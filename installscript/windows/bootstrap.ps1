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

# Siehe install.ps1 — dieselben zwei Gründe (TLS-1.2-Aushandlung unter
# PowerShell 5.1, Fortschrittsbalken bremst große Downloads massiv aus).
try {
    [Net.ServicePointManager]::SecurityProtocol =
        [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch { }
$ProgressPreference = "SilentlyContinue"

# Holt den aktuellen App-Stand als ZIP von GitHub und legt ihn über
# $InstallDir. data\, .env.local, node_modules\ und .next\ liegen nicht im
# ZIP und bleiben dabei unangetastet.
function Copy-RepoFromZip {
    param([string]$ZipUrl, [string]$InstallDir)

    $zipPath = Join-Path $env:TEMP "abo-tracker-$([guid]::NewGuid()).zip"
    $extractDir = Join-Path $env:TEMP "abo-tracker-extract-$([guid]::NewGuid())"

    Invoke-WebRequest -Uri $ZipUrl -OutFile $zipPath -UseBasicParsing
    Expand-Archive -Path $zipPath -DestinationPath $extractDir
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

    # GitHubs ZIP entpackt in einen Unterordner "abo-tracker-<branch>" —
    # dessen Inhalt wird ins (ggf. schon vorhandene) Zielverzeichnis gemergt.
    $extractedRoot = Get-ChildItem $extractDir -Directory | Select-Object -First 1
    if (-not $extractedRoot) {
        Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
        throw "Das heruntergeladene ZIP war leer oder unerwartet aufgebaut ($ZipUrl)."
    }
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Copy-Item -Path (Join-Path $extractedRoot.FullName "*") -Destination $InstallDir -Recurse -Force
    Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
}

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
            # Ein scheiterndes git wirft hier NICHT: PowerShell 5.1 macht aus
            # der stderr-Ausgabe eines nativen Programms nur dann einen
            # abbrechenden Fehler, wenn sie umgeleitet wird. Ohne diese
            # Prüfung lief der Installer mit dem alten Stand weiter und
            # meldete trotzdem Erfolg — etwa nach lokalen Änderungen im
            # Installationsordner oder einem Force-Push auf main.
            if ($LASTEXITCODE -ne 0) {
                Write-Host "git pull fehlgeschlagen (Code $LASTEXITCODE) — der Stand wird hart auf den Server-Stand gesetzt." -ForegroundColor Yellow
                # reset --hard fasst weder ignorierte noch unversionierte
                # Dateien an: data\, .env.local, node_modules\ und .next\
                # überstehen das unverändert.
                git -C $InstallDir fetch --prune origin
                if ($LASTEXITCODE -eq 0) {
                    git -C $InstallDir reset --hard "@{upstream}"
                }
                if ($LASTEXITCODE -ne 0) {
                    throw "Der App-Code in $InstallDir ließ sich nicht aktualisieren (git-Code $LASTEXITCODE). Ordner löschen und neu installieren, oder von Hand 'git status' darin ansehen."
                }
            }
        } else {
            Write-Host "Kein git gefunden — es wird per ZIP aktualisiert." -ForegroundColor Yellow
            Copy-RepoFromZip -ZipUrl $ZipUrl -InstallDir $InstallDir
        }
    } elseif ($hasProject) {
        # Eine ZIP-Installation hat keinen .git-Ordner, also auch keinen Pull.
        # Vorher endete der Lauf hier mit "wird nicht neu geholt" — der
        # Installer aktualisierte eine ZIP-Installation damit nie, meldete
        # aber trotzdem Erfolg, entgegen dem, was README und Wizard sagen.
        Write-Host "Vorhandene Installation in $InstallDir wird per ZIP aktualisiert …"
        Copy-RepoFromZip -ZipUrl $ZipUrl -InstallDir $InstallDir
    } elseif ($gitAvailable) {
        # $InstallDir kann schon existieren (z.B. weil der Inno-Setup-Installer
        # dort vorab installscript\windows\ abgelegt hat) — git clone verlangt
        # aber ein leeres oder nicht vorhandenes Zielverzeichnis. Deshalb erst in
        # einen Temp-Ordner klonen und von dort ins Zielverzeichnis mergen.
        Write-Host "Abo-Tracker wird nach $InstallDir geklont …"
        $tempClone = Join-Path $env:TEMP "abo-tracker-clone-$([guid]::NewGuid())"
        git clone $RepoUrl $tempClone
        if ($LASTEXITCODE -ne 0) {
            # Ungeprüft wäre der nächste Schritt ein Copy-Item aus einem
            # Ordner, den es gar nicht gibt — mit einer Fehlermeldung, die
            # nichts mehr mit der eigentlichen Ursache zu tun hat.
            Remove-Item $tempClone -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "git clone fehlgeschlagen (Code $LASTEXITCODE) — es wird auf den ZIP-Download ausgewichen." -ForegroundColor Yellow
            Copy-RepoFromZip -ZipUrl $ZipUrl -InstallDir $InstallDir
        } else {
            New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
            Copy-Item -Path (Join-Path $tempClone "*") -Destination $InstallDir -Recurse -Force
            Remove-Item $tempClone -Recurse -Force -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "Abo-Tracker wird nach $InstallDir geladen (kein git vorhanden, ZIP-Download) …"
        Copy-RepoFromZip -ZipUrl $ZipUrl -InstallDir $InstallDir
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
