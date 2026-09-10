; Abo-Tracker — Windows-Installer (Inno Setup).
;
; Erzeugt eine einzige AboTrackerSetup.exe, die Node.js (portabel, ohne
; Systemeingriff), die App-Abhängigkeiten und die lokale SQLite-Datenbank
; einrichtet, die App baut, den Server startet und einen Autostart-Eintrag
; (Aufgabenplanung, "bei Login") anlegt. Windows-Pendant zu
; ../install.sh + ../bootstrap.sh.
;
; Bauen (auf Windows, oder z.B. via GitHub Actions windows-latest-Runner):
;   iscc installscript\windows\setup.iss
; Ergebnis liegt danach in installscript\windows\dist\AboTrackerSetup.exe.
;
; Der Installer selbst enthält keinen App-Code — er lädt ihn bei der
; Installation von GitHub (wie bootstrap.sh unter Linux), braucht also eine
; Internetverbindung. Das hält den Installer klein und die Installation
; immer auf dem neuesten main-Stand.

#define MyAppName "Abo-Tracker"
; Von aussen überschreibbar: der Release-Workflow gibt die Version des
; gepushten v*-Tags mit "iscc /DMyAppVersion=1.7.0 ..." herein. Ohne das trug
; jede gebaute .exe die hier zuletzt von Hand gepflegte Nummer — ein Release
; v1.7.0 hätte sich in "Apps & Features" weiter als 1.6.5 eingetragen.
#ifndef MyAppVersion
  #define MyAppVersion "1.6.6"
#endif
#define MyAppPublisher "Abo-Tracker"
#define MyAppURL "https://github.com/CrazyJimPro/abo-tracker"

[Setup]
AppId={{6E1D9B2A-6B1B-4B8C-9C7F-ABO7TRACKER01}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={localappdata}\Abo-Tracker
DefaultGroupName=Abo-Tracker
DisableProgramGroupPage=yes
; Keine Admin-Rechte nötig — Installation landet unter %LOCALAPPDATA%,
; Node läuft portabel, der Autostart-Task ist ein Benutzer-Task.
PrivilegesRequired=lowest
; Ohne das läuft Setup.exe (und alles, was es via [Run] mit "powershell.exe"
; startet) als 32-Bit-Prozess unter WOW64 — Windows leitet "powershell.exe"
; dann per Dateisystem-Umleitung auf die 32-Bit-PowerShell aus SysWOW64 um
; statt die echte 64-Bit-PowerShell zu nehmen. Das führte zu einem
; sporadischen, aber reproduzierbaren Build-Fehler in Turbopacks nativer
; Modul-Auflösung (better-sqlite3), obwohl Node selbst weiterhin korrekt als
; 64-Bit-Prozess lief.
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=dist
OutputBaseFilename=AboTrackerSetup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
; Zeigte vorher auf uninstall.ps1 — eine .ps1 hat keine Icon-Ressource, in
; "Apps & Features" erschien deshalb ein Platzhalter. Der Deinstaller selbst
; existiert immer und bringt ein richtiges Icon mit.
UninstallDisplayIcon={uninstallexe}

[Files]
Source: "find-node.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion
Source: "find-server.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion
Source: "bootstrap.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion
Source: "install.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion
Source: "start-prod.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion
Source: "stop-prod.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion
Source: "open-app.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion
Source: "uninstall.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion

; "Öffnen" geht über open-app.ps1 statt direkt auf die URL: lief der Server
; gerade nicht, landete man vorher auf einer Browser-Fehlerseite ohne jeden
; Hinweis. open-app.ps1 startet ihn bei Bedarf und öffnet erst dann.
[Icons]
Name: "{group}\Abo-Tracker öffnen"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\installscript\windows\open-app.ps1"""
Name: "{group}\Abo-Tracker starten"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\installscript\windows\start-prod.ps1"""
Name: "{group}\Abo-Tracker stoppen"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\installscript\windows\stop-prod.ps1"""
Name: "{group}\Deinstallieren"; Filename: "{uninstallexe}"

; "64bit" schaltet für diesen einen Aufruf die WOW64-Dateisystem-Umleitung ab
; — sonst liefert "powershell.exe" (ohne Pfad, wie Setup.exe selbst ein
; 32-Bit-Prozess) die 32-Bit-PowerShell aus SysWOW64 statt der echten
; 64-Bit-PowerShell (siehe Kommentar bei ArchitecturesInstallIn64BitMode oben).
; Betrifft nur [Run]/[UninstallRun] — die [Icons]-Verknüpfungen oben werden
; später vom Explorer (immer 64-Bit) gestartet, nicht von Setup.exe.
[Run]
Filename: "powershell.exe"; \
    Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\installscript\windows\bootstrap.ps1"" -InstallDir ""{app}"" -Email ""{code:GetAdminEmail}"""; \
    StatusMsg: "Abo-Tracker wird eingerichtet (Node.js, Abhängigkeiten, Datenbank) — das kann einige Minuten dauern …"; \
    Flags: runascurrentuser waituntilterminated 64bit

; Kein [UninstallRun]-Eintrag für uninstall.ps1: Inno wertet den Exit-Code
; eines [UninstallRun]-Programms nicht aus, eine fehlgeschlagene Datensicherung
; würde also stillschweigend übergangen und der Ordner trotzdem gelöscht.
; Der Aufruf passiert deshalb weiter unten in [Code] per Exec(), wo sich der
; Rückgabewert prüfen und die Deinstallation notfalls abbrechen lässt.

; Ohne das kennt Inno Setup nur die 8 .ps1-Dateien aus [Files] — git clone und
; npm install legen tausende weitere Dateien in {app} an (node_modules,
; node-runtime, data\, .git, ...), die Inno nie selbst registriert hat. Der
; eingebaute Uninstaller versucht zwar am Ende, {app} zu entfernen, scheitert
; dabei aber lautlos mit "Failed to delete directory (145)" (Verzeichnis nicht
; leer) und meldet trotzdem "Uninstallation process succeeded" — der
; Projektordner samt Datenbank bliebe sonst komplett erhalten. "filesandordirs"
; entfernt {app} rekursiv, egal was darin liegt.
[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
var
  AdminEmailPage: TInputQueryWizardPage;

procedure InitializeWizard;
begin
  AdminEmailPage := CreateInputQueryPage(wpSelectDir,
    'Admin-Zugang', 'E-Mail-Adresse für den Admin-Account',
    'Wird nur beim allerersten Setup verwendet, um den Admin-Account anzulegen. ' +
    'Bei einer Aktualisierung einer bestehenden Installation bleibt sie unbenutzt.');
  AdminEmailPage.Add('E-Mail:', False);
end;

function GetAdminEmail(Param: string): string;
begin
  Result := AdminEmailPage.Values[0];
end;

// Liegt im Zielordner schon eine Datenbank, existiert der Admin-Account
// längst und die E-Mail wird nirgends verwendet — dann ist die Seite beim
// Aktualisieren nur eine Pflichteingabe ohne Wirkung.
function IsExistingInstallation: Boolean;
begin
  Result := FileExists(ExpandConstant('{app}\data\abo-tracker.db'));
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := (PageID = AdminEmailPage.ID) and IsExistingInstallation;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = AdminEmailPage.ID then
  begin
    if (Pos('@', AdminEmailPage.Values[0]) = 0) then
    begin
      MsgBox('Bitte eine gültige E-Mail-Adresse eingeben (nur nötig, falls noch kein Admin-Account existiert).', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

// MsgBox() ist ein normaler Windows-MessageBox-Dialog — Text darin lässt sich
// nicht mit der Maus markieren, nur die gesamte Meldung per Strg+C kopieren
// (kaum bekannt). Statt sich darauf zu verlassen, wird das Passwort hier
// direkt in die Zwischenablage kopiert: eine Datei mit dem Passwort wird von
// PowerShell eingelesen und per Set-Clipboard übernommen — nie über eine
// Kommandozeile, damit Sonderzeichen im generierten Passwort (&, ^, $, ...)
// nicht als Shell-Syntax fehlinterpretiert werden können.
procedure CopyToClipboard(Text: string);
var
  TempFile: string;
  ResultCode: Integer;
begin
  TempFile := ExpandConstant('{tmp}\abo-tracker-pw.txt');
  SaveStringToFile(TempFile, Text, False);
  // {sysnative} statt {sys}: Setup.exe bleibt trotz 64-Bit-Installationsmodus
  // ein 32-Bit-Prozess — "powershell.exe" würde sonst per WOW64-Umleitung auf
  // die 32-Bit-PowerShell aus SysWOW64 zeigen (siehe Kommentar weiter oben).
  Exec(ExpandConstant('{sysnative}\WindowsPowerShell\v1.0\powershell.exe'),
    '-NoProfile -Command "Get-Content -Raw -LiteralPath ''' + TempFile + ''' | Set-Clipboard"',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  DeleteFile(TempFile);
end;

// Das Konsolenfenster von install.ps1 (aus dem [Run]-Schritt oben) schließt
// sich sofort nach dem Skript wieder — ein frisch generiertes Passwort wäre
// dort nur einen Wimpernschlag lang sichtbar. install.ps1 legt es deshalb in
// {app}\.admin-credentials.txt ab; hier wird es in einem Dialog angezeigt,
// den man aktiv wegklicken muss, und die Datei danach sofort gelöscht —
// das Klartext-Passwort soll nicht auf der Platte liegen bleiben.
procedure CurStepChanged(CurStep: TSetupStep);
var
  CredFile: string;
  Lines: TArrayOfString;
begin
  if CurStep = ssPostInstall then
  begin
    CredFile := ExpandConstant('{app}\.admin-credentials.txt');
    if FileExists(CredFile) then
    begin
      if LoadStringsFromFile(CredFile, Lines) and (GetArrayLength(Lines) >= 2) then
      begin
        CopyToClipboard(Lines[1]);
        MsgBox(
          'Abo-Tracker ist eingerichtet.' + #13#10 + #13#10 +
          'Login:    ' + Lines[0] + #13#10 +
          'Passwort: ' + Lines[1] + #13#10 + #13#10 +
          '(Das Passwort steht bereits in der Zwischenablage — nach dem ' +
          'Schließen dieses Fensters direkt mit Strg+V einfügen.)' + #13#10 + #13#10 +
          'Wird beim ersten Login abgefragt und muss dann geändert werden.' + #13#10 +
          'Dieses Passwort wird nirgends noch einmal angezeigt!',
          mbInformation, MB_OK);
      end;
      DeleteFile(CredFile);
    end;
  end;
end;

// [UninstallDelete] weiter oben löscht {app} rekursiv — inklusive data\ mit
// der Datenbank. Das passierte vorher kommentarlos: uninstall.ps1 kennt zwar
// einen -KeepData-Schalter, der reguläre Deinstallationsweg hat ihn aber nie
// gesetzt, und das README verlangte dafür einen manuellen Vorab-Aufruf, den
// im Ernstfall niemand macht. Jetzt wird gefragt, bevor irgendetwas passiert.
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
  KeepDataFlag: string;
  ScriptPath: string;
begin
  if CurUninstallStep = usUninstall then
  begin
    ScriptPath := ExpandConstant('{app}\installscript\windows\uninstall.ps1');
    if not FileExists(ScriptPath) then
      Exit;

    KeepDataFlag := '';
    if FileExists(ExpandConstant('{app}\data\abo-tracker.db')) then
    begin
      if MsgBox(
        'Die Deinstallation entfernt den kompletten Ordner' + #13#10 +
        ExpandConstant('{app}') + #13#10 + #13#10 +
        'Darin liegt auch die Datenbank mit allen erfassten Abos — die ist ' +
        'das einzige, was sich nicht wiederherstellen lässt.' + #13#10 + #13#10 +
        'Soll vorher eine Kopie auf dem Desktop abgelegt werden?',
        mbConfirmation, MB_YESNO) = IDYES then
        KeepDataFlag := ' -KeepData';
    end;

    // {sysnative} statt {sys}: der Deinstaller ist wie Setup.exe ein
    // 32-Bit-Prozess (siehe Kommentar bei ArchitecturesInstallIn64BitMode).
    Exec(ExpandConstant('{sysnative}\WindowsPowerShell\v1.0\powershell.exe'),
      '-NoProfile -ExecutionPolicy Bypass -File "' + ScriptPath + '"' + KeepDataFlag,
      '', SW_SHOW, ewWaitUntilTerminated, ResultCode);

    // Nur wenn tatsächlich gesichert werden sollte, ist ein Fehlschlag hier
    // ein Grund anzuhalten — sonst wäre die Datenbank gleich darauf weg.
    if (KeepDataFlag <> '') and (ResultCode <> 0) then
    begin
      if MsgBox(
        'Die Sicherung der Datenbank hat nicht geklappt.' + #13#10 + #13#10 +
        'Wird jetzt fortgefahren, sind die Daten unwiderruflich weg.' + #13#10 +
        'Trotzdem deinstallieren?',
        mbError, MB_YESNO) = IDNO then
        Abort();
    end;
  end;
end;
