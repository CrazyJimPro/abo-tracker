#Requires -Version 5.1
<#
Stoppt den von start-prod.ps1 gestarteten Server, falls einer läuft.
Windows-Pendant zu ../../scripts/stop-prod.sh.

Schaut wie das Linux-Original auf den tatsächlich lauschenden Prozess statt
blind der PID-Datei zu vertrauen — die veraltet z.B. nach jedem Neustart.
Und wie das Linux-Original wird ein fremder Prozess auf dem Port nicht
angefasst, sondern gemeldet.
#>

[CmdletBinding()]
param([int]$Port = 3200)

$ErrorActionPreference = "Stop"

$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallScriptDir = Split-Path -Parent $WindowsDir
$ProjectDir = Split-Path -Parent $InstallScriptDir
$PidFile = Join-Path $ProjectDir ".server.pid"

. (Join-Path $WindowsDir "find-server.ps1")

$owner = Get-PortOwner -Port $Port

if (-not $owner) {
    Write-Host "Server läuft nicht (Port $Port)."
    Remove-Item $PidFile -ErrorAction SilentlyContinue
    exit 0
}

# Auf Port 3200 kann ebensogut etwas anderes lauschen — ein "Stop-Process
# -Force" auf alles, was den Port belegt, schoss vorher fremde Software ab.
if (-not (Test-IsOurServer -Process $owner -ProjectDir $ProjectDir -PidFile $PidFile)) {
    throw "Port $Port ist von einem fremden Prozess belegt (PID $($owner.Id), $($owner.ProcessName)) — der wird hier nicht beendet. Mit -Port <nummer> den richtigen Port angeben."
}

$processId = $owner.Id
Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue

if (-not (Wait-PortFree -Port $Port -TimeoutSeconds 5)) {
    Write-Host "Port $Port ist noch belegt — der Prozess braucht offenbar länger." -ForegroundColor Yellow
}

Remove-Item $PidFile -ErrorAction SilentlyContinue
Write-Host "Server gestoppt (war PID $processId, Port $Port)."
