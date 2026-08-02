/*
 * One-off migration: loads data/supabase-export.json (produced from the old
 * hosted Supabase project) into the local SQLite database.
 *
 * Ids are carried over unchanged so the owner/category references stay intact.
 * Passwords cannot be migrated — Supabase stores bcrypt hashes under its own
 * auth schema — so every user gets a fresh temporary password and is flagged
 * to change it on next login.
 *
 * Run with:  node --env-file=.env.local scripts/import-from-supabase.ts
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { hashPassword } from "../lib/auth/password.ts";
import { generateTempPassword } from "../lib/passwords.ts";
import { assertDbExists, resolveDbPath } from "../lib/db/path.ts";
import { categories, subscriptions, users } from "../lib/db/schema.ts";

// Vom Speicherort dieser Datei aus, nicht von process.cwd() — sonst trifft ein
// Aufruf aus einem anderen Verzeichnis die falsche (leere) Datenbank.
const PROJECT_ROOT = dirname(import.meta.dirname);

type ExportedProfile = {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
  created_by: string | null;
  created_at: string;
};

type ExportedCategory = {
  id: string;
  owner_id: string | null;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
};

type ExportedSubscription = {
  id: string;
  owner_id: string;
  category_id: string | null;
  name: string;
  amount: string | number;
  billing_interval: string;
  status: string;
  next_billing_date: string | null;
  notes: string | null;
  regular_amount: string | number | null;
  intro_until: string | null;
  created_at: string;
  updated_at: string;
};

const num = (v: string | number | null) => (v === null ? null : Number(v));

async function main() {
  const dumpPath = resolve(PROJECT_ROOT, "data/supabase-export.json");
  const dump = JSON.parse(readFileSync(dumpPath, "utf8")) as {
    profiles: ExportedProfile[];
    categories: ExportedCategory[];
    subscriptions: ExportedSubscription[];
  };

  const dbPath = resolveDbPath(PROJECT_ROOT);
  assertDbExists(dbPath);
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);

  if (db.select().from(users).all().length > 0) {
    console.error("Abbruch: In der SQLite-Datenbank existieren bereits User.");
    process.exit(1);
  }

  const tempPasswords: { email: string; password: string }[] = [];

  // Users first — categories and subscriptions reference them.
  for (const p of dump.profiles) {
    const tempPassword = generateTempPassword();
    db.insert(users)
      .values({
        id: p.id,
        email: p.email,
        passwordHash: await hashPassword(tempPassword),
        role: p.role === "admin" ? "admin" : "member",
        displayName: p.display_name,
        mustChangePassword: true,
        createdBy: p.created_by,
        createdAt: p.created_at,
        updatedAt: p.created_at,
      })
      .run();
    tempPasswords.push({ email: p.email, password: tempPassword });
  }

  for (const c of dump.categories) {
    db.insert(categories)
      .values({
        id: c.id,
        ownerId: c.owner_id,
        name: c.name,
        color: c.color,
        sortOrder: c.sort_order,
        createdAt: c.created_at,
      })
      .run();
  }

  for (const s of dump.subscriptions) {
    db.insert(subscriptions)
      .values({
        id: s.id,
        ownerId: s.owner_id,
        categoryId: s.category_id,
        name: s.name,
        amount: Number(s.amount),
        billingInterval: s.billing_interval as "weekly" | "monthly" | "quarterly" | "yearly",
        status: s.status as "active" | "paused" | "cancelled",
        nextBillingDate: s.next_billing_date,
        notes: s.notes,
        regularAmount: num(s.regular_amount),
        introUntil: s.intro_until,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })
      .run();
  }

  console.log(
    `Importiert: ${dump.profiles.length} User, ${dump.categories.length} Kategorien, ${dump.subscriptions.length} Abos.`
  );
  console.log("\nTemporäre Passwörter (beim ersten Login zu ändern):");
  for (const { email, password } of tempPasswords) {
    console.log(`  ${email}\n    ${password}`);
  }
}

main();
