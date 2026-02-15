#!/usr/bin/env bash
set -euo pipefail

##
## Deploy Harbor stack on a Bring-Your-Own-Host (BYOH) machine.
##
## Run this directly on the target host. AWS credentials must be available
## for ECR image pulls.
##
## Usage:
##   ./scripts/deploy-byoh.sh [options]
##
## Required (first deploy):
##   --harbor-id <id>         Convex harbor ID
##   --api-key <key>          Harbor API key
##
## Options:
##   --convex-url <url>       Convex deployment URL (default: production)
##   --gateway-token <token>  Gateway auth token (auto-generated if not set)
##   --version <tag>          Image tag for daemon + gateway (default: latest)
##   --gateway-port <port>    Gateway port (default: 18789)
##   --daemon-port <port>     Daemon port (default: 4747)
##   --deploy-dir <path>      Deploy directory (default: ~/harbor)
##   --sandbox-mode <mode>    Sandbox mode: all or off (default: off)
##   --dry-run                Print what would be done without executing
##

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Defaults
CONVEX_URL="https://cool-kingfisher-264.convex.cloud"
GATEWAY_TOKEN=""
VERSION="latest"
GATEWAY_PORT="18789"
DAEMON_PORT="4747"
DEPLOY_DIR="$HOME/harbor"
HARBOR_ID=""
API_KEY=""
SANDBOX_MODE="off"
DRY_RUN=false
AWS_REGION="us-east-1"
ECR_REGISTRY="429056709468.dkr.ecr.us-east-1.amazonaws.com"

usage() {
  sed -n 's/^## //p; s/^##$//p' "$0"
  exit 1
}

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
    --sandbox-mode)    SANDBOX_MODE="$2";     shift 2 ;;
    --dry-run)         DRY_RUN=true;          shift ;;
    -h|--help)         usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

log() { echo "[deploy-byoh] $*"; }

run() {
  if $DRY_RUN; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

# --- Validate ---
if [[ -n "$HARBOR_ID" && -z "$API_KEY" ]]; then
  echo "Error: --api-key is required when --harbor-id is set"
  exit 1
fi

if [[ -z "$HARBOR_ID" && ! -f "${DEPLOY_DIR}/.env.host" ]]; then
  echo "Error: --harbor-id is required for first deploy (no existing .env.host found)"
  exit 1
fi

# Auto-generate gateway token if not provided and no existing config
if [[ -z "$GATEWAY_TOKEN" ]]; then
  if [[ -f "${DEPLOY_DIR}/.env.host" ]]; then
    GATEWAY_TOKEN=$(grep '^OPENCLAW_GATEWAY_TOKEN=' "${DEPLOY_DIR}/.env.host" | cut -d= -f2- || true)
  fi
  if [[ -z "$GATEWAY_TOKEN" ]]; then
    GATEWAY_TOKEN=$(openssl rand -hex 32)
    log "Generated gateway token: ${GATEWAY_TOKEN:0:8}..."
  fi
fi

# --- Step 1: Create deploy directory ---
log "Setting up ${DEPLOY_DIR}..."
run mkdir -p "${DEPLOY_DIR}/config" "${DEPLOY_DIR}/workspaces" "${DEPLOY_DIR}/vault" "${DEPLOY_DIR}/knowledge"

# --- Step 2: Copy docker-compose.host.yml ---
log "Copying docker-compose.yml..."
if ! $DRY_RUN; then
  cp "$REPO_DIR/docker-compose.host.yml" "${DEPLOY_DIR}/docker-compose.yml"
fi

# --- Step 3: Write .env.host ---
DOCKER_GID=$(stat -c %g /var/run/docker.sock 2>/dev/null || echo "998")

if [[ -n "$HARBOR_ID" ]]; then
  log "Writing .env.host..."
  if ! $DRY_RUN; then
    cat > "${DEPLOY_DIR}/.env.host" <<EOF
CONVEX_URL=${CONVEX_URL}
HARBOR_ID=${HARBOR_ID}
HARBOR_API_KEY=${API_KEY}
OPENCLAW_GATEWAY_TOKEN=${GATEWAY_TOKEN}
GATEWAY_PORT=${GATEWAY_PORT}
DAEMON_PORT=${DAEMON_PORT}
DAEMON_VERSION=${VERSION}
GATEWAY_VERSION=${VERSION}
OPENCLAW_CONFIG_DIR=${DEPLOY_DIR}/config
OPENCLAW_WORKSPACE_DIR=${DEPLOY_DIR}/workspaces
DOCKER_GID=${DOCKER_GID}
SANDBOX_MODE=${SANDBOX_MODE}
EOF
    # Only add sandbox image if sandboxing is enabled
    if [[ "$SANDBOX_MODE" != "off" ]]; then
      echo "SANDBOX_IMAGE=${ECR_REGISTRY}/harbor-sandbox:${VERSION}" >> "${DEPLOY_DIR}/.env.host"
    fi
  fi
else
  log "Updating existing .env.host..."
  if ! $DRY_RUN; then
    # Update versions
    sed -i "s/^DAEMON_VERSION=.*/DAEMON_VERSION=${VERSION}/" "${DEPLOY_DIR}/.env.host"
    sed -i "s/^GATEWAY_VERSION=.*/GATEWAY_VERSION=${VERSION}/" "${DEPLOY_DIR}/.env.host"
    # Ensure DOCKER_GID is set
    grep -q '^DOCKER_GID=' "${DEPLOY_DIR}/.env.host" \
      && sed -i "s/^DOCKER_GID=.*/DOCKER_GID=${DOCKER_GID}/" "${DEPLOY_DIR}/.env.host" \
      || echo "DOCKER_GID=${DOCKER_GID}" >> "${DEPLOY_DIR}/.env.host"
    # Ensure SANDBOX_MODE is set
    grep -q '^SANDBOX_MODE=' "${DEPLOY_DIR}/.env.host" \
      && sed -i "s/^SANDBOX_MODE=.*/SANDBOX_MODE=${SANDBOX_MODE}/" "${DEPLOY_DIR}/.env.host" \
      || echo "SANDBOX_MODE=${SANDBOX_MODE}" >> "${DEPLOY_DIR}/.env.host"
  fi
fi

# --- Step 4: Copy cli.sh ---
if [[ -f "$REPO_DIR/scripts/cli.sh" ]]; then
  log "Copying cli.sh..."
  if ! $DRY_RUN; then
    cp "$REPO_DIR/scripts/cli.sh" "${DEPLOY_DIR}/cli.sh"
    chmod +x "${DEPLOY_DIR}/cli.sh"
  fi
fi

# --- Step 5: Clear stale gateway config ---
log "Clearing stale gateway config..."
run rm -f "${DEPLOY_DIR}/config/openclaw.json"

# --- Step 6: ECR login + pull ---
log "Logging into ECR..."
run bash -c "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}"

log "Pulling images..."
run docker compose -f "${DEPLOY_DIR}/docker-compose.yml" --env-file "${DEPLOY_DIR}/.env.host" pull

if [[ "$SANDBOX_MODE" != "off" ]]; then
  SANDBOX_IMAGE="${ECR_REGISTRY}/harbor-sandbox:${VERSION}"
  log "Pulling sandbox image..."
  run docker pull "$SANDBOX_IMAGE"
fi

# --- Step 7: Start stack ---
log "Starting stack..."
run docker compose -f "${DEPLOY_DIR}/docker-compose.yml" --env-file "${DEPLOY_DIR}/.env.host" up -d

# --- Step 8: Recreate sandboxes if enabled ---
if [[ "$SANDBOX_MODE" != "off" ]]; then
  log "Recreating sandbox containers..."
  run docker compose -f "${DEPLOY_DIR}/docker-compose.yml" --env-file "${DEPLOY_DIR}/.env.host" \
    run --rm cli sandbox recreate --all --force 2>/dev/null || true
fi

log ""
log "Done! Harbor stack deployed to ${DEPLOY_DIR}"
log ""
log "View logs:"
log "  cd ${DEPLOY_DIR} && docker compose --env-file .env.host logs -f"
log ""
log "CLI:"
if [[ -f "${DEPLOY_DIR}/cli.sh" ]]; then
  log "  ${DEPLOY_DIR}/cli.sh status"
else
  log "  docker compose -f ${DEPLOY_DIR}/docker-compose.yml --env-file ${DEPLOY_DIR}/.env.host run --rm cli status"
fi
