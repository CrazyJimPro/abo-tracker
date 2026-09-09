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
| 3 | Build-Werkzeuge prüfen: Visual Studio Build Tools + Python (siehe unten), fehlende Teile per winget nachinstallieren |
| 4 | Abhängigkeiten installieren (`npm ci`) |
| 5 | `.env.local` aus `.env.example` anlegen, falls sie fehlt |
| 6 | Datenbank anlegen und Standard-Kategorien einspielen |
| 7 | Admin-Konto erstellen (E-Mail wird im Installer-Wizard abgefragt) |
| 8 | App bauen |
| 9 | Server starten (Port 3200) |
| 10 | Autostart einrichten (Aufgabenplanung, Trigger "bei Login") |
| 11 | Temporäres Passwort in die Zwischenablage kopieren und in einem Dialog anzeigen |

Kein Node-Handbetrieb nötig: `install.ps1` lädt bei Bedarf automatisch die
aktuell passende Node-LTS-Version von nodejs.org und legt sie portabel unter
`node-runtime\` im Projektordner ab — eine eventuell bereits vorhandene,
andere Node-Installation auf dem Rechner bleibt unangetastet.

### Build-Werkzeuge (Visual Studio Build Tools + Python)

`better-sqlite3` hat keine vorkompilierten Windows-Binaries und kompiliert bei
jeder Installation nativen Code — dafür braucht `node-gyp` sowohl die Visual
Studio Build Tools (Workload "Desktop development with C++") als auch Python.
Fehlt eines von beiden, installiert `install.ps1` es automatisch über
`winget`:

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install --id Python.Python.3.12
```

Die Build-Tools-Installation self-elevated über ihre eigene UAC-Abfrage —
`install.ps1` selbst bleibt dabei unprivilegiert. Das kann beim ersten Mal
mehrere Minuten dauern; ein zweiter Installer-Lauf überspringt diesen Schritt,
sobald beides erkannt wird. Schlägt die automatische Installation fehl (z. B.
kein `winget` vorhanden), bricht der Installer mit dem jeweiligen
`winget`-Befehl zum manuellen Nachholen ab.

## Direkt nach der Installation

1. **Einloggen** unter <http://localhost:3200> mit der im Installer
   angegebenen E-Mail. Das temporäre Passwort steht am Ende in einem Dialog
   und ist zu diesem Zeitpunkt bereits in der Zwischenablage — einfach mit
   Strg+V ins Passwortfeld einfügen. Es wird nirgends noch einmal angezeigt.
2. **Passwort ändern.** Die App verlangt das beim ersten Login von sich aus.

Laufender Betrieb:

```powershell
installscript\windows\start-prod.ps1    # Server von Hand starten
installscript\windows\stop-prod.ps1     # Server stoppen
```

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
`abo-tracker.db` mit allem, was nicht wiederherstellbar ist. Vor dem
Kopieren den Server stoppen (WAL-Modus, siehe [Haupt-README](../README.md#backup)):

```powershell
installscript\windows\stop-prod.ps1
Copy-Item data "$env:USERPROFILE\Desktop\abo-tracker-backup-$(Get-Date -Format 'yyyy-MM-dd')" -Recurse
installscript\windows\start-prod.ps1
```

## Deinstallation

Über **Einstellungen → Apps → Abo-Tracker → Deinstallieren** (oder das
Icon in der Programmgruppe). Das stoppt den Server, entfernt den
Autostart-Task und löscht danach den Projektordner. Um die Datenbank vorher
zu sichern, `installscript\windows\uninstall.ps1 -KeepData` manuell
ausführen, bevor der reguläre Deinstaller läuft.

## Wenn etwas klemmt

| Symptom | Ursache und Abhilfe |
| --- | --- |
| `better-sqlite3 lässt sich nicht laden` / `npm install fehlgeschlagen` | Normalerweise fängt Schritt 3 (siehe oben) das ab. Bricht es trotzdem ab, fehlt meist `winget` selbst, oder die automatische Installation wurde abgebrochen (z. B. UAC-Dialog weggeklickt) — der Installer nennt dann den passenden `winget install`-Befehl zum manuellen Nachholen. |
| Server startet nicht | `prod-server.err.log` im Projektordner zeigt den Grund. |
| `install.log` fehlt oder zeigt nichts Hilfreiches | Liegt im Projektordner (`%LOCALAPPDATA%\Abo-Tracker\install.log`) — enthält die komplette Ausgabe von `bootstrap.ps1`/`install.ps1`, auch wenn das Konsolenfenster sich schon geschlossen hat. |
| Autostart-Task fehlt nach einem Windows-Update | `installscript\windows\install.ps1` erneut ausführen — legt den Task neu an. Schlägt die Task-Registrierung fehl (z. B. Gruppenrichtlinie), bricht das die Installation nicht ab, nur der Autostart fehlt dann. |
| Port 3200 belegt | `installscript\windows\start-prod.ps1 -Port 3300` (und beim nächsten `install.ps1`-Lauf ebenfalls `-Port 3300` mitgeben). |
