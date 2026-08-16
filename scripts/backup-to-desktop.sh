#!/usr/bin/env bash
# Sichert data/abo-tracker.db per SQLite-Online-Backup auf den Schreibtisch —
# WAL-sicher auch bei laufendem Server, siehe installscript/README.md#backup.
# Gedacht für einen @reboot-Crontab-Eintrag (siehe dort), lässt sich aber auch
# von Hand ausführen. Behält nur die letzten $KEEP Sicherungen, löscht ältere.
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(dirname -- "$SCRIPT_DIR")

# shellcheck source=scripts/find-node.sh
. "$SCRIPT_DIR/find-node.sh"

NODE=$(find_node_bin 22.18.0) || { echo "Kein passendes Node (>= 22.18) gefunden." >&2; exit 1; }

KEEP=10

# xdg-user-dir kennt die lokalisierte Bezeichnung (z.B. "Schreibtisch" statt
# "Desktop" bei deutscher Locale) — ein fest "Desktop" einprogrammierter Pfad
# würde auf so einem System einen zweiten, falschen Ordner anlegen.
DESKTOP=$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")
DEST_DIR="$DESKTOP/abo-backup"
mkdir -p "$DEST_DIR"
DEST_FILE="$DEST_DIR/abo-tracker-$(date +%Y-%m-%d).db"

cd "$PROJECT_DIR"
"$NODE" -e 'new (require("better-sqlite3"))("data/abo-tracker.db",{readonly:true}).backup(process.argv[1])' "$DEST_FILE"

echo "Backup geschrieben: $DEST_FILE"

# Nur die letzten $KEEP Sicherungen behalten. Der Dateiname sortiert dank
# JJJJ-MM-TT-Schema chronologisch; 'head -n -$KEEP' gibt alles bis auf die
# $KEEP neuesten aus — genau die werden dann gelöscht.
ls -1 "$DEST_DIR"/abo-tracker-*.db 2>/dev/null | sort | head -n "-$KEEP" | xargs -r rm -f
