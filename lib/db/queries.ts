import "server-only";

import { and, asc, eq, gte, isNotNull, isNull, like, lte, ne, or, sql } from "drizzle-orm";

import { db } from "./index";
import {
  categories,
  priceHistory,
  subscriptions,
  users,
  type BillingInterval,
  type NoticeUnit,
  type PaymentMethod,
  type PriceHistorySource,
  type SubscriptionStatus,
  type UserRole,
} from "./schema";
import { cancelByDate } from "@/lib/contract";

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
  contractEnd: string | null;
  noticePeriod: number | null;
  noticeUnit: NoticeUnit | null;
  paymentMethod: PaymentMethod | null;
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
  contractEnd: subscriptions.contractEnd,
  noticePeriod: subscriptions.noticePeriod,
  noticeUnit: subscriptions.noticeUnit,
  paymentMethod: subscriptions.paymentMethod,
  categoryName: categories.name,
  categoryColor: categories.color,
  categorySortOrder: categories.sortOrder,
};

export function listSubscriptions(
  userId: string,
  filters: { search?: string; status?: string; categoryId?: string; paymentMethod?: string } = {}
) {
  const conditions = [eq(subscriptions.ownerId, userId)];

  if (filters.search) conditions.push(like(subscriptions.name, `%${filters.search}%`));
  if (filters.categoryId) conditions.push(eq(subscriptions.categoryId, filters.categoryId));
  // "none" = Abos ohne Angabe; "" bzw. nicht gesetzt = kein Filter.
  if (filters.paymentMethod === "none") {
    conditions.push(isNull(subscriptions.paymentMethod));
  } else if (filters.paymentMethod) {
    conditions.push(eq(subscriptions.paymentMethod, filters.paymentMethod as PaymentMethod));
  }

  const { status } = filters;
  if (status === "active" || status === "paused" || status === "cancelled") {
    conditions.push(eq(subscriptions.status, status));
  } else if (status === "") {
    // "Aktiv & pausiert" — the one explicit filter option that still hides
    // cancelled subscriptions. Anything else (in particular "all", or no
    // filter set at all) shows every status.
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

// Exact-match lookup used by CSV import to catch duplicates that an id-based
// check can miss (id column absent, or from a different database entirely —
// see insertSubscription). Nullable columns need `is null` rather than
// `= null`, hence the ternaries instead of a plain eq() for each.
export function findMatchingSubscription(userId: string, values: SubscriptionValues) {
  return db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.ownerId, userId),
        eq(subscriptions.name, values.name),
        eq(subscriptions.amount, values.amount),
        eq(subscriptions.billingInterval, values.billingInterval),
        eq(subscriptions.status, values.status),
        values.categoryId === null
          ? isNull(subscriptions.categoryId)
          : eq(subscriptions.categoryId, values.categoryId),
        values.nextBillingDate === null
          ? isNull(subscriptions.nextBillingDate)
          : eq(subscriptions.nextBillingDate, values.nextBillingDate),
        values.notes === null ? isNull(subscriptions.notes) : eq(subscriptions.notes, values.notes),
        values.regularAmount === null
          ? isNull(subscriptions.regularAmount)
          : eq(subscriptions.regularAmount, values.regularAmount),
        values.introUntil === null
          ? isNull(subscriptions.introUntil)
          : eq(subscriptions.introUntil, values.introUntil),
        values.contractEnd === null
          ? isNull(subscriptions.contractEnd)
          : eq(subscriptions.contractEnd, values.contractEnd),
        values.noticePeriod === null
          ? isNull(subscriptions.noticePeriod)
          : eq(subscriptions.noticePeriod, values.noticePeriod),
        values.noticeUnit === null
          ? isNull(subscriptions.noticeUnit)
          : eq(subscriptions.noticeUnit, values.noticeUnit),
        values.paymentMethod === null
          ? isNull(subscriptions.paymentMethod)
          : eq(subscriptions.paymentMethod, values.paymentMethod)
      )
    )
    .get();
}

// Reuses the given id when the caller has one (CSV import, so re-importing
// the same file — even into a different database — recognizes its own rows
// by id next time instead of relying on findMatchingSubscription above).
// Generates a fresh one otherwise, same as before.
export function insertSubscription(userId: string, values: SubscriptionValues, id: string = newId()) {
  db.transaction((tx) => {
    tx.insert(subscriptions)
      .values({ id, ownerId: userId, ...values })
      .run();
    tx.insert(priceHistory)
      .values({
        id: newId(),
        subscriptionId: id,
        ownerId: userId,
        amount: values.amount,
        changedAt: nowIso().slice(0, 10),
        source: "initial",
      })
      .run();
  });
  return id;
}

// Writes the update and, when `amount` actually changed, appends a
// price_history row in the same transaction so the two never drift apart.
export function updateSubscription(userId: string, id: string, values: SubscriptionValues) {
  db.transaction((tx) => {
    const current = tx
      .select({ amount: subscriptions.amount })
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerId, userId)))
      .get();

    tx.update(subscriptions)
      .set({ ...values, updatedAt: nowIso() })
      .where(and(eq(subscriptions.id, id), eq(subscriptions.ownerId, userId)))
      .run();

    if (current && current.amount !== values.amount) {
      tx.insert(priceHistory)
        .values({
          id: newId(),
          subscriptionId: id,
          ownerId: userId,
          amount: values.amount,
          changedAt: nowIso().slice(0, 10),
          source: "auto",
        })
        .run();
    }
  });
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

// ---------- price history ----------

export function getPriceHistoryForSubscription(userId: string, subscriptionId: string) {
  return db
    .select()
    .from(priceHistory)
    .where(and(eq(priceHistory.subscriptionId, subscriptionId), eq(priceHistory.ownerId, userId)))
    .orderBy(asc(priceHistory.changedAt), asc(priceHistory.createdAt))
    .all();
}

export function insertPriceHistoryEntry(
  userId: string,
  subscriptionId: string,
  values: { amount: number; changedAt: string; source?: PriceHistorySource; note?: string | null }
) {
  const id = newId();
  db.insert(priceHistory)
    .values({
      id,
      subscriptionId,
      ownerId: userId,
      amount: values.amount,
      changedAt: values.changedAt,
      source: values.source ?? "manual",
      note: values.note ?? null,
    })
    .run();
  return id;
}

// Corrects an existing entry's amount/date — used to fix a price change that
// was auto-captured on the day it was *edited in the app* rather than the day
// it actually took effect (or to fix a mistyped manual backfill).
export function updatePriceHistoryEntry(
  userId: string,
  entryId: string,
  values: { amount: number; changedAt: string }
) {
  db.update(priceHistory)
    .set(values)
    .where(and(eq(priceHistory.id, entryId), eq(priceHistory.ownerId, userId)))
    .run();
}

export function deletePriceHistoryEntry(userId: string, entryId: string) {
  db.delete(priceHistory)
    .where(and(eq(priceHistory.id, entryId), eq(priceHistory.ownerId, userId)))
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

// Abos mit eingetragenem Vertragsende, bei denen der späteste Kündigungstag
// bis zum cutoff erreicht ist und das Vertragsende noch nicht vorbei ist.
// "Kündigen bis" hängt an Monatslängen, deshalb wird in JS gefiltert statt in
// SQL. Gekündigte Abos brauchen keine Erinnerung mehr.
export function listCancelDeadlines(userId: string, today: string, cutoff: string) {
  return db
    .select({
      id: subscriptions.id,
      name: subscriptions.name,
      contractEnd: subscriptions.contractEnd,
      noticePeriod: subscriptions.noticePeriod,
      noticeUnit: subscriptions.noticeUnit,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.ownerId, userId),
        ne(subscriptions.status, "cancelled"),
        isNotNull(subscriptions.contractEnd),
        gte(subscriptions.contractEnd, today)
      )
    )
    .all()
    .map((s) => ({ ...s, cancelBy: cancelByDate(s.contractEnd, s.noticePeriod, s.noticeUnit)! }))
    .filter((s) => s.cancelBy <= cutoff)
    .sort((a, b) => a.cancelBy.localeCompare(b.cancelBy));
}

export function countNotifications(userId: string, today: string, cutoff: string) {
  return (
    listDueUpTo(userId, cutoff).length +
    listPromoEnding(userId, today, cutoff).length +
    listCancelDeadlines(userId, today, cutoff).length
  );
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

export function setAboStatusFilter(userId: string, status: string) {
  db.update(users)
    .set({ aboStatusFilter: status, updatedAt: nowIso() })
    .where(eq(users.id, userId))
    .run();
}

export function setNotifyDays(userId: string, days: number) {
  db.update(users)
    .set({ notifyDays: days, updatedAt: nowIso() })
    .where(eq(users.id, userId))
    .run();
}

export function setAboPaymentFilter(userId: string, paymentMethod: string) {
  db.update(users)
    .set({ aboPaymentFilter: paymentMethod, updatedAt: nowIso() })
    .where(eq(users.id, userId))
    .run();
}

export function setAboCategoryFilter(userId: string, categoryId: string) {
  db.update(users)
    .set({ aboCategoryFilter: categoryId, updatedAt: nowIso() })
    .where(eq(users.id, userId))
    .run();
}

export function setPassword(userId: string, passwordHash: string, mustChangePassword: boolean) {
  db.update(users)
    .set({ passwordHash, mustChangePassword, updatedAt: nowIso() })
    .where(eq(users.id, userId))
    .run();
}
