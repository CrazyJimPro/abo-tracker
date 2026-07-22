#!/bin/bash
# Autostart entry point (~/.config/autostart/abo-tracker.desktop) for the
# production server. Uses an absolute node path because .desktop Exec
# entries run outside any shell profile, so nvm/PATH aren't set up — same
# reason the dev launch.json config needs the same trick.
# Runs on port 3200 so it never collides with the Claude Code dev-preview
# server (.claude/launch.json, port 3000) or the monatsausgaben production
# server (port 3100).
cd /home/chris/claude/abo-tracker || exit 1
exec /home/chris/.nvm/versions/node/v24.18.0/bin/node node_modules/next/dist/bin/next start -p 3200 \
  >> /home/chris/claude/abo-tracker/prod-server.log 2>&1
