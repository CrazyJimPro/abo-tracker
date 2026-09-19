# Abo-Tracker unter Windows

Anleitung für Windows 10 und 11. Was auf Windows und Linux gleich ist (was
eine Sicherung ist, was beim Zurückspielen passiert, woran man ein Update
erkennt), steht in der [allgemeinen Anleitung](../README.md).

- [Erstinstallation](#erstinstallation)
- [Im Alltag](#im-alltag)
- [Sicherung erstellen](#sicherung-erstellen)
- [Sicherung zurückspielen](#sicherung-zurückspielen)
- [Update](#update)
- [Deinstallation](#deinstallation)
- [Wenn etwas nicht klappt](#wenn-etwas-nicht-klappt)
- [Technische Details](#technische-details)

---

## Erstinstallation

**Du brauchst:** Windows 10 oder 11 (64 Bit) und eine Internetverbindung.
Administratorrechte sind nicht nötig. Node.js oder andere Programme musst du
nicht vorher installieren, der Installer bringt alles mit.

1. **Installer herunterladen:**
   <https://github.com/CrazyJimPro/abo-tracker/releases/latest/download/AboTrackerSetup.exe>

2. **`AboTrackerSetup.exe` starten** (Doppelklick).
   Zeigt Windows „Der Computer wurde durch Windows geschützt“, auf
   **Weitere Informationen** und dann **Trotzdem ausführen** klicken. Die
   Warnung kommt, weil der Installer nicht kostenpflichtig signiert ist.

3. **Zielordner:** Den Vorschlag (`%LOCALAPPDATA%\Abo-Tracker`) übernehmen und
   auf **Weiter** klicken.

4. **Daten übernehmen:**
   - **Neuer Start ohne alte Daten:** „Nein, ohne Sicherung weiter“ lassen.
   - **Du hast eine Sicherung** (z. B. von einem anderen Rechner):
     „Ja, Daten aus einer Sicherung übernehmen“ wählen. Auf der nächsten
     Seite über **Durchsuchen …** die Sicherungsdatei auswählen (`.db`). Liegt
     schon eine im Download-Ordner oder in `abo-backup` auf dem Desktop, ist
     die neueste bereits eingetragen.

5. **Admin-Zugang:** Deine E-Mail-Adresse eingeben. Damit meldest du dich
   später an. Diese Seite erscheint nicht, wenn du eine Sicherung übernimmst,
   denn dann kommen die Konten aus der Sicherung.

6. **Installieren** klicken. Ein schwarzes Fenster zeigt den Fortschritt. Das
   dauert meist **2–5 Minuten**. Das Fenster bitte nicht schließen.

7. **Am Ende** erscheint ein Fenster mit deinem **vorläufigen Passwort**. Es
   ist schon in der Zwischenablage, du kannst es also direkt mit **Strg+V**
   einfügen. Es wird nirgends noch einmal angezeigt.
   Hast du eine Sicherung übernommen, meldet das Fenster stattdessen, wie
   viele Konten und Abos eingespielt wurden. Dann gilt dein altes Passwort.

8. Der Browser öffnet sich mit <http://localhost:3200>. Anmelden und dem
   neuen Passwort folgen, siehe
   [Nach der ersten Installation](../README.md#nach-der-ersten-installation).

Beim ersten Start fragt eventuell die **Windows-Firewall** nach. Mit
„Zulassen“ ist die App auch vom Handy im Heimnetz erreichbar. Brauchst du das
nicht, kannst du ablehnen, am Rechner selbst funktioniert sie trotzdem.

---

## Im Alltag

Der Server startet **automatisch, sobald du dich bei Windows anmeldest**. Du
musst nichts weiter tun, einfach den Browser öffnen.

Im **Startmenü** unter *Abo-Tracker* findest du:

| Eintrag | Wozu |
| --- | --- |
| **Abo-Tracker öffnen** | öffnet die App im Browser (und startet den Server, falls er nicht läuft) |
| **Abo-Tracker starten** / **stoppen** | Server von Hand starten bzw. anhalten |
| **Abo-Tracker sichern** | legt eine Sicherung auf dem Desktop ab, siehe unten |
| **Abo-Tracker wiederherstellen** | spielt eine Sicherung zurück, die du in einem Fenster auswählst, siehe unten |
| **Deinstallieren** | entfernt den Abo-Tracker |

---

## Sicherung erstellen

**Empfohlen:** in der App unter **Einstellungen → Sicherung erstellen**. Die
Datei landet in deinem Download-Ordner. Näheres dazu in der
[allgemeinen Anleitung](../README.md#backup).

**Alternativ über das Startmenü:** *Abo-Tracker sichern*. Das legt die
Sicherung im Ordner **`abo-backup`** auf deinem Desktop ab
(`abo-tracker-<Datum>.db`) und zeigt am Ende ein Fenster mit dem Ergebnis.
Es bleiben die **letzten 10** Sicherungen liegen, ältere werden automatisch
gelöscht. Nutzt du OneDrive, landet der Ordner auf dem Desktop, den du
tatsächlich siehst.

Beides funktioniert, während der Abo-Tracker läuft.

---

## Sicherung zurückspielen

### Bei der Installation

Auf der Installer-Seite **Daten übernehmen** „Ja“ wählen und die
Sicherungsdatei auswählen, siehe [Erstinstallation](#erstinstallation),
Schritt 4. Das geht auch über eine bestehende Installation: Die bisherige
Datenbank wird dann vorher auf dem Desktop gesichert, der Installer fragt
dafür noch einmal nach.

### In einer bestehenden Installation

1. Startmenü → **Abo-Tracker wiederherstellen**.
2. Es öffnet sich das gewohnte Windows-Fenster **„Datei öffnen“**. Navigiere
   zu deiner Sicherung, egal wo sie liegt (USB-Stick, Dokumente, Netzlaufwerk
   …), wähle sie aus und klicke **Öffnen**. Liegt schon eine im
   Download-Ordner oder in `abo-backup` auf dem Desktop, ist die neueste davon
   bereits ausgewählt.
3. Ein Fenster zeigt Datei, Ordner und Datum der Sicherung und fragt, ob sie
   eingespielt werden soll. **Ja** klicken.
4. Nach ein paar Sekunden meldet ein Fenster, wie viele Konten und Abos
   eingespielt wurden. Der Server wurde dabei kurz angehalten und läuft
   wieder. Das schwarze Fenster im Hintergrund kannst du danach schließen.

**Abbrechen** bzw. **Nein** ändert nichts. Ist die Datei keine gültige
Sicherung, sagt ein Fenster, warum, und deine Daten bleiben unverändert.

Für Fortgeschrittene geht es auch ohne Fenster, direkt in PowerShell:

```powershell
cd $env:LOCALAPPDATA\Abo-Tracker
installscript\windows\restore.ps1 -From "D:\Sicherungen\abo-tracker-2026-09-19.db"
```

Was dabei passiert und was du danach beachten solltest (z. B. dass die
Passwörter vom Zeitpunkt der Sicherung zurückkommen), steht in der
[allgemeinen Anleitung](../README.md#restore).

---

## Update

Zeigt die App **„Update verfügbar“** an:

1. **Sicherung erstellen**: in der App *Einstellungen → Sicherung erstellen*.
2. **Neuen Installer herunterladen:** auf den Hinweis „Update verfügbar“
   klicken, auf der GitHub-Seite unten bei *Assets* auf
   **AboTrackerSetup.exe** klicken. Oder direkt:
   <https://github.com/CrazyJimPro/abo-tracker/releases/latest/download/AboTrackerSetup.exe>
3. **`AboTrackerSetup.exe` starten** und durchklicken:
   - Zielordner: unverändert lassen.
   - Daten übernehmen: **„Nein, ohne Sicherung weiter“**. Deine vorhandenen
     Daten bleiben erhalten.
   - Die Frage nach der E-Mail entfällt beim Update.
4. Das schwarze Fenster läuft wieder ein paar Minuten durch. Der Server wird
   dabei automatisch angehalten und neu gestartet.
5. Browser neu laden. Die neue Versionsnummer steht oben neben dem Schriftzug,
   der Update-Hinweis ist weg.

Bitte immer die **neue** `AboTrackerSetup.exe` herunterladen. Eine ältere
bringt die App zwar auch auf den neuesten Stand, neue Einträge im Startmenü
und die richtige Versionsnummer unter *Apps* kommen aber nur mit dem neuen
Installer.

---

## Deinstallation

**Einstellungen → Apps → Installierte Apps → Abo-Tracker → Deinstallieren**
(oder Startmenü → *Abo-Tracker* → *Deinstallieren*).

Der Deinstaller hält den Server an, entfernt den Autostart und löscht den
kompletten Programmordner, **einschließlich deiner Daten**. Vorher fragt er,
ob eine Kopie der Datenbank auf dem Desktop abgelegt werden soll (Ordner
`abo-tracker-backup-<Datum>`). Sag **Ja**, wenn du die Daten noch brauchst.
Die Datei `abo-tracker.db` in diesem Ordner kannst du später beim
Installieren als Sicherung auswählen.

---

## Wenn etwas nicht klappt

| Problem | Lösung |
| --- | --- |
| Die App lädt nicht im Browser | Startmenü → *Abo-Tracker öffnen*, das startet den Server bei Bedarf. |
| Installation bricht ab | Im Programmordner `%LOCALAPPDATA%\Abo-Tracker` liegt `install.log` mit der kompletten Ausgabe, auch wenn das Fenster schon zu ist. Die Datei hilft bei der Fehlersuche. |
| Server startet nicht | `prod-server.err.log` im Programmordner nennt den Grund. |
| Passwort vergessen | Eine andere Person mit Admin-Rechten setzt es im Bereich *Admin* zurück. Das vorläufige Passwort steht absichtlich nirgends gespeichert, auch nicht in `install.log`. |
| Nach einem Windows-Update startet der Server nicht mehr automatisch | Den Installer erneut ausführen (wie beim [Update](#update)), das richtet den Autostart neu ein. |
| „Port 3200 ist belegt“ | Ein anderes Programm nutzt denselben Port. `installscript\windows\start-prod.ps1 -Port 3300` startet auf einem anderen. |
| App nur auf diesem Rechner nutzen, keine Firewall-Abfrage | `installscript\windows\start-prod.ps1 -BindHost 127.0.0.1` |

---

## Technische Details

Für alle, die wissen wollen, was unter der Haube passiert.

### Was der Installer macht

Die `.exe` enthält nur ein paar PowerShell-Skripte. Den eigentlichen
Programmcode lädt sie bei jeder Installation frisch von GitHub.

| Schritt | Inhalt |
| --- | --- |
| 1 | aktuellen Programmcode von GitHub laden (`bootstrap.ps1`) |
| 2 | Node.js suchen (ab 22.18), sonst portabel nach `node-runtime\` laden, ohne Eingriff ins System |
| 3 | Abhängigkeiten installieren (`npm ci --ignore-scripts`) |
| 4 | `.env.local` anlegen, falls sie fehlt |
| 5 | ggf. Sicherung einspielen, dann Datenbank anlegen bzw. aktualisieren |
| 6 | Admin-Konto anlegen, falls noch keins existiert |
| 7 | App bauen, Server starten (Port 3200) |
| 8 | Autostart über die Aufgabenplanung einrichten (Aufgabe „AboTracker“, bei Anmeldung) |

Alle Schritte laufen über `install.ps1` und sind wiederholbar: Ein zweiter
Lauf aktualisiert, ohne Daten anzufassen. Die Skripte liegen nach der
Installation unter `installscript\windows\` im Programmordner:

| Skript | Zweck |
| --- | --- |
| `install.ps1` | Installation / Update (Optionen: `-Email`, `-RestoreFrom <pfad>`, `-Port`, `-NoStart`, `-NoOpen`, `-NoAutostart`) |
| `open-app.ps1`, `start-prod.ps1`, `stop-prod.ps1` | Server und Browser |
| `backup.ps1` | Sicherung nach `Desktop\abo-backup` (`-ShowResult` zeigt ein Ergebnisfenster) |
| `restore.ps1` | Sicherung zurückspielen. Ohne Angabe per Fenster „Datei öffnen“, mit `-From <pfad>` direkt; `-Force` fragt nicht nach und nimmt ohne `-From` die neueste gefundene Sicherung. |
| `uninstall.ps1` | Hilfsskript des Deinstallers. Nicht zum Deinstallieren direkt aufrufen, es löscht den Ordner nicht. `-KeepData` kopiert `data\` auf den Desktop. |

### Keine Build-Werkzeuge nötig

`better-sqlite3`, die Datenbank-Bibliothek, bringt fertig kompilierte Dateien
für Windows (x64 und ARM64) mit. Python oder Visual Studio Build Tools
braucht es deshalb nicht. Frühere Versionen des Installers haben beides
installiert. Das war unnötig, sie liegen auf älteren Installationen eventuell
noch herum und werden beim Deinstallieren nicht entfernt. Wer sie nicht
anderweitig braucht:

```powershell
winget uninstall --id Microsoft.VisualStudio.2022.BuildTools
winget uninstall --id Python.Python.3.12
```

Die Installation läuft mit `npm ci --ignore-scripts`: Keine Abhängigkeit
braucht ihr Installationsskript, jede bezieht ihre fertigen Dateien aus einem
Plattform-Paket. Das zusätzliche `allowScripts`-Feld in `package.json`
versteht erst npm 12. Ältere npm-Versionen (npm 10 bei Node 22) würden für
`better-sqlite3` sonst einen unnötigen Compiler-Lauf starten, der ohne Build
Tools scheitert.

### Installer selbst bauen

Normalerweise nicht nötig: Bei jedem Versions-Tag (`v*`) baut der Workflow
[`build-windows-installer.yml`](../../.github/workflows/build-windows-installer.yml)
die `.exe` und hängt sie an das GitHub-Release. Über *Actions → Windows-
Installer bauen → Run workflow* lässt sie sich auch ohne Release bauen (zum
Testen). Von Hand, mit [Inno Setup](https://jrsoftware.org/isinfo.php):

```powershell
iscc installscript\windows\setup.iss
```

Ergebnis: `installscript\windows\dist\AboTrackerSetup.exe`.
