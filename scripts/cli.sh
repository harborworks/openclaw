#!/usr/bin/env bash
set -euo pipefail

##
## Run the OpenClaw CLI against the local harbor stack.
##
## Usage:
##   ./cli.sh [openclaw args...]
##
## Examples:
##   ./cli.sh status
##   ./cli.sh doctor
##   ./cli.sh config get
##

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${SCRIPT_DIR%/scripts}"

# Deployed hosts have a single docker-compose.yml (copied from host.yml)
if [[ -f "$DEPLOY_DIR/docker-compose.yml" ]]; then
  exec docker compose -f "$DEPLOY_DIR/docker-compose.yml" \
    --env-file "$DEPLOY_DIR/.env.host" run --rm cli "$@"
fi

# Local dev: compose with host + dev overlay
if [[ -f "$DEPLOY_DIR/docker-compose.host.yml" ]]; then
  exec docker compose \
    -f "$DEPLOY_DIR/docker-compose.host.yml" \
    -f "$DEPLOY_DIR/docker-compose.dev.yml" \
    --env-file "$DEPLOY_DIR/.env.host" run --rm cli "$@"
fi

echo "Error: No docker-compose file found in $DEPLOY_DIR" >&2
exit 1
