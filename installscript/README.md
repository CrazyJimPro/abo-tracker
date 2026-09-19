# Abo-Tracker – Anleitung

Diese Anleitung erklärt, wie du den Abo-Tracker installierst, deine Daten
sicherst, eine Sicherung zurückspielst und auf eine neue Version
aktualisierst.

Die Schritte am Rechner unterscheiden sich zwischen Windows und Linux. Sie
stehen deshalb in zwei eigenen Anleitungen:

| Du benutzt … | Anleitung |
| --- | --- |
| **Windows** 10 / 11 | [Anleitung für Windows](windows/README.md) |
| **Linux** (z. B. Ubuntu, Debian, Mint) | [Anleitung für Linux](LINUX.md) |

Alles, was auf beiden Systemen gleich funktioniert, steht hier auf dieser
Seite.

---

## Auf einen Blick

| | Windows | Linux |
| --- | --- | --- |
| **Installieren** | `AboTrackerSetup.exe` herunterladen und starten | einen Befehl im Terminal ausführen |
| **Programmordner** | `%LOCALAPPDATA%\Abo-Tracker` | `~/abo-tracker` |
| **App öffnen** | Startmenü → *Abo-Tracker öffnen* | im Browser <http://localhost:3200> |
| **Sicherung erstellen** | in der App: *Einstellungen → Sicherung erstellen* | in der App: *Einstellungen → Sicherung erstellen* |
| **Sicherung zurückspielen** | beim Installieren, oder Startmenü → *Abo-Tracker wiederherstellen* | beim Installieren, oder `scripts/restore.sh` |
| **Aktualisieren** | neue `AboTrackerSetup.exe` herunterladen und starten | denselben Befehl wie beim Installieren erneut ausführen |
| **Deinstallieren** | *Einstellungen → Apps → Abo-Tracker* | `./installscript/uninstall.sh` |

Der Abo-Tracker läuft komplett auf deinem eigenen Rechner: ein kleiner
Server und eine Datenbank-Datei. Es gibt keinen Cloud-Dienst und kein Konto
bei irgendeinem Anbieter. Für die Installation und für Updates braucht der
Rechner eine Internetverbindung, im Betrieb nicht.

---

## Nach der ersten Installation

1. **Anmelden** unter <http://localhost:3200> mit der E-Mail-Adresse, die du
   bei der Installation angegeben hast, und dem **vorläufigen Passwort**, das
   dir die Installation am Ende anzeigt.
   Das Passwort wird nur dieses eine Mal angezeigt. Notiere es dir sofort
   (unter Windows liegt es zusätzlich schon in der Zwischenablage).
2. **Neues Passwort festlegen.** Die App verlangt das beim ersten Anmelden.
3. **Loslegen:** Unter *Abos* das erste Abo anlegen. Acht Kategorien sind
   schon vorhanden, eigene kannst du beim Anlegen eines Abos ergänzen.
4. **Weitere Personen** bekommen im Bereich *Admin* ein eigenes Konto. Jede
   Person sieht nur ihre eigenen Abos.

Hast du bei der Installation eine Sicherung zurückgespielt, entfällt das
vorläufige Passwort: Du meldest dich mit den Zugangsdaten aus der Sicherung
an.

Die App ist auch von anderen Geräten im selben Heimnetz erreichbar (Handy,
Tablet), und zwar unter `http://<IP-Adresse-des-Rechners>:3200`.

---

## Backup

### Was ist eine Sicherung?

Alle deine Daten stecken in **einer einzigen Datei**, der Datenbank. Darin
liegen alle Konten mit ihren Passwörtern, alle Abos, Kategorien und die
Preishistorie. Programm und Einstellungen lassen sich jederzeit neu
installieren, diese Datei nicht. Eine Sicherung ist eine Kopie genau dieser
Datei, zum Beispiel `abo-tracker-2026-09-19.db`.

> **Bewahre Sicherungen sorgfältig auf.** Wer die Datei hat, hat alle Daten.
> Die Passwörter liegen darin zwar nur verschlüsselt (als Hash), die Abos
> aber lesbar.

### Sicherung erstellen – in der App (empfohlen, Windows und Linux)

1. In der App oben auf **Einstellungen** gehen.
2. In der Karte **Sicherung** auf **Sicherung erstellen** klicken.
3. Der Browser lädt die Datei `abo-tracker-<Datum>.db` in deinen
   Download-Ordner.
4. Die Datei an einen sicheren Ort verschieben, z. B. auf einen USB-Stick,
   eine externe Festplatte oder in deinen Cloud-Speicher.

Das geht auch vom Handy oder von einem anderen Rechner aus. Der Server muss
dafür nicht angehalten werden. Die Karte *Sicherung* sehen nur Admins, weil
die Datei die Daten **aller** Personen enthält.

Zusätzlich gibt es auf jedem System noch einen eigenen Weg, z. B. eine
automatische Sicherung beim Hochfahren unter Linux. Das steht in der
jeweiligen Anleitung.

### CSV-Export ist keine Sicherung

Unter *Einstellungen → Daten* kann jede Person ihre eigenen Abos als
CSV-Datei exportieren (öffnet sich in Excel oder LibreOffice) und wieder
importieren. Das ist praktisch, um die Liste anzusehen oder zu bearbeiten.
Die CSV-Datei enthält aber **keine** Konten, keine Passwörter und keine
Preishistorie. Für den Ernstfall brauchst du die Sicherung von oben.

---

## Restore

Eine Sicherung zurückspielen („wiederherstellen“) geht auf zwei Arten:

- **Bei der Installation:** Die Installation fragt, ob du Daten aus einer
  Sicherung übernehmen willst. Das ist der richtige Weg für einen neuen
  Rechner oder nach einer Neuinstallation.
- **In einer bestehenden Installation:** über *Abo-Tracker wiederherstellen*
  (Windows) bzw. `scripts/restore.sh` (Linux), z. B. wenn versehentlich
  etwas gelöscht wurde.

Wie das im Einzelnen geht, steht in der Anleitung für
[Windows](windows/README.md#sicherung-zurückspielen) bzw.
[Linux](LINUX.md#sicherung-zurückspielen). In beiden Fällen gilt:

- **Die Sicherung wird vorher geprüft.** Ist die Datei keine
  Abo-Tracker-Datenbank, beschädigt oder stammt sie aus einer neueren
  Version als der installierten, wird nichts verändert.
- **Deine bisherigen Daten gehen nicht verloren.** Gibt es schon eine
  Datenbank, wird sie vorher als `vor-wiederherstellung-<Datum-Uhrzeit>.db`
  im Ordner `abo-backup` auf dem Desktop bzw. Schreibtisch abgelegt.
- **Ältere Sicherungen funktionieren.** Eine Sicherung aus einer älteren
  Version wird beim Einspielen automatisch auf den aktuellen Stand gebracht.
- **Es kommt alles zurück, auch die Passwörter**, und zwar mit dem Stand zum
  Zeitpunkt der Sicherung. Wurde seitdem ein Passwort geändert, gilt wieder
  das alte.
- **Windows und Linux sind austauschbar.** Eine unter Windows erstellte
  Sicherung lässt sich unter Linux zurückspielen und umgekehrt.

---

## Update

### Woran erkenne ich ein Update?

Oben in der App steht neben dem Schriftzug „Abo-Tracker“ die installierte
Version, z. B. `v1.9.0`. Gibt es eine neuere, erscheint daneben ein Hinweis
wie **„Update verfügbar: v1.9.1“**. Ein Klick darauf öffnet die Seite dieser
Version auf GitHub. Dort steht, was sich geändert hat.

Die App schaut höchstens einmal pro Stunde nach, ob es eine neue Version
gibt. Ein frisch erschienenes Update kann also bis zu einer Stunde brauchen,
bis der Hinweis auftaucht. Ist GitHub gerade nicht erreichbar, erscheint
einfach kein Hinweis.

### So gehst du vor

1. **Sicherung erstellen** (siehe [oben](#backup)). Ein Update lässt deine
   Daten zwar in Ruhe, eine frische Sicherung schadet aber nie.
2. **Update ausführen**, je nach System:
   - **Windows:** die neue `AboTrackerSetup.exe` herunterladen und starten,
     siehe [Anleitung für Windows](windows/README.md#update).
   - **Linux:** den Installationsbefehl erneut ausführen, siehe
     [Anleitung für Linux](LINUX.md#update).
3. **Prüfen:** Die App im Browser neu laden. Neben dem Schriftzug steht die
   neue Versionsnummer, und der Update-Hinweis ist verschwunden.

Beim Update bleiben alle Abos, Konten und Passwörter erhalten. Nach
**Sicherung zurückspielen** wird beim Update **nicht** gefragt: Das gibt es
nur bei einer Erstinstallation (Linux) bzw. wird mit „Nein“ übersprungen
(Windows).

---

## Umzug auf einen anderen Rechner

Das funktioniert auch von Windows nach Linux und umgekehrt.

1. Auf dem **alten** Rechner in der App **Sicherung erstellen** und die Datei
   auf den neuen Rechner bringen (USB-Stick, Netzlaufwerk, Cloud …).
2. Auf dem **neuen** Rechner den Abo-Tracker installieren und bei der Frage
   nach einer Sicherung **Ja** sagen und die Datei auswählen.
3. Mit den gewohnten Zugangsdaten anmelden. Fertig.
