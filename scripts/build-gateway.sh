#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OPENCLAW_DIR="$REPO_ROOT/vendor/openclaw"

IMAGE_NAME="${1:-openclaw:local}"

if [ ! -f "$OPENCLAW_DIR/Dockerfile" ]; then
  echo "Error: vendor/openclaw not found. Run: git submodule update --init" >&2
  exit 1
fi

echo "Building gateway image: $IMAGE_NAME"
echo "OpenClaw version: $(cd "$OPENCLAW_DIR" && git describe --tags 2>/dev/null || echo 'unknown')"

docker build -t "$IMAGE_NAME" -f "$OPENCLAW_DIR/Dockerfile" "$OPENCLAW_DIR"

echo "Done: $IMAGE_NAME"
