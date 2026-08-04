#!/usr/bin/env bash
#
# Abo-Tracker — vollständige Deinstallation.
#
#   ./installscript/uninstall.sh
#
# Stoppt den Server, entfernt den Autostart-Eintrag und löscht danach den
# kompletten Projektordner samt Datenbank (Abos, Konten, Passwort-Hashes).
# Das lässt sich nicht rückgängig machen.
#
# Optionen:
#   --keep-data   data/ vorher nach <Projektordner>-data-backup-<Datum>
#                 kopieren, statt es mit zu löschen
#   -y, --yes     Keine Rückfragen — löscht auch die Daten ohne nachzufragen
#
set -euo pipefail

# Dieses Script liegt in installscript/, das Projekt ist eine Ebene darüber.
INSTALL_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(dirname -- "$INSTALL_DIR")
cd "$PROJECT_DIR"

# Zusätzlich zum Pfad-Check den Namen prüfen — das hier räumt mit 'rm -rf'
# den ganzen Ordner ab, ein falsches Zielverzeichnis darf nicht passieren.
[ -f package.json ] && grep -q '"name": *"abo-tracker"' package.json || {
  echo "Kein Abo-Tracker-Projekt in $PROJECT_DIR gefunden — liegt uninstall.sh noch im Ordner installscript/?" >&2
  exit 1
}

KEEP_DATA=false
ASSUME_YES=false

while [ $# -gt 0 ]; do
  case "$1" in
    --keep-data) KEEP_DATA=true; shift ;;
    -y|--yes) ASSUME_YES=true; shift ;;
    -h|--help) awk '/^#!/ { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"; exit 0 ;;
    *) echo "Unbekannte Option: $1  (--help für die Übersicht)" >&2; exit 1 ;;
  esac
done

# ---------------------------------------------------------------- Ausgabe ---

if [ -t 1 ]; then
  BOLD=$(printf '\033[1m'); DIM=$(printf '\033[2m'); RED=$(printf '\033[31m')
  GREEN=$(printf '\033[32m'); YELLOW=$(printf '\033[33m'); RESET=$(printf '\033[0m')
else
  BOLD=""; DIM=""; RED=""; GREEN=""; YELLOW=""; RESET=""
fi

TOTAL_STEPS=3
STEP=0
step()  { STEP=$((STEP + 1)); printf '\n%s[%d/%d] %s%s\n' "$BOLD" "$STEP" "$TOTAL_STEPS" "$1" "$RESET"; }
muted() { printf '      %s%s%s\n' "$DIM" "$1" "$RESET"; }
ok()    { printf '      %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
warn()  { printf '      %s!%s %s\n' "$YELLOW" "$RESET" "$1"; }
die()   { printf '\n%sFehler:%s %s\n' "$RED" "$RESET" "$1" >&2; exit 1; }

confirm() { # confirm "Frage?" -> 0 = ja
  $ASSUME_YES && return 0
  [ -t 0 ] || return 1
  local answer
  read -r -p "      $1 [J/n] " answer
  case "${answer:-j}" in [JjYy]*) return 0 ;; *) return 1 ;; esac
}

printf '\n%sAbo-Tracker — Deinstallation%s\n' "$BOLD" "$RESET"
muted "$PROJECT_DIR"

# --------------------------------------------------------------- Server ---

step "Server stoppen"
"$PROJECT_DIR/scripts/stop-prod.sh"

# ------------------------------------------------------------- Autostart ---

step "Autostart entfernen"
DESKTOP_FILE="$HOME/.config/autostart/abo-tracker.desktop"
if [ -f "$DESKTOP_FILE" ]; then
  rm -f "$DESKTOP_FILE"
  ok "Autostart-Eintrag entfernt"
else
  muted "Kein Autostart-Eintrag vorhanden"
fi

# --------------------------------------------------------- Daten + Ordner ---

step "Daten und Projektordner entfernen"

DATA_DIR="$PROJECT_DIR/data"
HAS_DATA=false
[ -d "$DATA_DIR" ] && [ -n "$(ls -A "$DATA_DIR" 2>/dev/null)" ] && HAS_DATA=true

if $KEEP_DATA && $HAS_DATA; then
  BACKUP_DIR="${PROJECT_DIR}-data-backup-$(date +%Y-%m-%d)"
  cp -a "$DATA_DIR" "$BACKUP_DIR"
  ok "data/ gesichert nach $BACKUP_DIR"
elif $HAS_DATA; then
  warn "data/ enthält Abos, Konten und Passwort-Hashes und wird mit entfernt."
fi

if ! confirm "Projektordner $PROJECT_DIR jetzt endgültig entfernen?"; then
  if $HAS_DATA && ! $KEEP_DATA; then
    die "Abgebrochen. Für ein Backup vorher: installscript/README.md#backup, oder das Script mit --keep-data neu starten."
  else
    die "Abgebrochen."
  fi
fi

cd "$HOME"
rm -rf "${PROJECT_DIR:?}"
ok "Entfernt."

printf '\n%s────────────────────────────────────────────────────────%s\n' "$DIM" "$RESET"
printf '%sFertig.%s Abo-Tracker ist deinstalliert.\n\n' "$BOLD$GREEN" "$RESET"
