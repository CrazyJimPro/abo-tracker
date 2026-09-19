#!/usr/bin/env bash
# Spielt eine Sicherung in eine bestehende Installation zurück — ohne
# install.sh noch einmal laufen zu lassen. Pendant zu
# installscript/windows/restore.ps1.
#
#   scripts/restore.sh               # neueste Sicherung (siehe scripts/find-backup.sh)
#   scripts/restore.sh <pfad>        # bestimmte .db-Datei oder Ordner mit abo-tracker.db
#   scripts/restore.sh -y [<pfad>]   # ohne Rückfrage
#
# Ablauf: Server stoppen, bisherige Datenbank nach
# <Schreibtisch>/abo-backup/vor-wiederherstellung-<Zeit>.db sichern,
# Sicherung einspielen, Migrationen anwenden (eine ältere Sicherung wird so
# auf den aktuellen Stand gebracht), Server wieder starten, falls er lief.
# Konten und Passwörter sind danach die aus der Sicherung.
#
# Port 3200 wie start-prod.sh — mit PORT=... überschreibbar.
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(dirname -- "$SCRIPT_DIR")

# shellcheck source=scripts/find-node.sh
. "$SCRIPT_DIR/find-node.sh"
# shellcheck source=scripts/find-backup.sh
. "$SCRIPT_DIR/find-backup.sh"

die() { printf 'Fehler: %s\n' "$1" >&2; exit 1; }

ASSUME_YES=false
FROM=""
while [ $# -gt 0 ]; do
  case "$1" in
    -y|--yes) ASSUME_YES=true; shift ;;
    -h|--help) awk '/^#!/ { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; exit 0 ;;
    -*) die "Unbekannte Option: $1" ;;
    *) FROM=$1; shift ;;
  esac
done

cd "$PROJECT_DIR"
PORT=${PORT:-3200}

NODE=$(find_node_bin 22.18.0) || die "Kein passendes Node (>= 22.18) gefunden. Bitte ./installscript/install.sh ausführen."
PATH="$(dirname "$NODE"):$PATH"

# Datenbankpfad wie in install.sh aus .env.local — im Subshell, damit die
# übrigen Variablen dort dieses Script nicht verändern.
DB_PATH=$(set -a; [ -f .env.local ] && . ./.env.local; printf '%s' "${DATABASE_PATH:-data/abo-tracker.db}")
case "$DB_PATH" in /*) ;; *) DB_PATH="$PROJECT_DIR/$DB_PATH" ;; esac

[ -n "$FROM" ] || FROM=$(newest_backup "$PROJECT_DIR")
[ -n "$FROM" ] || die "Keine Sicherung gefunden. Pfad angeben: scripts/restore.sh <pfad>"
[ -e "$FROM" ] || die "Sicherung nicht gefunden: $FROM"

SAFETY_COPY=$(safety_copy_path)
echo "Sicherung:  $FROM ($(date -r "$FROM" '+%d.%m.%Y %H:%M'))"
echo "Ersetzt:    $DB_PATH"
echo "Alle Abos und Konten werden durch den Stand der Sicherung ersetzt."
echo "Die bisherige Datenbank wird vorher nach $SAFETY_COPY gesichert."
if ! $ASSUME_YES; then
  [ -t 0 ] || die "Ohne Terminal nur mit -y."
  read -r -p "Fortfahren? [j/N] " answer
  case "$answer" in [JjYy]*) ;; *) echo "Abgebrochen."; exit 1 ;; esac
fi

WAS_RUNNING=false
# stop-prod.sh scheitert auch, wenn der Port einem fremden Prozess gehört —
# dann läuft unser Server gar nicht, und das Einspielen ist gefahrlos. Nur ein
# eigener Server, der sich nicht beenden lässt, ist ein Grund aufzuhören.
if ! STOP_OUTPUT=$(PORT="$PORT" "$SCRIPT_DIR/stop-prod.sh" 2>&1); then
  case "$STOP_OUTPUT" in *"reagiert nicht"*) die "$STOP_OUTPUT" ;; esac
fi
case "$STOP_OUTPUT" in "Server gestoppt"*) WAS_RUNNING=true; echo "$STOP_OUTPUT" ;; esac

FAILED=false
if "$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/restore-db.ts "$FROM" "$DB_PATH" "$SAFETY_COPY"; then
  # Ausgabe nur im Fehlerfall — drizzle-kit schreibt sonst Spinner-Steuerzeichen.
  if ! MIGRATE_LOG=$(npx --no-install drizzle-kit migrate --config drizzle.config.ts 2>&1); then
    printf '%s\n' "$MIGRATE_LOG" >&2
    echo "Migration fehlgeschlagen." >&2
    FAILED=true
  fi
else
  echo "Wiederherstellung fehlgeschlagen — die bisherige Datenbank ist unverändert." >&2
  FAILED=true
fi

# Auch nach einem Fehlschlag wieder starten — dann eben mit der unveränderten
# bisherigen Datenbank. Gestartet wird wie in install.sh, losgelöst von
# diesem Terminal.
if $WAS_RUNNING; then
  PORT="$PORT" setsid "$SCRIPT_DIR/start-prod.sh" </dev/null >/dev/null 2>&1 &
  echo "Server wird wieder gestartet (Port $PORT)."
fi

$FAILED && exit 1
echo "Wiederherstellung abgeschlossen."
