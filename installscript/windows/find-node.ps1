# Gemeinsame Node-Auflösung, per Dot-Source von install.ps1 und start-prod.ps1
# eingebunden. Pendant zu ../find-node.sh.
#
# Bevorzugt wird die portable Node-Installation unter node-runtime\ im
# Projektordner (von install.ps1 angelegt) — so bleibt eine eventuell auf dem
# Rechner bereits vorhandene, andere Node-Version unangetastet. Erst danach
# wird auf ein System-Node in PATH zurückgegriffen.

function Test-NodeVersionOk {
    param([string]$NodeExe, [string]$MinVersion)

    if (-not (Test-Path $NodeExe)) { return $false }
    try {
        $raw = & $NodeExe -v 2>$null
    } catch {
        return $false
    }
    if (-not $raw) { return $false }

    $version = [version]($raw.TrimStart('v') -replace '-.*$', '')
    $min = [version]$MinVersion
    return $version -ge $min
}

# Gibt den Pfad zu einem passenden node.exe zurück, oder $null.
# Aufruf: Find-NodeBin -ProjectDir $ProjectDir -MinVersion "22.18.0"
function Find-NodeBin {
    param([string]$ProjectDir, [string]$MinVersion)

    $portable = Join-Path $ProjectDir "node-runtime\node.exe"
    if (Test-NodeVersionOk $portable $MinVersion) { return $portable }

    $onPath = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    if ($onPath -and (Test-NodeVersionOk $onPath $MinVersion)) { return $onPath }

    return $null
}
