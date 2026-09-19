#Requires -Version 5.1
<#
Sichert data\abo-tracker.db per SQLite-Online-Backup auf den Desktop
(Windows-Pendant zu ../../scripts/backup-to-desktop.sh). WAL-sicher auch bei
laufendem Server — der muss dafür nicht gestoppt werden.

Ziel: <Desktop>\abo-backup\abo-tracker-<JJJJ-MM-TT>.db. Es bleiben nur die
letzten 10 Sicherungen liegen, ältere werden gelöscht. Ein zweiter Lauf am
selben Tag überschreibt die Sicherung dieses Tages.

Optionen:
  -ShowResult   Ergebnis zusätzlich als Meldungsfenster anzeigen. Nutzt die
                Startmenü-Verknüpfung "Abo-Tracker sichern", die ohne
                sichtbares Konsolenfenster läuft.
#>

[CmdletBinding()]
param(
    [switch]$ShowResult
)

$ErrorActionPreference = "Stop"

$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallScriptDir = Split-Path -Parent $WindowsDir
$ProjectDir = Split-Path -Parent $InstallScriptDir
$Keep = 10

. (Join-Path $WindowsDir "find-node.ps1")

function Show-Result {
    param([string]$Message, [int]$Icon)
    Write-Host $Message
    if ($ShowResult) {
        # 0x40 Information, 0x10 Fehler
        (New-Object -ComObject WScript.Shell).Popup($Message, 0, "Abo-Tracker sichern", $Icon) | Out-Null
    }
}

try {
    $Node = Find-NodeBin -ProjectDir $ProjectDir -MinVersion "22.18.0"
    if (-not $Node) {
        throw "Kein passendes Node (>= 22.18) gefunden. Bitte installscript\windows\install.ps1 ausführen."
    }

    $db = Join-Path $ProjectDir "data\abo-tracker.db"
    if (-not (Test-Path $db)) { throw "Keine Datenbank gefunden: $db" }

    # GetFolderPath statt $env:USERPROFILE\Desktop: bei eingeschalteter
    # OneDrive-Sicherung liegt der sichtbare Desktop unter
    # %USERPROFILE%\OneDrive\Desktop (bzw. "OneDrive - <Firma>\Desktop"), der
    # feste Pfad träfe einen leeren Ordner, den niemand ansieht.
    $desktop = [Environment]::GetFolderPath("Desktop")
    if (-not $desktop) { $desktop = Join-Path $env:USERPROFILE "Desktop" }
    $destDir = Join-Path $desktop "abo-backup"
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    $destFile = Join-Path $destDir "abo-tracker-$(Get-Date -Format 'yyyy-MM-dd').db"

    # Der JS-Code enthält absichtlich keine doppelten Anführungszeichen:
    # PowerShell 5.1 reicht sie an native Programme nicht sauber durch.
    $js = @'
new (require('better-sqlite3'))(process.argv[1], { readonly: true })
  .backup(process.argv[2])
  .catch((e) => { console.error(e.message); process.exit(1); });
'@
    # require() löst relativ zum Arbeitsverzeichnis auf, daher dorthin.
    Push-Location $ProjectDir
    try {
        & $Node -e $js $db $destFile
        if ($LASTEXITCODE -ne 0) { throw "Online-Backup fehlgeschlagen (Exit-Code $LASTEXITCODE)." }
    } finally {
        Pop-Location
    }

    # Nur die letzten $Keep behalten. Der Dateiname sortiert dank
    # JJJJ-MM-TT chronologisch.
    Get-ChildItem -Path $destDir -Filter "abo-tracker-*.db" |
        Sort-Object Name -Descending |
        Select-Object -Skip $Keep |
        Remove-Item -Force

    Show-Result "Backup geschrieben: $destFile" 0x40
} catch {
    Show-Result "Backup fehlgeschlagen: $($_.Exception.Message)" 0x10
    exit 1
}
