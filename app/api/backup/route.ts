import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

// Vollständige Sicherung der Datenbank als Download — dasselbe, was
// backup.ps1 / backup-to-desktop.sh auf den Desktop legen, nur ohne Konsole
// und von jedem Gerät aus. Nur für Admins: die Datei enthält alle Konten samt
// Passwort-Hashes, nicht bloß die eigenen Abos wie der CSV-Export.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Nicht angemeldet.", { status: 401 });
  if (user.role !== "admin") return new NextResponse("Nur für Admins.", { status: 403 });

  // SQLite-Online-Backup über die laufende Verbindung: in sich stimmig trotz
  // WAL und parallelen Schreibzugriffen. Erst in eine Temp-Datei, weil die
  // Backup-API nur in eine Datei schreiben kann.
  const tmp = path.join(os.tmpdir(), `abo-tracker-backup-${randomUUID()}.db`);
  try {
    await db.$client.backup(tmp);
    const data = await readFile(tmp);

    // Lokales Datum statt toISOString() (UTC) — kurz nach Mitternacht trüge
    // die Datei sonst das Datum von gestern. Das Namensschema abo-tracker-*.db
    // ist dasselbe wie bei backup.ps1, danach suchen Installer und
    // restore.ps1.
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const filename = `abo-tracker-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.db`;

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await rm(tmp, { force: true });
  }
}
