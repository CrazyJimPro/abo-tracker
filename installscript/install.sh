#!/usr/bin/env bash
#
# Abo-Tracker — Komplett-Installation mit einem Befehl.
#
#   ./installscript/install.sh
#
# Prüft Node, installiert die Abhängigkeiten, legt die lokale SQLite-Datenbank
# an, seedet die Standard-Kategorien, erstellt den Admin-Account, baut die App,
# startet den Server im Hintergrund und öffnet den Browser.
#
# Das Script ist idempotent: ein zweiter Lauf aktualisiert die Installation,
# ohne vorhandene Daten (Datenbank, Accounts, Passwörter) anzufassen.
#
# Optionen:
#   --email <adresse>   E-Mail des Admin-Accounts (nur beim ersten Lauf relevant)
#   --port <nummer>     Port des Servers (Standard: 3200)
#   --autostart         Autostart-Eintrag anlegen (Server startet nach Reboot)
#   --no-autostart      Autostart nicht anlegen, nicht nachfragen
#   --no-open           Browser am Ende nicht öffnen
#   --no-start          Nur installieren, Server nicht starten
#   -y, --yes           Keine Rückfragen, überall die Vorgabe verwenden
#
set -euo pipefail

# Dieses Script liegt in installscript/, das Projekt ist eine Ebene darüber.
INSTALL_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(dirname -- "$INSTALL_DIR")
SCRIPT_DIR="$PROJECT_DIR/scripts"
cd "$PROJECT_DIR"

[ -f "$PROJECT_DIR/package.json" ] || {
  echo "Kein Projekt gefunden in $PROJECT_DIR — liegt install.sh noch im Ordner installscript/?" >&2
  exit 1
}

# shellcheck source=scripts/find-node.sh
. "$SCRIPT_DIR/find-node.sh"

# Native TypeScript-Ausführung (scripts/*.ts laufen ohne tsx) ist ab 22.18
# standardmäßig aktiv; Next.js 16 verlangt ohnehin >= 20.
readonly MIN_NODE=22.18.0
readonly INSTALL_NODE=24
readonly PID_FILE="$PROJECT_DIR/.server.pid"

ADMIN_EMAIL=""
PORT=${PORT:-3200}
ASSUME_YES=false
OPEN_BROWSER=true
START_SERVER=true
AUTOSTART=ask

while [ $# -gt 0 ]; do
  case "$1" in
    --email) ADMIN_EMAIL=${2:?--email braucht eine Adresse}; shift 2 ;;
    --port) PORT=${2:?--port braucht eine Nummer}; shift 2 ;;
    --autostart) AUTOSTART=yes; shift ;;
    --no-autostart) AUTOSTART=no; shift ;;
    --no-open) OPEN_BROWSER=false; shift ;;
    --no-start) START_SERVER=false; OPEN_BROWSER=false; shift ;;
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

STEP=0
step()  { STEP=$((STEP + 1)); printf '\n%s[%d/%d] %s%s\n' "$BOLD" "$STEP" "$TOTAL_STEPS" "$1" "$RESET"; }
info()  { printf '      %s\n' "$1"; }
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

TOTAL_STEPS=7
$START_SERVER && TOTAL_STEPS=8

printf '\n%sAbo-Tracker — Installation%s\n' "$BOLD" "$RESET"
muted "$PROJECT_DIR"

# ------------------------------------------------------------------- Node ---

step "Node.js prüfen"

if ! NODE=$(find_node_bin "$MIN_NODE"); then
  warn "Kein Node >= $MIN_NODE gefunden."
  if confirm "Node $INSTALL_NODE über nvm installieren (lädt aus dem Internet)?"; then
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    if [ ! -s "$NVM_DIR/nvm.sh" ]; then
      command -v curl >/dev/null 2>&1 || die "curl wird gebraucht, um nvm zu installieren."
      info "nvm wird installiert …"
      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    fi
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    info "Node $INSTALL_NODE wird installiert …"
    nvm install "$INSTALL_NODE"
    NODE=$(find_node_bin "$MIN_NODE") || die "Node-Installation hat nicht geklappt."
  else
    die "Bitte Node >= $MIN_NODE installieren (z.B. https://nodejs.org) und das Script erneut starten."
  fi
fi

# npm liegt im selben bin-Verzeichnis wie das gewählte node — ohne diesen
# PATH-Eintrag würde ein älteres System-npm mit dem falschen Node bauen.
PATH="$(dirname "$NODE"):$PATH"
export PATH
command -v npm >/dev/null 2>&1 || die "npm nicht gefunden neben $NODE."

# Die Wartungs-Scripts sind TypeScript und laufen über Nodes Type-Stripping.
# Ohne den Schalter warnt Node bei jedem Aufruf über das fehlende "type" im
# package.json — das ist hier korrekt so und nur Rauschen in der Ausgabe.
NODE_TS_FLAGS="--disable-warning=MODULE_TYPELESS_PACKAGE_JSON"

ok "Node $("$NODE" -v) · npm $(npm -v)  ($NODE)"

# ---------------------------------------------------------- Abhängigkeiten ---

step "Abhängigkeiten installieren"
muted "better-sqlite3 wird dabei ggf. kompiliert, das kann etwas dauern."

# NODE_ENV=production würde npm die devDependencies überspringen lassen —
# drizzle-kit und die Typen werden aber für Migration und Build gebraucht.
unset NODE_ENV || true

if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund || {
    warn "npm ci fehlgeschlagen, versuche npm install …"
    npm install --no-audit --no-fund
  }
else
  npm install --no-audit --no-fund
fi

# better-sqlite3 ist nativ und wird beim Installieren kompiliert. Schlägt das
# fehl (fehlender Compiler, oder npm hat die Install-Scripts blockiert), merkt
# man das sonst erst beim ersten Seitenaufruf.
"$NODE" -e 'new (require("better-sqlite3"))(":memory:").close()' 2>/dev/null || {
  warn "better-sqlite3 lässt sich nicht laden."
  info "Debian/Ubuntu: sudo apt install build-essential python3"
  info "Bei neuerem npm ggf. zusätzlich: npm approve-scripts better-sqlite3"
  die "Abhängigkeiten sind unvollständig."
}
ok "Pakete installiert"

# --------------------------------------------------------------- Konfig ---

step "Konfiguration"

if [ -f .env.local ]; then
  ok ".env.local vorhanden"
else
  cp .env.example .env.local
  ok ".env.local aus .env.example erzeugt"
fi

set -a
# shellcheck disable=SC1091
. ./.env.local
set +a
DB_PATH=${DATABASE_PATH:-data/abo-tracker.db}
# Relative Angaben zählen ab dem Projektverzeichnis, nicht ab dem
# Arbeitsverzeichnis — genau wie in lib/db/path.ts und drizzle.config.ts.
case "$DB_PATH" in /*) ;; *) DB_PATH="$PROJECT_DIR/$DB_PATH" ;; esac
muted "Datenbank: $DB_PATH"

# ------------------------------------------------------------- Datenbank ---

step "Datenbank anlegen / aktualisieren"

mkdir -p "$(dirname "$DB_PATH")"

# Ausgabe nur im Fehlerfall zeigen — drizzle-kit schreibt sonst Spinner-
# Steuerzeichen mitten in die Schritt-Ausgabe.
if ! MIGRATE_LOG=$(npx --no-install drizzle-kit migrate 2>&1); then
  printf '%s\n' "$MIGRATE_LOG" >&2
  die "Migration fehlgeschlagen."
fi
ok "Migrationen angewendet"

"$NODE" $NODE_TS_FLAGS scripts/seed-categories.ts | sed 's/^/      /'

# ----------------------------------------------------------- Admin-Konto ---

step "Admin-Konto"

EXISTING_ADMIN=$("$NODE" -e '
  const Database = require("better-sqlite3");
  const db = new Database(process.argv[1], { readonly: true });
  const row = db.prepare("select email from users where role = ? order by created_at limit 1").get("admin");
  process.stdout.write(row ? row.email : "");
' "$DB_PATH")

if [ -n "$EXISTING_ADMIN" ]; then
  ok "Admin existiert bereits: $EXISTING_ADMIN"
  muted "Passwort vergessen? Zurücksetzen geht im Bereich /admin oder über eine zweite Admin-Person."
  ADMIN_PASSWORD=""
else
  if [ -z "$ADMIN_EMAIL" ] && ! $ASSUME_YES && [ -t 0 ]; then
    read -r -p "      E-Mail für den Admin-Zugang: " ADMIN_EMAIL
  fi
  [ -n "$ADMIN_EMAIL" ] || die "Keine Admin-E-Mail angegeben. Bitte mit --email <adresse> starten."

  BOOTSTRAP_OUTPUT=$("$NODE" $NODE_TS_FLAGS scripts/bootstrap-admin.ts "$ADMIN_EMAIL")
  # Das Passwort wird nur hier ein einziges Mal ausgegeben — es liegt danach
  # ausschließlich als scrypt-Hash in der Datenbank.
  ADMIN_PASSWORD=$(printf '%s\n' "$BOOTSTRAP_OUTPUT" | sed -n 's/^Temporäres Passwort: //p')
  ok "Admin angelegt: $ADMIN_EMAIL"
fi

# ------------------------------------------------------------------ Build ---

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

step "App bauen"

# Vor dem Build stoppen, nicht erst danach: next build schreibt .next/ neu,
# unter einem laufenden Server weg — der lädt seine Chunks erst bei Bedarf und
# läuft währenddessen in Fehler.
OLD_PID=$(port_pid "$PORT")
if [ -n "$OLD_PID" ]; then
  # Nur einen Server aus genau diesem Verzeichnis abschießen — auf Port 3100
  # läuft z.B. die Monatsausgaben-App, die hier nichts verloren hat.
  OLD_CWD=$(readlink -f "/proc/$OLD_PID/cwd" 2>/dev/null || true)
  if [ "$OLD_CWD" != "$PROJECT_DIR" ]; then
    die "Port $PORT ist von einem fremden Prozess (PID $OLD_PID) belegt. Mit --port <nummer> einen anderen Port wählen."
  elif $START_SERVER; then
    info "Laufender Abo-Tracker-Server (PID $OLD_PID) wird für den Build beendet …"
    kill "$OLD_PID" 2>/dev/null || true
    for _ in $(seq 20); do
      [ -n "$(port_pid "$PORT")" ] || break
      sleep 0.25
    done
  else
    warn "Auf Port $PORT läuft ein Server (PID $OLD_PID); der Build zieht ihm .next/ unter den Füßen weg."
    info "Nach dem Build neu starten: scripts/start-prod.sh"
  fi
fi

npm run build
ok "Build fertig"

# ------------------------------------------------------------------ Start ---

if $START_SERVER; then
  step "Server starten"

  PORT="$PORT" setsid "$SCRIPT_DIR/start-prod.sh" </dev/null >/dev/null 2>&1 &
  URL="http://localhost:$PORT"

  READY=false
  for _ in $(seq 60); do
    if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
      exec 3<&- 3>&-
      READY=true
      break
    fi
    sleep 0.5
  done

  if $READY; then
    # .server.pid schreibt start-prod.sh selbst, damit die Datei auch bei einem
    # Start von Hand oder per Autostart stimmt.
    SERVER_PID=$(cat "$PID_FILE" 2>/dev/null || port_pid "$PORT")
    ok "Server läuft auf $URL  (PID ${SERVER_PID:-?})"
  else
    die "Server ist nicht hochgekommen. Details stehen in prod-server.log"
  fi
fi

# -------------------------------------------------------------- Autostart ---

step "Autostart"

DESKTOP_FILE="$HOME/.config/autostart/abo-tracker.desktop"
if [ "$AUTOSTART" = ask ]; then
  if [ -f "$DESKTOP_FILE" ]; then
    AUTOSTART=yes
  elif confirm "Server nach jedem Neustart automatisch starten?"; then
    AUTOSTART=yes
  else
    AUTOSTART=no
  fi
fi

if [ "$AUTOSTART" = yes ]; then
  mkdir -p "$(dirname "$DESKTOP_FILE")"
  cat > "$DESKTOP_FILE" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Abo-Tracker
GenericName=Subscription tracker
Comment=Starts the Abo-Tracker app server in the background.
Comment[de_DE]=Startet den Abo-Tracker-App-Server im Hintergrund.
Name[de_DE]=Abo-Tracker
Exec=env PORT=$PORT $SCRIPT_DIR/start-prod.sh
Icon=utilities-terminal
Terminal=false
StartupNotify=false
Categories=Office;Finance;
X-GNOME-Autostart-enabled=true
X-GNOME-Autostart-Delay=15
NoDisplay=false
Hidden=false
DESKTOP
  ok "Autostart eingerichtet ($DESKTOP_FILE)"
else
  muted "Kein Autostart. Manuell starten mit: scripts/start-prod.sh"
fi

# ------------------------------------------------------------ Abschluss ---

printf '\n%s────────────────────────────────────────────────────────%s\n' "$DIM" "$RESET"
printf '%sFertig.%s\n\n' "$BOLD$GREEN" "$RESET"

if $START_SERVER; then
  printf '  App:      %s%s%s\n' "$BOLD" "$URL" "$RESET"
fi
if [ -n "${ADMIN_PASSWORD:-}" ]; then
  printf '  Login:    %s\n' "$ADMIN_EMAIL"
  printf '  Passwort: %s%s%s\n' "$BOLD" "$ADMIN_PASSWORD" "$RESET"
  printf '            %sWird beim ersten Login abgefragt und muss dann geändert werden.%s\n' "$DIM" "$RESET"
  printf '            %sDieses Passwort wird nirgends noch einmal angezeigt.%s\n' "$DIM" "$RESET"
elif [ -n "$EXISTING_ADMIN" ]; then
  printf '  Login:    %s (bestehendes Passwort)\n' "$EXISTING_ADMIN"
fi
printf '\n  Stoppen:  kill $(cat .server.pid)\n'
printf '  Log:      prod-server.log\n\n'

# Nur ein Hinweis, kein automatischer sudo-Aufruf (gleiches Prinzip wie beim
# apt-install-Hinweis oben) - und nur zeigen, wenn noch nicht eingerichtet.
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
LAN_HOSTNAME=abo.local
if [ -n "$LAN_IP" ] && ! getent hosts "$LAN_HOSTNAME" >/dev/null 2>&1; then
  printf '  %sZugriff von anderen Geräten im selben Netzwerk (optional):%s\n' "$DIM" "$RESET"
  printf '      %sFirefox löscht bei einer reinen IP-Adresse mitunter lokal\n' "$DIM"
  printf '      gespeicherte Einstellungen (z.B. die Design-Wahl) beim Beenden.\n'
  printf '      Ein fester Hostname umgeht das:%s\n' "$RESET"
  printf "      echo -e '%s\\\\t%s' | sudo tee -a /etc/hosts\n" "$LAN_IP" "$LAN_HOSTNAME"
  printf '      %sFalls "Cookies und Website-Daten beim Beenden löschen" in Firefox\n' "$DIM"
  printf '      aktiv ist, zusätzlich (Firefox davor komplett beenden):%s\n' "$RESET"
  printf '      scripts/firefox-persist-fix.sh %s\n\n' "$LAN_HOSTNAME"
fi

if $OPEN_BROWSER && [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ] && command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 &
fi
