#Requires -Version 5.1
<#
Öffnet Abo-Tracker im Browser und startet den Server vorher, falls er gerade
nicht läuft. Liegt hinter der Startmenü-Verknüpfung "Abo-Tracker öffnen".

Die Verknüpfung zeigte vorher direkt auf http://localhost:3200. Lief der
Server in dem Moment nicht (Autostart abgeschaltet, vorher gestoppt, nach
einem Absturz), landete man auf einer Browser-Fehlerseite ohne jeden Hinweis
darauf, was zu tun ist.
#>

[CmdletBinding()]
param([int]$Port = 3200)

$ErrorActionPreference = "Stop"

$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallScriptDir = Split-Path -Parent $WindowsDir
$ProjectDir = Split-Path -Parent $InstallScriptDir

. (Join-Path $WindowsDir "find-server.ps1")

if (-not (Test-PortOpen -Port $Port)) {
    Write-Host "Server läuft nicht — wird gestartet …"
    & (Join-Path $WindowsDir "start-prod.ps1") -Port $Port

    $ready = $false
    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortOpen -Port $Port) { $ready = $true; break }
        Start-Sleep -Milliseconds 250
    }

    if (-not $ready) {
        $errLog = Join-Path $ProjectDir "prod-server.err.log"
        $detail = if (Test-Path $errLog) { "`n`nLetzte Zeilen aus prod-server.err.log:`n" + ((Get-Content $errLog -Tail 10 -ErrorAction SilentlyContinue) -join "`n") } else { "" }
        # Kein throw: das Skript läuft hinter einer Verknüpfung, ein
        # PowerShell-Stacktrace in einem sich sofort schließenden Fenster
        # hilft niemandem. Stattdessen ein Dialog, der stehen bleibt.
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "Der Abo-Tracker-Server ist nicht hochgekommen (Port $Port).$detail",
            "Abo-Tracker", "OK", "Error") | Out-Null
        exit 1
    }
}

Start-Process "http://localhost:$Port"
