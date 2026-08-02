import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import type { Config } from "drizzle-kit";

// Muss dieselbe Datei treffen wie lib/db/path.ts zur Laufzeit, sonst legen die
// Migrationen die Tabellen in einer anderen Datenbank an als die App liest.
// Bewusst selbst aufgelöst statt importiert: drizzle-kit bundelt diese Config,
// import.meta.dirname kann dabei danebenliegen — die package.json-Prüfung
// fängt das ab und fällt sonst auf das Arbeitsverzeichnis zurück.
const here = import.meta.dirname;
const projectRoot = here && existsSync(join(here, "package.json")) ? here : process.cwd();
const configured = process.env.DATABASE_PATH ?? "data/abo-tracker.db";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: isAbsolute(configured) ? configured : resolve(projectRoot, configured),
  },
} satisfies Config;
