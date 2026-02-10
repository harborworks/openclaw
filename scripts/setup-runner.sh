#!/bin/bash
set -euo pipefail

# Setup a GitHub Actions self-hosted runner on this machine.
# Run this once on ben-devbox.
#
# Prerequisites:
#   - Docker installed
#   - A GitHub personal access token with repo scope
#
# Usage:
#   ./scripts/setup-runner.sh <github-token>

GITHUB_TOKEN="${1:?Usage: setup-runner.sh <github-token>}"
REPO="harborworks/harbor-app"
RUNNER_DIR="$HOME/actions-runner"

echo "==> Setting up GitHub Actions runner for $REPO"

# Get registration token
REG_TOKEN=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO/actions/runners/registration-token" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Download runner
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

if [[ ! -f ./config.sh ]]; then
  LATEST=$(curl -s https://api.github.com/repos/actions/runner/releases/latest \
    | python3 -c "import sys,json;r=json.load(sys.stdin);print([a['browser_download_url'] for a in r['assets'] if 'linux-x64' in a['name'] and a['name'].endswith('.tar.gz')][0])")
  curl -sL "$LATEST" | tar xz
fi

# Configure
./config.sh --url "https://github.com/$REPO" --token "$REG_TOKEN" --unattended --name "ben-devbox" --labels "self-hosted,devbox"

# Install and start as service
sudo ./svc.sh install
sudo ./svc.sh start

echo "==> Runner installed and running"
echo "Check status: sudo ./svc.sh status"
