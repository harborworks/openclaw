#!/usr/bin/env bash
set -euo pipefail

##
## Install or upgrade Harbor on the current host.
##
## Installs both the gateway (openclaw) and daemon as systemd services.
## Artifacts are downloaded from S3.
##
## Usage:
##   ./scripts/install-harbor.sh --version v0.7.0 [options]
##
## Required:
##   --version <tag>          Harbor release version (e.g. v0.7.0)
##
## Required (first install):
##   --harbor-id <id>         Convex harbor ID
##   --api-key <key>          Harbor API key
##
## Options:
##   --convex-url <url>       Convex deployment URL (default: production)
##   --gateway-token <token>  Gateway auth token (auto-generated if not set)
##   --gateway-port <port>    Gateway port (default: 18789)
##   --daemon-port <port>     Daemon port (default: 4747)
##   --deploy-dir <path>      Deploy directory (default: ~/harbor)
##   --dry-run                Print what would be done without executing
##

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Defaults
CONVEX_URL="https://cool-kingfisher-264.convex.cloud"
GATEWAY_TOKEN=""
VERSION=""
GATEWAY_PORT="18789"
DAEMON_PORT="4747"
DEPLOY_DIR="${HOME}/harbor"
HARBOR_ID=""
API_KEY=""
DRY_RUN=false
AWS_REGION="us-east-1"
S3_BUCKET="harbor-artifacts"

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
    --dry-run)         DRY_RUN=true;          shift ;;
    -h|--help)         usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

log() { echo "[install-harbor] $*"; }

run() {
  if $DRY_RUN; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

# --- Validate ---
if [[ -z "$VERSION" ]]; then
  echo "Error: --version is required"
  usage
fi

if [[ -n "$HARBOR_ID" && -z "$API_KEY" ]]; then
  echo "Error: --api-key is required when --harbor-id is set"
  exit 1
fi

ENV_FILE="${DEPLOY_DIR}/.env"

if [[ -z "$HARBOR_ID" && ! -f "$ENV_FILE" ]]; then
  echo "Error: --harbor-id is required for first install (no existing ${ENV_FILE} found)"
  exit 1
fi

# Load existing env if present
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

# Auto-generate gateway token if not provided
if [[ -z "$GATEWAY_TOKEN" ]]; then
  GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-}"
  if [[ -z "$GATEWAY_TOKEN" ]]; then
    GATEWAY_TOKEN=$(openssl rand -hex 32)
    log "Generated gateway token: ${GATEWAY_TOKEN:0:8}..."
  fi
fi

# Use existing values as fallback
HARBOR_ID="${HARBOR_ID:-${HARBOR_ID_EXISTING:-}}"
API_KEY="${API_KEY:-${HARBOR_API_KEY:-}}"
CONVEX_URL="${CONVEX_URL:-${CONVEX_URL_EXISTING:-https://cool-kingfisher-264.convex.cloud}}"

# --- Step 1: Create directories ---
log "Setting up ${DEPLOY_DIR}..."
run mkdir -p "${DEPLOY_DIR}"/{config,workspaces,vault,knowledge,bin}

# --- Step 2: Download artifacts from S3 ---
S3_PREFIX="s3://${S3_BUCKET}/${VERSION}"

log "Downloading harbor ${VERSION} artifacts from S3..."
run aws s3 cp "${S3_PREFIX}/openclaw.tgz" "/tmp/harbor-openclaw-${VERSION}.tgz" --region "$AWS_REGION"
run aws s3 cp "${S3_PREFIX}/harbor-daemon.tgz" "/tmp/harbor-daemon-${VERSION}.tgz" --region "$AWS_REGION"

# --- Step 3: Install openclaw (gateway) ---
log "Installing openclaw..."
run npm install -g "/tmp/harbor-openclaw-${VERSION}.tgz"
OPENCLAW_BIN=$(which openclaw)
log "Installed openclaw at ${OPENCLAW_BIN}"

# --- Step 4: Install daemon ---
log "Installing daemon..."
DAEMON_DIR="${DEPLOY_DIR}/daemon"
run mkdir -p "$DAEMON_DIR"
run tar -xzf "/tmp/harbor-daemon-${VERSION}.tgz" -C "$DAEMON_DIR" --strip-components=1
(cd "$DAEMON_DIR" && run npm ci --production)
log "Installed daemon at ${DAEMON_DIR}"

# --- Step 5: Write env file ---
log "Writing ${ENV_FILE}..."
if ! $DRY_RUN; then
  cat > "$ENV_FILE" <<EOF
# Harbor environment — managed by install-harbor.sh
HARBOR_VERSION=${VERSION}
CONVEX_URL=${CONVEX_URL}
HARBOR_ID=${HARBOR_ID}
HARBOR_API_KEY=${API_KEY}
OPENCLAW_GATEWAY_TOKEN=${GATEWAY_TOKEN}
GATEWAY_PORT=${GATEWAY_PORT}
DAEMON_PORT=${DAEMON_PORT}
DEPLOY_DIR=${DEPLOY_DIR}
OPENCLAW_CONFIG_DIR=${DEPLOY_DIR}/config
WORKSPACES_DIR=${DEPLOY_DIR}/workspaces
EOF
fi

# --- Step 6: Ensure minimal gateway config ---
GATEWAY_CONFIG="${DEPLOY_DIR}/config/openclaw.json"
if [[ ! -f "$GATEWAY_CONFIG" ]]; then
  log "Creating minimal gateway config..."
  if ! $DRY_RUN; then
    mkdir -p "${DEPLOY_DIR}/config"
    echo '{"gateway":{"mode":"local"}}' > "$GATEWAY_CONFIG"
  fi
fi

# --- Step 7: Install user systemd services (no sudo required) ---
log "Installing user systemd services..."

SYSTEMD_DIR="${HOME}/.config/systemd/user"
mkdir -p "$SYSTEMD_DIR"

if ! $DRY_RUN; then
  cat > "${SYSTEMD_DIR}/harbor-gateway.service" <<EOF
[Unit]
Description=Harbor Gateway (OpenClaw)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment=HOME=${HOME}
Environment=OPENCLAW_GATEWAY_TOKEN=${GATEWAY_TOKEN}
EnvironmentFile=${ENV_FILE}
ExecStart=$(which openclaw) gateway --port ${GATEWAY_PORT}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

  cat > "${SYSTEMD_DIR}/harbor-daemon.service" <<EOF
[Unit]
Description=Harbor Daemon
After=harbor-gateway.service
Wants=harbor-gateway.service

[Service]
Type=simple
Environment=HOME=${HOME}
Environment=NODE_ENV=production
EnvironmentFile=${ENV_FILE}
Environment=GATEWAY_TOKEN=${GATEWAY_TOKEN}
Environment=DEFAULT_CONFIG_PATH=${DAEMON_DIR}/scripts/openclaw-config.json
WorkingDirectory=${DAEMON_DIR}
ExecStart=$(which node) ${DAEMON_DIR}/dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

  systemctl --user daemon-reload
  systemctl --user enable harbor-gateway harbor-daemon

  # Enable linger so services survive logout
  loginctl enable-linger "$USER" 2>/dev/null || true
fi

# --- Step 8: Start/restart services ---
log "Starting services..."
run systemctl --user restart harbor-gateway
# Give gateway a moment to start before daemon connects
sleep 2
run systemctl --user restart harbor-daemon

# --- Step 9: Cleanup ---
rm -f "/tmp/harbor-openclaw-${VERSION}.tgz" "/tmp/harbor-daemon-${VERSION}.tgz"

log ""
log "Done! Harbor ${VERSION} installed at ${DEPLOY_DIR}"
log ""
log "Services:"
log "  systemctl --user status harbor-gateway"
log "  systemctl --user status harbor-daemon"
log ""
log "Logs:"
log "  journalctl --user -u harbor-gateway -f"
log "  journalctl --user -u harbor-daemon -f"
log ""
log "CLI:"
log "  openclaw status"
