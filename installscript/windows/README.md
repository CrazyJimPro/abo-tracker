# Abo-Tracker unter Windows

Windows-Pendant zu den Bash-Scripts in [`../`](../README.md). Statt Terminal
und Bash gibt es hier PowerShell-Scripts, verpackt in einen Inno-Setup-
Installer, der als eine einzige `.exe` verteilt wird.

## Installer bauen

**Automatisch (empfohlen):** Der Workflow
[`build-windows-installer.yml`](../../.github/workflows/build-windows-installer.yml)
baut die `.exe` auf einem `windows-latest`-Runner:

- Push eines `v*`-Tags baut sie und hängt sie als Asset an das zugehörige
  GitHub Release an.
- Manuell auslösbar über *Actions → Windows-Installer bauen → Run workflow* —
  liefert die `.exe` nur als herunterladbares Artifact, ohne ein Release
  anzufassen (praktisch für einen Testlauf auf einer VM).

**Von Hand:** Voraussetzung ist [Inno Setup](https://jrsoftware.org/isinfo.php)
(bringt `iscc.exe` mit, die Kommandozeilen-Version des Compilers).

```powershell
iscc installscript\windows\setup.iss
```

Ergebnis: `installscript\windows\dist\AboTrackerSetup.exe`. Der Installer
enthält nur die PowerShell-Scripts aus diesem Ordner — den App-Code lädt er
bei der Installation selbst von GitHub (wie `bootstrap.sh` unter Linux),
braucht also eine Internetverbindung.

## Was der Installer macht

| Schritt | Inhalt |
| --- | --- |
| 1 | App-Code von GitHub holen (`bootstrap.ps1`) nach `%LOCALAPPDATA%\Abo-Tracker` |
| 2 | Node.js suchen (>= 22.18), sonst portabel nach `node-runtime\` laden — kein Systemeingriff |
| 3 | Abhängigkeiten installieren (`npm ci`) |
| 4 | `.env.local` aus `.env.example` anlegen, falls sie fehlt |
| 5 | Datenbank anlegen und Standard-Kategorien einspielen |
| 6 | Admin-Konto erstellen (E-Mail wird im Installer-Wizard abgefragt) |
| 7 | App bauen |
| 8 | Server starten (Port 3200) |
| 9 | Autostart einrichten (Aufgabenplanung, Trigger "bei Login") |
| 10 | Temporäres Passwort in die Zwischenablage kopieren und in einem Dialog anzeigen |

Kein Node-Handbetrieb nötig: `install.ps1` lädt bei Bedarf automatisch die
aktuell passende Node-LTS-Version von nodejs.org und legt sie portabel unter
`node-runtime\` im Projektordner ab — eine eventuell bereits vorhandene,
andere Node-Installation auf dem Rechner bleibt unangetastet.

### Keine Build-Werkzeuge nötig

`better-sqlite3` liefert vorkompilierte Binaries mit — Node-API-Prebuilds für
`win32-x64` und `win32-arm64` (dazu macOS und Linux). „Node-API" heißt dabei
ABI-stabil: ein neuer Node-Hauptversionssprung entwertet sie nicht. Diese
Installation braucht deshalb **weder Python noch einen C++-Compiler**.

Frühere Fassungen installierten hier über `winget` die Visual Studio Build
Tools (2–4 GB, mit UAC-Abfrage) und Python, mit der Begründung,
`better-sqlite3` müsse bei jeder Installation nativen Code kompilieren. Das war
falsch: sein `binding.gyp` ist ausdrücklich dafür gebaut, bei vorhandenem
Prebuild nichts zu tun. Ein Messlauf am 18.09.2026 zeigte, dass `node-gyp`
dabei zwar `MSBuild.exe` startet, aber keine einzige `.node`-Datei erzeugt —
die Werkzeuge wurden für einen Build gebraucht, der nichts produziert. Der
Schritt ist entfallen.

Seit npm 12 blockiert npm die Install-Scripts von Abhängigkeiten ohnehin,
solange sie nicht im `allowScripts`-Feld der `package.json` stehen. Dort sind
alle betroffenen Pakete bewusst auf `false` gesetzt — jedes davon bezieht sein
Binary aus einem Plattform-Paket und braucht sein Script nicht:

| Paket | Script | Woher das Binary stattdessen kommt |
| --- | --- | --- |
| `better-sqlite3` | `node-gyp rebuild` | `prebuilds\win32-x64.node` im Paket selbst |
| `esbuild` (3 Fassungen) | `node install.js` | `@esbuild/win32-x64` |
| `sharp` | `node install/check.js` | `@img/sharp-win32-x64` |
| `unrs-resolver` | `node postinstall.js` | `@unrs/resolver-binding-win32-x64-msvc` |

Nachgeprüft: mit allen vier blockiert laufen `npm ci` und `npm run build`
fehlerfrei durch, und die Datenbank ist lesbar.

Fehlt für eine Plattform einmal ein Prebuild (etwa bei 32-Bit-Node), meldet das
der `better-sqlite3`-Ladetest im Installer und nennt die dann nötigen Schritte:
Build-Werkzeuge installieren **und** `npm install-scripts approve
better-sqlite3` — ohne die Freigabe bliebe `node-gyp` blockiert und der
Compiler nutzlos.

## Direkt nach der Installation

1. **Einloggen** unter <http://localhost:3200> mit der im Installer
   angegebenen E-Mail. Das temporäre Passwort steht am Ende in einem Dialog
   und ist zu diesem Zeitpunkt bereits in der Zwischenablage — einfach mit
   Strg+V ins Passwortfeld einfügen. Es wird nirgends noch einmal angezeigt.
2. **Passwort ändern.** Die App verlangt das beim ersten Login von sich aus.

Laufender Betrieb:

```powershell
installscript\windows\open-app.ps1      # startet den Server falls nötig und öffnet den Browser
installscript\windows\start-prod.ps1    # Server von Hand starten
installscript\windows\stop-prod.ps1     # Server stoppen
```

`start-prod.ps1` tut nichts, wenn der Server bereits läuft, und
`stop-prod.ps1` fasst einen **fremden** Prozess auf dem Port nicht an,
sondern meldet ihn — auf Port 3200 kann schließlich auch etwas anderes
lauschen.

Log-Dateien: `prod-server.log` (Ausgabe) und `prod-server.err.log` (Fehler)
im Projektordner.

## Update

```powershell
cd $env:LOCALAPPDATA\Abo-Tracker
git pull   # falls per git installiert; sonst: Installer erneut ausführen
installscript\windows\install.ps1
```

Erneutes Ausführen des Installers (`AboTrackerSetup.exe`) aktualisiert eine
bestehende Installation ebenfalls — Datenbank und Konten bleiben dabei
erhalten, `bootstrap.ps1` lädt nur den aktuellen App-Code neu.

## Backup

Wie unter Linux ist nur **`data\`** zu sichern — darin liegt
`abo-tracker.db` mit allem, was nicht wiederherstellbar ist.

Am einfachsten über den Startmenü-Eintrag **„Abo-Tracker sichern“** oder:

```powershell
cd $env:LOCALAPPDATA\Abo-Tracker
installscript\windows\backup.ps1
```

Das legt per SQLite-Online-Backup `abo-backup\abo-tracker-<Datum>.db` auf dem
Desktop ab (Pendant zu `scripts/backup-to-desktop.sh`). Der Server darf dabei
laufen, die Sicherung ist trotz WAL-Modus in sich stimmig. Es bleiben die
letzten 10 Sicherungen liegen, ältere löscht das Script. Als Desktop gilt der
Ordner, den Windows dafür eingetragen hat — mit OneDrive-Sicherung also
`OneDrive\Desktop`, nicht `%USERPROFILE%\Desktop`.

Wer lieber den ganzen Ordner kopiert, muss vorher den Server stoppen, sonst
fehlt der Kopie womöglich, was noch in `abo-tracker.db-wal` steht:

```powershell
installscript\windows\stop-prod.ps1
Copy-Item data "$([Environment]::GetFolderPath('Desktop'))\abo-tracker-backup-$(Get-Date -Format 'yyyy-MM-dd')" -Recurse
installscript\windows\start-prod.ps1
```

### Wiederherstellen

**Bei der Installation:** Der Installer fragt auf der Seite „Daten
übernehmen“, ob eine Sicherung eingespielt werden soll, und schlägt die
neueste aus `abo-backup` auf dem Desktop vor. Genauso geht die
`abo-tracker.db` aus einem Ordner `abo-tracker-backup-<Datum>`, den die
Deinstallation angelegt hat. Konten und Passwörter kommen dann aus der
Sicherung, die Frage nach der Admin-E-Mail entfällt.

**In einer bestehenden Installation:** Startmenü-Eintrag **„Abo-Tracker
wiederherstellen“** (nimmt die neueste Sicherung und fragt vorher nach) oder:

```powershell
cd $env:LOCALAPPDATA\Abo-Tracker
installscript\windows\restore.ps1                  # neueste aus abo-backup
installscript\windows\restore.ps1 -From <pfad>     # bestimmte .db oder Ordner
```

In beiden Fällen wird die Sicherung vorher geprüft (SQLite, intakt,
Abo-Tracker-Datenbank, nicht aus einer neueren App-Version). Eine schon
vorhandene Datenbank landet vorher als
`abo-backup\vor-wiederherstellung-<Zeit>.db` auf dem Desktop, danach bringen
die Migrationen eine ältere Sicherung auf den aktuellen Stand. Scheitert die
Prüfung, bleibt die bisherige Datenbank unverändert.

**CSV-Export/-Import** (Einstellungen in der App) ist kein Ersatz dafür: Er
enthält nur die Abos des angemeldeten Kontos, keine Konten, Preishistorie
oder Benachrichtigungen. Die exportierte Datei öffnet sich direkt in Excel
und lässt sich auch nach dem Speichern in Excel (Windows-1252, deutsches
Datumsformat) wieder importieren.

## Deinstallation

Über **Einstellungen → Apps → Abo-Tracker → Deinstallieren**, oder den
Eintrag "Deinstallieren" in der Startmenü-Programmgruppe, oder direkt
`%LOCALAPPDATA%\Abo-Tracker\unins000.exe` ausführen. Das stoppt den Server,
entfernt den Autostart-Task und löscht danach den kompletten Projektordner
(App-Code, `node_modules`, Node-Runtime, Datenbank — alles).

Findet der Deinstaller dabei eine Datenbank, **fragt er vorher nach**, ob eine
Kopie auf dem Desktop abgelegt werden soll (`abo-tracker-backup-<Datum>`).
Schlägt diese Sicherung fehl, hält er an und fragt, ob trotzdem gelöscht
werden soll — die Datenbank ist das einzige an der ganzen Installation, was
sich nicht wiederherstellen lässt.

**Nicht** `installscript\windows\uninstall.ps1` direkt ausführen, um zu
deinstallieren — das ist nur ein Hilfsskript, das der echte Deinstaller
(`unins000.exe`) im Hintergrund aufruft, um Server und Autostart-Task zu
stoppen. Es löscht den Ordner selbst nicht; direkt ausgeführt bleibt der
komplette Projektordner (inklusive Datenbank) danach liegen. Für eine
Sicherung *ohne* Deinstallation taugt es aber:

```powershell
cd $env:LOCALAPPDATA\Abo-Tracker
installscript\windows\uninstall.ps1 -KeepData    # sichert data\ auf den Desktop
```

Visual Studio Build Tools und Python werden von der Deinstallation **nicht**
angerührt. Seit dem Wegfall des Build-Werkzeuge-Schritts (siehe
[oben](#keine-build-werkzeuge-nötig)) installiert der Installer sie ohnehin
nicht mehr — auf älteren Installationen können sie aber noch von früher
liegen. Es sind eigenständige System-Werkzeuge, kein Teil der App, und andere
Software könnte sie ebenfalls nutzen. Wer sie manuell entfernen will:

```powershell
winget uninstall --id Microsoft.VisualStudio.2022.BuildTools
winget uninstall --id Python.Python.3.12
```

## Wenn etwas klemmt

| Symptom | Ursache und Abhilfe |
| --- | --- |
| `better-sqlite3 lässt sich nicht laden` / `npm install fehlgeschlagen` | Der Installer grenzt die Ursache selbst ein und sagt, welcher der drei Fälle vorliegt: kein Prebuild für diese Plattform (dann nennt er Build-Werkzeuge **und** `npm install-scripts approve better-sqlite3`), beschädigtes `node_modules` (`Remove-Item -Recurse -Force node_modules; npm ci`), oder `better-sqlite3` gar nicht installiert (`npm ci`). Blockierte Install-Scripts in der npm-Ausgabe sind dabei normal und **nicht** die Ursache — siehe [oben](#keine-build-werkzeuge-nötig). |
| Server startet nicht | `prod-server.err.log` im Projektordner zeigt den Grund. |
| `install.log` fehlt oder zeigt nichts Hilfreiches | Liegt im Projektordner (`%LOCALAPPDATA%\Abo-Tracker\install.log`) — enthält die komplette Ausgabe von `bootstrap.ps1`/`install.ps1`, auch wenn das Konsolenfenster sich schon geschlossen hat. |
| Autostart-Task fehlt nach einem Windows-Update | `installscript\windows\install.ps1` erneut ausführen — legt den Task neu an. Schlägt die Task-Registrierung fehl (z. B. Gruppenrichtlinie), bricht das die Installation nicht ab, nur der Autostart fehlt dann. |
| Port 3200 belegt | `installscript\windows\start-prod.ps1 -Port 3300` (und beim nächsten `install.ps1`-Lauf ebenfalls `-Port 3300` mitgeben). Lauscht dort fremde Software, bricht der Installer ab, statt sie zu beenden. |
| Windows-Firewall fragt beim ersten Start nach | Next.js lauscht wie unter Linux auf allen Schnittstellen, damit die App auch von anderen Geräten im Heimnetz erreichbar ist. Wer das nicht braucht: `start-prod.ps1 -BindHost 127.0.0.1` — dann bleibt die App rein lokal und die Abfrage entfällt. |
| Passwort vergessen, `install.log` durchsucht | Steht dort nicht drin — das temporäre Passwort wird bewusst am Transcript vorbei ausgegeben, damit es nicht dauerhaft im Klartext neben der Datenbank liegt. Zurücksetzen geht im Bereich `/admin` oder über eine zweite Admin-Person. |
