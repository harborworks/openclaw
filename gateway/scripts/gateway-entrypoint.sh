#!/bin/sh
set -e

ENV_FILE="$HOME/.openclaw/.env"

# Start .env watcher in background — when the file changes, kill the gateway
# process so Docker restarts the container with fresh env vars.
node -e "
  const fs = require('fs');
  const path = '$ENV_FILE';
  let debounce = null;
  function watch() {
    try {
      fs.watch(path, () => {
        if (debounce) return;
        debounce = setTimeout(() => {
          console.log('[env-watcher] .env changed — restarting gateway');
          // Find and kill the gateway node process (PID 1's child)
          try {
            const pids = fs.readdirSync('/proc')
              .filter(e => /^\d+$/.test(e))
              .map(Number)
              .filter(p => p !== process.pid && p !== 1);
            for (const pid of pids) {
              try {
                const cmd = fs.readFileSync('/proc/' + pid + '/cmdline', 'utf-8');
                if (cmd.includes('gateway')) {
                  process.kill(pid, 'SIGTERM');
                  console.log('[env-watcher] sent SIGTERM to PID ' + pid);
                }
              } catch {}
            }
          } catch {}
          debounce = null;
        }, 1000);
      });
    } catch {
      // File doesn't exist yet — retry
      setTimeout(watch, 2000);
    }
  }
  watch();
" &

# Source .env if it exists so secrets are in the process environment
if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

# Run the gateway
exec openclaw gateway "$@"
