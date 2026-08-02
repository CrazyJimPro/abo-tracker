import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

/*
 * Der Server-Code wird gebundelt und kennt seinen eigenen Pfad zur Laufzeit
 * nicht mehr, deshalb wird das Projektverzeichnis hier zur Build-Zeit fest
 * eingesetzt. Damit hängt die Auflösung von DATABASE_PATH (siehe lib/db/path.ts)
 * nicht mehr am Arbeitsverzeichnis dessen, der den Server startet.
 *
 * import.meta.dirname ist der verlässlichere Wert, gilt aber nur solange diese
 * Datei nicht wegkompiliert wird — die Prüfung auf package.json fängt das ab.
 */
function findProjectRoot(): string {
  const here = import.meta.dirname;
  if (here && existsSync(join(here, "package.json"))) return here;
  return process.cwd();
}

const nextConfig: NextConfig = {
  env: {
    PROJECT_ROOT: findProjectRoot(),
  },
};

export default nextConfig;
