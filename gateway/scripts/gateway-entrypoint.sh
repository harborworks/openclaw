#!/bin/sh
set -e

# Ensure a minimal config exists so the gateway can start.
# The daemon will patch in the full config once connected.
CONFIG_DIR="${HOME}/.openclaw"
CONFIG_FILE="${CONFIG_DIR}/openclaw.json"

if [ ! -f "$CONFIG_FILE" ]; then
  mkdir -p "$CONFIG_DIR"
  cat > "$CONFIG_FILE" <<'EOF'
{"gateway":{"mode":"local"}}
EOF
  echo "Created minimal gateway config at $CONFIG_FILE"
fi

# Run the gateway
exec openclaw gateway "$@"
