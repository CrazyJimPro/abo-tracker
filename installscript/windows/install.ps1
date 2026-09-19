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

-RestoreFrom <pfad>  Vor den Migrationen eine Sicherung als Datenbank
                     einspielen: eine .db-Datei (backup.ps1) oder ein Ordner
                     mit abo-tracker.db (Deinstallation mit Sicherung). Eine
                     schon vorhandene Datenbank wird vorher nach
                     <Desktop>\abo-backup\vor-wiederherstellung-<Zeit>.db
                     gesichert. Die Konten kommen aus der Sicherung, -Email
                     bleibt dann unbenutzt.
#>

[CmdletBinding()]
param(
    [string]$Email = "",
    [int]$Port = 3200,
    [switch]$NoAutostart,
    [switch]$NoOpen,
    [switch]$NoStart,
    [string]$RestoreFrom = ""
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

# Beendet einen laufenden Abo-Tracker-Server aus genau diesem Projektordner.
# Ein fremder Prozess auf dem Port wird nicht angefasst, sondern gemeldet
# (siehe Test-IsOurServer in find-server.ps1). Läuft nichts, passiert nichts.
function Stop-OurServer {
    param([string]$Reason)

    $proc = Get-PortOwner -Port $Port
    if (-not $proc) { return }
    if (-not (Test-IsOurServer -Process $proc -ProjectDir $ProjectDir -PidFile $PidFile)) {
        throw "Port $Port ist von einem fremden Prozess belegt (PID $($proc.Id), $($proc.ProcessName)). Mit -Port <nummer> einen anderen Port wählen."
    }
    Write-Note "Laufender Abo-Tracker-Server (PID $($proc.Id)) wird $Reason beendet …"
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    # Auf das Prozessende warten, nicht nur auf den freien Port: erst dann
    # gibt Windows die geladenen nativen Module (.node-Dateien) wieder frei.
    Wait-Process -Id $proc.Id -Timeout 10 -ErrorAction SilentlyContinue
    if (-not (Wait-PortFree -Port $Port -TimeoutSeconds 10)) {
        throw "Der laufende Server auf Port $Port ließ sich nicht beenden."
    }
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

# --------------------------------------------- Keine Build-Werkzeuge ---

# Hier stand früher ein Schritt, der die Visual Studio Build Tools (2-4 GB,
# mit UAC-Nachfrage) und Python über winget nachinstallierte. Begründung war,
# better-sqlite3 habe keine vorkompilierten Windows-Binaries und müsse bei
# jeder Installation nativen Code kompilieren. Das ist nachweislich falsch:
# better-sqlite3 13.x liefert Node-API-Prebuilds mit (prebuilds\win32-x64.node,
# dazu win32-arm64, macOS und Linux). Node-API heißt ABI-stabil — ein neuer
# Node-Hauptversionssprung entwertet sie nicht.
#
# Sein binding.gyp ist ausdrücklich dafür gebaut, bei vorhandenem Prebuild
# nichts zu tun ("npm's implicit node-gyp rebuild should do nothing when the
# package contains a prebuild for the host"). Gemessen am 2026-09-18: lässt
# man das Install-Script trotzdem laufen, startet node-gyp MSBuild.exe — und
# legt in build\Release keine einzige .node-Datei ab. Die Build-Werkzeuge
# wurden also für einen Build gebraucht, der nichts produziert.
#
# Seit npm 12 blockiert npm die Install-Scripts von Abhängigkeiten ohnehin,
# solange sie nicht im allowScripts-Feld der package.json stehen. Dort ist
# better-sqlite3 bewusst auf false gesetzt: der Prebuild wird geladen,
# node-gyp läuft nie, und diese Installation braucht weder Python noch einen
# C++-Compiler.
#
# Fehlt für eine Plattform einmal ein Prebuild (etwa bei 32-Bit-Node), fällt
# das im better-sqlite3-Ladetest weiter unten auf und wird dort erklärt.

# ---------------------------------------------------------- Abhängigkeiten ---

Write-Step "Abhängigkeiten installieren"
Write-Note "better-sqlite3 nutzt ein vorkompiliertes Binary, es wird nichts kompiliert."

# Wird gerufen, wenn npm install scheitert oder better-sqlite3 sich nicht laden
# lässt. Frühere Fassungen behaupteten hier pauschal "muss nativen Code
# kompilieren, dafür fehlt Werkzeug" und schickten den Nutzer die Build Tools
# installieren — die falsche Spur, seit npm 12 Install-Scripts blockiert und
# better-sqlite3 Prebuilds mitliefert. Deshalb wird die Ursache jetzt zuerst
# eingegrenzt, statt geraten.
function Write-SqliteFailureHint {
    param([string]$Output = "")

    # Die Frage, die alles entscheidet: gibt es für diese Plattform überhaupt
    # ein Prebuild? lib/binding.js schreibt genau dafür 1 oder 0 nach stdout,
    # wenn man es direkt aufruft — dieselbe Prüfung, die binding.gyp nutzt.
    $bindingProbe = Join-Path $ProjectDir "node_modules\better-sqlite3\lib\binding.js"
    $prebuild = ""
    if (Test-Path $bindingProbe) {
        $prevEap = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try { $prebuild = (& $Node $bindingProbe 2>$null | Out-String).Trim() } catch { $prebuild = "" }
        finally { $ErrorActionPreference = $prevEap }
    }

    $arch = ""
    try { $arch = (& $Node -p "process.platform + '-' + process.arch" 2>$null | Out-String).Trim() } catch { }
    if ($arch) { Write-Note "Plattform dieser Node-Installation: $arch" }

    if ($prebuild -eq "0") {
        # Kein Prebuild: nur hier sind Build-Werkzeuge wirklich nötig, und nur
        # hier muss zusätzlich das Install-Script freigegeben werden. Ohne die
        # Freigabe bliebe node-gyp blockiert und der Compiler nutzlos.
        Write-Note "Für diese Plattform liefert better-sqlite3 kein vorkompiliertes Binary mit."
        Write-Note "Dann muss es kompiliert werden, und dafür braucht es beides:"
        Write-Note "  1. Build-Werkzeuge:"
        Write-Note "     winget install --id Microsoft.VisualStudio.2022.BuildTools --override ""--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"""
        Write-Note "     winget install --id Python.Python.3.12"
        Write-Note "  2. Freigabe des Install-Scripts (npm blockiert es sonst):"
        Write-Note "     npm install-scripts approve better-sqlite3"
        Write-Note "Ist 64-Bit-Node eine Option, ist der Wechsel darauf der einfachere Weg."
    } elseif ($prebuild -eq "1") {
        # Prebuild liegt vor, laden geht trotzdem nicht: dann ist die Datei
        # beschädigt oder node_modules halb geschrieben — kein Werkzeug- und
        # kein Freigabeproblem.
        Write-Note "Ein passendes Prebuild ist vorhanden, lädt aber nicht — node_modules ist vermutlich beschädigt."
        Write-Note "node_modules löschen und neu installieren:"
        Write-Note "  Remove-Item -Recurse -Force node_modules; npm ci"
    } else {
        Write-Note "node_modules ist unvollständig — better-sqlite3 ist gar nicht installiert."
        Write-Note "Neu installieren:  npm ci"
    }

    if ($Output -match "install scripts blocked|allowScripts") {
        Write-Note "npm hat dabei Install-Scripts blockiert. Das ist normal und erwünscht:"
        Write-Note "die Freigaben stehen im allowScripts-Feld der package.json."
    }
    Write-Note "Danach diesen Installer/install.ps1 erneut ausführen."
}

Push-Location $ProjectDir
try {
    Remove-Item Env:\NODE_ENV -ErrorAction SilentlyContinue

    # Den Server stoppen, BEVOR npm node_modules anfasst — nicht erst vor dem
    # Build. Ein laufender Server hat die nativen Module (better-sqlite3,
    # next-swc) als DLLs geladen, und Windows verweigert das Löschen einer
    # geladenen DLL. "npm ci" räumt node_modules aber zuerst komplett ab und
    # scheiterte deshalb bei jeder Aktualisierung einer laufenden Installation
    # mit "EPERM: operation not permitted, unlink ...next-swc.win32-x64-
    # msvc.node". Aufgefangen hat das nur der Rückfall auf "npm install", der
    # gesperrte Module wegbenennt statt löscht und dabei Reste wie
    # node_modules\.better-sqlite3-XXXX zurückließ. Unter Linux fällt das nicht
    # auf, dort lassen sich geöffnete Dateien löschen. Nebeneffekt: ein
    # fremder Prozess auf dem Port fällt jetzt sofort auf, nicht erst nach
    # mehreren Minuten npm install.
    Stop-OurServer -Reason "für die Aktualisierung"

    # npm schreibt Warnungen nach stderr; unter $ErrorActionPreference =
    # "Stop" würde ein 2>&1-Redirect jede einzelne Zeile davon in einen
    # abbrechenden Fehler verwandeln (PowerShell-5.1-Eigenheit bei nativen
    # Programmen). Deshalb hier kurzzeitig auf "Continue" schalten.
    #
    # ForEach-Object { "$_" } macht aus den ErrorRecords, in die PowerShell
    # jede stderr-Zeile verpackt, wieder schlichten Text. Ohne das erschien
    # schon eine harmlose Deprecation-Warnung im Installationsfenster als
    # roter Fehlerblock ("npm.cmd : npm warn deprecated ...", dazu
    # "NativeCommandError" und Zeilenangabe).
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if (Test-Path "package-lock.json") {
            & $Npm ci --no-audit --no-fund 2>&1 | ForEach-Object { "$_" } | Tee-Object -Variable npmOutput
            if ($LASTEXITCODE -ne 0) {
                Write-Note "npm ci fehlgeschlagen, versuche npm install …"
                & $Npm install --no-audit --no-fund 2>&1 | ForEach-Object { "$_" } | Tee-Object -Variable npmOutput
            }
        } else {
            & $Npm install --no-audit --no-fund 2>&1 | ForEach-Object { "$_" } | Tee-Object -Variable npmOutput
        }
    } finally {
        $ErrorActionPreference = $prevEap
    }
    if ($LASTEXITCODE -ne 0) {
        # Nur bei Hinweisen auf die nativen Abhängigkeiten erklären — bei einem
        # Netzwerk- oder Registry-Fehler wäre der Prebuild-Hinweis irreführend.
        if ($npmOutput -match "node-gyp|better-sqlite3|install scripts blocked") {
            Write-Note "Der Fehler betrifft die nativen Abhängigkeiten:"
            Write-SqliteFailureHint -Output ($npmOutput -join "`n")
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
        Write-SqliteFailureHint
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

    # Seed und Admin-Anlage sind TypeScript und laufen über Nodes
    # Type-Stripping; ohne den Schalter warnt Node bei jedem Aufruf über das
    # fehlende "type" in package.json (MODULE_TYPELESS_PACKAGE_JSON). Das ist
    # hier korrekt so und nur Rauschen — das Linux-Pendant schaltet die Warnung
    # genauso ab (NODE_TS_FLAGS in ../install.sh). Vor dem Build wird der alte
    # Wert wiederhergestellt, damit der Server nicht damit startet.
    $prevNodeOptions = $env:NODE_OPTIONS
    $env:NODE_OPTIONS = ("$prevNodeOptions --disable-warning=MODULE_TYPELESS_PACKAGE_JSON").Trim()

    # Vor den Migrationen, damit eine Sicherung aus einer älteren Version
    # gleich auf das aktuelle Schema gebracht wird. Der Server ist hier schon
    # gestoppt (Stop-OurServer vor npm). Die Sicherheitskopie heißt bewusst
    # nicht abo-tracker-*.db, sonst fiele sie backup.ps1s Aufräumen zum Opfer.
    if ($RestoreFrom) {
        Write-Note "Sicherung wird eingespielt: $RestoreFrom"
        $desktop = [Environment]::GetFolderPath("Desktop")
        if (-not $desktop) { $desktop = Join-Path $env:USERPROFILE "Desktop" }
        $safetyCopy = Join-Path $desktop "abo-backup\vor-wiederherstellung-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').db"
        Remove-Item (Join-Path $ProjectDir ".restore-result.txt") -Force -ErrorAction SilentlyContinue
        $restoreOutput = & $Node (Join-Path $ProjectDir "scripts\restore-db.ts") $RestoreFrom $dbPath $safetyCopy
        $restoreOutput | ForEach-Object { Write-Note $_ }
        if ($LASTEXITCODE -ne 0) { throw "Wiederherstellung fehlgeschlagen — die bisherige Datenbank ist unverändert." }
        Write-Ok "Sicherung eingespielt"
        # setup.iss meldet das Ergebnis nach dem Schließen dieses Fensters in
        # einem Dialog und löscht die Datei danach. Fehlt sie, ist das
        # Einspielen gescheitert.
        $restoredLine = $restoreOutput | Where-Object { $_ -match '^RESTORED ' } | Select-Object -Last 1
        Set-Content -Path (Join-Path $ProjectDir ".restore-result.txt") -Encoding utf8 -Value $restoredLine
    }

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

    if ($null -eq $prevNodeOptions) { Remove-Item Env:\NODE_OPTIONS -ErrorAction SilentlyContinue } else { $env:NODE_OPTIONS = $prevNodeOptions }

    # Gestoppt wurde der Server schon vor npm (siehe dort). Hier nur noch als
    # Absicherung, falls ihn zwischendurch jemand wieder gestartet hat, etwa
    # per Startmenü-Verknüpfung: next build schreibt .next/ neu, unter einem
    # laufenden Server weg.
    Stop-OurServer -Reason "für den Build"

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
            # -User ist hier der eigentliche Fix: ein -AtLogOn-Trigger ohne
            # Benutzer heißt "bei Anmeldung eines BELIEBIGEN Benutzers", und so
            # eine Aufgabe darf nur ein Admin anlegen. Der Installer läuft aber
            # bewusst ohne Admin-Rechte (PrivilegesRequired=lowest) —
            # Register-ScheduledTask scheiterte deshalb bei jeder Installation
            # mit "Zugriff verweigert", der Autostart wurde nie eingerichtet.
            # Mit dem aktuellen Benutzer als Ziel ist es eine gewöhnliche
            # Benutzeraufgabe, die jeder für sich selbst anlegen darf
            # (nachgeprüft als Nicht-Admin: ohne -User abgelehnt, mit -User ok).
            $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name
            $trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
            # -ExecutionTimeLimit 0 ist Absicherung, kein akuter Fix: die
            # Aufgabe endet, sobald start-prod.ps1 fertig ist — den per
            # Start-Process abgekoppelten Node-Server verfolgt die
            # Aufgabenplanung nicht (nachgeprüft: Kindprozess läuft weiter,
            # Aufgabe steht auf "Bereit", LastTaskResult 0). Das Standardlimit
            # PT72H trifft den Server heute also nicht. Greifen würde es erst,
            # wenn start-prod.ps1 irgendwann auf den Server wartet, statt ihn
            # abzukoppeln — dann soll ihn die Aufgabenplanung nicht nach drei
            # Tagen beenden.
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
