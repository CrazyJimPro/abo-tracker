import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { assertDbExists, existingDirOrCwd, resolveDbPath } from "./path";
import * as schema from "./schema";

// PROJECT_ROOT wird von next.config.ts zur Build-Zeit eingesetzt, weil der
// gebundelte Server-Code seinen eigenen Pfad nicht zuverlässig kennt. Wurde das
// Projekt nach dem Build verschoben, zeigt der eingebackene Pfad ins Leere —
// dann ist das Arbeitsverzeichnis die bessere Vermutung.
const DB_PATH = resolveDbPath(existingDirOrCwd(process.env.PROJECT_ROOT));

function createDb() {
  // Die Datenbank wird von den Migrationen angelegt, nie von der App — ein
  // fehlendes File heißt also "falscher Pfad" und nicht "erster Start".
  assertDbExists(DB_PATH);
  const sqlite = new Database(DB_PATH);

  // SQLite ships with foreign keys DISABLED — without this the ON DELETE
  // CASCADE / SET NULL rules in the schema would silently do nothing.
  sqlite.pragma("foreign_keys = ON");
  // WAL lets readers run while a write is in flight, which matters because
  // Next.js serves requests concurrently from one process.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");

  return drizzle(sqlite, { schema });
}

// Next.js re-evaluates modules on hot reload; without the global cache each
// reload would open another handle to the same file.
const globalForDb = globalThis as unknown as { __aboTrackerDb?: ReturnType<typeof createDb> };

export const db = globalForDb.__aboTrackerDb ?? createDb();

if (process.env.NODE_ENV !== "production") globalForDb.__aboTrackerDb = db;

export { schema };
export * from "./schema";
