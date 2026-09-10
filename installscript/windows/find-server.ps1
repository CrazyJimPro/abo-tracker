# Gemeinsame Server- und Port-Auflösung, per Dot-Source von install.ps1,
# start-prod.ps1, stop-prod.ps1 und open-app.ps1 eingebunden. Seitenstück zu
# find-node.ps1.
#
# Kernpunkt ist Test-IsOurServer: ein belegter Port heißt nicht, dass dort
# unser Server lauscht. Das Linux-Pendant (../install.sh) vergleicht dafür
# /proc/<pid>/cwd mit dem Projektordner und bricht bei einem fremden Prozess
# ausdrücklich ab, statt ihn abzuschießen — unter Windows fehlte diese
# Prüfung, ein "Stop-Process -Force" traf hier alles, was zufällig auf dem
# Port lag.

# Schneller TCP-Test auf localhost. Absichtlich nicht Test-NetConnection:
# das braucht auf einem geschlossenen Port über drei Sekunden pro Versuch
# (es hängt Routing- und ICMP-Diagnose an), womit aus einer Warteschleife
# mit 60 Durchläufen Minuten statt Sekunden werden.
function Test-PortOpen {
    param([int]$Port, [int]$TimeoutMs = 300)

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        # Wait() liefert $false bei Zeitüberschreitung und wirft eine
        # AggregateException, wenn die Verbindung aktiv abgelehnt wurde —
        # beides bedeutet hier schlicht "noch nicht da".
        return $client.ConnectAsync([System.Net.IPAddress]::Loopback, $Port).Wait($TimeoutMs)
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

# Der Prozess, der auf $Port lauscht (oder $null).
function Get-PortOwner {
    param([int]$Port)

    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $conn) { return $null }
    return Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
}

# Gehört dieser Prozess zu genau dieser Installation?
function Test-IsOurServer {
    param($Process, [string]$ProjectDir, [string]$PidFile)

    if (-not $Process) { return $false }
    if ($Process.ProcessName -ne "node") { return $false }

    # 1. Die PID-Datei, die start-prod.ps1 beim Start geschrieben hat. Deckt
    #    auch Server ab, die noch eine ältere start-prod.ps1 gestartet hat
    #    (die rief next über einen relativen Pfad auf, siehe Punkt 3).
    if ($PidFile -and (Test-Path $PidFile)) {
        $recorded = Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
        $recordedId = 0
        if ([int]::TryParse(("$recorded").Trim(), [ref]$recordedId) -and $recordedId -eq $Process.Id) {
            return $true
        }
    }

    # 2. Die portable Node-Runtime liegt im Projektordner — eindeutiger geht es nicht.
    $exe = $null
    try { $exe = $Process.Path } catch { }
    if ($exe -and $exe.StartsWith($ProjectDir, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $true
    }

    # 3. Ein System-Node ist nur dann unserer, wenn seine Kommandozeile auf
    #    das next-Binary aus genau diesem Projektordner zeigt (start-prod.ps1
    #    übergibt den Pfad deshalb absolut).
    $cmdline = (Get-CimInstance Win32_Process -Filter "ProcessId = $($Process.Id)" -ErrorAction SilentlyContinue).CommandLine
    if ($cmdline -and $cmdline.IndexOf($ProjectDir, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
        return $true
    }

    return $false
}

# Wartet, bis der Port frei ist (nach einem Stop-Process).
function Wait-PortFree {
    param([int]$Port, [int]$TimeoutSeconds = 10)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (-not (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)) {
            return $true
        }
        Start-Sleep -Milliseconds 250
    }
    return $false
}
