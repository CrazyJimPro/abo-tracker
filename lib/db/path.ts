import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

/*
 * DATABASE_PATH is documented as being relative to the project root. Resolving
 * it against process.cwd() instead — which is what plain resolve() does — means
 * starting the server or a script from any other directory silently opens a
 * *different*, empty database file. That failure is invisible until a query
 * runs and every page dies with "no such table: users", so both halves matter:
 * anchor the path to the project root, and refuse to open a file that isn't
 * there instead of letting SQLite create an empty one.
 */
export function resolveDbPath(projectRoot: string): string {
  const configured = process.env.DATABASE_PATH ?? "data/abo-tracker.db";
  return isAbsolute(configured) ? configured : resolve(projectRoot, configured);
}

export function existingDirOrCwd(dir: string | undefined): string {
  return dir && existsSync(dir) ? dir : process.cwd();
}

export function assertDbExists(dbPath: string): void {
  if (existsSync(dbPath)) return;

  throw new Error(
    `Datenbank nicht gefunden: ${dbPath}\n` +
      `Sie wird von der Installation angelegt — bitte ./install.sh ausführen ` +
      `(oder 'npm run db:migrate' im Projektverzeichnis).`
  );
}
