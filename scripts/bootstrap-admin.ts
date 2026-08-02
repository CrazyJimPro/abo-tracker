/*
 * Creates the first admin account in the local SQLite database and prints a
 * generated temporary password. Safe to re-run: it exits without changes if
 * the account already exists.
 *
 * Run with:  node scripts/bootstrap-admin.ts [email]
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { resolve } from "node:path";

import { hashPassword } from "../lib/auth/password.ts";
import { generateTempPassword } from "../lib/passwords.ts";
import { users } from "../lib/db/schema.ts";

const ADMIN_EMAIL = process.argv[2] ?? "c.jung2811@gmx.de";

async function main() {
  const sqlite = new Database(resolve(process.env.DATABASE_PATH ?? "data/abo-tracker.db"));
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);

  const existing = db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).get();
  if (existing) {
    console.log(`Admin-User ${ADMIN_EMAIL} existiert bereits (id: ${existing.id}). Nichts zu tun.`);
    return;
  }

  const tempPassword = generateTempPassword();
  db.insert(users)
    .values({
      id: crypto.randomUUID(),
      email: ADMIN_EMAIL,
      passwordHash: await hashPassword(tempPassword),
      role: "admin",
      mustChangePassword: true,
    })
    .run();

  console.log(`Admin-User ${ADMIN_EMAIL} angelegt.`);
  console.log(`Temporäres Passwort: ${tempPassword}`);
  console.log("Beim ersten Login wirst du aufgefordert, es zu ändern.");
}

main();
