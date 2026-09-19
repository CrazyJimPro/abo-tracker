# Abo-Tracker unter Linux

Anleitung für Linux mit Desktop (z. B. Ubuntu, Debian, Linux Mint). Was auf
Windows und Linux gleich ist (was eine Sicherung ist, was beim Zurückspielen
passiert, woran man ein Update erkennt), steht in der
[allgemeinen Anleitung](README.md).

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

**Du brauchst:** eine Internetverbindung sowie `git` und `curl`. Fehlen die
beiden, installierst du sie so (Ubuntu/Debian/Mint):

```bash
sudo apt install git curl
```

Node.js musst du nicht vorher installieren, die Installation bietet das
selbst an. Administratorrechte (`sudo`) braucht die Installation nicht.

**1. Terminal öffnen und diesen Befehl einfügen:**

```bash
curl -fsSL https://raw.githubusercontent.com/CrazyJimPro/abo-tracker/main/installscript/bootstrap.sh | bash
```

Das lädt den Abo-Tracker nach `~/abo-tracker` und startet die Installation.

**2. Die Fragen beantworten.** Die Installation fragt unterwegs nur, was sie
wissen muss:

| Frage | Was du antwortest |
| --- | --- |
| *Node 24 über nvm installieren?* (nur wenn Node fehlt oder zu alt ist) | **Enter** (= ja) |
| *Konten und Abos aus einer Sicherung wiederherstellen? [j/N]* | **Enter** für einen Neuanfang. **j**, wenn du eine Sicherung übernehmen willst, siehe unten. |
| *E-Mail für den Admin-Zugang* (nicht bei übernommener Sicherung) | deine E-Mail-Adresse, damit meldest du dich später an |
| *Server nach jedem Neustart automatisch starten?* | **Enter** (= ja) |

**Sicherung übernehmen:** Nach **j** fragt die Installation nach dem Pfad
zur Sicherungsdatei. Die **Tab-Taste** vervollständigt Ordner- und
Dateinamen, `~` steht für deinen Home-Ordner, z. B.
`~/Sicherungen/abo-tracker-2026-09-19.db`. Liegt schon eine Sicherung im
Download-Ordner oder in `abo-backup` auf dem Schreibtisch, wird sie als
Vorschlag angezeigt und mit Enter übernommen. Bei einem Tippfehler fragt die
Installation noch einmal, eine leere Eingabe bricht ab (dann geht es ohne
Sicherung weiter).

**3. Warten.** Die Installation dauert meist **3–5 Minuten**.

**4. Am Ende** stehen im Terminal die Adresse der App und dein **vorläufiges
Passwort**. Es wird nur dieses eine Mal angezeigt, also gleich notieren. Hast
du eine Sicherung übernommen, steht dort stattdessen „bestehendes Passwort“.
Der Browser öffnet sich mit <http://localhost:3200>. Anmelden und dem neuen
Passwort folgen, siehe
[Nach der ersten Installation](README.md#nach-der-ersten-installation).

Wer die Installation ohne Rückfragen braucht (z. B. in einem Skript):

```bash
curl -fsSL https://raw.githubusercontent.com/CrazyJimPro/abo-tracker/main/installscript/bootstrap.sh \
  | bash -s -- --email ich@example.com -y
```

---

## Im Alltag

Mit Autostart startet der Server **automatisch, sobald du dich am Desktop
anmeldest**. Einfach den Browser öffnen: <http://localhost:3200>.

Von Hand, jeweils im Terminal:

```bash
cd ~/abo-tracker
setsid -f scripts/start-prod.sh     # Server starten (läuft weiter, auch wenn das Terminal zu ist)
scripts/stop-prod.sh                # Server anhalten
tail -f prod-server.log             # Protokoll mitlesen (Strg+C beendet das Mitlesen)
```

---

## Sicherung erstellen

**Empfohlen:** in der App unter **Einstellungen → Sicherung erstellen**. Die
Datei landet in deinem Download-Ordner. Näheres dazu in der
[allgemeinen Anleitung](README.md#backup).

**Alternativ im Terminal:**

```bash
~/abo-tracker/scripts/backup-to-desktop.sh
```

Das legt die Sicherung im Ordner **`abo-backup`** auf deinem Schreibtisch ab
(`abo-tracker-<Datum>.db`). Es bleiben die **letzten 10** Sicherungen liegen,
ältere werden automatisch gelöscht. Beides funktioniert, während der
Abo-Tracker läuft.

### Automatisch bei jedem Hochfahren

Praktisch für einen Rechner oder eine VM, die nicht rund um die Uhr läuft:

1. Im Terminal `crontab -e` eingeben (beim ersten Mal einen Editor wählen,
   z. B. `nano`).
2. Diese Zeile ans Ende setzen:
   ```
   @reboot sleep 60 && $HOME/abo-tracker/scripts/backup-to-desktop.sh >> $HOME/abo-tracker/backup.log 2>&1
   ```
3. Speichern und schließen (bei `nano`: Strg+O, Enter, Strg+X).

Ab dann entsteht bei jedem Start eine Minute nach dem Hochfahren eine
Sicherung, pro Tag eine Datei.

---

## Sicherung zurückspielen

### Bei der Installation

Die Frage *„Konten und Abos aus einer Sicherung wiederherstellen?“* mit
**j** beantworten und den Pfad angeben, siehe
[Erstinstallation](#erstinstallation), Schritt 2. Diese Frage kommt nur bei
einer **Erstinstallation**, nicht bei einem Update.

Ohne Rückfrage geht es auch direkt:

```bash
~/abo-tracker/installscript/install.sh --restore ~/Sicherungen/abo-tracker-2026-09-19.db
```

### In einer bestehenden Installation

```bash
cd ~/abo-tracker
scripts/restore.sh ~/Sicherungen/abo-tracker-2026-09-19.db
```

Das Skript zeigt, was es tun wird, und fragt nach. Mit **j** bestätigen. Der
Server wird dabei kurz angehalten und danach wieder gestartet.

Ohne Pfad (`scripts/restore.sh`) nimmt es die neueste Sicherung aus dem
Download-Ordner, aus `abo-backup` auf dem Schreibtisch oder aus einer
Sicherung der Deinstallation.

Was dabei passiert und was du danach beachten solltest (z. B. dass die
Passwörter vom Zeitpunkt der Sicherung zurückkommen), steht in der
[allgemeinen Anleitung](README.md#restore).

---

## Update

Zeigt die App **„Update verfügbar“** an:

1. **Sicherung erstellen**: in der App *Einstellungen → Sicherung erstellen*.
2. **Terminal öffnen und denselben Befehl ausführen wie bei der
   Installation:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/CrazyJimPro/abo-tracker/main/installscript/bootstrap.sh | bash
   ```
   Er erkennt die vorhandene Installation, holt die neue Version und bringt
   alles auf den neuesten Stand. Fragen kommen dabei normalerweise keine:
   Deine Daten bleiben unangetastet, nach einer Sicherung wird nicht gefragt,
   und der Autostart bleibt, wie er ist.
3. Der Server wird automatisch angehalten und neu gestartet. Browser neu
   laden, die neue Versionsnummer steht oben neben dem Schriftzug, der
   Update-Hinweis ist weg.

Gleichwertig, falls du lieber im Programmordner arbeitest:

```bash
cd ~/abo-tracker
git pull
./installscript/install.sh
```

Bitte nach `git pull` immer `install.sh` ausführen. Nur so werden neue
Abhängigkeiten installiert und Änderungen an der Datenbank angewendet.

---

## Deinstallation

```bash
cd ~/abo-tracker
./installscript/uninstall.sh --keep-data
```

Das hält den Server an, entfernt den Autostart und löscht den Programmordner.
Mit `--keep-data` wird die Datenbank vorher nach
`~/abo-tracker-data-backup-<Datum>/` kopiert. Die Datei `abo-tracker.db` darin
kannst du später beim Installieren als Sicherung angeben.

Ohne `--keep-data` werden **auch deine Daten gelöscht**. Das Skript fragt
vorher einmal nach. Mit `-y` fragt es gar nicht mehr.

---

## Wenn etwas nicht klappt

| Problem | Lösung |
| --- | --- |
| `git wird gebraucht` / `curl: Befehl nicht gefunden` | `sudo apt install git curl`, dann den Befehl erneut ausführen. |
| `Kein Node >= 22.18 gefunden` | Die Frage nach nvm wurde verneint. Befehl erneut ausführen und mit Enter bestätigen, oder Node von <https://nodejs.org> installieren. |
| Die App lädt nicht im Browser | Server läuft nicht: `cd ~/abo-tracker && setsid -f scripts/start-prod.sh`. Den Grund zeigt `tail -20 ~/abo-tracker/prod-server.log`. |
| `better-sqlite3 lässt sich nicht laden` | Das Skript nennt die Ursache selbst. Meist ist `node_modules` beschädigt: `cd ~/abo-tracker && rm -rf node_modules && ./installscript/install.sh`. |
| `Port 3200 ist von einem fremden Prozess belegt` | Ein anderes Programm nutzt den Port. Mit `--port 3300` installieren bzw. `PORT=3300 setsid -f scripts/start-prod.sh` starten. |
| `Datenbank nicht gefunden` | Der Server wurde nicht über `scripts/start-prod.sh` gestartet. |
| Beim Update: `git pull` bricht mit „local changes“ ab | Im Programmordner wurden Dateien geändert. `cd ~/abo-tracker && git stash`, dann das Update erneut ausführen. |
| Passwort vergessen | Eine andere Person mit Admin-Rechten setzt es im Bereich *Admin* zurück. |
| Firefox vergisst die Design-Wahl (hell/dunkel) nach einem Neustart | Passiert beim Zugriff über `localhost` oder eine IP-Adresse, wenn Firefox beim Beenden Cookies löscht. Die Installation zeigt am Ende die zwei passenden Befehle an (fester Name `abo.local` + `scripts/firefox-persist-fix.sh`). |

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
