import "server-only";

import { and, asc, eq, gte, isNotNull, isNull, like, lte, ne, or, sql } from "drizzle-orm";

import { db } from "./index";
import {
  categories,
  subscriptions,
  users,
  type BillingInterval,
  type SubscriptionStatus,
  type UserRole,
} from "./schema";

/*
 * Every read/write of user-owned data lives here and takes the acting user id
 * explicitly. Postgres RLS used to guarantee isolation at the database level;
 * with SQLite that guarantee is gone, so this module is the single place where
 * owner scoping is applied — keep it that way rather than querying `db`
 * directly from pages and actions.
 */

const newId = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

// Sorts undated rows last, matching the previous `nullsFirst: false` ordering.
const byNextBillingDate = sql`${subscriptions.nextBillingDate} is null, ${subscriptions.nextBillingDate} asc`;

// ---------- categories ----------

// Global (owner_id null) categories plus the user's own private ones.
export function listVisibleCategories(userId: string) {
  return db
    .select()
    .from(categories)
    .where(or(isNull(categories.ownerId), eq(categories.ownerId, userId)))
    .orderBy(asc(categories.sortOrder), asc(categories.name))
    .all();
}

export function createPrivateCategory(userId: string, name: string, color: string | null) {
  const id = newId();
  db.insert(categories).values({ id, ownerId: userId, name, color }).run();
  return id;
}

export function listGlobalCategories() {
  return db
    .select()
    .from(categories)
    .where(isNull(categories.ownerId))
    .orderBy(asc(categories.sortOrder), asc(categories.name))
    .all();
}

export function getGlobalCategory(id: string) {
  return db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), isNull(categories.ownerId)))
    .get();
}

export function createGlobalCategory(name: string, color: string | null, sortOrder: number) {
  const id = newId();
  db.insert(categories).values({ id, ownerId: null, name, color, sortOrder }).run();
  return id;
}

export function updateGlobalCategory(
  id: string,
  values: { name: string; color: string | null; sortOrder: number }
) {
  db.update(categories)
    .set({ name: values.name, color: values.color, sortOrder: values.sortOrder })
    .where(and(eq(categories.id, id), isNull(categories.ownerId)))
    .run();
}

// Usage count for the admin detail page. Deliberately not owner-scoped: a
// global category is shared, and the admin needs the true total to judge the
// impact of deleting it. Returns only a number, never other users' rows.
export function countSubscriptionsInCategory(categoryId: string) {
  const row = db
    .select({ count: sql<number>`count(*)` })
    .from(subscriptions)
    .where(eq(subscriptions.categoryId, categoryId))
    .get();
  return row?.count ?? 0;
}

export function deleteGlobalCategory(id: string) {
  db.delete(categories)
    .where(and(eq(categories.id, id), isNull(categories.ownerId)))
    .run();
}

// ---------- subscriptions ----------

export type SubscriptionValues = {
  name: string;
  amount: number;
  billingInterval: BillingInterval;
  status: SubscriptionStatus;
  categoryId: string | null;
  nextBillingDate: string | null;
  notes: string | null;
  regularAmount: number | null;
  introUntil: string | null;
};

const withCategory = {
  id: subscriptions.id,
  name: subscriptions.name,
  amount: subscriptions.amount,
  billingInterval: subscriptions.billingInterval,
  status: subscriptions.status,
  categoryId: subscriptions.categoryId,
  nextBillingDate: subscriptions.nextBillingDate,
  notes: subscriptions.notes,
  regularAmount: subscriptions.regularAmount,
  introUntil: subscriptions.introUntil,
  categoryName: categories.name,
  categoryColor: categories.color,
  categorySortOrder: categories.sortOrder,
};

export function listSubscriptions(
  userId: string,
  filters: { search?: string; status?: string; categoryId?: string } = {}
) {
  const conditions = [eq(subscriptions.ownerId, userId)];

  if (filters.search) conditions.push(like(subscriptions.name, `%${filters.search}%`));
  if (filters.categoryId) conditions.push(eq(subscriptions.categoryId, filters.categoryId));

  const { status } = filters;
  if (status === "active" || status === "paused" || status === "cancelled") {
    conditions.push(eq(subscriptions.status, status));
  } else if (status !== "all") {
    // Default view hides cancelled subscriptions.
    conditions.push(ne(subscriptions.status, "cancelled"));
  }

  return db
    .select(withCategory)
    .from(subscriptions)
    .leftJoin(categories, eq(subscriptions.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(byNextBillingDate, asc(subscriptions.name))
    .all();
}

export function listActiveSubscriptions(userId: string) {
  return db
    .select(withCategory)
    .from(subscriptions)
    .leftJoin(categories, eq(subscriptions.categoryId, categories.id))
    .where(and(eq(subscriptions.ownerId, userId), eq(subscriptions.status, "active")))
    .orderBy(byNextBillingDate)
    .all();
}

export function getSubscription(userId: string, id: string) {
  return db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerId, userId)))
    .get();
}

export function insertSubscription(userId: string, values: SubscriptionValues) {
  db.insert(subscriptions)
    .values({ id: newId(), ownerId: userId, ...values })
    .run();
}

export function updateSubscription(userId: string, id: string, values: SubscriptionValues) {
  db.update(subscriptions)
    .set({ ...values, updatedAt: nowIso() })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerId, userId)))
    .run();
}

export function deleteSubscription(userId: string, id: string) {
  db.delete(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerId, userId)))
    .run();
}

export function setNextBillingDate(userId: string, id: string, nextBillingDate: string) {
  db.update(subscriptions)
    .set({ nextBillingDate, updatedAt: nowIso() })
    .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerId, userId)))
    .run();
}

// ---------- notifications ----------

export function listDueUpTo(userId: string, cutoff: string) {
  return db
    .select({
      id: subscriptions.id,
      name: subscriptions.name,
      amount: subscriptions.amount,
      nextBillingDate: subscriptions.nextBillingDate,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.ownerId, userId),
        eq(subscriptions.status, "active"),
        isNotNull(subscriptions.nextBillingDate),
        lte(subscriptions.nextBillingDate, cutoff)
      )
    )
    .orderBy(asc(subscriptions.nextBillingDate))
    .all();
}

export function listPromoEnding(userId: string, today: string, cutoff: string) {
  return db
    .select({
      id: subscriptions.id,
      name: subscriptions.name,
      amount: subscriptions.amount,
      regularAmount: subscriptions.regularAmount,
      introUntil: subscriptions.introUntil,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.ownerId, userId),
        eq(subscriptions.status, "active"),
        isNotNull(subscriptions.regularAmount),
        gte(subscriptions.introUntil, today),
        lte(subscriptions.introUntil, cutoff)
      )
    )
    .orderBy(asc(subscriptions.introUntil))
    .all();
}

export function countNotifications(userId: string, today: string, cutoff: string) {
  return listDueUpTo(userId, cutoff).length + listPromoEnding(userId, today, cutoff).length;
}

// ---------- users ----------

export function getUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email)).get();
}

export function getUserById(id: string) {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function listUsers() {
  return db.select().from(users).orderBy(asc(users.createdAt)).all();
}

export function insertUser(values: {
  email: string;
  passwordHash: string;
  role?: UserRole;
  displayName?: string | null;
  createdBy?: string | null;
  mustChangePassword?: boolean;
}) {
  const id = newId();
  db.insert(users)
    .values({
      id,
      email: values.email,
      passwordHash: values.passwordHash,
      role: values.role ?? "member",
      displayName: values.displayName ?? null,
      createdBy: values.createdBy ?? null,
      mustChangePassword: values.mustChangePassword ?? true,
    })
    .run();
  return id;
}

export function updateDisplayName(userId: string, displayName: string | null) {
  db.update(users).set({ displayName, updatedAt: nowIso() }).where(eq(users.id, userId)).run();
}

export function setPassword(userId: string, passwordHash: string, mustChangePassword: boolean) {
  db.update(users)
    .set({ passwordHash, mustChangePassword, updatedAt: nowIso() })
    .where(eq(users.id, userId))
    .run();
}
