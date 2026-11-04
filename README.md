# Abo-Tracker

Abo-Verwaltung für den eigenen Rechner: Abos anlegen, Kategorien vergeben und
sehen, was das alles pro Monat kostet. Alle Daten bleiben bei dir: Die App
läuft lokal mit einer SQLite-Datenbank, ohne Cloud-Dienst und ohne Konto bei
irgendeinem Anbieter.

Die **Startseite** (Klick auf den Schriftzug „Abo-Tracker“) zeigt, was alle
aktiven Abos pro Monat und aufs Jahr gerechnet kosten, und was gekündigte
und pausierte Abos im Monat und im Jahr einsparen.

Im Reiter **Historie** lässt sich der Preisverlauf jedes Abos (aktiv wie
gekündigt) einsehen, mit Vergleich „vor 12 Monaten vs. heute“, um
Preiserhöhungen auf einen Blick zu erkennen. Preisänderungen werden beim
Bearbeiten eines Abos automatisch erfasst, ältere Preise lassen sich von Hand
nachtragen.

Unter **Benachrichtigungen** (Glocke oben rechts) erinnert die App an anstehende Abrechnungen,
auslaufende Aktionspreise und Kündigungsfristen: Mit „Vertrag läuft bis“ und
„Kündigungsfrist“ (beides freiwillig) rechnet sie aus, bis wann spätestens
gekündigt werden muss. Wie viele Tage im Voraus erinnert wird, stellt jeder
unter **Einstellungen** selbst ein (3, 7, 14 oder 30 Tage). Pro Abo lässt sich
außerdem die Zahlungsart festhalten (PayPal, Kreditkarte, Lastschrift,
Überweisung/Rechnung, Sonstiges) und die Abo-Liste danach filtern.

Beim Ausfüllen hilft die App mit: Fehlt in einem Formular etwas oder stimmt
ein Wert nicht, wird das Feld rot umrandet und darunter steht, was fehlt.
Alles bereits Eingetragene bleibt dabei stehen. Nach dem Speichern bestätigt
eine kurze Meldung „Gespeichert“, und bevor ein Abo gelöscht wird, fragt die
App noch einmal nach. **Duplizieren** öffnet eine ausgefüllte Kopie, die erst mit „Kopie
speichern“ angelegt wird. Wer die Kopie ohne Speichern verlassen will, wird
gefragt, ob sie gespeichert werden soll.

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
