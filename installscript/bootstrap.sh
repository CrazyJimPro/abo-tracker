#!/usr/bin/env bash
#
# Abo-Tracker — Einstieg für einen frischen Rechner.
#
#   curl -fsSL https://raw.githubusercontent.com/CrazyJimPro/abo-tracker/main/installscript/bootstrap.sh | bash
#
# Holt das Repository nach ~/abo-tracker und startet dort install.sh, das den
# Rest erledigt. Ist der Ordner schon da, wird er aktualisiert statt neu geklont.
#
# Argumente werden an install.sh durchgereicht:
#   curl -fsSL <url> | bash -s -- --email ich@example.com -y
#
# Umgebungsvariablen:
#   ABO_TRACKER_DIR    Zielverzeichnis (Standard: ~/abo-tracker)
#   ABO_TRACKER_REPO   Repository-URL, z.B. für einen eigenen Fork
#
set -euo pipefail

REPO=${ABO_TRACKER_REPO:-https://github.com/CrazyJimPro/abo-tracker.git}
TARGET=${ABO_TRACKER_DIR:-$HOME/abo-tracker}

command -v git >/dev/null 2>&1 || {
  echo "git wird gebraucht. Debian/Ubuntu: sudo apt install git" >&2
  exit 1
}

if [ -d "$TARGET/.git" ]; then
  echo "Vorhandene Installation in $TARGET wird aktualisiert …"
  git -C "$TARGET" pull --ff-only
elif [ -e "$TARGET" ]; then
  echo "$TARGET existiert bereits und ist kein Git-Repository." >&2
  echo "Anderen Ort wählen: ABO_TRACKER_DIR=/pfad/zum/ordner ..." >&2
  exit 1
else
  echo "Abo-Tracker wird nach $TARGET geklont …"
  git clone "$REPO" "$TARGET"
fi

# Beim Aufruf über 'curl | bash' hängt stdin an der Pipe, nicht am Terminal —
# ohne diese Umleitung könnte install.sh nichts abfragen und würde mangels
# Admin-Adresse abbrechen.
# Erst im Subshell öffnen: gibt es gar kein Terminal (Cron, CI), schlägt das
# hier folgenlos fehl, statt das Script unter 'set -e' zu beenden. install.sh
# kommt ohne Terminal zurecht, verlangt dann aber --email.
#
# Die Umleitung muss Teil desselben exec sein wie der Aufruf von install.sh,
# nicht ein vorangehendes eigenes 'exec < /dev/tty': dieses Script wird selbst
# per Pipe an bash gestreamt, und bash liest seine eigenen restlichen Zeilen
# ebenfalls aus stdin nach. Ein separates 'exec < /dev/tty' zieht stdin schon
# um, bevor die letzte Zeile (der Aufruf von install.sh) gelesen ist — bash
# sucht sie danach auf dem jetzt leeren Terminal-fd, findet dort sofort EOF
# und beendet sich kommentarlos mit Exit-Code 0, ohne install.sh je zu
# starten. Mit echtem Terminal reproduzierbar, ohne (z.B. in dieser Sandbox)
# nicht, weil die Umleitung dann komplett übersprungen wird.
if [ ! -t 0 ] && (exec 3< /dev/tty) 2>/dev/null; then
  exec "$TARGET/installscript/install.sh" "$@" < /dev/tty
else
  exec "$TARGET/installscript/install.sh" "$@"
fi
