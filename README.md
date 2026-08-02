# Abo-Tracker

Abo-Verwaltung für den eigenen Rechner: Abos anlegen, Kategorien vergeben und
sehen, was das alles pro Monat kostet. Next.js mit lokaler SQLite-Datenbank —
kein Cloud-Dienst, keine Accounts irgendwo draußen, alle Daten bleiben in
`data/abo-tracker.db`.

## Installation

Auf einem frischen Rechner genügt dieser eine Befehl im Terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/CrazyJimPro/abo-tracker/main/installscript/bootstrap.sh | bash
```

Liegt das Repository schon lokal:

```bash
./installscript/install.sh
```

Das Script erledigt alles: Node prüfen (und bei Bedarf über nvm nachinstallieren),
Pakete installieren, Datenbank anlegen, Standard-Kategorien einspielen,
Admin-Konto erstellen, App bauen, Server starten und den Browser öffnen. Das
temporäre Admin-Passwort steht am Ende der Ausgabe und wird beim ersten Login
geändert.

Ein zweiter Lauf aktualisiert die Installation, ohne vorhandene Abos, Konten
oder Passwörter anzufassen — also auch nach einem `git pull` das Richtige.

**Ausführliche Anleitung samt Backup und Restore:
[installscript/README.md](installscript/README.md)**

## Betrieb

```bash
scripts/start-prod.sh          # Server starten (Port 3200, Log in prod-server.log)
kill $(cat .server.pid)        # Server stoppen
```

## Entwicklung

```bash
npm run dev                    # Dev-Server mit Hot Reload
npm run build                  # Produktions-Build
npm run lint                   # ESLint
npm run db:migrate             # Migrationen aus drizzle/ anwenden
npm run db:seed                # Globale Standard-Kategorien nachziehen
npm run bootstrap-admin <mail> # Weiteres Admin-Konto anlegen
```

Schema-Änderungen gehen über `lib/db/schema.ts`; die Migration dazu erzeugt
`npx drizzle-kit generate`.

Die Datenbank liegt standardmäßig unter `data/abo-tracker.db` und lässt sich
über `DATABASE_PATH` in `.env.local` verschieben — relative Angaben zählen ab
dem Projektverzeichnis, nicht ab dem Arbeitsverzeichnis des Aufrufers.
Versioniert wird sie bewusst nicht (`/data` steht in `.gitignore`), weil dort
echte Daten und Passwort-Hashes liegen. Zum Sichern nicht einfach kopieren —
die Datenbank läuft im WAL-Modus, das Vorgehen steht in
[installscript/README.md](installscript/README.md#backup).
