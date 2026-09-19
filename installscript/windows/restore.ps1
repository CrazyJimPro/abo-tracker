#Requires -Version 5.1
<#
Spielt eine Sicherung in eine bestehende Installation zurück — ohne den
Installer noch einmal laufen zu lassen. Gegenstück zu backup.ps1.

  installscript\windows\restore.ps1                      # neueste Sicherung aus <Desktop>\abo-backup
  installscript\windows\restore.ps1 -From <pfad>         # bestimmte .db-Datei oder Ordner mit abo-tracker.db

Ablauf: Server stoppen, bisherige Datenbank nach
<Desktop>\abo-backup\vor-wiederherstellung-<Zeit>.db sichern, Sicherung
einspielen, Migrationen anwenden (eine ältere Sicherung wird so auf den
aktuellen Stand gebracht), Server wieder starten. Die Konten und Passwörter
sind danach die aus der Sicherung.

Optionen:
  -From <pfad>   Sicherung (siehe oben). Ohne Angabe die neueste
                 abo-tracker-*.db aus <Desktop>\abo-backup.
  -Force         Nicht nachfragen.
  -Port <n>      Port des Servers (Standard 3200).
#>

[CmdletBinding()]
param(
    [string]$From = "",
    [switch]$Force,
    [int]$Port = 3200
)

$ErrorActionPreference = "Stop"

$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallScriptDir = Split-Path -Parent $WindowsDir
$ProjectDir = Split-Path -Parent $InstallScriptDir
$DbPath = Join-Path $ProjectDir "data\abo-tracker.db"

. (Join-Path $WindowsDir "find-node.ps1")

$Node = Find-NodeBin -ProjectDir $ProjectDir -MinVersion "22.18.0"
if (-not $Node) {
    throw "Kein passendes Node (>= 22.18) gefunden. Bitte installscript\windows\install.ps1 ausführen."
}
$Npm = Join-Path (Split-Path -Parent $Node) "npm.cmd"

$desktop = [Environment]::GetFolderPath("Desktop")
if (-not $desktop) { $desktop = Join-Path $env:USERPROFILE "Desktop" }

if (-not $From) {
    $newest = Get-ChildItem -Path (Join-Path $desktop "abo-backup") -Filter "abo-tracker-*.db" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1
    if (-not $newest) { throw "Keine Sicherung in $desktop\abo-backup gefunden. Mit -From <pfad> angeben." }
    $From = $newest.FullName
}
if (-not (Test-Path $From)) { throw "Sicherung nicht gefunden: $From" }

Write-Host ""
Write-Host "Sicherung:  $From"
Write-Host "Ersetzt:    $DbPath"
Write-Host "Alle Abos und Konten werden durch den Stand der Sicherung ersetzt."
Write-Host "Die bisherige Datenbank wird vorher in $desktop\abo-backup gesichert."
if (-not $Force) {
    $answer = Read-Host "Fortfahren? (j/n)"
    if ($answer -notmatch '^(j|ja|y|yes)$') { Write-Host "Abgebrochen."; exit 1 }
}

& (Join-Path $WindowsDir "stop-prod.ps1") -Port $Port

Push-Location $ProjectDir
$prevNodeOptions = $env:NODE_OPTIONS
$env:NODE_OPTIONS = ("$prevNodeOptions --disable-warning=MODULE_TYPELESS_PACKAGE_JSON").Trim()
$env:Path = "$(Split-Path -Parent $Node);$env:Path"
# npm schreibt Hinweise nach stderr; unter "Stop" würde PowerShell 5.1 daraus
# einen Abbruch machen, sobald die Ausgabe umgeleitet wird (siehe install.ps1).
# Maßgeblich sind hier allein die Exit-Codes.
$ErrorActionPreference = "Continue"
try {
    $safetyCopy = Join-Path $desktop "abo-backup\vor-wiederherstellung-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').db"
    & $Node (Join-Path $ProjectDir "scripts\restore-db.ts") $From $DbPath $safetyCopy
    $restoreOk = $LASTEXITCODE -eq 0

    if ($restoreOk) {
        & $Npm run db:migrate
        if ($LASTEXITCODE -ne 0) { throw "Migration fehlgeschlagen." }
    }
} finally {
    $ErrorActionPreference = "Stop"
    $env:NODE_OPTIONS = $prevNodeOptions
    Pop-Location
    # Auch nach einem Fehlschlag wieder starten — dann eben mit der
    # unveränderten bisherigen Datenbank.
    & (Join-Path $WindowsDir "start-prod.ps1") -Port $Port
}

if (-not $restoreOk) { throw "Wiederherstellung fehlgeschlagen — die bisherige Datenbank ist unverändert." }
Write-Host "Wiederherstellung abgeschlossen." -ForegroundColor Green
