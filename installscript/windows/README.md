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
| 6 | Admin-Konto erstellen (E-Mail wird im Installer-Wizard abgefragt), temporäres Passwort ausgeben |
| 7 | App bauen |
| 8 | Server starten (Port 3200) |
| 9 | Autostart einrichten (Aufgabenplanung, Trigger "bei Login") |

Kein Node-Handbetrieb nötig: `install.ps1` lädt bei Bedarf automatisch die
aktuell passende Node-LTS-Version von nodejs.org und legt sie portabel unter
`node-runtime\` im Projektordner ab — eine eventuell bereits vorhandene,
andere Node-Installation auf dem Rechner bleibt unangetastet.

## Direkt nach der Installation

1. **Einloggen** unter <http://localhost:3200> mit der im Installer
   angegebenen E-Mail und dem temporären Passwort aus der Installer-Ausgabe.
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
| `better-sqlite3 lässt sich nicht laden` | Meist fehlen die Visual Studio Build Tools (Workload "Desktop development with C++") für einen Fallback-Build des nativen Moduls. |
| Server startet nicht | `prod-server.err.log` im Projektordner zeigt den Grund. |
| Autostart-Task fehlt nach einem Windows-Update | `installscript\windows\install.ps1` erneut ausführen — legt den Task neu an. |
| Port 3200 belegt | `installscript\windows\start-prod.ps1 -Port 3300` (und beim nächsten `install.ps1`-Lauf ebenfalls `-Port 3300` mitgeben). |
