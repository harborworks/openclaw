#!/usr/bin/env bash
set -euo pipefail

##
## Deploy Harbor to a remote EC2 host via AWS SSM.
##
## Uploads install-harbor.sh and runs it remotely. The install script handles
## downloading artifacts from S3 and setting up systemd services.
##
## Usage:
##   ./scripts/deploy-host.sh <host-name> --version <tag> [options]
##
## Arguments:
##   <host-name>   Host name (e.g. "01") — maps to EC2 instance "harbor-host-01"
##
## Required:
##   --version <tag>          Harbor release version (e.g. v0.7.0)
##
## Required (first deploy):
##   --harbor-id <id>         Convex harbor ID
##   --api-key <key>          Harbor API key
##
## Options:
##   --convex-url <url>       Convex deployment URL (default: production)
##   --gateway-token <token>  Gateway auth token (auto-generated if not set)
##   --gateway-port <port>    Gateway port (default: 18789)
##   --daemon-port <port>     Daemon port (default: 4747)
##   --deploy-dir <path>      Remote deploy directory (default: /home/ubuntu/harbor)
##   --dry-run                Print what would be done without executing
##

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Defaults
CONVEX_URL="https://cool-kingfisher-264.convex.cloud"
GATEWAY_TOKEN=""
VERSION=""
GATEWAY_PORT="18789"
DAEMON_PORT="4747"
DEPLOY_DIR="/home/ubuntu/harbor"
HARBOR_ID=""
API_KEY=""
DRY_RUN=false
AWS_REGION="us-east-1"

usage() {
  sed -n 's/^## //p; s/^##$//p' "$0"
  exit 1
}

[[ $# -lt 1 ]] && usage
HOST_NAME="$1"; shift

while [[ $# -gt 0 ]]; do
  case "$1" in
    --harbor-id)       HARBOR_ID="$2";       shift 2 ;;
    --api-key)         API_KEY="$2";          shift 2 ;;
    --convex-url)      CONVEX_URL="$2";       shift 2 ;;
    --gateway-token)   GATEWAY_TOKEN="$2";    shift 2 ;;
    --version)         VERSION="$2";          shift 2 ;;
    --gateway-port)    GATEWAY_PORT="$2";     shift 2 ;;
    --daemon-port)     DAEMON_PORT="$2";      shift 2 ;;
    --deploy-dir)      DEPLOY_DIR="$2";       shift 2 ;;
    --dry-run)         DRY_RUN=true;          shift ;;
    -h|--help)         usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

log() { echo "[deploy-host] $*"; }

if [[ -z "$VERSION" ]]; then
  echo "Error: --version is required"
  usage
fi

# --- Resolve instance ID ---
log "Resolving instance ID for harbor-host-${HOST_NAME}..."
INSTANCE_ID=$(aws ec2 describe-instances \
  --region "$AWS_REGION" \
  --filters "Name=tag:Name,Values=harbor-host-${HOST_NAME}" \
            "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text)

if [[ -z "$INSTANCE_ID" || "$INSTANCE_ID" == "None" ]]; then
  echo "Error: No running instance found for harbor-host-${HOST_NAME}"
  exit 1
fi
log "Found instance: $INSTANCE_ID"

# --- SSM helpers ---
ssm_run() {
  local cmd="$1"
  if $DRY_RUN; then
    echo "[dry-run] ssm: $cmd"
    return 0
  fi

  local cmd_id
  cmd_id=$(aws ssm send-command \
    --region "$AWS_REGION" \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --timeout-seconds 300 \
    --parameters "commands=[\"$cmd\"]" \
    --query "Command.CommandId" \
    --output text)

  aws ssm wait command-executed \
    --region "$AWS_REGION" \
    --command-id "$cmd_id" \
    --instance-id "$INSTANCE_ID" 2>/dev/null || true

  local status
  status=$(aws ssm get-command-invocation \
    --region "$AWS_REGION" \
    --command-id "$cmd_id" \
    --instance-id "$INSTANCE_ID" \
    --query "Status" \
    --output text)

  if [[ "$status" != "Success" ]]; then
    local stderr
    stderr=$(aws ssm get-command-invocation \
      --region "$AWS_REGION" \
      --command-id "$cmd_id" \
      --instance-id "$INSTANCE_ID" \
      --query "StandardErrorContent" \
      --output text)
    echo "Error: Command failed with status $status"
    echo "$stderr"
    return 1
  fi

  aws ssm get-command-invocation \
    --region "$AWS_REGION" \
    --command-id "$cmd_id" \
    --instance-id "$INSTANCE_ID" \
    --query "StandardOutputContent" \
    --output text
}

ssm_run_as() {
  local cmd="$1"
  local encoded
  # Set XDG_RUNTIME_DIR so systemctl --user works over SSM
  encoded=$(echo "export XDG_RUNTIME_DIR=/run/user/\$(id -u) && $cmd" | base64 -w0)
  ssm_run "echo '$encoded' | base64 -d | runuser -u ubuntu -- bash"
}

ssm_write_file() {
  local remote_path="$1"
  local content="$2"
  local encoded
  encoded=$(echo "$content" | base64 -w0)
  ssm_run "echo '$encoded' | base64 -d > $remote_path && chown ubuntu:ubuntu $remote_path && chmod +x $remote_path"
}

# --- Ensure Node.js is installed ---
log "Checking Node.js..."
ssm_run_as "node --version 2>/dev/null || (curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs)"

# --- Upload and run install script ---
log "Uploading install script..."
ssm_write_file "/tmp/install-harbor.sh" "$(cat "${SCRIPT_DIR}/install-harbor.sh")"

# Build install command
INSTALL_CMD="/tmp/install-harbor.sh --version ${VERSION} --deploy-dir ${DEPLOY_DIR} --gateway-port ${GATEWAY_PORT} --daemon-port ${DAEMON_PORT}"
[[ -n "$HARBOR_ID" ]] && INSTALL_CMD+=" --harbor-id ${HARBOR_ID}"
[[ -n "$API_KEY" ]] && INSTALL_CMD+=" --api-key ${API_KEY}"
[[ -n "$GATEWAY_TOKEN" ]] && INSTALL_CMD+=" --gateway-token ${GATEWAY_TOKEN}"
[[ "$CONVEX_URL" != "https://cool-kingfisher-264.convex.cloud" ]] && INSTALL_CMD+=" --convex-url ${CONVEX_URL}"

log "Running install-harbor.sh on harbor-host-${HOST_NAME}..."
ssm_run_as "$INSTALL_CMD"

# Cleanup
ssm_run "rm -f /tmp/install-harbor.sh"

log ""
log "Done! Harbor ${VERSION} deployed to harbor-host-${HOST_NAME} (${INSTANCE_ID})"
log ""
log "Connect with:"
log "  aws ssm start-session --target ${INSTANCE_ID}"
log ""
log "View logs:"
log "  journalctl -u harbor-gateway -f"
log "  journalctl -u harbor-daemon -f"
