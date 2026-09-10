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
  -KeepData   data\ vorher nach <Projektordner>-data-backup-<Datum> kopieren
#>

[CmdletBinding()]
param([switch]$KeepData)

$ErrorActionPreference = "Stop"

$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallScriptDir = Split-Path -Parent $WindowsDir
$ProjectDir = Split-Path -Parent $InstallScriptDir

& (Join-Path $WindowsDir "stop-prod.ps1") -ErrorAction SilentlyContinue

Unregister-ScheduledTask -TaskName "AboTracker" -Confirm:$false -ErrorAction SilentlyContinue

$dataDir = Join-Path $ProjectDir "data"
if ($KeepData -and (Test-Path $dataDir) -and (Get-ChildItem $dataDir -ErrorAction SilentlyContinue)) {
    $backupDir = "$ProjectDir-data-backup-$(Get-Date -Format 'yyyy-MM-dd')"
    Copy-Item $dataDir $backupDir -Recurse
    Write-Host "data\ gesichert nach $backupDir"
}

Write-Host ""
Write-Host "Server gestoppt, Autostart entfernt. Der Projektordner wird hierdurch NICHT gelöscht."
Write-Host "Zum vollständigen Deinstallieren: $ProjectDir\unins000.exe ausführen"
Write-Host "(oder Einstellungen -> Apps -> Abo-Tracker -> Deinstallieren)."
