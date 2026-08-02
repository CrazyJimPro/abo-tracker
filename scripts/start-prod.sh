#!/usr/bin/env bash
# Starts the production server in the foreground, appending to prod-server.log.
#
# Used both by install.sh and by the autostart entry
# (~/.config/autostart/abo-tracker.desktop). The .desktop Exec line runs outside
# any shell profile, so nvm/PATH aren't set up — hence the explicit node lookup
# via find-node.sh instead of relying on `node` being resolvable.
#
# Port 3200 by default so it never collides with the Claude Code dev-preview
# server (.claude/launch.json, port 3000) or the monatsausgaben production
# server (port 3100). Override with PORT=... if needed.
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(dirname -- "$SCRIPT_DIR")

# shellcheck source=scripts/find-node.sh
. "$SCRIPT_DIR/find-node.sh"

PORT=${PORT:-3200}

cd "$PROJECT_DIR"

if ! NODE=$(find_node_bin 22.18.0); then
  echo "Kein passendes Node (>= 22.18) gefunden. Bitte ./install.sh ausführen." >&2
  exit 1
fi

exec "$NODE" node_modules/next/dist/bin/next start -p "$PORT" \
  >> "$PROJECT_DIR/prod-server.log" 2>&1
