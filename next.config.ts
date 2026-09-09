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
  output: "standalone",
  // better-sqlite3 ist ein natives Addon (kompilierte .node-Datei) — ohne
  // diese Ausnahme versucht Turbopack, es wie normalen JS-Code zu bündeln
  // und ihm beim Server-Build einen internen Hash-Namen zu geben. Das
  // Auflösen dieses Hash-Namens schlägt dann bei der Seiten-Daten-Sammlung
  // fehl ("Cannot find module 'better-sqlite3-<hash>'"), z. B. für
  // /api/export. serverExternalPackages weist Next.js an, das Paket mit
  // einem normalen require() aus node_modules zu laden statt es zu bündeln.
  serverExternalPackages: ["better-sqlite3"],
  env: {
    PROJECT_ROOT: findProjectRoot(),
  },
};

export default nextConfig;
