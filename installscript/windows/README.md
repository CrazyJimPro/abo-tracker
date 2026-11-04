# Abo-Tracker unter Windows

Anleitung für Windows 10 und 11, Schritt für Schritt. Was auf Windows und
Linux gleich ist (was eine Sicherung ist, was beim Zurückspielen passiert),
steht in der [allgemeinen Anleitung](../README.md).

- [Erstinstallation](#erstinstallation)
- [Im Alltag](#im-alltag)
- [Sicherung erstellen](#sicherung-erstellen)
- [Sicherung zurückspielen](#sicherung-zurückspielen)
- [Update](#update)
- [Deinstallation](#deinstallation)
- [Wenn etwas nicht klappt](#wenn-etwas-nicht-klappt)
- [Technische Details](#technische-details)

---

## Erstinstallation

**Du brauchst:** Windows 10 oder 11 und Internet. Sonst nichts: keine
Administratorrechte, keine anderen Programme. Alles, was der Abo-Tracker
braucht, holt sich der Installer selbst.

### Schritt 1: Installer herunterladen

Klicke auf diesen Link:
<https://github.com/CrazyJimPro/abo-tracker/releases/latest/download/AboTrackerSetup.exe>

Der Browser speichert die Datei `AboTrackerSetup.exe` in deinem Ordner
**Downloads**.

> Meldet Microsoft Edge, die Datei werde „nicht häufig heruntergeladen“:
> Mit der Maus auf die Meldung zeigen, auf die drei Punkte **…** klicken,
> dann **Beibehalten**, dann **Mehr anzeigen** und **Trotzdem beibehalten**.

### Schritt 2: Installer starten

1. Den Ordner **Downloads** öffnen: **Windows-Taste + E** drücken und links
   auf **Downloads** klicken.
2. Doppelklick auf **AboTrackerSetup**.

Erscheint ein blaues Fenster **„Der Computer wurde durch Windows
geschützt“**, ist das normal: Der Installer hat keine kostenpflichtige
Unterschrift. Auf **Weitere Informationen** klicken, dann auf **Trotzdem
ausführen**.

### Schritt 3: Ordner

Seite *Ziel-Ordner wählen*: Nichts ändern, auf **Weiter** klicken.

### Schritt 4: Daten übernehmen

Seite *Daten übernehmen*. Hier gibt es zwei Möglichkeiten:

- **Du benutzt den Abo-Tracker zum ersten Mal:** Der obere Punkt
  *„Nein, ohne Sicherung weiter“* ist schon ausgewählt. Einfach auf
  **Weiter** klicken.
- **Du hast eine Sicherung** (zum Beispiel vom alten Rechner):
  1. *„Ja, Daten aus einer Sicherung übernehmen“* anklicken, dann **Weiter**.
  2. Seite *Sicherung auswählen*: Steht im Feld schon eine Datei, ist das
     deine neueste Sicherung. Dann einfach **Weiter**.
  3. Ist das Feld leer oder steht die falsche Datei darin: auf **Durchsuchen …**
     klicken, die Sicherung suchen (sie heißt zum Beispiel
     `abo-tracker-2026-09-19.db`), anklicken, **Öffnen**, dann **Weiter**.

> **Tipp:** Lege die Sicherung vorher in deinen Ordner **Downloads**. Dann
> trägt der Installer sie von selbst ein.

### Schritt 5: E-Mail-Adresse

Seite *Admin-Zugang*: Deine E-Mail-Adresse in das Feld tippen und auf
**Weiter** klicken. Mit dieser Adresse meldest du dich später an.

Hast du in Schritt 4 eine Sicherung gewählt, kommt diese Seite nicht. Die
Anmeldedaten stecken dann schon in der Sicherung.

### Schritt 6: Installieren

Seite *Bereit zur Installation*: auf **Installieren** klicken.

Jetzt öffnet sich ein **schwarzes Fenster**, in dem viel Text durchläuft.
Das ist richtig so. **Das Fenster nicht schließen**, einfach warten. Das
dauert meist **2 bis 5 Minuten**. Danach geht es von selbst zu.

### Schritt 7: Passwort aufschreiben

Wenn das schwarze Fenster weg ist, passieren zwei Dinge:

- Der **Browser** öffnet sich mit der Anmeldeseite des Abo-Trackers.
- Der Installer zeigt ein kleines Fenster **„Abo-Tracker ist eingerichtet.“**
  mit deinem **Login** und einem **vorläufigen Passwort**.

**Schreib dir das Passwort jetzt auf.** Es wird nie wieder angezeigt. Es
liegt außerdem schon in der Zwischenablage, du kannst es also gleich mit
**Strg+V** einfügen. Dann auf **OK** und danach auf **Fertigstellen** klicken.

Siehst du das kleine Fenster nicht, liegt es hinter dem Browser. Klicke unten
in der Taskleiste auf das Symbol des Installers.

Hast du in Schritt 4 eine Sicherung gewählt, steht im Fenster stattdessen
**„Die Sicherung wurde eingespielt.“** und wie viele Konten und Abos
übernommen wurden. Dann gilt dein altes Passwort. **OK**, dann **Fertigstellen**.

### Schritt 8: Anmelden

Im Browser (Adresse <http://localhost:3200>):

1. Bei **E-Mail** deine Adresse eintragen, bei **Passwort** das Passwort aus
   Schritt 7 (Strg+V). Auf **Anmelden** klicken.
2. Es erscheint *Passwort ändern*. Zweimal ein neues Passwort eintippen
   (mindestens 8 Zeichen) und auf **Passwort ändern** klicken. Ab jetzt gilt
   dieses Passwort.

**Fertig!** Jetzt kannst du unter **Abos** dein erstes Abo anlegen. Wie es
weitergeht (weitere Personen anlegen usw.), steht unter
[Nach der ersten Installation](../README.md#nach-der-ersten-installation).

**Windows-Firewall:** Fragt Windows beim ersten Start nach, darfst du dir
aussuchen: **Zugriff zulassen**, wenn du den Abo-Tracker auch vom Handy aus
nutzen willst, sonst **Abbrechen**. Am Rechner selbst funktioniert er in
beiden Fällen.

---

## Im Alltag

Du musst nichts starten. Der Abo-Tracker startet **von selbst, sobald du dich
bei Windows anmeldest**.

**So öffnest du ihn:** Auf den **Start**-Knopf klicken, `Abo-Tracker`
eintippen und **Abo-Tracker öffnen** anklicken. Oder im Browser die Adresse
<http://localhost:3200> aufrufen. Am besten gleich ein Lesezeichen anlegen.

Im **Startmenü** unter *Abo-Tracker* gibt es außerdem:

| Eintrag | Wozu |
| --- | --- |
| **Abo-Tracker öffnen** | öffnet die App im Browser (und startet sie, falls sie nicht läuft) |
| **Abo-Tracker starten** / **stoppen** | App von Hand starten bzw. anhalten |
| **Abo-Tracker sichern** | legt eine Sicherung auf dem Desktop ab, siehe unten |
| **Abo-Tracker wiederherstellen** | spielt eine Sicherung zurück, siehe unten |
| **Deinstallieren** | entfernt den Abo-Tracker |

---

## Sicherung erstellen

Mach ab und zu eine Sicherung, und immer vor einem Update. Dafür musst du
Admin sein, sonst siehst du die Karte nicht.

1. Den Abo-Tracker öffnen und oben auf **Einstellungen** klicken.
2. In der Karte **Sicherung** auf **Sicherung erstellen** klicken.
3. Der Browser speichert die Datei `abo-tracker-<Datum>.db` in deinem Ordner
   **Downloads**.
4. Die Datei an einen sicheren Ort kopieren, zum Beispiel auf einen
   USB-Stick.

**Oder über das Startmenü:** *Abo-Tracker sichern*. Das legt die Sicherung im
Ordner **`abo-backup`** auf deinem Desktop ab und zeigt am Ende ein Fenster
mit dem Ergebnis. Dort bleiben die **letzten 10** Sicherungen liegen, ältere
werden automatisch gelöscht.

Beides geht, während der Abo-Tracker läuft. Mehr dazu in der
[allgemeinen Anleitung](../README.md#backup).

---

## Sicherung zurückspielen

### Bei der Installation

Im Installer auf der Seite *Daten übernehmen* „Ja“ wählen, siehe
[Erstinstallation, Schritt 4](#schritt-4-daten-übernehmen). Das ist der
richtige Weg für einen neuen Rechner.

### Wenn der Abo-Tracker schon installiert ist

Zum Beispiel, wenn du aus Versehen etwas gelöscht hast:

1. Auf den **Start**-Knopf klicken, `Abo-Tracker wiederherstellen` eintippen
   und anklicken.
2. Es öffnet sich das Fenster *Sicherung zum Zurückspielen auswählen*. Ist
   schon eine Datei ausgewählt, ist das deine neueste Sicherung aus
   **Downloads** oder `abo-backup`. Sonst die Sicherung suchen (USB-Stick,
   Dokumente …) und anklicken. Dann auf **Öffnen** klicken.
3. Ein Fenster zeigt, welche Sicherung eingespielt wird. Auf **Ja** klicken.
4. Nach ein paar Sekunden meldet ein Fenster, wie viele Konten und Abos
   zurückgekommen sind. **OK** klicken. Das schwarze Fenster im Hintergrund
   kannst du danach mit dem **X** oben rechts schließen.
5. Im Browser die Seite neu laden (**F5**).

**Abbrechen** oder **Nein** ändert nichts. Ist die Datei keine richtige
Sicherung, sagt dir ein Fenster das, und deine Daten bleiben, wie sie sind.

Deine Daten von vorher gehen nicht verloren: Sie werden vorher als
`vor-wiederherstellung-<Datum>.db` im Ordner `abo-backup` auf dem Desktop
abgelegt. Die Passwörter kommen mit dem Stand der Sicherung zurück, mehr dazu
in der [allgemeinen Anleitung](../README.md#restore).

Für Fortgeschrittene geht es auch ohne Fenster, in PowerShell:

```powershell
cd $env:LOCALAPPDATA\Abo-Tracker
installscript\windows\restore.ps1 -From "D:\Sicherungen\abo-tracker-2026-09-19.db"
```

---

## Update

Steht oben im Abo-Tracker **„Update verfügbar“**, gibt es eine neue Version.
Deine Abos, Konten und Passwörter bleiben beim Update erhalten.

1. **Sicherung erstellen**, wie oben unter
   [Sicherung erstellen](#sicherung-erstellen) beschrieben. Nur zur
   Sicherheit.
2. **Neuen Installer herunterladen** über diesen Link:
   <https://github.com/CrazyJimPro/abo-tracker/releases/latest/download/AboTrackerSetup.exe>
   Bitte immer frisch herunterladen, nicht eine alte Datei wiederverwenden.
3. **Starten:** Im Ordner **Downloads** doppelt auf die neue
   **AboTrackerSetup** klicken. Kommt das blaue Windows-Fenster, wieder
   **Weitere Informationen** und **Trotzdem ausführen**.
4. Seite *Daten übernehmen*: **„Nein, ohne Sicherung weiter“** lassen und
   auf **Weiter** klicken. Bitte hier **nicht „Ja“** wählen, sonst werden deine
   aktuellen Daten durch die alte Sicherung ersetzt.
   (Kommt vorher die Seite mit dem Ordner, nichts ändern und **Weiter**. Die
   Frage nach der E-Mail kommt beim Update nicht.)
5. Seite *Bereit zur Installation*: **Installieren** klicken. Das schwarze Fenster läuft
   wieder ein paar Minuten. Nicht schließen, einfach warten.
6. Ein Passwort-Fenster kommt diesmal nicht. Auf **Fertigstellen** klicken.
7. Im Browser die Seite neu laden (**F5**). Oben neben „Abo-Tracker“ steht
   jetzt die neue Versionsnummer, und „Update verfügbar“ ist verschwunden.

---

## Deinstallation

Der Abo-Tracker lässt sich ganz entfernen. Keine Sorge um deine Daten: Der
Deinstaller fragt vorher, ob er sie auf den Desktop retten soll.

1. Auf den **Start**-Knopf klicken, dann auf **Einstellungen** (das Zahnrad).
2. Links auf **Apps**, dann auf **Installierte Apps**.
   (Windows 10: **Apps**, dann **Apps & Features**.)
3. In das Suchfeld `Abo-Tracker` eintippen.
4. Rechts neben *Abo-Tracker* auf die drei Punkte **…** klicken, dann auf
   **Deinstallieren**, und noch einmal auf **Deinstallieren**.
   (Windows 10: auf *Abo-Tracker* klicken, dann zweimal **Deinstallieren**.)
5. Die Frage *„Sind Sie sicher, dass Sie Abo-Tracker und alle zugehörigen
   Komponenten entfernen möchten?“* mit **Ja** beantworten.
6. Die Frage *„Soll vorher eine Kopie auf dem Desktop abgelegt werden?“* mit
   **Ja** beantworten. Ein schwarzes Fenster blitzt kurz auf.
7. Zum Schluss meldet ein Fenster *„Abo-Tracker wurde erfolgreich von Ihrem
   Computer entfernt.“* **OK** klicken.

**Deine Daten** liegen danach auf dem Desktop im Ordner
`abo-tracker-backup-<Datum>`, darin die Datei `abo-tracker.db`. Heb diesen
Ordner gut auf. Installierst du den Abo-Tracker später wieder, wählst du
diese Datei in [Schritt 4](#schritt-4-daten-übernehmen) als Sicherung aus.

Hast du in Schritt 6 **Nein** gesagt, sind alle Abos und Konten endgültig
weg.

Der Abo-Tracker lässt sich genauso über das Startmenü entfernen:
*Abo-Tracker* → *Deinstallieren*, weiter ab Schritt 5.

---

## Wenn etwas nicht klappt

Viele Lösungen unten erwähnen den **Programmordner**. So öffnest du ihn:
**Windows-Taste + R** drücken, `%LOCALAPPDATA%\Abo-Tracker` eintippen und
**Enter** drücken.

| Problem | Lösung |
| --- | --- |
| Der Browser zeigt „Seite nicht erreichbar“ | Startmenü → *Abo-Tracker öffnen*. Das startet die App, falls sie nicht läuft. |
| Das Passwort-Fenster nach der Installation ist nicht zu sehen | Es liegt hinter dem Browser: unten in der Taskleiste auf das Symbol des Installers klicken. |
| Vorläufiges Passwort nicht aufgeschrieben, noch nie angemeldet | Den Abo-Tracker [deinstallieren](#deinstallation) (bei der Frage nach der Kopie **Nein**, es gibt ja noch keine Daten) und neu [installieren](#erstinstallation). Dann gibt es ein neues Passwort. |
| Passwort vergessen | Eine andere Person mit Admin-Rechten setzt es im Bereich *Admin* zurück. Das vorläufige Passwort ist absichtlich nirgends gespeichert. |
| Die Installation bricht ab | Im Programmordner liegt die Datei `install.log` mit allem, was im schwarzen Fenster stand. Sie hilft bei der Fehlersuche. |
| Die App startet nicht | Die Datei `prod-server.err.log` im Programmordner nennt den Grund. |
| Nach einem Windows-Update startet die App nicht mehr von selbst | Den Installer noch einmal ausführen, genau wie beim [Update](#update). Das richtet den Autostart neu ein. |
| „Port 3200 ist belegt“ | Ein anderes Programm benutzt denselben Port. In PowerShell im Programmordner: `installscript\windows\start-prod.ps1 -Port 3300`, dann <http://localhost:3300> öffnen. |
| App nur auf diesem Rechner nutzen, ohne Firewall-Frage | In PowerShell im Programmordner: `installscript\windows\start-prod.ps1 -BindHost 127.0.0.1` |

---

## Technische Details

Für alle, die wissen wollen, was unter der Haube passiert.

### Was der Installer macht

Die `.exe` enthält nur ein paar PowerShell-Skripte. Den eigentlichen
Programmcode lädt sie bei jeder Installation frisch von GitHub.

| Schritt | Inhalt |
| --- | --- |
| 1 | aktuellen Programmcode von GitHub laden (`bootstrap.ps1`) |
| 2 | Node.js suchen (ab 22.18), sonst portabel nach `node-runtime\` laden, ohne Eingriff ins System |
| 3 | Abhängigkeiten installieren (`npm ci --ignore-scripts`) |
| 4 | `.env.local` anlegen, falls sie fehlt |
| 5 | ggf. Sicherung einspielen, dann Datenbank anlegen bzw. aktualisieren |
| 6 | Admin-Konto anlegen, falls noch keins existiert |
| 7 | App bauen, Server starten (Port 3200) |
| 8 | Autostart über die Aufgabenplanung einrichten (Aufgabe „AboTracker“, bei Anmeldung) |

Alle Schritte laufen über `install.ps1` und sind wiederholbar: Ein zweiter
Lauf aktualisiert, ohne Daten anzufassen. Die Skripte liegen nach der
Installation unter `installscript\windows\` im Programmordner:

| Skript | Zweck |
| --- | --- |
| `install.ps1` | Installation / Update (Optionen: `-Email`, `-RestoreFrom <pfad>`, `-Port`, `-NoStart`, `-NoOpen`, `-NoAutostart`) |
| `open-app.ps1`, `start-prod.ps1`, `stop-prod.ps1` | Server und Browser |
| `backup.ps1` | Sicherung nach `Desktop\abo-backup` (`-ShowResult` zeigt ein Ergebnisfenster) |
| `restore.ps1` | Sicherung zurückspielen. Ohne Angabe per Fenster „Datei öffnen“, mit `-From <pfad>` direkt; `-Force` fragt nicht nach und nimmt ohne `-From` die neueste gefundene Sicherung. |
| `uninstall.ps1` | Hilfsskript des Deinstallers. Nicht zum Deinstallieren direkt aufrufen, es löscht den Ordner nicht. `-KeepData` kopiert `data\` auf den Desktop. |

### Keine Build-Werkzeuge nötig

`better-sqlite3`, die Datenbank-Bibliothek, bringt fertig kompilierte Dateien
für Windows (x64 und ARM64) mit. Python oder Visual Studio Build Tools
braucht es deshalb nicht. Frühere Versionen des Installers haben beides
installiert. Das war unnötig, sie liegen auf älteren Installationen eventuell
noch herum und werden beim Deinstallieren nicht entfernt. Wer sie nicht
anderweitig braucht:

```powershell
winget uninstall --id Microsoft.VisualStudio.2022.BuildTools
winget uninstall --id Python.Python.3.12
```

Die Installation läuft mit `npm ci --ignore-scripts`: Keine Abhängigkeit
braucht ihr Installationsskript, jede bezieht ihre fertigen Dateien aus einem
Plattform-Paket. Das zusätzliche `allowScripts`-Feld in `package.json`
versteht erst npm 12. Ältere npm-Versionen (npm 10 bei Node 22) würden für
`better-sqlite3` sonst einen unnötigen Compiler-Lauf starten, der ohne Build
Tools scheitert.

### Installer selbst bauen

Normalerweise nicht nötig: Bei jedem Versions-Tag (`v*`) baut der Workflow
[`build-windows-installer.yml`](../../.github/workflows/build-windows-installer.yml)
die `.exe` und hängt sie an das GitHub-Release. Über *Actions → Windows-
Installer bauen → Run workflow* lässt sie sich auch ohne Release bauen (zum
Testen). Von Hand, mit [Inno Setup](https://jrsoftware.org/isinfo.php):

```powershell
iscc installscript\windows\setup.iss
```

Ergebnis: `installscript\windows\dist\AboTrackerSetup.exe`.
