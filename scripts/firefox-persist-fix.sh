#!/usr/bin/env bash
#
# Firefox: "Design-Wahl wird nicht gespeichert" beheben.
#
#   scripts/firefox-persist-fix.sh <hostname>
#   scripts/firefox-persist-fix.sh abo.local
#
# Hintergrund: Firefox' Einstellung "Cookies und Website-Daten löschen, wenn
# Firefox beendet wird" löscht auch localStorage (z.B. die Theme-Wahl dieser
# App). Die normale Ausnahmeliste in den Firefox-Einstellungen setzt dafür
# eine "cookie"-Berechtigung, die der Sanitizer beim Beenden aber nicht mehr
# zu respektieren scheint (beobachtet mit Firefox 154). Die tatsächlich
# wirksame Berechtigung heißt intern "persist-data-on-shutdown" und hat in
# aktuellen Firefox-Versionen keinen bekannten UI-Weg mehr - sie taucht nur
# noch bei Seiten auf, die sie vor einem Firefox-Update schon hatten. Dieses
# Script trägt sie direkt in Firefox' eigene Berechtigungsdatenbank ein,
# exakt im selben Format.
#
# Firefox MUSS dafür komplett geschlossen sein (alle Fenster/Prozesse, nicht
# nur der Tab) - sonst überschreibt Firefox die Änderung beim nächsten
# eigenen Speichern wieder.
#
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(dirname -- "$SCRIPT_DIR")
cd "$PROJECT_DIR"

# shellcheck source=find-node.sh
. "$SCRIPT_DIR/find-node.sh"

HOSTNAME_ARG=${1:?"Verwendung: $0 <hostname>  (z.B. abo.local)"}

# Kein "-x firefox": der eigentliche Prozess heißt "firefox-bin", nicht
# "firefox" (Debian/Ubuntu-Paketierung) - ein exakter Namensvergleich würde
# ihn verfehlen, obwohl er laeuft, und permissions.sqlite waere gesperrt.
if pgrep firefox >/dev/null 2>&1; then
  echo "Firefox läuft noch - bitte zuerst komplett beenden (nicht nur das Fenster schließen), dann erneut versuchen." >&2
  exit 1
fi

NODE=$(find_node_bin 0.0.0) || { echo "Kein Node gefunden." >&2; exit 1; }

shopt -s nullglob
PROFILES=("$HOME"/.mozilla/firefox/*/permissions.sqlite)
shopt -u nullglob

if [ "${#PROFILES[@]}" -eq 0 ]; then
  echo "Kein Firefox-Profil gefunden (~/.mozilla/firefox/*/permissions.sqlite) - läuft Firefox unter einem anderen Pfad (z.B. Snap)?" >&2
  exit 1
fi

for DB in "${PROFILES[@]}"; do
  "$NODE" -e '
    const Database = require("better-sqlite3");
    const db = new Database(process.argv[1]);
    const now = Date.now();
    const insert = db.prepare(
      "INSERT INTO moz_perms (origin, type, permission, expireType, expireTime, modificationTime) VALUES (?, ?, 1, 0, 0, ?)"
    );
    const exists = db.prepare("SELECT 1 FROM moz_perms WHERE origin = ? AND type = ?");
    let added = 0;
    for (const scheme of ["http", "https"]) {
      const origin = scheme + "://" + process.argv[2];
      if (!exists.get(origin, "persist-data-on-shutdown")) {
        insert.run(origin, "persist-data-on-shutdown", now);
        added++;
      }
    }
    console.log("  " + (added ? "✓" : "·") + " " + process.argv[1] + ": " + added + " neue Berechtigung(en)");
    db.close();
  ' "$DB" "$HOSTNAME_ARG"
done

echo
echo "Fertig. Firefox jetzt (wieder) öffnen."
