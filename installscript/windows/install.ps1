#Requires -Version 5.1
<#
Abo-Tracker — Komplett-Installation unter Windows.

Windows-Pendant zu ../install.sh: prüft/installiert Node.js (portabel, ohne
Systemeingriff), installiert die Abhängigkeiten, legt die lokale SQLite-
Datenbank an, seedet die Standard-Kategorien, erstellt den Admin-Account,
baut die App, startet den Server im Hintergrund und richtet den Autostart
ein. Wird normalerweise nicht von Hand aufgerufen, sondern vom Inno-Setup-
Installer (setup.iss) bzw. dessen [Run]-Schritt.

Das Script ist idempotent: ein zweiter Lauf aktualisiert die Installation,
ohne vorhandene Daten (Datenbank, Accounts, Passwörter) anzufassen.
#>

[CmdletBinding()]
param(
    [string]$Email = "",
    [int]$Port = 3200,
    [switch]$NoAutostart,
    [switch]$NoOpen,
    [switch]$NoStart
)

$ErrorActionPreference = "Stop"

$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallScriptDir = Split-Path -Parent $WindowsDir
$ProjectDir = Split-Path -Parent $InstallScriptDir

. (Join-Path $WindowsDir "find-node.ps1")

if (-not (Test-Path (Join-Path $ProjectDir "package.json"))) {
    throw "Kein Projekt gefunden in $ProjectDir — liegt install.ps1 noch im Ordner installscript\windows\?"
}

$MinNode = "22.18.0"
$PidFile = Join-Path $ProjectDir ".server.pid"

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}
function Write-Ok {
    param([string]$Text)
    Write-Host "    OK  $Text" -ForegroundColor Green
}
function Write-Note {
    param([string]$Text)
    Write-Host "    $Text"
}

Write-Host ""
Write-Host "Abo-Tracker — Installation (Windows)" -ForegroundColor White
Write-Note $ProjectDir

# ------------------------------------------------------------------ Node ---

Write-Step "Node.js prüfen"

$Node = Find-NodeBin -ProjectDir $ProjectDir -MinVersion $MinNode
if (-not $Node) {
    Write-Note "Kein Node >= $MinNode gefunden — wird portabel nach node-runtime\ geladen (kein Systemeingriff)."

    # Statt eine feste Version zu hardcoden, wird die neueste passende LTS-
    # Version aus dem offiziellen Index gewählt — das ist robuster als ein
    # Versionsstand, der irgendwann nicht mehr existiert oder veraltet ist.
    $index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json"
    $min = [version]$MinNode
    $candidate = $index | Where-Object {
        $_.lts -ne $false -and ([version]($_.version.TrimStart('v'))) -ge $min
    } | Sort-Object { [version]($_.version.TrimStart('v')) } -Descending | Select-Object -First 1

    if (-not $candidate) {
        throw "Keine passende Node-LTS-Version (>= $MinNode) im offiziellen Index gefunden."
    }

    $nodeVersion = $candidate.version
    $zipUrl = "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-win-x64.zip"
    $zipPath = Join-Path $env:TEMP "node-$nodeVersion-win-x64.zip"
    $extractDir = Join-Path $env:TEMP "node-extract-$nodeVersion"

    Write-Note "Lade Node $nodeVersion …"
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath

    if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
    Expand-Archive -Path $zipPath -DestinationPath $extractDir
    Remove-Item $zipPath -Force

    $nodeRuntimeDir = Join-Path $ProjectDir "node-runtime"
    if (Test-Path $nodeRuntimeDir) { Remove-Item $nodeRuntimeDir -Recurse -Force }
    Move-Item (Join-Path $extractDir "node-$nodeVersion-win-x64") $nodeRuntimeDir
    Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue

    $Node = Join-Path $nodeRuntimeDir "node.exe"
    if (-not (Test-NodeVersionOk $Node $MinNode)) {
        throw "Node-Installation hat nicht geklappt."
    }
}

$NodeDir = Split-Path -Parent $Node
$Npm = Join-Path $NodeDir "npm.cmd"
$env:Path = "$NodeDir;$env:Path"

$nodeVersionOutput = & $Node -v
Write-Ok "Node $nodeVersionOutput  ($Node)"

# ---------------------------------------------------------- Abhängigkeiten ---

Write-Step "Abhängigkeiten installieren"
Write-Note "better-sqlite3 wird dabei ggf. kompiliert, das kann etwas dauern."

function Write-MissingBuildToolsHint {
    param([string]$Output = "")

    Write-Note "better-sqlite3 muss nativen Code kompilieren, dafür fehlt Werkzeug dafür."
    $showVs = -not $Output -or $Output -match "Could not find any Visual Studio installation"
    $showPython = -not $Output -or $Output -match "Could not find any Python installation"
    if ($showVs) {
        Write-Note "Visual Studio Build Tools installieren (braucht Admin-Rechte, ca. 2-4 GB):"
        Write-Note "  winget install --id Microsoft.VisualStudio.2022.BuildTools --override ""--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"""
    }
    if ($showPython) {
        Write-Note "Python installieren (wird von node-gyp zum Kompilieren gebraucht):"
        Write-Note "  winget install --id Python.Python.3.12"
    }
    Write-Note "Danach diesen Installer/install.ps1 erneut ausführen."
}

Push-Location $ProjectDir
try {
    Remove-Item Env:\NODE_ENV -ErrorAction SilentlyContinue

    # npm schreibt Warnungen nach stderr; unter $ErrorActionPreference =
    # "Stop" würde ein 2>&1-Redirect jede einzelne Zeile davon in einen
    # abbrechenden Fehler verwandeln (PowerShell-5.1-Eigenheit bei nativen
    # Programmen). Deshalb hier kurzzeitig auf "Continue" schalten.
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if (Test-Path "package-lock.json") {
            & $Npm ci --no-audit --no-fund 2>&1 | Tee-Object -Variable npmOutput
            if ($LASTEXITCODE -ne 0) {
                Write-Note "npm ci fehlgeschlagen, versuche npm install …"
                & $Npm install --no-audit --no-fund 2>&1 | Tee-Object -Variable npmOutput
            }
        } else {
            & $Npm install --no-audit --no-fund 2>&1 | Tee-Object -Variable npmOutput
        }
    } finally {
        $ErrorActionPreference = $prevEap
    }
    if ($LASTEXITCODE -ne 0) {
        if ($npmOutput -match "node-gyp") {
            Write-MissingBuildToolsHint -Output ($npmOutput -join "`n")
        }
        throw "npm install fehlgeschlagen."
    }

    # Als Datei statt per -e '...' aufrufen: Windows PowerShell 5.1 verliert beim
    # Aufbau der Kommandozeile für native Programme zuverlässig eingebettete
    # doppelte Anführungszeichen in einfach gequoteten -e-Argumenten (aus
    # ":memory:" wird memory: → Syntaxfehler im Node-Code).
    # Muss im Projektordner liegen, nicht in $env:TEMP — Node löst require()
    # bei einer Skriptdatei relativ zu deren eigenem Ordner auf, nicht zum
    # Arbeitsverzeichnis (anders als bei -e), sonst würde node_modules nicht
    # gefunden.
    $sqliteCheckScript = Join-Path $ProjectDir ".abo-tracker-sqlite-check.js"
    Set-Content -Path $sqliteCheckScript -Value 'new (require("better-sqlite3"))(":memory:").close();' -Encoding utf8
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & $Node $sqliteCheckScript 2>$null
    } finally {
        $ErrorActionPreference = $prevEap
        Remove-Item $sqliteCheckScript -Force -ErrorAction SilentlyContinue
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Note "better-sqlite3 lässt sich nicht laden."
        Write-MissingBuildToolsHint
        throw "Abhängigkeiten sind unvollständig."
    }
    Write-Ok "Pakete installiert"

    # --------------------------------------------------------- Konfig ---

    Write-Step "Konfiguration"

    $envLocal = Join-Path $ProjectDir ".env.local"
    if (Test-Path $envLocal) {
        Write-Ok ".env.local vorhanden"
    } else {
        Copy-Item (Join-Path $ProjectDir ".env.example") $envLocal
        Write-Ok ".env.local aus .env.example erzeugt"
    }

    # ------------------------------------------------------- Datenbank ---

    Write-Step "Datenbank anlegen / aktualisieren"

    $dbPathRaw = (Get-Content $envLocal | Where-Object { $_ -match '^\s*DATABASE_PATH\s*=' } | Select-Object -Last 1)
    $dbPath = if ($dbPathRaw) { ($dbPathRaw -split '=', 2)[1].Trim() } else { "data/abo-tracker.db" }
    if (-not [System.IO.Path]::IsPathRooted($dbPath)) { $dbPath = Join-Path $ProjectDir $dbPath }

    # better-sqlite3 legt die Datenbankdatei selbst an, aber nicht deren
    # Elternordner — /data existiert in einem frischen Checkout nicht
    # (steht in .gitignore, siehe ../install.sh Zeile mit "mkdir -p").
    New-Item -ItemType Directory -Path (Split-Path -Parent $dbPath) -Force | Out-Null

    & $Npm run db:migrate
    if ($LASTEXITCODE -ne 0) { throw "Migration fehlgeschlagen." }
    Write-Ok "Migrationen angewendet"

    & $Npm run db:seed
    if ($LASTEXITCODE -ne 0) { throw "Seed fehlgeschlagen." }

    # ----------------------------------------------------- Admin-Konto ---

    Write-Step "Admin-Konto"

    # Als Datei statt per -e @'...'@ aufrufen — siehe Kommentar beim
    # better-sqlite3-Ladetest weiter oben (PowerShell 5.1 verschluckt
    # eingebettete doppelte Anführungszeichen in nativen Kommandozeilen).
    # Muss im Projektordner liegen — siehe Kommentar beim
    # better-sqlite3-Ladetest weiter oben (require()-Auflösung).
    $adminCheckScript = Join-Path $ProjectDir ".abo-tracker-admin-check.js"
    # argv[1] ist bei einer Skriptdatei (anders als bei -e) deren eigener
    # Pfad — das erste echte Argument ist argv[2].
    Set-Content -Path $adminCheckScript -Encoding utf8 -Value @'
const Database = require("better-sqlite3");
const db = new Database(process.argv[2], { readonly: true });
const row = db.prepare("select email from users where role = ? order by created_at limit 1").get("admin");
process.stdout.write(row ? row.email : "");
'@
    try {
        $existingAdmin = & $Node $adminCheckScript $dbPath
    } finally {
        Remove-Item $adminCheckScript -Force -ErrorAction SilentlyContinue
    }

    $adminPassword = ""
    if ($existingAdmin) {
        Write-Ok "Admin existiert bereits: $existingAdmin"
        Write-Note "Passwort vergessen? Zurücksetzen geht im Bereich /admin oder über eine zweite Admin-Person."
    } else {
        if (-not $Email) {
            $Email = Read-Host "      E-Mail für den Admin-Zugang"
        }
        if (-not $Email) { throw "Keine Admin-E-Mail angegeben." }

        $bootstrapOutput = & $Npm run bootstrap-admin --silent -- $Email
        if ($LASTEXITCODE -ne 0) { throw "Admin-Anlage fehlgeschlagen." }
        # ASCII-Marker statt der deutschen Zeile: unter Windows PowerShell 5.1
        # kann die Ausgabe eines Kindprozesses auf eine Art decodiert werden,
        # die visuell korrekt aussieht, aber nicht Unicode-normalisierungs-
        # gleich mit dem Literal im Skript ist — das ließ dieses Pattern auf
        # "Temporäres Passwort: " zuverlässig ins Leere laufen.
        $passwordLine = $bootstrapOutput | Where-Object { $_ -match '^TEMP_PASSWORD=' } | Select-Object -Last 1
        $adminPassword = if ($passwordLine) { $passwordLine -replace '^TEMP_PASSWORD=', '' } else { "" }
        Write-Ok "Admin angelegt: $Email"
    }

    # ------------------------------------------------------------ Build ---

    Write-Step "App bauen"

    $existingProc = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existingProc) {
        Write-Note "Laufender Abo-Tracker-Server (PID $($existingProc.OwningProcess)) wird für den Build beendet …"
        Stop-Process -Id $existingProc.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }

    # --webpack statt des seit Next.js 16 für "next build" defaultmäßigen
    # Turbopack: Turbopack brach den Build reproduzierbar mit "Cannot find
    # module 'better-sqlite3-<hash>'" ab, sobald der Installer selbst (statt
    # einer normalen interaktiven Shell) der aufrufende Prozess war — ein
    # Timing-Fenster, ein Retry im selben oder einem frischen Prozess und
    # sogar ein Fix der Installer-eigenen 32-Bit/WOW64-Prozessumgebung
    # änderten daran nichts, alles deutet auf einen Turbopack-eigenen Bug bei
    # der Auflösung nativer Module in dieser Konstellation hin. Klassisches
    # Webpack baut exakt denselben Code zuverlässig.
    & $Npm run build -- --webpack
    if ($LASTEXITCODE -ne 0) { throw "Build fehlgeschlagen." }
    Write-Ok "Build fertig"

    # ------------------------------------------------------------ Start ---

    if (-not $NoStart) {
        Write-Step "Server starten"

        & (Join-Path $WindowsDir "start-prod.ps1") -Port $Port

        $ready = $false
        for ($i = 0; $i -lt 60; $i++) {
            if (Test-NetConnection -ComputerName "127.0.0.1" -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue) {
                $ready = $true
                break
            }
            Start-Sleep -Milliseconds 500
        }

        if ($ready) {
            Write-Ok "Server läuft auf http://localhost:$Port"
        } else {
            throw "Server ist nicht hochgekommen. Details stehen in prod-server.log / prod-server.err.log"
        }
    }

    # -------------------------------------------------------- Autostart ---

    Write-Step "Autostart"

    if (-not $NoAutostart) {
        # Best-effort: Autostart ist ein Komfort-Feature, kein kritischer
        # Installationsschritt. Manche Umgebungen (Gruppenrichtlinien,
        # eingeschränkte Sitzungen) verweigern Register-ScheduledTask den
        # Zugriff — das soll dann nicht die sonst erfolgreiche Installation
        # als Ganzes scheitern lassen.
        try {
            $taskName = "AboTracker"
            $action = New-ScheduledTaskAction -Execute "powershell.exe" `
                -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$WindowsDir\start-prod.ps1`" -Port $Port"
            $trigger = New-ScheduledTaskTrigger -AtLogOn
            $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
            Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -ErrorAction Stop | Out-Null
            Write-Ok "Autostart eingerichtet (Aufgabenplanung: $taskName, startet bei Login)"
        } catch {
            Write-Note "Autostart konnte nicht eingerichtet werden ($($_.Exception.Message))."
            Write-Note "Manuell starten mit: installscript\windows\start-prod.ps1"
        }
    } else {
        Write-Note "Kein Autostart. Manuell starten mit: installscript\windows\start-prod.ps1"
    }

    # ------------------------------------------------------------ Abschluss ---

    Write-Host ""
    Write-Host "────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "Fertig." -ForegroundColor Green
    Write-Host ""
    if (-not $NoStart) { Write-Host "  App:      http://localhost:$Port" -ForegroundColor White }
    if ($adminPassword) {
        Write-Host "  Login:    $Email"
        Write-Host "  Passwort: $adminPassword" -ForegroundColor White
        Write-Host "            Wird beim ersten Login abgefragt und muss dann geändert werden."
        Write-Host "            Dieses Passwort wird nirgends noch einmal angezeigt."

        # Das Konsolenfenster, in dem dieses Script läuft, schließt sich
        # sofort nach dem [Run]-Schritt von setup.iss — ohne das hier würde
        # das Passwort nur ganz kurz sichtbar aufblitzen. setup.iss liest
        # diese Datei danach aus, zeigt sie in einem Dialog an und löscht sie
        # anschließend wieder (Klartext-Passwort soll nicht liegen bleiben).
        Set-Content -Path (Join-Path $ProjectDir ".admin-credentials.txt") -Encoding utf8 -Value "$Email`n$adminPassword"
    } elseif ($existingAdmin) {
        Write-Host "  Login:    $existingAdmin (bestehendes Passwort)"
    }
    Write-Host ""
    Write-Host "  Stoppen:  installscript\windows\stop-prod.ps1"
    Write-Host "  Log:      prod-server.log / prod-server.err.log"
    Write-Host ""

    if (-not $NoOpen -and -not $NoStart) {
        Start-Process "http://localhost:$Port"
    }
} finally {
    Pop-Location
}
