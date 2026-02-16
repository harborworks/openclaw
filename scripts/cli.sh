#!/usr/bin/env bash
set -euo pipefail

##
## Run the OpenClaw CLI against the local harbor gateway.
##
## Usage:
##   ./cli.sh [openclaw args...]
##
## Examples:
##   ./cli.sh status
##   ./cli.sh doctor
##   ./cli.sh config get
##

exec openclaw "$@"
