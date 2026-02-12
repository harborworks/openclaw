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

# If no scripts dir (deployed to host), use current dir
if [[ ! -f "$DEPLOY_DIR/docker-compose.yml" ]]; then
  DEPLOY_DIR="$(pwd)"
fi

exec docker compose -f "$DEPLOY_DIR/docker-compose.yml" --env-file "$DEPLOY_DIR/.env.host" run --rm cli "$@"
