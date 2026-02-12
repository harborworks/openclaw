#!/bin/bash
set -euo pipefail

# Harbor Daemon host setup script
# Run on the target host to install openclaw + daemon

CONVEX_URL="${CONVEX_URL:?CONVEX_URL required}"
HARBOR_ID="${HARBOR_ID:?HARBOR_ID required}"

echo "=== Installing OpenClaw ==="
if ! command -v openclaw &>/dev/null; then
  curl -fsSL https://get.openclaw.ai | bash
  export PATH="$HOME/.openclaw/bin:$PATH"
fi

echo "=== Setting up daemon ==="
DAEMON_DIR="$HOME/harbor-daemon"
mkdir -p "$DAEMON_DIR"

# Write daemon env file
cat > "$DAEMON_DIR/.env" << EOF
CONVEX_URL=${CONVEX_URL}
HARBOR_ID=${HARBOR_ID}
ENV_FILE_PATH=$HOME/.openclaw/.env
TICK_INTERVAL_MS=5000
DAEMON_PORT=4747
EOF

echo "=== Daemon env written to $DAEMON_DIR/.env ==="
cat "$DAEMON_DIR/.env"

echo "=== Setup complete ==="
