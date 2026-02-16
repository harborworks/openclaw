#!/usr/bin/env bash
set -euo pipefail

##
## Deploy Harbor on a Bring-Your-Own-Host (BYOH) machine.
##
## Wrapper around install-harbor.sh for local execution.
## Run this directly on the target host.
##
## Usage:
##   ./scripts/deploy-byoh.sh --version v0.7.0 [options]
##
## See install-harbor.sh for full option list.
##

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec "${SCRIPT_DIR}/install-harbor.sh" "$@"
