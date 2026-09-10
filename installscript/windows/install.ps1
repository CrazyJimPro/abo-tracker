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

# PowerShell 5.1 handelt von sich aus noch TLS 1.0/1.1 aus; nodejs.org und
# GitHub lehnen das inzwischen ab, der Node-Download schlüge sonst auf einem
# frisch aufgesetzten Windows mit einem nichtssagenden Verbindungsfehler fehl.
try {
    [Net.ServicePointManager]::SecurityProtocol =
        [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch { }

# Der Fortschrittsbalken von Invoke-WebRequest kostet unter PowerShell 5.1 bei
# einem ~30-MB-Download ein Vielfaches der eigentlichen Übertragungszeit.
$ProgressPreference = "SilentlyContinue"

$WindowsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallScriptDir = Split-Path -Parent $WindowsDir
$ProjectDir = Split-Path -Parent $InstallScriptDir

. (Join-Path $WindowsDir "find-node.ps1")
. (Join-Path $WindowsDir "find-server.ps1")

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
    # -UseBasicParsing überall: ohne das benutzt Invoke-WebRequest unter
    # PowerShell 5.1 die Internet-Explorer-Engine zum Parsen der Antwort und
    # scheitert auf einem frischen Windows, auf dem die IE-Erstkonfiguration
    # nie durchlaufen wurde.
    $index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -UseBasicParsing
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

    $zipName = "node-$nodeVersion-win-x64.zip"

    Write-Note "Lade Node $nodeVersion …"
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing

    # Gegen die offizielle SHASUMS256.txt prüfen. Ein abgebrochener Download
    # fällt sonst erst beim Entpacken auf — und ein unterwegs veränderter
    # überhaupt nicht, obwohl von hier aus gleich nativer Code kompiliert und
    # ausgeführt wird.
    $shaText = (Invoke-WebRequest -Uri "https://nodejs.org/dist/$nodeVersion/SHASUMS256.txt" -UseBasicParsing).Content
    $shaLine = $shaText -split "`n" | Where-Object { $_ -match "\s\*?$([regex]::Escape($zipName))\s*$" } | Select-Object -First 1
    if (-not $shaLine) {
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
        throw "Keine Prüfsumme für $zipName in SHASUMS256.txt gefunden."
    }
    $expectedHash = ($shaLine -split '\s+')[0]
    $actualHash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash
    if ($actualHash -ne $expectedHash) {
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
        throw "Prüfsumme des Node-Downloads stimmt nicht (erwartet $expectedHash, war $actualHash)."
    }
    Write-Ok "Download per SHA256 geprüft"

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

# ------------------------------------------------------ Build-Werkzeuge ---

# better-sqlite3 hat keine vorkompilierten Windows-Binaries und kompiliert bei
# jeder Installation nativen Code — dafür braucht node-gyp sowohl die Visual
# Studio Build Tools als auch Python. Beide fehlen auf einem frischen Windows-
# Rechner fast immer; statt erst mitten in "npm install" mit einer kryptischen
# gyp-Fehlermeldung aufzugeben, wird hier vorab geprüft und bei Bedarf über
# winget automatisch nachinstalliert, damit die Installation in einem
# Durchgang durchläuft.

function Test-VSBuildToolsAvailable {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
    if (-not (Test-Path $vswhere)) { return $false }
    $path = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    return [bool]$path
}

function Test-PythonAvailable {
    # Get-Command "python"/"py" allein reicht nicht: ohne echtes Python
    # installiert liegt unter WindowsApps ein "App Execution Alias"-Stub mit
    # genau diesem Namen, der beim Ausführen nur den Microsoft Store öffnet.
    # Get-Command findet den Namen trotzdem klaglos — deshalb Treffer aus
    # WindowsApps explizit ausschließen.
    foreach ($cmd in @("py", "python", "python3")) {
        $found = Get-Command $cmd -ErrorAction SilentlyContinue
        if ($found -and $found.Source -notmatch '\\WindowsApps\\') { return $true }
    }
    # winget aktualisiert das System-PATH, aber dieser bereits laufende
    # Prozess sieht davon nichts — deshalb zusätzlich direkt in den üblichen
    # Installationsordnern nachsehen (dieselben, die node-gyp selbst absucht).
    $candidates = Get-ChildItem "$env:LOCALAPPDATA\Programs\Python" -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^Python3\d\d$' }
    foreach ($c in $candidates) {
        if (Test-Path (Join-Path $c.FullName "python.exe")) { return $true }
    }
    return $false
}

Write-Step "Build-Werkzeuge prüfen"

if (Test-VSBuildToolsAvailable) {
    Write-Ok "Visual Studio Build Tools vorhanden"
} else {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "Visual Studio Build Tools fehlen und winget ist nicht verfügbar. Bitte manuell installieren: https://visualstudio.microsoft.com/visual-cpp-build-tools/"
    }
    Write-Note "Visual Studio Build Tools fehlen — werden jetzt automatisch installiert."
    Write-Note "Das braucht eine Admin-Bestätigung (UAC) und kann einige Minuten dauern …"
    & winget install --id Microsoft.VisualStudio.2022.BuildTools --accept-package-agreements --accept-source-agreements `
        --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
    if ($LASTEXITCODE -ne 0 -or -not (Test-VSBuildToolsAvailable)) {
        throw "Visual Studio Build Tools konnten nicht automatisch installiert werden. Bitte manuell: winget install --id Microsoft.VisualStudio.2022.BuildTools --override ""--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"""
    }
    Write-Ok "Visual Studio Build Tools installiert"
}

if (Test-PythonAvailable) {
    Write-Ok "Python vorhanden"
} else {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "Python fehlt und winget ist nicht verfügbar. Bitte manuell installieren: https://www.python.org/downloads/"
    }
    Write-Note "Python fehlt (wird von node-gyp zum Kompilieren gebraucht) — wird jetzt automatisch installiert."
    & winget install --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0 -or -not (Test-PythonAvailable)) {
        throw "Python konnte nicht automatisch installiert werden. Bitte manuell: winget install --id Python.Python.3.12"
    }
    # winget aktualisiert nur das System-PATH (Registry) — dieser bereits
    # laufende Prozess bekommt das nicht automatisch mit, würde node-gyp
    # also "python" trotz erfolgreicher Installation nicht finden lassen.
    $newPython = Get-ChildItem "$env:LOCALAPPDATA\Programs\Python" -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^Python3\d\d$' } |
        Sort-Object Name -Descending | Select-Object -First 1
    if ($newPython) { $env:Path = "$($newPython.FullName);$env:Path" }
    Write-Ok "Python installiert"
}

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
    # Anführungszeichen und einen angehängten Kommentar wegnehmen — das
    # Linux-Pendant sourced .env.local und bekommt beides von der Shell
    # geschenkt, hier muss es von Hand passieren. Ein Kommentar zählt nur,
    # wenn ihm Leerraum vorausgeht, sonst wäre ein "#" im Pfad nicht möglich.
    if ($dbPath -notmatch '^\s*["'']') { $dbPath = ($dbPath -replace '\s+#.*$', '').Trim() }
    $dbPath = ($dbPath -replace '^\s*(["''])(.*)\1\s*$', '$2')
    if (-not $dbPath) { $dbPath = "data/abo-tracker.db" }
    if (-not [System.IO.Path]::IsPathRooted($dbPath)) { $dbPath = Join-Path $ProjectDir $dbPath }
    Write-Note "Datenbank: $dbPath"

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

    # Vor dem Build stoppen, nicht erst danach: next build schreibt .next/ neu,
    # unter einem laufenden Server weg. Aber nur einen Server aus genau diesem
    # Projektordner — vorher traf das "Stop-Process -Force" alles, was
    # zufällig auf dem Port lauschte (das Linux-Pendant in ../install.sh
    # bricht in dem Fall ausdrücklich ab, statt fremde Software abzuschießen).
    $existingProc = Get-PortOwner -Port $Port
    if ($existingProc) {
        if (-not (Test-IsOurServer -Process $existingProc -ProjectDir $ProjectDir -PidFile $PidFile)) {
            throw "Port $Port ist von einem fremden Prozess belegt (PID $($existingProc.Id), $($existingProc.ProcessName)). Mit -Port <nummer> einen anderen Port wählen."
        }
        Write-Note "Laufender Abo-Tracker-Server (PID $($existingProc.Id)) wird für den Build beendet …"
        Stop-Process -Id $existingProc.Id -Force -ErrorAction SilentlyContinue
        if (-not (Wait-PortFree -Port $Port -TimeoutSeconds 10)) {
            throw "Der laufende Server auf Port $Port ließ sich nicht beenden."
        }
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

        # Test-PortOpen statt Test-NetConnection (siehe find-server.ps1):
        # Test-NetConnection braucht auf einem geschlossenen Port über drei
        # Sekunden pro Versuch, aus den gedachten 30 Sekunden Wartezeit
        # wurden damit rund vier Minuten, bevor der Fehler überhaupt
        # auftauchte.
        $ready = $false
        $serverGone = $false
        $deadline = (Get-Date).AddSeconds(60)
        while ((Get-Date) -lt $deadline) {
            if (Test-PortOpen -Port $Port) { $ready = $true; break }
            # Ist der eben gestartete Node schon wieder weg, ist der Start
            # gescheitert — dann nicht noch eine Minute ins Leere warten.
            $startedId = 0
            $recordedPid = Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1
            if ([int]::TryParse(("$recordedPid").Trim(), [ref]$startedId)) {
                if (-not (Get-Process -Id $startedId -ErrorAction SilentlyContinue)) {
                    $serverGone = $true
                    break
                }
            }
            Start-Sleep -Milliseconds 250
        }

        if ($ready) {
            Write-Ok "Server läuft auf http://localhost:$Port"
        } else {
            # Der Grund steht praktisch immer im Fehlerlog — ohne diesen
            # Auszug müsste man ihn in einem Konsolenfenster suchen, das sich
            # gleich darauf schließt.
            $errLog = Join-Path $ProjectDir "prod-server.err.log"
            if (Test-Path $errLog) {
                $tail = Get-Content $errLog -Tail 15 -ErrorAction SilentlyContinue
                if ($tail) {
                    Write-Note ""
                    Write-Note "Letzte Zeilen aus prod-server.err.log:"
                    $tail | ForEach-Object { Write-Note "  $_" }
                }
            }
            $why = if ($serverGone) { "Der Server-Prozess hat sich sofort wieder beendet." } else { "Der Server hat den Port nicht rechtzeitig geöffnet." }
            throw "Server ist nicht hochgekommen. $why Details stehen in prod-server.log / prod-server.err.log"
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
            # -ExecutionTimeLimit 0 ist hier nicht optional: ohne die Angabe
            # setzt New-ScheduledTaskSettingsSet PT72H, und weil start-prod.ps1
            # den Node-Prozess als Kind startet, gilt die Aufgabe für die
            # Aufgabenplanung solange als "läuft" — nach drei Tagen Laufzeit
            # würde sie den Server also von sich aus beenden.
            $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
                -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)

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
        # [Console]::WriteLine statt Write-Host, und das ist der ganze Punkt:
        # bootstrap.ps1 protokolliert den Lauf per Start-Transcript nach
        # install.log, und Write-Host wird seit PowerShell 5.0 mitprotokolliert
        # — das frische Passwort lag damit dauerhaft im Klartext neben der
        # Datenbank, genau das, was setup.iss mit dem sofortigen Löschen von
        # .admin-credentials.txt verhindern soll. [Console]::WriteLine schreibt
        # am PowerShell-Host vorbei direkt auf die Konsole und taucht im
        # Transcript nicht auf (nachgeprüft unter PowerShell 5.1).
        [Console]::WriteLine("  Passwort: $adminPassword")
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
