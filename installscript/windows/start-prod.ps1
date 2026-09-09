#Requires -Version 5.1
<#
Startet den Produktionsserver im Hintergrund (Windows-Pendant zu
../../scripts/start-prod.sh). Wird sowohl von install.ps1 als auch von der
Aufgabenplanung (Task "AboTracker", eingerichtet von install.ps1 für den
Autostart bei Login) aufgerufen.

Port 3200 by default, wie unter Linux — Kollision mit Port 3100
(Monatsausgaben-App) oder 3000 (Claude-Code-Dev-Preview) vermeiden.
#>

[CmdletBinding()]
param([int]$Port = 3200)

$ErrorActionPreference = "Stop"

$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallScriptDir = Split-Path -Parent $WindowsDir
$ProjectDir = Split-Path -Parent $InstallScriptDir

. (Join-Path $WindowsDir "find-node.ps1")

$Node = Find-NodeBin -ProjectDir $ProjectDir -MinVersion "22.18.0"
if (-not $Node) {
    throw "Kein passendes Node (>= 22.18) gefunden. Bitte installscript\windows\install.ps1 ausführen."
}

$proc = Start-Process -FilePath $Node `
    -ArgumentList @("node_modules\next\dist\bin\next", "start", "-p", "$Port") `
    -WorkingDirectory $ProjectDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $ProjectDir "prod-server.log") `
    -RedirectStandardError (Join-Path $ProjectDir "prod-server.err.log") `
    -PassThru

$proc.Id | Set-Content (Join-Path $ProjectDir ".server.pid")
Write-Host "Server gestartet (PID $($proc.Id), Port $Port)."
