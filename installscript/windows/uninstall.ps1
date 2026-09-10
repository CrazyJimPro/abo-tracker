#Requires -Version 5.1
<#
Wird vom Inno-Setup-Uninstaller aufgerufen (setup.iss, [UninstallRun]), bevor
er die Programmdateien entfernt: stoppt den Server und löscht den
Autostart-Eintrag. Windows-Pendant zum Server-/Autostart-Teil von
../uninstall.sh — das Löschen des Projektordners übernimmt Inno Setup selbst
(setup.iss, [UninstallDelete]).

Dieses Script ist NICHT der Deinstaller — wer es direkt ausführt, bekommt
Server-Stop und Autostart-Entfernung, aber der Projektordner (inklusive
Datenbank) bleibt liegen. Zum vollständigen Deinstallieren:
%LOCALAPPDATA%\Abo-Tracker\unins000.exe (oder Einstellungen → Apps →
Abo-Tracker → Deinstallieren).

Optionen:
  -KeepData   data\ vorher auf den Desktop sichern. Der echte Deinstaller
              fragt das inzwischen von sich aus ab und reicht den Schalter
              hierher durch — die Datenbank ist das einzige an der ganzen
              Installation, was sich nicht wiederherstellen lässt.
#>

[CmdletBinding()]
param([switch]$KeepData)

$ErrorActionPreference = "Stop"

$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallScriptDir = Split-Path -Parent $WindowsDir
$ProjectDir = Split-Path -Parent $InstallScriptDir

# Der Server muss vor der Sicherung weg (WAL-Modus), aber ein Fehler dabei
# darf die Deinstallation nicht aufhalten — stop-prod.ps1 bricht neuerdings
# ab, wenn auf dem Port ein fremder Prozess sitzt, und das wäre hier der
# denkbar schlechteste Moment zum Abbrechen.
try {
    & (Join-Path $WindowsDir "stop-prod.ps1")
} catch {
    Write-Host "Server konnte nicht gestoppt werden: $($_.Exception.Message)" -ForegroundColor Yellow
}

Unregister-ScheduledTask -TaskName "AboTracker" -Confirm:$false -ErrorAction SilentlyContinue

$dataDir = Join-Path $ProjectDir "data"
if ($KeepData -and (Test-Path $dataDir) -and (Get-ChildItem $dataDir -ErrorAction SilentlyContinue)) {
    # Auf den Desktop, nicht neben den Projektordner: der liegt unter
    # %LOCALAPPDATA% und wird dort nie wieder jemand suchen.
    $desktop = [Environment]::GetFolderPath("Desktop")
    if (-not $desktop) { $desktop = Split-Path -Parent $ProjectDir }
    $backupDir = Join-Path $desktop "abo-tracker-backup-$(Get-Date -Format 'yyyy-MM-dd')"
    # Bei zwei Anläufen am selben Tag nicht die erste Sicherung überschreiben.
    if (Test-Path $backupDir) { $backupDir = "$backupDir-$(Get-Date -Format 'HHmmss')" }
    try {
        Copy-Item $dataDir $backupDir -Recurse
        Write-Host "Datenbank gesichert nach: $backupDir" -ForegroundColor Green
    } catch {
        Write-Host "Sicherung fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

Write-Host ""
Write-Host "Server gestoppt, Autostart entfernt. Der Projektordner wird hierdurch NICHT gelöscht."
Write-Host "Zum vollständigen Deinstallieren: $ProjectDir\unins000.exe ausführen"
Write-Host "(oder Einstellungen -> Apps -> Abo-Tracker -> Deinstallieren)."
