# Abo-Tracker unter Linux

Anleitung für Linux mit Desktop (z. B. Ubuntu, Debian, Linux Mint), Schritt
für Schritt. Was auf Windows und Linux gleich ist (was eine Sicherung ist,
was beim Zurückspielen passiert), steht in der
[allgemeinen Anleitung](README.md).

- [Das Terminal in 1 Minute](#das-terminal-in-1-minute)
- [Erstinstallation](#erstinstallation)
- [Im Alltag](#im-alltag)
- [Sicherung erstellen](#sicherung-erstellen)
- [Sicherung zurückspielen](#sicherung-zurückspielen)
- [Update](#update)
- [Deinstallation](#deinstallation)
- [Wenn etwas nicht klappt](#wenn-etwas-nicht-klappt)
- [Technische Details](#technische-details)

---

## Das Terminal in 1 Minute

Unter Linux installierst du den Abo-Tracker über das **Terminal**. Das ist
ein Fenster, in das man Befehle schreibt. Du musst nichts selbst tippen, nur
Befehle von dieser Seite hineinkopieren.

| Was | So geht's |
| --- | --- |
| **Terminal öffnen** | **Strg + Alt + T** drücken. Klappt das nicht: im Anwendungsmenü nach `Terminal` suchen und anklicken. |
| **Befehl kopieren** | In den grauen Kästen auf dieser Seite auf das Kopier-Symbol oben rechts klicken. Oder den Befehl mit der Maus markieren und **Strg + C** drücken. |
| **Befehl einfügen** | Im Terminal **Strg + Umschalt + V** drücken (nur Strg + V geht im Terminal nicht). Oder mit der rechten Maustaste ins Terminal klicken und **Einfügen** wählen. |
| **Befehl ausführen** | **Enter** drücken. |
| **Fertig?** | Wenn wieder eine Zeile erscheint, die mit `$` endet, ist der Befehl fertig. |
| **Text aus dem Terminal kopieren** | Mit der Maus markieren, dann **Strg + Umschalt + C**. |

**Fragen mit `[J/n]` oder `[j/N]`:** Der Großbuchstabe ist die Antwort, die
genommen wird, wenn du einfach **Enter** drückst. `[J/n]` + Enter heißt also
„Ja“, `[j/N]` + Enter heißt „Nein“. Willst du die andere Antwort, tippst du
den Buchstaben (`j` oder `n`) und dann Enter.

---

## Erstinstallation

**Du brauchst:** Internet und das Passwort, mit dem du dich am Rechner
anmeldest (nur für Schritt 2).

### Schritt 1: Terminal öffnen

**Strg + Alt + T** drücken.

### Schritt 2: Zwei Helfer installieren

Diesen Befehl kopieren, im Terminal einfügen und **Enter** drücken:

```bash
sudo apt install -y git curl
```

Das Terminal fragt nach deinem Passwort. Tippe das Passwort, mit dem du dich
am Rechner anmeldest, und drücke **Enter**.

> **Beim Tippen des Passworts siehst du nichts, nicht einmal Sternchen.** Das
> ist normal. Einfach blind tippen und Enter drücken.

Warten, bis wieder die Zeile mit `$` erscheint. Steht dort „ist schon die
neueste Version“, waren die Helfer schon da. Auch gut.

### Schritt 3: Abo-Tracker installieren

Diesen Befehl kopieren, im Terminal einfügen und **Enter** drücken:

```bash
curl -fsSL https://raw.githubusercontent.com/CrazyJimPro/abo-tracker/main/installscript/bootstrap.sh | bash
```

Das lädt den Abo-Tracker in den Ordner `abo-tracker` in deinem persönlichen
Ordner und startet die Installation.

### Schritt 4: Die Fragen beantworten

Unterwegs stellt die Installation ein paar Fragen. Fast immer reicht
**Enter**:

| Frage im Terminal | Was du machst |
| --- | --- |
| *Node 24 über nvm installieren (lädt aus dem Internet)? [J/n]* (kommt nicht immer) | **Enter** |
| *Konten und Abos aus einer Sicherung wiederherstellen? [j/N]* | Zum ersten Mal: **Enter**. Hast du eine Sicherung: `j` und **Enter**, siehe unten. |
| *E-Mail für den Admin-Zugang:* | Deine E-Mail-Adresse tippen, dann **Enter**. Damit meldest du dich später an. (Kommt nicht, wenn du eine Sicherung übernimmst.) |
| *Server nach jedem Neustart automatisch starten? [J/n]* | **Enter** |

**Du hast eine Sicherung?** Am einfachsten geht es so:

1. **Vor** Schritt 3 die Sicherungsdatei (zum Beispiel
   `abo-tracker-2026-09-19.db`) in deinen Ordner **Downloads** legen.
2. Bei der Frage nach der Sicherung `j` und **Enter**.
3. Die Installation zeigt dann *Vorschlag (Enter): …* mit deiner Datei. Noch
   einmal **Enter** drücken. Fertig.

Liegt die Datei woanders, tippst du bei *Pfad zur Sicherung* den Weg dorthin,
zum Beispiel `~/Sicherungen/abo-tracker-2026-09-19.db` (`~` ist dein
persönlicher Ordner). Die **Tab**-Taste ergänzt angefangene Ordner- und
Dateinamen. Stimmt der Weg nicht, fragt die Installation noch einmal. Drückst
du dann nur **Enter**, geht es ohne Sicherung weiter.

### Schritt 5: Warten

Jetzt läuft viel Text durch. Das ist richtig so. **Das Terminal nicht
schließen**, einfach warten. Das dauert meist **3 bis 5 Minuten**.

### Schritt 6: Passwort aufschreiben

Am Ende steht im Terminal **„Fertig.“** und darunter:

- **App:** die Adresse, <http://localhost:3200>
- **Login:** deine E-Mail-Adresse
- **Passwort:** dein **vorläufiges Passwort**

**Schreib dir das Passwort jetzt auf.** Es wird nie wieder angezeigt. (Oder
mit der Maus markieren und mit Strg + Umschalt + C kopieren.)

Hast du eine Sicherung übernommen, steht dort stattdessen
*„(bestehendes Passwort)“*. Dann gilt dein altes Passwort.

Gleichzeitig öffnet sich der **Browser** mit der Anmeldeseite. Das Terminal
kannst du jetzt schließen.

### Schritt 7: Anmelden

Im Browser (Adresse <http://localhost:3200>):

1. Bei **E-Mail** deine Adresse eintragen, bei **Passwort** das Passwort aus
   Schritt 6. Auf **Anmelden** klicken.
2. Es erscheint *Passwort ändern*. Zweimal ein neues Passwort eintippen
   (mindestens 8 Zeichen) und auf **Passwort ändern** klicken. Ab jetzt gilt
   dieses Passwort.

**Fertig!** Jetzt kannst du unter **Abos** dein erstes Abo anlegen. Wie es
weitergeht (weitere Personen anlegen usw.), steht unter
[Nach der ersten Installation](README.md#nach-der-ersten-installation).

---

## Im Alltag

Du musst nichts starten. Der Abo-Tracker startet **von selbst, sobald du dich
am Rechner anmeldest**.

**So öffnest du ihn:** im Browser die Adresse <http://localhost:3200>
aufrufen. Am besten gleich ein Lesezeichen anlegen.

Für Fortgeschrittene, im Terminal:

```bash
cd ~/abo-tracker
setsid -f scripts/start-prod.sh     # App starten (läuft weiter, auch wenn das Terminal zu ist)
scripts/stop-prod.sh                # App anhalten
tail -f prod-server.log             # Protokoll mitlesen (Strg+C beendet das Mitlesen)
```

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

Mehr dazu in der [allgemeinen Anleitung](README.md#backup).

**Oder im Terminal:**

```bash
~/abo-tracker/scripts/backup-to-desktop.sh
```

Das legt die Sicherung im Ordner **`abo-backup`** auf deinem Schreibtisch ab.
Dort bleiben die **letzten 10** Sicherungen liegen, ältere werden
automatisch gelöscht. Beides geht, während der Abo-Tracker läuft.

### Automatisch bei jedem Hochfahren

Praktisch für einen Rechner, der nicht rund um die Uhr läuft:

1. Im Terminal `crontab -e` eingeben und Enter drücken. Beim ersten Mal
   fragt es nach einem Editor: `1` (nano) und Enter.
2. Mit den Pfeiltasten ganz nach unten gehen und diese Zeile einfügen
   (Strg + Umschalt + V):
   ```
   @reboot sleep 60 && $HOME/abo-tracker/scripts/backup-to-desktop.sh >> $HOME/abo-tracker/backup.log 2>&1
   ```
3. Speichern und schließen: **Strg + O**, **Enter**, **Strg + X**.

Ab dann entsteht eine Minute nach jedem Hochfahren eine Sicherung, pro Tag
eine Datei.

---

## Sicherung zurückspielen

### Bei der Installation

Bei der Frage *„Konten und Abos aus einer Sicherung wiederherstellen?“* `j`
antworten, siehe [Erstinstallation, Schritt 4](#schritt-4-die-fragen-beantworten).
Diese Frage kommt nur bei der ersten Installation, nicht beim Update. Das ist
der richtige Weg für einen neuen Rechner.

### Wenn der Abo-Tracker schon installiert ist

Zum Beispiel, wenn du aus Versehen etwas gelöscht hast:

1. Die Sicherungsdatei in deinen Ordner **Downloads** legen.
2. Terminal öffnen (**Strg + Alt + T**), diesen Befehl einfügen und
   **Enter** drücken:
   ```bash
   ~/abo-tracker/scripts/restore.sh
   ```
3. Das Terminal zeigt, welche Sicherung es nimmt (die neueste aus
   **Downloads**, `abo-backup` oder der Deinstallation), und fragt
   *Fortfahren? [j/N]*. Stimmt die Datei: `j` und **Enter**.
4. Nach ein paar Sekunden steht dort *Wiederherstellung abgeschlossen.* Im
   Browser die Seite neu laden (**F5**).

Eine bestimmte Datei nimmst du, indem du ihren Weg dahinter schreibst:

```bash
~/abo-tracker/scripts/restore.sh ~/Sicherungen/abo-tracker-2026-09-19.db
```

Deine Daten von vorher gehen nicht verloren: Sie werden vorher als
`vor-wiederherstellung-<Datum>.db` im Ordner `abo-backup` auf dem
Schreibtisch abgelegt. Die Passwörter kommen mit dem Stand der Sicherung
zurück, mehr dazu in der [allgemeinen Anleitung](README.md#restore).

---

## Update

Steht oben im Abo-Tracker **„Update verfügbar“**, gibt es eine neue Version.
Deine Abos, Konten und Passwörter bleiben beim Update erhalten.

1. **Sicherung erstellen**, wie oben unter
   [Sicherung erstellen](#sicherung-erstellen) beschrieben. Nur zur
   Sicherheit.
2. **Terminal öffnen:** Strg + Alt + T.
3. **Denselben Befehl wie bei der Installation** einfügen und **Enter**
   drücken:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/CrazyJimPro/abo-tracker/main/installscript/bootstrap.sh | bash
   ```
4. **Warten**, meist 2 bis 4 Minuten. Normalerweise kommen keine Fragen.
   Kommt doch eine, einfach **Enter** drücken.
5. Steht **„Fertig.“** im Terminal, im Browser die Seite neu laden (**F5**).
   Oben neben „Abo-Tracker“ steht jetzt die neue Versionsnummer, und „Update
   verfügbar“ ist verschwunden.

Für Fortgeschrittene geht es auch im Programmordner:

```bash
cd ~/abo-tracker
git pull
./installscript/install.sh
```

Nach `git pull` bitte immer `install.sh` ausführen. Nur so werden neue
Bausteine installiert und Änderungen an der Datenbank angewendet.

---

## Deinstallation

1. Terminal öffnen: **Strg + Alt + T**.
2. Diesen Befehl einfügen und **Enter** drücken:
   ```bash
   ~/abo-tracker/installscript/uninstall.sh --keep-data
   ```
3. Bei der Frage *Projektordner … jetzt endgültig entfernen? [J/n]*
   **Enter** drücken.
4. Am Ende steht *„Fertig. Abo-Tracker ist deinstalliert.“*

**Deine Daten** liegen danach in deinem persönlichen Ordner im Ordner
`abo-tracker-data-backup-<Datum>`, darin die Datei `abo-tracker.db`. Heb diesen
Ordner gut auf. Installierst du den Abo-Tracker später wieder, schlägt die
Installation diese Datei bei der Frage nach der Sicherung von selbst vor.

> **Achtung:** Ohne `--keep-data` am Ende des Befehls werden **auch alle Abos
> und Konten gelöscht**, endgültig.

Was danach bleibt: `git`, `curl` und, falls die Installation es geholt hat,
Node.js (im versteckten Ordner `~/.nvm`). Das stört nicht und kann bleiben.

---

## Wenn etwas nicht klappt

| Problem | Lösung |
| --- | --- |
| Strg + V fügt im Terminal nichts ein | Im Terminal heißt es **Strg + Umschalt + V**, oder Rechtsklick → **Einfügen**. |
| Beim Passwort-Tippen erscheint nichts | Das ist normal. Blind weitertippen und Enter drücken. |
| `… ist nicht in der sudoers-Datei` | Dein Benutzer darf keine Programme installieren. Die Person, die den Rechner eingerichtet hat, muss Schritt 2 einmal für dich ausführen. |
| `git wird gebraucht` / `curl: Befehl nicht gefunden` | Schritt 2 wurde übersprungen. `sudo apt install -y git curl`, dann Schritt 3 noch einmal. |
| `Kein Node >= 22.18 gefunden` | Die Frage nach Node wurde mit `n` beantwortet. Schritt 3 noch einmal und bei der Frage einfach **Enter** drücken. |
| Der Browser zeigt „Seite nicht erreichbar“ | Die App läuft nicht. Im Terminal: `cd ~/abo-tracker && setsid -f scripts/start-prod.sh`. Den Grund zeigt `tail -20 ~/abo-tracker/prod-server.log`. |
| Vorläufiges Passwort nicht aufgeschrieben, noch nie angemeldet | `~/abo-tracker/installscript/uninstall.sh` (ohne `--keep-data`, es gibt ja noch keine Daten), dann Schritt 3 noch einmal. Dann gibt es ein neues Passwort. |
| Passwort vergessen | Eine andere Person mit Admin-Rechten setzt es im Bereich *Admin* zurück. |
| `better-sqlite3 lässt sich nicht laden` | Das Skript nennt die Ursache selbst. Meist hilft: `cd ~/abo-tracker && rm -rf node_modules && ./installscript/install.sh`. |
| `Port 3200 ist von einem fremden Prozess belegt` | Ein anderes Programm benutzt den Port. Mit `--port 3300` installieren bzw. `PORT=3300 setsid -f scripts/start-prod.sh` starten, dann <http://localhost:3300> öffnen. |
| `Datenbank nicht gefunden` | Die App wurde nicht über `scripts/start-prod.sh` gestartet. |
| Beim Update: `git pull` bricht mit „local changes“ ab | Im Programmordner wurden Dateien geändert. `cd ~/abo-tracker && git stash`, dann das Update noch einmal. |
| Firefox vergisst die Design-Wahl (hell/dunkel) nach einem Neustart | Passiert beim Zugriff über `localhost` oder eine IP-Adresse, wenn Firefox beim Beenden Cookies löscht. Die Installation zeigt am Ende die zwei passenden Befehle an (fester Name `abo.local` + `scripts/firefox-persist-fix.sh`). |

Wer die Installation ohne Rückfragen braucht (z. B. in einem Skript):

```bash
curl -fsSL https://raw.githubusercontent.com/CrazyJimPro/abo-tracker/main/installscript/bootstrap.sh \
  | bash -s -- --email ich@example.com -y
```

---

## Technische Details

Für alle, die wissen wollen, was unter der Haube passiert.

### Was die Installation macht

| Schritt | Inhalt |
| --- | --- |
| 1 | Node.js suchen (ab 22.18), auf Wunsch Node 24 über nvm installieren |
| 2 | Abhängigkeiten installieren (`npm ci --ignore-scripts`) |
| 3 | `.env.local` aus `.env.example` anlegen, falls sie fehlt |
| 4 | ggf. Sicherung einspielen, dann Datenbank anlegen bzw. aktualisieren und Standard-Kategorien anlegen |
| 5 | Admin-Konto anlegen, falls noch keins existiert |
| 6 | App bauen |
| 7 | Server starten (Port 3200) |
| 8 | Autostart einrichten (`~/.config/autostart/abo-tracker.desktop`) |

`install.sh` ist wiederholbar: Ein zweiter Lauf aktualisiert, ohne Daten
anzufassen. Optionen:

| Option | Wirkung |
| --- | --- |
| `--email <adresse>` | E-Mail des Admin-Kontos, statt nachzufragen |
| `--restore <pfad>` | Sicherung einspielen, statt nachzufragen |
| `--port <nummer>` | Port des Servers (Standard: 3200) |
| `--autostart` / `--no-autostart` | Autostart einrichten bzw. nicht, ohne zu fragen |
| `--no-open` | Browser am Ende nicht öffnen |
| `--no-start` | nur installieren, Server nicht starten |
| `-y`, `--yes` | keine Rückfragen. Eine Sicherung wird dann nur mit `--restore` eingespielt. |

Anderer Zielordner: `ABO_TRACKER_DIR=~/apps/abo-tracker` vor `bash` setzen,
also `curl … | ABO_TRACKER_DIR=~/apps/abo-tracker bash`.

### Skripte

| Skript | Zweck |
| --- | --- |
| `installscript/bootstrap.sh` | holt bzw. aktualisiert den Programmcode (`git clone` / `git pull`) und startet `install.sh` |
| `installscript/install.sh` | Installation / Update |
| `installscript/uninstall.sh` | Deinstallation (`--keep-data`, `-y`) |
| `scripts/start-prod.sh`, `scripts/stop-prod.sh` | Server starten / anhalten (`PORT=…` für einen anderen Port) |
| `scripts/backup-to-desktop.sh` | Sicherung nach `Schreibtisch/abo-backup`, behält die letzten 10 (Variable `KEEP`) |
| `scripts/restore.sh` | Sicherung zurückspielen (`-y` ohne Nachfrage) |

### Sicherung von Hand

Die Datenbank (`data/abo-tracker.db`) läuft im WAL-Modus. Einfaches Kopieren
bei laufendem Server kann eine unvollständige Kopie ergeben. Sauber geht es
entweder mit SQLites eigener Backup-Funktion (das nutzen auch die App und
`backup-to-desktop.sh`):

```bash
cd ~/abo-tracker
node -e 'new (require("better-sqlite3"))("data/abo-tracker.db",{readonly:true}).backup(process.argv[1])' \
  ~/abo-tracker-$(date +%Y-%m-%d).db
```

oder mit angehaltenem Server:

```bash
cd ~/abo-tracker
scripts/stop-prod.sh
cp -a data ~/abo-tracker-backup-$(date +%Y-%m-%d)
setsid -f scripts/start-prod.sh
```

### Keine Build-Werkzeuge nötig

`better-sqlite3`, die Datenbank-Bibliothek, bringt fertig kompilierte Dateien
für Linux (x64, ARM64, musl) mit, `make` oder ein C-Compiler sind nicht
nötig. Deshalb läuft die Installation mit `--ignore-scripts`: npm 10 (bei
Node 22) würde sonst trotzdem einen Compiler-Lauf starten und ohne `make`
scheitern.

Der Workflow
[`test-linux-install.yml`](../.github/workflows/test-linux-install.yml)
spielt bei jeder Änderung an den Installationsskripten eine komplette
Installation samt Wiederherstellung auf einem frischen Ubuntu durch, mit
Node 22 und ohne `make`.
