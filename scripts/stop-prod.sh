#!/usr/bin/env bash
# Stops the production server started by start-prod.sh, if one is running.
#
# Looks at what's actually listening on the port instead of trusting
# .server.pid alone — that file only gets written on start, so it goes stale
# (and 'kill $(cat .server.pid)' starts failing with "No such process") the
# moment the server is stopped by any other means, e.g. a reboot. Also
# refuses to touch a process from a different project that happens to be
# squatting the same port.
#
# Port 3200 by default, same as start-prod.sh — override with PORT=... if
# the server was started on a different one.
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(dirname -- "$SCRIPT_DIR")
PORT=${PORT:-3200}
PID_FILE="$PROJECT_DIR/.server.pid"

port_pid() { # PID des Prozesses, der auf dem Port lauscht (oder leer)
  local pid=""
  if command -v lsof >/dev/null 2>&1; then
    pid=$(lsof -ti "tcp:$1" -sTCP:LISTEN 2>/dev/null | head -n 1)
  fi
  if [ -z "$pid" ] && command -v ss >/dev/null 2>&1; then
    pid=$(ss -ltnpH "sport = :$1" 2>/dev/null | grep -o 'pid=[0-9]*' | head -n 1 | cut -d= -f2)
  fi
  printf '%s' "$pid"
}

PID=$(port_pid "$PORT")

if [ -z "$PID" ]; then
  echo "Server läuft nicht (Port $PORT)."
  rm -f "$PID_FILE"
  exit 0
fi

OWNER_CWD=$(readlink -f "/proc/$PID/cwd" 2>/dev/null || true)
if [ "$OWNER_CWD" != "$PROJECT_DIR" ]; then
  echo "Port $PORT gehört Prozess $PID aus einem anderen Verzeichnis ($OWNER_CWD) — wird nicht angefasst." >&2
  exit 1
fi

kill "$PID"
for _ in $(seq 20); do
  [ -n "$(port_pid "$PORT")" ] || break
  sleep 0.25
done

if [ -n "$(port_pid "$PORT")" ]; then
  echo "Prozess $PID reagiert nicht auf SIGTERM. Von Hand prüfen: kill -9 $PID" >&2
  exit 1
fi

rm -f "$PID_FILE"
echo "Server gestoppt (war PID $PID, Port $PORT)."
