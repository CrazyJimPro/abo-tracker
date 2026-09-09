#Requires -Version 5.1
<#
Stoppt den von start-prod.ps1 gestarteten Server, falls einer läuft.
Windows-Pendant zu ../../scripts/stop-prod.sh.

Schaut wie das Linux-Original auf den tatsächlich lauschenden Prozess statt
blind der PID-Datei zu vertrauen — die veraltet z.B. nach jedem Neustart.
#>

[CmdletBinding()]
param([int]$Port = 3200)

$ErrorActionPreference = "Stop"

$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallScriptDir = Split-Path -Parent $WindowsDir
$ProjectDir = Split-Path -Parent $InstallScriptDir
$PidFile = Join-Path $ProjectDir ".server.pid"

$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $conn) {
    Write-Host "Server läuft nicht (Port $Port)."
    Remove-Item $PidFile -ErrorAction SilentlyContinue
    exit 0
}

$processId = $conn.OwningProcess
Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue

for ($i = 0; $i -lt 20; $i++) {
    $stillThere = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $stillThere) { break }
    Start-Sleep -Milliseconds 250
}

Remove-Item $PidFile -ErrorAction SilentlyContinue
Write-Host "Server gestoppt (war PID $processId, Port $Port)."
