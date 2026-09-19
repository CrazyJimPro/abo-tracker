# Abo-Tracker

Abo-Verwaltung für den eigenen Rechner: Abos anlegen, Kategorien vergeben und
sehen, was das alles pro Monat kostet. Alle Daten bleiben bei dir: Die App
läuft lokal mit einer SQLite-Datenbank, ohne Cloud-Dienst und ohne Konto bei
irgendeinem Anbieter.

Im Reiter **Historie** lässt sich der Preisverlauf jedes Abos (aktiv wie
gekündigt) einsehen, mit Vergleich „vor 12 Monaten vs. heute“, um
Preiserhöhungen auf einen Blick zu erkennen. Preisänderungen werden beim
Bearbeiten eines Abos automatisch erfasst, ältere Preise lassen sich von Hand
nachtragen.

## Installation, Sicherung und Update

| | |
| --- | --- |
| **Windows** | [`AboTrackerSetup.exe` herunterladen](https://github.com/CrazyJimPro/abo-tracker/releases/latest/download/AboTrackerSetup.exe) und starten. Schritt für Schritt: [Anleitung für Windows](installscript/windows/README.md) |
| **Linux** | Im Terminal: `curl -fsSL https://raw.githubusercontent.com/CrazyJimPro/abo-tracker/main/installscript/bootstrap.sh \| bash`. Schritt für Schritt: [Anleitung für Linux](installscript/LINUX.md) |

Was auf beiden Systemen gleich ist, also Sicherung erstellen, Sicherung
zurückspielen, Update und Umzug auf einen anderen Rechner, steht in der
**[allgemeinen Anleitung](installscript/README.md)**.

Kurz gesagt:

- **Sicherung:** in der App unter *Einstellungen → Sicherung erstellen*.
- **Zurückspielen:** Die Installation fragt, ob Daten aus einer Sicherung
  übernommen werden sollen.
- **Update:** Zeigt die App „Update verfügbar“, unter Windows die neue
  `AboTrackerSetup.exe` ausführen, unter Linux den Installationsbefehl
  wiederholen. Die Daten bleiben dabei erhalten.

## Entwicklung

```bash
npm run dev                    # Dev-Server mit Hot Reload
npm run build                  # Produktions-Build
npm run lint                   # ESLint
npm test                       # Tests (node:test, lib/**/*.test.ts)
npm run db:migrate             # Migrationen aus drizzle/ anwenden
npm run db:seed                # Globale Standard-Kategorien nachziehen
npm run bootstrap-admin <mail> # Weiteres Admin-Konto anlegen
```

Schema-Änderungen gehen über `lib/db/schema.ts`, die Migration dazu erzeugt
`npx drizzle-kit generate`.

Die Datenbank liegt standardmäßig unter `data/abo-tracker.db` und lässt sich
über `DATABASE_PATH` in `.env.local` verschieben. Relative Angaben zählen ab
dem Projektverzeichnis, nicht ab dem Arbeitsverzeichnis des Aufrufers.
Versioniert wird sie bewusst nicht (`/data` steht in `.gitignore`), weil dort
echte Daten und Passwort-Hashes liegen.

**Release:** Version in `package.json` (per `npm version <x>
--no-git-tag-version`, zieht `package-lock.json` mit) und in
`installscript/windows/setup.iss` (`MyAppVersion`) setzen, committen, Tag
`v<x>` pushen. Der Workflow baut daraus die `AboTrackerSetup.exe` und hängt
sie an das Release. Er bricht ab, wenn Tag und `package.json` nicht
übereinstimmen.
