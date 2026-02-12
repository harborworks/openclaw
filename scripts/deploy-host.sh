#!/usr/bin/env bash
set -euo pipefail

##
## Deploy Harbor stack to a remote host via AWS SSM.
##
## Usage:
##   ./scripts/deploy-host.sh <host-name> [options]
##
## Arguments:
##   <host-name>   Host name (e.g. "01") — maps to EC2 instance "harbor-host-01"
##
## Options:
##   --harbor-id <id>         Convex harbor ID (required on first deploy)
##   --api-key <key>          Harbor API key (required on first deploy)
##   --convex-url <url>       Convex deployment URL (default: production)
##   --gateway-token <token>  Gateway auth token (auto-generated if not set)
##   --daemon-version <tag>   Daemon image tag (default: latest)
##   --gateway-version <tag>  Gateway image tag (default: latest)
##   --gateway-port <port>    Gateway port on host (default: 18789)
##   --deploy-dir <path>      Remote deploy directory (default: /home/ubuntu/harbor)
##   --dry-run                Print what would be done without executing
##

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Defaults
CONVEX_URL="https://cool-kingfisher-264.convex.cloud"  # production
GATEWAY_TOKEN=""
DAEMON_VERSION="latest"
GATEWAY_VERSION="latest"
GATEWAY_PORT="18789"
DEPLOY_DIR="/home/ubuntu/harbor"
HARBOR_ID=""
API_KEY=""
DRY_RUN=false
AWS_REGION="us-east-1"
ECR_REGISTRY="429056709468.dkr.ecr.us-east-1.amazonaws.com"

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
    --daemon-version)  DAEMON_VERSION="$2";   shift 2 ;;
    --gateway-version) GATEWAY_VERSION="$2";  shift 2 ;;
    --gateway-port)    GATEWAY_PORT="$2";     shift 2 ;;
    --deploy-dir)      DEPLOY_DIR="$2";       shift 2 ;;
    --dry-run)         DRY_RUN=true;          shift ;;
    -h|--help)         usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

log() { echo "[deploy] $*"; }

# Auto-generate gateway token if not provided
if [[ -z "$GATEWAY_TOKEN" ]]; then
  GATEWAY_TOKEN=$(openssl rand -hex 32)
  log "Generated gateway token: ${GATEWAY_TOKEN:0:8}..."
fi

# --- Resolve instance ID from host name ---
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

# --- Helper to run commands on remote via SSM ---
ssm_run() {
  local cmd="$1"
  if $DRY_RUN; then
    echo "[dry-run] ssm send-command: $cmd"
    return 0
  fi

  local cmd_id
  cmd_id=$(aws ssm send-command \
    --region "$AWS_REGION" \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"$cmd\"]" \
    --query "Command.CommandId" \
    --output text)

  # Wait for command to complete
  aws ssm wait command-executed \
    --region "$AWS_REGION" \
    --command-id "$cmd_id" \
    --instance-id "$INSTANCE_ID" 2>/dev/null || true

  # Get output
  local result
  result=$(aws ssm get-command-invocation \
    --region "$AWS_REGION" \
    --command-id "$cmd_id" \
    --instance-id "$INSTANCE_ID" \
    --query "[Status, StandardOutputContent, StandardErrorContent]" \
    --output text)

  local status
  status=$(echo "$result" | head -1 | awk '{print $1}')
  if [[ "$status" != "Success" ]]; then
    echo "Error: Command failed with status $status"
    echo "$result"
    return 1
  fi

  echo "$result" | tail -n +2
}

# --- Helper to write a file on remote via SSM ---
ssm_write_file() {
  local remote_path="$1"
  local content="$2"

  # Base64 encode to handle special characters safely
  local encoded
  encoded=$(echo "$content" | base64 -w0)

  ssm_run "echo '$encoded' | base64 -d > $remote_path"
}

# --- Validate ---
if [[ -n "$HARBOR_ID" && -z "$API_KEY" ]]; then
  echo "Error: --api-key is required when --harbor-id is set"
  exit 1
fi

if [[ -z "$HARBOR_ID" ]]; then
  # Check if remote already has .env.host
  log "Checking for existing deployment..."
  if ssm_run "test -f ${DEPLOY_DIR}/.env.host && echo EXISTS" 2>/dev/null | grep -q EXISTS; then
    log "Remote .env.host exists — updating deployment"
  else
    echo "Error: --harbor-id is required for first deploy"
    exit 1
  fi
fi

# --- Step 1: Ensure deploy directory exists with correct ownership ---
log "Creating deploy directory..."
ssm_run "mkdir -p ${DEPLOY_DIR}/.harbor-host/config ${DEPLOY_DIR}/.harbor-host/workspace && chown -R 1000:1000 ${DEPLOY_DIR}/.harbor-host"

# --- Step 2: Copy docker-compose.host.yml ---
log "Copying docker-compose.yml..."
ssm_write_file "${DEPLOY_DIR}/docker-compose.yml" "$(cat "$REPO_DIR/docker-compose.host.yml")"

# --- Step 3: Write .env.host ---
if [[ -n "$HARBOR_ID" ]]; then
  log "Writing .env.host..."
  ssm_write_file "${DEPLOY_DIR}/.env.host" "CONVEX_URL=${CONVEX_URL}
HARBOR_ID=${HARBOR_ID}
HARBOR_API_KEY=${API_KEY}
OPENCLAW_GATEWAY_TOKEN=${GATEWAY_TOKEN}
GATEWAY_PORT=${GATEWAY_PORT}
DAEMON_VERSION=${DAEMON_VERSION}
GATEWAY_VERSION=${GATEWAY_VERSION}"
else
  # Update versions in existing .env.host
  if [[ "$DAEMON_VERSION" != "latest" || "$GATEWAY_VERSION" != "latest" ]]; then
    log "Updating image versions..."
    ssm_run "cd ${DEPLOY_DIR} && sed -i 's/^DAEMON_VERSION=.*/DAEMON_VERSION=${DAEMON_VERSION}/' .env.host && sed -i 's/^GATEWAY_VERSION=.*/GATEWAY_VERSION=${GATEWAY_VERSION}/' .env.host"
  fi
fi

# --- Step 4: Copy cli.sh ---
log "Copying cli.sh..."
ssm_write_file "${DEPLOY_DIR}/cli.sh" "$(cat "$REPO_DIR/scripts/cli.sh")"
ssm_run "chmod +x ${DEPLOY_DIR}/cli.sh"

# --- Step 5: Clear stale gateway config ---
# The daemon patches config via WS on startup. Stale openclaw.json from a
# previous version can reference env vars that don't exist yet, crashing the
# gateway before the daemon can connect. Always start from a clean slate.
log "Clearing stale gateway config..."
ssm_run "rm -f ${DEPLOY_DIR}/.harbor-host/config/openclaw.json"

# --- Step 6: ECR login on remote host ---
log "Logging into ECR..."
ssm_run "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}"

# --- Step 7: Pull and start ---
log "Pulling images..."
ssm_run "cd ${DEPLOY_DIR} && docker compose --env-file .env.host pull"

log "Starting stack..."
ssm_run "cd ${DEPLOY_DIR} && docker compose --env-file .env.host up -d"

log "Done! Stack deployed to harbor-host-${HOST_NAME} (${INSTANCE_ID})"
log ""
log "Connect with:"
log "  aws ssm start-session --target ${INSTANCE_ID}"
log ""
log "View logs:"
log "  cd ${DEPLOY_DIR} && docker compose --env-file .env.host logs -f"
