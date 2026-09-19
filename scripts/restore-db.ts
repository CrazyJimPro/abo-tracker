// Spielt eine Datenbank-Sicherung zurück. Aufgerufen von
// installscript/windows/install.ps1 (-RestoreFrom) und
// installscript/windows/restore.ps1; der Server muss dabei gestoppt sein.
//
//   node scripts/restore-db.ts <sicherung> <ziel-db> [<sicherheitskopie>]
//
// <sicherung> ist eine .db-Datei (backup.ps1, backup-to-desktop.sh) oder ein
// Ordner mit abo-tracker.db darin (uninstall.ps1 -KeepData). Liegt daneben
// noch eine -wal-Datei — bei einer bloßen Ordnerkopie ohne sauberes
// Herunterfahren möglich —, wird sie mitgenommen, sonst fehlte, was nur dort
// stand. Existiert <ziel-db> schon, wird es vorher nach <sicherheitskopie>
// gesichert.
//
// Als Datei statt per node -e: PowerShell 5.1 verliert eingebettete doppelte
// Anführungszeichen in nativen Kommandozeilen (siehe install.ps1).
// Letzte Ausgabezeile bei Erfolg: RESTORED users=<n> subscriptions=<n>

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function resolveSource(p: string): string {
  if (!fs.existsSync(p)) fail(`Sicherung nicht gefunden: ${p}`);
  if (!fs.statSync(p).isDirectory()) return p;
  const inside = path.join(p, "abo-tracker.db");
  if (!fs.existsSync(inside)) fail(`Im Ordner ${p} liegt keine abo-tracker.db.`);
  return inside;
}

function removeDb(file: string) {
  for (const f of [file, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true });
}

async function main() {
  const [srcArg, dest, safetyCopy] = process.argv.slice(2);
  if (!srcArg || !dest) fail("Aufruf: node scripts/restore-db.ts <sicherung> <ziel-db> [<sicherheitskopie>]");
  const src = resolveSource(path.resolve(srcArg));

  const header = Buffer.alloc(16);
  const fd = fs.openSync(src, "r");
  fs.readSync(fd, header, 0, 16, 0);
  fs.closeSync(fd);
  if (header.toString("latin1") !== "SQLite format 3\0") fail(`${src} ist keine SQLite-Datenbank.`);

  // Auf einer Kopie arbeiten: Öffnen spielt eine -wal-Datei ein und schreibt
  // dabei — die Sicherung selbst bleibt so unberührt.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "abo-restore-"));
  try {
    const work = path.join(tmpDir, "restore.db");
    fs.copyFileSync(src, work);
    if (fs.existsSync(`${src}-wal`)) fs.copyFileSync(`${src}-wal`, `${work}-wal`);

    const db = new Database(work);
    try {
      if (db.pragma("integrity_check", { simple: true }) !== "ok") fail(`${src} ist beschädigt (integrity_check).`);

      const tables = new Set(db.prepare("select name from sqlite_master where type = 'table'").all().map((r) => (r as { name: string }).name));
      for (const t of ["users", "subscriptions", "__drizzle_migrations"]) {
        if (!tables.has(t)) fail(`${src} ist keine Abo-Tracker-Datenbank (Tabelle ${t} fehlt).`);
      }

      // Eine Sicherung aus einer neueren App-Version kennt Migrationen, die
      // dieser Stand nicht hat — drizzle-kit migrate täte dann nichts, und
      // die App liefe gegen ein Schema, das sie nicht versteht.
      const journal = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "drizzle", "meta", "_journal.json"), "utf8"));
      const newestKnown = Math.max(...journal.entries.map((e: { when: number }) => e.when));
      const newestInBackup = (db.prepare("select max(created_at) as t from __drizzle_migrations").get() as { t: number | null }).t ?? 0;
      if (newestInBackup > newestKnown) {
        fail("Die Sicherung stammt aus einer neueren Abo-Tracker-Version. Bitte zuerst die App aktualisieren.");
      }

      const users = (db.prepare("select count(*) as n from users").get() as { n: number }).n;
      const subscriptions = (db.prepare("select count(*) as n from subscriptions").get() as { n: number }).n;

      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (safetyCopy && fs.existsSync(dest)) {
        fs.mkdirSync(path.dirname(safetyCopy), { recursive: true });
        const current = new Database(dest);
        try {
          await current.backup(safetyCopy);
        } finally {
          current.close();
        }
        console.log(`Bisherige Datenbank gesichert: ${safetyCopy}`);
      }

      removeDb(dest);
      await db.backup(dest);
      console.log(`RESTORED users=${users} subscriptions=${subscriptions}`);
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
