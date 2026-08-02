/*
 * Seeds the global categories (owner_id null) that every user sees as the
 * shared starting set. A database created straight from the Drizzle migrations
 * has none of them — they only existed in the old Supabase seed.
 *
 * Safe to re-run: existing global categories are left untouched, only missing
 * ones are inserted. Renaming or deleting a seed category in the admin UI
 * therefore brings it back on the next run, which is the intended behaviour for
 * a repair/reinstall run.
 *
 * Run with:  node scripts/seed-categories.ts
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { isNull } from "drizzle-orm";
import { dirname } from "node:path";

import { assertDbExists, resolveDbPath } from "../lib/db/path.ts";
import { categories } from "../lib/db/schema.ts";

// Colours are taken from CATEGORY_COLORS in lib/actions/subscriptions.ts so the
// seeded categories and the auto-coloured private ones share one palette.
// "Sonstiges" sorts last on purpose — it is the catch-all.
const DEFAULT_CATEGORIES = [
  { name: "Streaming", color: "#8b5cf6", sortOrder: 10 },
  { name: "Musik", color: "#ec4899", sortOrder: 20 },
  { name: "Fitness", color: "#22c55e", sortOrder: 30 },
  { name: "Software", color: "#3b82f6", sortOrder: 40 },
  { name: "Gaming", color: "#f97316", sortOrder: 50 },
  { name: "Nachrichten & Medien", color: "#eab308", sortOrder: 60 },
  { name: "Cloud & Speicher", color: "#06b6d4", sortOrder: 70 },
  { name: "Sonstiges", color: "#64748b", sortOrder: 999 },
];

// Vom Speicherort dieser Datei aus, nicht von process.cwd() — sonst trifft ein
// Aufruf aus einem anderen Verzeichnis die falsche (leere) Datenbank.
const dbPath = resolveDbPath(dirname(import.meta.dirname));
assertDbExists(dbPath);

const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);

const existing = new Set(
  db
    .select({ name: categories.name })
    .from(categories)
    .where(isNull(categories.ownerId))
    .all()
    .map((row) => row.name)
);

const missing = DEFAULT_CATEGORIES.filter((category) => !existing.has(category.name));

if (missing.length === 0) {
  console.log(`Globale Kategorien bereits vollständig (${existing.size}). Nichts zu tun.`);
} else {
  db.insert(categories)
    .values(missing.map((category) => ({ id: crypto.randomUUID(), ownerId: null, ...category })))
    .run();
  console.log(
    `${missing.length} globale Kategorie(n) angelegt: ${missing.map((c) => c.name).join(", ")}`
  );
}
