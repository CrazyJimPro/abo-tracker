import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

/*
 * SQLite port of the former Supabase/Postgres schema.
 *
 * Notable translations:
 * - uuid            -> text (ids generated with crypto.randomUUID() in app code)
 * - enums           -> text + CHECK constraint
 * - numeric(10,2)   -> real
 * - date            -> text 'YYYY-MM-DD' (compared lexically, as the app already does)
 * - timestamptz     -> text ISO-8601
 * - boolean         -> integer 0/1
 *
 * Row-level security is gone: Postgres RLS was the real enforcement boundary,
 * so every query now MUST scope by owner id in application code. All access
 * goes through lib/db/queries.ts, which takes the acting user explicitly.
 */

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
};

// Merges the former public.profiles with Supabase's auth.users: identity,
// credentials and app role now live in one table.
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("member").$type<UserRole>(),
    displayName: text("display_name"),
    mustChangePassword: integer("must_change_password", { mode: "boolean" })
      .notNull()
      .default(true),
    createdBy: text("created_by"),
    // Last status filter chosen on the Abos list ("" = active+paused, the
    // select's first option). Persisted per user so it survives logins and
    // fresh tab visits, not just the current URL. No CHECK constraint here on
    // purpose: adding one forces SQLite into a rebuild-the-table migration,
    // and that path cascade-deleted every owned row in testing (the
    // PRAGMA foreign_keys=OFF meant to guard it is a silent no-op inside a
    // transaction). Valid values are enforced in the server action instead.
    aboStatusFilter: text("abo_status_filter").notNull().default("all"),
    // Last category filter chosen on the Abos list ("" = "Alle Kategorien").
    // Same reasoning as aboStatusFilter above re: no CHECK constraint — and
    // category ids are dynamic per-user anyway, so a fixed enum wouldn't fit.
    aboCategoryFilter: text("abo_category_filter").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_email_key").on(t.email),
    check("users_role_check", sql`${t.role} in ('admin', 'member')`),
  ]
);

// Server-side sessions replacing Supabase Auth's JWT cookies. The cookie only
// carries the opaque id; everything else is looked up here.
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)]
);

// owner_id null = global category (seeded, admin-managed); otherwise private
// to that user. Mirrors the post-M9 Postgres design.
export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => [
    // Names are unique among global categories, and unique per owner among
    // private ones — the partial-index pair from migration 0002.
    uniqueIndex("categories_name_global_key")
      .on(t.name)
      .where(sql`${t.ownerId} is null`),
    uniqueIndex("categories_name_owner_key")
      .on(t.ownerId, t.name)
      .where(sql`${t.ownerId} is not null`),
  ]
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    amount: real("amount").notNull(),
    billingInterval: text("billing_interval")
      .notNull()
      .default("monthly")
      .$type<BillingInterval>(),
    status: text("status").notNull().default("active").$type<SubscriptionStatus>(),
    nextBillingDate: text("next_billing_date"),
    notes: text("notes"),
    regularAmount: real("regular_amount"),
    introUntil: text("intro_until"),
    ...timestamps,
  },
  (t) => [
    index("subscriptions_owner_id_idx").on(t.ownerId),
    index("subscriptions_owner_status_idx").on(t.ownerId, t.status),
    check("subscriptions_amount_check", sql`${t.amount} >= 0`),
    check(
      "subscriptions_regular_amount_check",
      sql`${t.regularAmount} is null or ${t.regularAmount} >= 0`
    ),
    check(
      "subscriptions_billing_interval_check",
      sql`${t.billingInterval} in ('weekly', 'monthly', 'quarterly', 'yearly')`
    ),
    check(
      "subscriptions_status_check",
      sql`${t.status} in ('active', 'paused', 'cancelled')`
    ),
  ]
);

export type UserRole = "admin" | "member";
export type BillingInterval = "weekly" | "monthly" | "quarterly" | "yearly";
export type SubscriptionStatus = "active" | "paused" | "cancelled";

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
