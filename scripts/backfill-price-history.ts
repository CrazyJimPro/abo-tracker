/*
 * One-off (but safe to re-run) backfill: every subscription that predates the
 * price_history table gets a single "initial" entry using its current amount
 * and creation date, so the Historie tab has at least one data point instead
 * of an empty chart. Subscriptions that already have history rows (created
 * after this feature shipped) are left untouched.
 *
 * Run with:  node scripts/backfill-price-history.ts
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, sql } from "drizzle-orm";

import { assertDbExists, resolveDbPath } from "../lib/db/path.ts";
import { subscriptions, priceHistory } from "../lib/db/schema.ts";

const dbPath = resolveDbPath(process.cwd());
assertDbExists(dbPath);

const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);

const allSubs = db.select().from(subscriptions).all();

let inserted = 0;
for (const sub of allSubs) {
  const existing = db
    .select({ count: sql<number>`count(*)` })
    .from(priceHistory)
    .where(eq(priceHistory.subscriptionId, sub.id))
    .get();

  if (existing && existing.count > 0) continue;

  db.insert(priceHistory)
    .values({
      id: crypto.randomUUID(),
      subscriptionId: sub.id,
      ownerId: sub.ownerId,
      amount: sub.amount,
      changedAt: sub.createdAt.slice(0, 10),
      source: "initial",
    })
    .run();
  inserted++;
}

console.log(`Backfill fertig: ${inserted} Abo(s) mit initialem Preiseintrag versehen.`);
