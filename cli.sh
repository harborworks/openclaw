#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
exec docker compose -f docker-compose.host.yml --env-file .env.host run --rm cli "$@"
