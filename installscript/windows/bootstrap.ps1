#Requires -Version 5.1
<#
Abo-Tracker — Einstieg für einen frischen Windows-Rechner.

Windows-Pendant zu ../bootstrap.sh: holt das Repository (per Git, falls
vorhanden, sonst als ZIP von GitHub) in ein Zielverzeichnis und startet dort
install.ps1, das den Rest erledigt. Ist der Ordner schon da, wird er
aktualisiert statt neu geholt.

Aufruf (z.B. aus dem [Run]-Schritt von setup.iss):
  powershell -ExecutionPolicy Bypass -File bootstrap.ps1 -InstallDir "C:\Users\...\Abo-Tracker" -Email ich@example.com

Alle nicht hier aufgeführten Parameter werden an install.ps1 durchgereicht.
#>

[CmdletBinding()]
param(
    [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "Abo-Tracker"),
    [string]$RepoUrl = "https://github.com/CrazyJimPro/abo-tracker.git",
    [string]$ZipUrl = "https://github.com/CrazyJimPro/abo-tracker/archive/refs/heads/main.zip",
    # Ab hier 1:1 durchgereicht an install.ps1 — siehe dort für die Bedeutung.
    [string]$Email = "",
    [int]$Port = 3200,
    [switch]$NoAutostart,
    [switch]$NoOpen,
    [switch]$NoStart
)

$ErrorActionPreference = "Stop"

# Persistentes Log, unabhängig davon, wie dieses Script gestartet wurde
# (Inno-Setup-[Run]-Schritt fängt die Konsolenausgabe nicht ein und zeigt bei
# einem Fehler nur "fertig" ohne jeden Hinweis — mit Transcript bleibt immer
# nachvollziehbar, was tatsächlich passiert ist).
try {
    New-Item -ItemType Directory -Path $InstallDir -Force -ErrorAction SilentlyContinue | Out-Null
    Start-Transcript -Path (Join-Path $InstallDir "install.log") -Append -ErrorAction SilentlyContinue | Out-Null
} catch {}

try {
    $gitAvailable = [bool](Get-Command git.exe -ErrorAction SilentlyContinue)

    $hasProject = Test-Path (Join-Path $InstallDir "package.json")

    if (Test-Path (Join-Path $InstallDir ".git")) {
        Write-Host "Vorhandene Installation in $InstallDir wird aktualisiert …"
        if ($gitAvailable) {
            git -C $InstallDir pull --ff-only
        } else {
            Write-Host "Kein git gefunden — Aktualisierung wird übersprungen, vorhandener Stand bleibt." -ForegroundColor Yellow
        }
    } elseif ($hasProject) {
        Write-Host "Vorhandene Installation in $InstallDir gefunden, wird nicht neu geholt."
    } elseif ($gitAvailable) {
        # $InstallDir kann schon existieren (z.B. weil der Inno-Setup-Installer
        # dort vorab installscript\windows\ abgelegt hat) — git clone verlangt
        # aber ein leeres oder nicht vorhandenes Zielverzeichnis. Deshalb erst in
        # einen Temp-Ordner klonen und von dort ins Zielverzeichnis mergen.
        Write-Host "Abo-Tracker wird nach $InstallDir geklont …"
        $tempClone = Join-Path $env:TEMP "abo-tracker-clone-$([guid]::NewGuid())"
        git clone $RepoUrl $tempClone
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
        Copy-Item -Path (Join-Path $tempClone "*") -Destination $InstallDir -Recurse -Force
        Remove-Item $tempClone -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "Abo-Tracker wird nach $InstallDir geladen (kein git vorhanden, ZIP-Download) …"
        $zipPath = Join-Path $env:TEMP "abo-tracker.zip"
        $extractDir = Join-Path $env:TEMP "abo-tracker-extract"

        Invoke-WebRequest -Uri $ZipUrl -OutFile $zipPath
        if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
        Expand-Archive -Path $zipPath -DestinationPath $extractDir
        Remove-Item $zipPath -Force

        # GitHubs ZIP entpackt in einen Unterordner "abo-tracker-<branch>" —
        # dessen Inhalt wird ins (ggf. schon vorhandene) Zielverzeichnis gemergt.
        $extractedRoot = Get-ChildItem $extractDir -Directory | Select-Object -First 1
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
        Copy-Item -Path (Join-Path $extractedRoot.FullName "*") -Destination $InstallDir -Recurse -Force
        Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
    }

    & (Join-Path $InstallDir "installscript\windows\install.ps1") `
        -Email $Email -Port $Port `
        -NoAutostart:$NoAutostart -NoOpen:$NoOpen -NoStart:$NoStart
} catch {
    Write-Host "FEHLER: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace
    throw
} finally {
    try { Stop-Transcript -ErrorAction SilentlyContinue | Out-Null } catch {}
}
