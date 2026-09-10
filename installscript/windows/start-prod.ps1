#Requires -Version 5.1
<#
Startet den Produktionsserver im Hintergrund (Windows-Pendant zu
../../scripts/start-prod.sh). Wird sowohl von install.ps1 als auch von der
Aufgabenplanung (Task "AboTracker", eingerichtet von install.ps1 für den
Autostart bei Login) aufgerufen.

Port 3200 by default, wie unter Linux — Kollision mit Port 3100
(Monatsausgaben-App) oder 3000 (Claude-Code-Dev-Preview) vermeiden.

Optionen:
  -BindHost <adresse>   Netzwerkschnittstelle, auf der gelauscht wird.
                        Ohne Angabe lauscht Next.js auf allen Schnittstellen
                        (wie unter Linux, damit der Zugriff von anderen
                        Geräten im Heimnetz funktioniert). Beim allerersten
                        Start fragt deshalb einmal die Windows-Firewall nach.
                        Wer das nicht braucht: -BindHost 127.0.0.1 — dann
                        bleibt die App rein lokal und die Abfrage entfällt.
#>

[CmdletBinding()]
param(
    [int]$Port = 3200,
    [string]$BindHost = ""
)

$ErrorActionPreference = "Stop"

$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallScriptDir = Split-Path -Parent $WindowsDir
$ProjectDir = Split-Path -Parent $InstallScriptDir
$PidFile = Join-Path $ProjectDir ".server.pid"

. (Join-Path $WindowsDir "find-node.ps1")
. (Join-Path $WindowsDir "find-server.ps1")

# Läuft schon einer? Dann nichts tun. Ohne diese Prüfung startete jeder
# weitere Aufruf — etwa ein zweiter Klick auf die Startmenü-Verknüpfung
# "Abo-Tracker starten" — einen zweiten Node, der an EADDRINUSE scheitert,
# vorher aber .server.pid mit seiner eigenen, gleich wieder toten PID
# überschreibt.
$existing = Get-PortOwner -Port $Port
if ($existing) {
    if (Test-IsOurServer -Process $existing -ProjectDir $ProjectDir -PidFile $PidFile) {
        # PID-Datei mitziehen: nach einem Neustart per Aufgabenplanung kann
        # sie veraltet sein, der laufende Server ist trotzdem unserer.
        $existing.Id | Set-Content $PidFile
        Write-Host "Server läuft bereits (PID $($existing.Id), Port $Port)."
        exit 0
    }
    throw "Port $Port ist von einem fremden Prozess belegt (PID $($existing.Id), $($existing.ProcessName)). Mit -Port <nummer> einen anderen Port wählen."
}

$Node = Find-NodeBin -ProjectDir $ProjectDir -MinVersion "22.18.0"
if (-not $Node) {
    throw "Kein passendes Node (>= 22.18) gefunden. Bitte installscript\windows\install.ps1 ausführen."
}

# next absichtlich über seinen absoluten Pfad aufrufen, nicht relativ zum
# Arbeitsverzeichnis: nur so steht der Projektordner in der Kommandozeile des
# Node-Prozesses und Test-IsOurServer (find-server.ps1) kann einen Server aus
# genau dieser Installation von fremder Software auf demselben Port
# unterscheiden.
#
# Die Argumente dabei als eine fertig gequotete Zeichenkette übergeben, nicht
# als Array: Start-Process fügt ein Array unter PowerShell 5.1 ungequotet mit
# Leerzeichen zusammen — bei einem Benutzernamen mit Leerzeichen
# ("C:\Users\Max Mustermann\...") käme in node ein zerrissener Pfad an.
$nextBin = Join-Path $ProjectDir "node_modules\next\dist\bin\next"
$nextArgs = "`"$nextBin`" start -p $Port"
if ($BindHost) { $nextArgs += " -H $BindHost" }

$proc = Start-Process -FilePath $Node `
    -ArgumentList $nextArgs `
    -WorkingDirectory $ProjectDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $ProjectDir "prod-server.log") `
    -RedirectStandardError (Join-Path $ProjectDir "prod-server.err.log") `
    -PassThru

$proc.Id | Set-Content $PidFile
Write-Host "Server gestartet (PID $($proc.Id), Port $Port)."
