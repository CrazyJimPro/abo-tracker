# Gemeinsame Suche nach Sicherungen, per "." eingebunden von
# installscript/install.sh und scripts/restore.sh. Pendant zu FindNewestBackup
# in installscript/windows/setup.iss.

# xdg-user-dir kennt die lokalisierten Namen ("Schreibtisch", "Downloads");
# ein fest einprogrammierter Pfad liefe auf deutschen Systemen ins Leere.
# Ist ein Ordner nicht eingerichtet (Server ohne Desktop-Umgebung), liefert
# xdg-user-dir schlicht $HOME — dann gilt der übliche englische Name.
xdg_dir_or() {
  local dir
  dir=$(xdg-user-dir "$1" 2>/dev/null || true)
  if [ -z "$dir" ] || [ "$dir" = "$HOME" ]; then dir="$HOME/$2"; fi
  printf '%s' "$dir"
}
backup_desktop_dir() { xdg_dir_or DESKTOP Desktop; }
backup_download_dir() { xdg_dir_or DOWNLOAD Downloads; }

# Jüngste Sicherung nach Änderungszeit, oder leer. Gesucht wird dort, wo
# Sicherungen entstehen:
#   <Schreibtisch>/abo-backup/abo-tracker-*.db    scripts/backup-to-desktop.sh
#   <Downloads>/abo-tracker-*.db                   "Sicherung erstellen" in der App
#   <Projektordner>-data-backup-*/abo-tracker.db   installscript/uninstall.sh --keep-data
# Nach Zeit, nicht nach Name: der Browser hängt bei gleichem Namen " (1)" an.
# Aufruf: newest_backup "$PROJECT_DIR"
newest_backup() {
  # ls meldet für jedes Muster ohne Treffer einen Fehler — der ist hier der
  # Normalfall und darf unter "set -e -o pipefail" nicht das Script beenden.
  { ls -1t -- "$(backup_desktop_dir)"/abo-backup/abo-tracker-*.db \
      "$(backup_download_dir)"/abo-tracker-*.db \
      "$1"-data-backup-*/abo-tracker.db 2>/dev/null || true; } | head -n 1
}

# Ziel der Sicherheitskopie, bevor eine vorhandene Datenbank ersetzt wird.
# Bewusst nicht abo-tracker-*.db: backup-to-desktop.sh räumt diese Namen auf.
safety_copy_path() {
  printf '%s' "$(backup_desktop_dir)/abo-backup/vor-wiederherstellung-$(date +%Y-%m-%d-%H%M%S).db"
}
