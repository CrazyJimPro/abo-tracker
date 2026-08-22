# Installation, Backup, Restore und Deinstallation

Alles, was zum Aufsetzen und Betreiben des Abo-Trackers auf einem eigenen
Rechner nötig ist. Die App läuft komplett lokal: ein Next.js-Server und eine
SQLite-Datei, kein Cloud-Dienst, keine externen Accounts.

## Schnellstart

Diesen Befehl im Terminal einfügen und ausführen:

```bash
curl -fsSL https://raw.githubusercontent.com/CrazyJimPro/abo-tracker/main/installscript/bootstrap.sh | bash
```

Der Befehl holt das Projekt nach `~/abo-tracker` und startet dort die
Installation. Am Ende öffnet sich der Browser und die App ist einsatzbereit.

Voraussetzungen: `git` und eine Internetverbindung. Node.js braucht **nicht**
vorher installiert zu sein — fehlt es oder ist es zu alt, bietet das Script an,
Node 24 über nvm nachzuinstallieren.

Anderes Zielverzeichnis oder ein eigener Fork:

```bash
ABO_TRACKER_DIR=~/apps/abo-tracker curl -fsSL <url> | bash
```

Wenn das Repository schon lokal liegt, geht es direkt:

```bash
cd abo-tracker
./installscript/install.sh
```

## Was dabei passiert

| Schritt | Inhalt |
| --- | --- |
| 1 | Node.js suchen (>= 22.18), auf Wunsch über nvm nachinstallieren |
| 2 | Abhängigkeiten installieren (`npm ci`) |
| 3 | `.env.local` aus `.env.example` anlegen, falls sie fehlt |
| 4 | Datenbank anlegen und Standard-Kategorien einspielen |
| 5 | Admin-Konto erstellen, temporäres Passwort ausgeben |
| 6 | App bauen |
| 7 | Server starten (Port 3200) |
| 8 | Autostart einrichten, damit der Server einen Neustart übersteht |

Das Script fragt unterwegs nach der E-Mail-Adresse für den Admin-Zugang und
danach, ob der Autostart eingerichtet werden soll. Wer nichts gefragt werden
will, gibt beides direkt mit:

```bash
./installscript/install.sh --email ich@example.com -y
```

| Option | Wirkung |
| --- | --- |
| `--email <adresse>` | E-Mail des Admin-Kontos, statt Rückfrage |
| `--port <nummer>` | Port des Servers (Standard: 3200) |
| `--autostart` / `--no-autostart` | Autostart erzwingen bzw. überspringen |
| `--no-open` | Browser am Ende nicht öffnen |
| `--no-start` | Nur installieren, Server nicht starten |
| `-y`, `--yes` | Keine Rückfragen, überall die Vorgabe |

## Direkt nach der Installation

1. **Einloggen** unter <http://localhost:3200> mit der angegebenen E-Mail und
   dem temporären Passwort aus der Ausgabe. Das Passwort wird nur dieses eine
   Mal angezeigt — in der Datenbank liegt danach nur noch ein scrypt-Hash.
2. **Passwort ändern.** Die App verlangt das beim ersten Login von sich aus.
3. **Loslegen:** unter *Abos* das erste Abo anlegen. Acht Kategorien sind schon
   da, eigene lassen sich beim Anlegen eines Abos direkt ergänzen.
4. **Weitere Personen** bekommen unter *Admin* ein Konto mit temporärem
   Passwort — jede Person sieht ausschließlich ihre eigenen Abos.

Laufender Betrieb:

```bash
scripts/start-prod.sh          # Server von Hand starten
scripts/stop-prod.sh           # Server stoppen
tail -f prod-server.log        # Log mitlesen
```

## Update

Der Header zeigt neben der laufenden Version, ob ein neueres Release verfügbar
ist. Der Check fragt dafür direkt GitHubs Releases-API ab (unauthentifiziert,
das Repo ist öffentlich) — ist eine neuere Version da, erscheint ein
Hinweis-Badge, z.B. „Update verfügbar: v1.2.0", ein Klick darauf öffnet die
passende Release-Seite auf GitHub. Ist GitHub gerade nicht erreichbar, bleibt
der Badge einfach weg — kein Fehler, keine blockierte Seite.

Auf den neuesten Stand bringen — die Installation bleibt dabei erhalten,
Datenbank und Konten werden nicht angefasst:

```bash
cd ~/abo-tracker
git pull
./installscript/install.sh
```

`install.sh` danach nicht durch ein bloßes `git pull` ersetzen, auch wenn das
oft reichen würde — es installiert bei Bedarf auch neue Abhängigkeiten und
wendet neue Datenbank-Migrationen an, ist aber schnell durchgelaufen, wenn
sich nichts geändert hat.

## Backup

Zu sichern ist genau ein Verzeichnis: **`data/`**. Darin liegt
`abo-tracker.db` mit allem, was nicht wiederherstellbar ist — Abos,
Kategorien, Konten und Passwort-Hashes. Alles andere (Code, Abhängigkeiten,
Build) kommt bei Bedarf aus Git zurück. Die optionale `.env.local` lohnt sich
nur, wenn du den Datenbankpfad darin geändert hast.

> Behandle die Sicherung wie ein Passwort-Archiv: sie enthält die
> Zugangsdaten aller Nutzer in gehashter Form.

Die Datenbank läuft im WAL-Modus. Deshalb reicht es **nicht**, die Datei im
laufenden Betrieb einfach zu kopieren — ein Teil der Änderungen steht dann
noch in `abo-tracker.db-wal` und die Kopie kann in sich widersprüchlich sein.
Zwei Wege, die sauber sind:

**Variante A — Server kurz stoppen (ohne Zusatzwerkzeug):**

```bash
cd ~/abo-tracker
scripts/stop-prod.sh                                      # Server anhalten
cp -a data ~/abo-tracker-backup-$(date +%Y-%m-%d)         # sichern
scripts/start-prod.sh &                                   # wieder starten
```

Beim sauberen Beenden schreibt SQLite die WAL-Datei in die Datenbank zurück.
`cp -a` auf den ganzen Ordner nimmt ohnehin alles mit, was da ist.

**Variante B — im laufenden Betrieb, ohne den Server anzuhalten:**

```bash
cd ~/abo-tracker
node -e 'new (require("better-sqlite3"))("data/abo-tracker.db",{readonly:true}).backup(process.argv[1])' \
  ~/abo-tracker-backup-$(date +%Y-%m-%d).db
```

Das ist die dafür vorgesehene Backup-Funktion von SQLite: sie liefert auch bei
gleichzeitigen Schreibzugriffen einen konsistenten Stand, als eine einzige
Datei ohne WAL-Beiwerk. Zusätzliche Software braucht es nicht — `better-sqlite3`
steckt schon in der Installation.

**Automatisch bei jedem Start** — praktisch gerade auf einer VM, die nicht
durchgehend läuft und deshalb selten oder nie um eine feste Uhrzeit an ist:
`scripts/backup-to-desktop.sh` bündelt Variante B (WAL-sicheres Online-Backup,
kein Server-Stopp nötig) in einem Script, das auch die richtige Node-Version
selbst findet (wie `install.sh`). Per `crontab -e` einmalig eintragen:

```
@reboot sleep 60 && $HOME/abo-tracker/scripts/backup-to-desktop.sh >> $HOME/abo-tracker/backup.log 2>&1
```

`@reboot` löst beim Start von Cron aus (also faktisch beim Hochfahren),
`sleep 60` verzögert um eine Minute, damit die Datenbank sicher da ist, bevor
gesichert wird. Pfad ggf. anpassen, falls das Projekt woanders liegt. Landet
unter **`abo-backup`** auf dem Schreibtisch — das Script fragt dafür
`xdg-user-dir DESKTOP` ab, trifft also auch bei deutscher Locale
(„Schreibtisch" statt „Desktop") den richtigen, tatsächlich sichtbaren Ordner.
Eine Datei pro Kalendertag (`abo-tracker-JJJJ-MM-TT.db`), mehrere Starts am
selben Tag überschreiben dieselbe Datei. Das Script behält automatisch nur
die **letzten 10** Sicherungen und löscht ältere selbst — nichts, worum man
sich manuell kümmern muss. Anzahl in `scripts/backup-to-desktop.sh` über die
Variable `KEEP` einstellbar. Node muss dafür nicht von Hand gesucht werden —
`backup-to-desktop.sh` löst das wie `install.sh` selbst.

## Restore

```bash
cd ~/abo-tracker
scripts/stop-prod.sh                          # 1. Server anhalten
rm -f data/abo-tracker.db-wal data/abo-tracker.db-shm
cp <sicherung> data/abo-tracker.db            # 2. Sicherung einspielen
scripts/start-prod.sh &                       # 3. Server starten
```

Für `<sicherung>` je nach Variante `…/backup-ordner/abo-tracker.db` (A) oder
die einzelne Backup-Datei (B) einsetzen.

Schritt 1 und das Löschen der `-wal`/`-shm`-Dateien sind beide wichtig: eine
stehengebliebene WAL-Datei gehört zur *alten* Datenbank und würde nach dem
Start über die frisch eingespielte gelegt.

Danach einloggen und stichprobenartig prüfen, ob die Abos vollständig sind.
Beachte: mit der Datenbank kommen auch die **Passwörter vom Zeitpunkt der
Sicherung** zurück. Wurde seitdem ein Passwort geändert, gilt wieder das alte.

Kein Backup mehr, aber die Datenbank ist beschädigt? Dann hilft nur der
Neuanfang: `data/` löschen und `./installscript/install.sh` erneut ausführen —
das legt eine leere Datenbank und ein frisches Admin-Konto an.

## Deinstallation

```bash
cd ~/abo-tracker
./installscript/uninstall.sh
```

Stoppt den Server, entfernt den Autostart-Eintrag und löscht danach den
kompletten Projektordner samt Datenbank — Abos, Konten und Passwort-Hashes
eingeschlossen. Fragt vor dem endgültigen Löschen einmal nach. Wer nicht
gefragt werden will:

```bash
./installscript/uninstall.sh -y
```

Um die Datenbank zu behalten statt sie mit zu löschen, z.B. für eine
spätere Neuinstallation:

```bash
./installscript/uninstall.sh --keep-data
```

Das kopiert `data/` vorher nach `<Projektordner>-data-backup-<Datum>` —
neben den (dann gelöschten) Projektordner, am Standardort also z.B.
`~/abo-tracker-data-backup-2026-08-04`. Für ein reguläres Backup unabhängig
von einer Deinstallation siehe [Backup](#backup) oben.

## Umzug auf einen anderen Rechner

1. Auf dem neuen Rechner ganz normal installieren (Schnellstart oben).
2. Server stoppen, `data/abo-tracker.db` aus der Sicherung einspielen wie im
   Abschnitt *Restore*.
3. Server starten. Die Zugangsdaten sind dieselben wie auf dem alten Rechner.

## Wenn etwas klemmt

| Symptom | Ursache und Abhilfe |
| --- | --- |
| `Kein Node >= 22.18 gefunden` | Verneinte nvm-Installation. Node von <https://nodejs.org> installieren und erneut starten. |
| `better-sqlite3 lässt sich nicht laden` | Es fehlen Build-Werkzeuge: `sudo apt install build-essential python3`. |
| `Port 3200 ist von einem fremden Prozess belegt` | Anderer Dienst auf dem Port. Mit `--port 3300` ausweichen. |
| `Datenbank nicht gefunden` | Der Server wurde aus dem falschen Verzeichnis gestartet. `scripts/start-prod.sh` benutzen. |
| `kill $(cat .server.pid)` sagt `No such process` | Der Server läuft schon nicht mehr, `.server.pid` war nur veraltet — kein Fehler. `scripts/stop-prod.sh` benutzen, das prüft den tatsächlichen Zustand statt der Datei blind zu vertrauen. |
| Seite lädt nicht | `tail -20 prod-server.log` zeigt den Grund. |
| Design-Wahl (hell/dunkel/midnight) merkt sich Firefox nicht über einen Neustart hinweg | Passiert typischerweise beim Zugriff über `localhost` oder eine reine IP-Adresse, wenn in Firefox „Cookies und Website-Daten löschen, wenn Firefox beendet wird" aktiv ist. `install.sh` zeigt am Ende automatisch die passenden zwei Befehle (fester Hostname in `/etc/hosts` + `scripts/firefox-persist-fix.sh <hostname>`), falls noch nicht eingerichtet. |
