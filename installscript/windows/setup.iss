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
#define MyAppVersion "1.6.3"
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
UninstallDisplayIcon={app}\installscript\windows\uninstall.ps1

[Files]
Source: "find-node.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion
Source: "bootstrap.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion
Source: "install.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion
Source: "start-prod.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion
Source: "stop-prod.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion
Source: "uninstall.ps1"; DestDir: "{app}\installscript\windows"; Flags: ignoreversion

[Icons]
Name: "{group}\Abo-Tracker öffnen"; Filename: "http://localhost:3200"
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

[UninstallRun]
Filename: "powershell.exe"; \
    Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\installscript\windows\uninstall.ps1"""; \
    Flags: runascurrentuser waituntilterminated 64bit

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
