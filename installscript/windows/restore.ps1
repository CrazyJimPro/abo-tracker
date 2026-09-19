#Requires -Version 5.1
<#
Spielt eine Sicherung in eine bestehende Installation zurück — ohne den
Installer noch einmal laufen zu lassen. Gegenstück zu backup.ps1.

  installscript\windows\restore.ps1                      # Sicherung im Fenster "Datei öffnen" auswählen
  installscript\windows\restore.ps1 -From <pfad>         # bestimmte .db-Datei oder Ordner mit abo-tracker.db

Ablauf: Server stoppen, bisherige Datenbank nach
<Desktop>\abo-backup\vor-wiederherstellung-<Zeit>.db sichern, Sicherung
einspielen, Migrationen anwenden (eine ältere Sicherung wird so auf den
aktuellen Stand gebracht), Server wieder starten. Die Konten und Passwörter
sind danach die aus der Sicherung.

Optionen:
  -From <pfad>   Sicherung (siehe oben). Ohne Angabe öffnet sich ein
                 Fenster "Datei öffnen", vorbelegt mit der neuesten
                 abo-tracker-*.db aus <Desktop>\abo-backup oder dem
                 Download-Ordner (dorthin lädt "Sicherung erstellen" in den
                 Einstellungen der App). Nachfrage und Ergebnis kommen dann
                 ebenfalls als Fenster — so ruft es der Startmenü-Eintrag
                 "Abo-Tracker wiederherstellen" auf.
  -Force         Nicht nachfragen, kein Fenster. Ohne -From wird dann die
                 neueste gefundene Sicherung genommen.
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

# Ohne -From und ohne -Force wird die Sicherung per Fenster ausgewählt, und
# auch Nachfrage und Ergebnis kommen als Fenster: so ruft der Startmenü-
# Eintrag das Script auf, und wer seine Sicherungen anderswo ablegt als in
# Downloads oder auf dem Desktop, navigiert einfach dorthin.
$UseDialogs = (-not $From) -and (-not $Force)
if ($UseDialogs) { Add-Type -AssemblyName System.Windows.Forms }

$DialogTitle = "Abo-Tracker wiederherstellen"
function Show-Message {
    param([string]$Text, [string]$Icon = "Information", [string]$Buttons = "OK")
    return [System.Windows.Forms.MessageBox]::Show($Text, $DialogTitle, $Buttons, $Icon)
}

# Gesucht wird dort, wo Sicherungen entstehen: backup.ps1 legt sie in
# <Desktop>\abo-backup ab, "Sicherung erstellen" in der App im
# Download-Ordner. Über beide hinweg zählt das Änderungsdatum, nicht der
# Name — der Browser hängt bei gleichem Namen " (1)" an.
try {
    $downloads = (New-Object -ComObject Shell.Application).NameSpace("shell:Downloads").Self.Path
} catch {
    $downloads = $null
}
if (-not $downloads) { $downloads = Join-Path $env:USERPROFILE "Downloads" }
$searched = @((Join-Path $desktop "abo-backup"), $downloads)
function Find-NewestBackup {
    $searched |
        ForEach-Object { Get-ChildItem -Path $_ -Filter "abo-tracker-*.db" -ErrorAction SilentlyContinue } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

if ($UseDialogs) {
    $newest = Find-NewestBackup
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = "Sicherung zum Zurückspielen auswählen"
    $dialog.Filter = "Abo-Tracker-Sicherung (*.db)|*.db|Alle Dateien (*.*)|*.*"
    if ($newest) {
        $dialog.InitialDirectory = $newest.DirectoryName
        $dialog.FileName = $newest.Name
    } else {
        $dialog.InitialDirectory = $downloads
    }
    # Unsichtbares Fenster als Besitzer mit TopMost: sonst öffnet sich der
    # Dialog gern hinter dem Konsolenfenster und wirkt, als hinge das Script.
    $owner = New-Object System.Windows.Forms.Form
    $owner.TopMost = $true
    try {
        $picked = $dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK
    } finally {
        $owner.Dispose()
    }
    if (-not $picked) { Write-Host "Abgebrochen, nichts verändert."; exit 1 }
    $From = $dialog.FileName
} elseif (-not $From) {
    $newest = Find-NewestBackup
    if (-not $newest) { throw "Keine Sicherung gefunden in $($searched -join ' oder '). Mit -From <pfad> angeben." }
    $From = $newest.FullName
}
if (-not (Test-Path $From)) { throw "Sicherung nicht gefunden: $From" }

$fromDate = (Get-Item $From).LastWriteTime.ToString("dd.MM.yyyy HH:mm")
Write-Host ""
Write-Host "Sicherung:  $From (vom $fromDate)"
Write-Host "Ersetzt:    $DbPath"
Write-Host "Alle Abos und Konten werden durch den Stand der Sicherung ersetzt."
Write-Host "Die bisherige Datenbank wird vorher in $desktop\abo-backup gesichert."
if ($UseDialogs) {
    $answer = Show-Message -Icon Warning -Buttons YesNo -Text (
        "Diese Sicherung einspielen?`n`n" +
        "Datei:  $(Split-Path -Leaf $From)`nOrdner:  $(Split-Path -Parent $From)`nvom $fromDate`n`n" +
        "Alle Abos und Konten werden durch den Stand der Sicherung ersetzt, " +
        "auch die Passwörter.`n`n" +
        "Die bisherige Datenbank wird vorher im Ordner abo-backup auf dem Desktop gesichert.")
    if ($answer -ne [System.Windows.Forms.DialogResult]::Yes) { Write-Host "Abgebrochen, nichts verändert."; exit 1 }
} elseif (-not $Force) {
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
$failure = $null
$summary = ""
try {
    $safetyCopy = Join-Path $desktop "abo-backup\vor-wiederherstellung-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').db"
    # Ausgabe mitschneiden, damit das Ergebnisfenster den Grund eines
    # Fehlschlags nennen kann ("... ist keine SQLite-Datenbank" usw.).
    $restoreOutput = & $Node (Join-Path $ProjectDir "scripts\restore-db.ts") $From $DbPath $safetyCopy 2>&1 |
        ForEach-Object { "$_" }
    $restoreOutput | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) {
        $reason = ($restoreOutput | Where-Object { $_ -and $_ -notmatch '^RESTORED ' }) -join "`n"
        $failure = "Die Sicherung wurde nicht eingespielt:`n`n$reason`n`nDie bisherige Datenbank ist unverändert."
    } else {
        $line = $restoreOutput | Where-Object { $_ -match '^RESTORED users=(\d+) subscriptions=(\d+)$' } | Select-Object -Last 1
        if ($line -and $line -match '^RESTORED users=(\d+) subscriptions=(\d+)$') { $summary = "Konten: $($Matches[1]), Abos: $($Matches[2])" }
        & $Npm run db:migrate
        if ($LASTEXITCODE -ne 0) {
            $failure = "Die Sicherung ist eingespielt, sie ließ sich aber nicht auf den aktuellen Stand bringen (Migration fehlgeschlagen). Details im Konsolenfenster."
        }
    }
} finally {
    $ErrorActionPreference = "Stop"
    $env:NODE_OPTIONS = $prevNodeOptions
    Pop-Location
    # Auch nach einem Fehlschlag wieder starten — dann eben mit der
    # unveränderten bisherigen Datenbank.
    & (Join-Path $WindowsDir "start-prod.ps1") -Port $Port
}

if ($failure) {
    if ($UseDialogs) { Show-Message -Icon Error -Text $failure | Out-Null }
    throw $failure
}
Write-Host "Wiederherstellung abgeschlossen." -ForegroundColor Green
if ($UseDialogs) {
    Show-Message -Text (
        "Die Sicherung wurde eingespielt.`n`n$summary`n`n" +
        "Anmelden mit den Zugangsdaten, die zum Zeitpunkt der Sicherung galten.") | Out-Null
}
