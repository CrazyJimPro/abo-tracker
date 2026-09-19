import type { BillingInterval, SubscriptionStatus } from "@/lib/db/schema";

// Shared by lib/actions/subscriptions.ts (form-based create/update) and
// lib/actions/csv-import.ts (CSV import) so both stay in sync. Deliberately
// NOT in a "use server" file: Next.js requires every export of a "use
// server" module to be an async function, so this plain validation/constant
// logic has to live outside lib/actions/subscriptions.ts.

export const BILLING_INTERVALS: BillingInterval[] = ["weekly", "monthly", "quarterly", "yearly"];
export const STATUSES: SubscriptionStatus[] = ["active", "paused", "cancelled"];

// Palette for auto-coloring newly created categories, mirroring the tones of
// the global seed categories so a fresh private category looks at home in
// the list and donut chart instead of falling back to grey.
export const CATEGORY_COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#eab308",
  "#06b6d4",
  "#ef4444",
  "#14b8a6",
  "#a855f7",
];

export type SubscriptionFields = {
  name: string;
  amount: number;
  billingInterval: string;
  status: string;
  categoryId: string | null;
  nextBillingDate: string | null;
  notes: string | null;
  regularAmount: number | null;
  introUntil: string | null;
};

// Echtes Kalenderdatum im Format JJJJ-MM-TT — "2026-02-30" fällt durch, weil
// Date.UTC den Tag in den März überlaufen ließe.
export function isValidIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export function validate(fields: SubscriptionFields): string | null {
  if (!fields.name) return "Name ist erforderlich.";
  if (!Number.isFinite(fields.amount) || fields.amount < 0) {
    return "Betrag muss eine positive Zahl sein.";
  }
  if (!BILLING_INTERVALS.includes(fields.billingInterval as BillingInterval)) {
    return "Ungültiges Intervall.";
  }
  if (!STATUSES.includes(fields.status as SubscriptionStatus)) {
    return "Ungültiger Status.";
  }
  if (fields.nextBillingDate !== null && !isValidIsoDate(fields.nextBillingDate)) {
    return `Nächste Abrechnung "${fields.nextBillingDate}" ist kein gültiges Datum (TT.MM.JJJJ oder JJJJ-MM-TT).`;
  }
  if (fields.introUntil !== null && !isValidIsoDate(fields.introUntil)) {
    return `Aktionspreis gilt bis "${fields.introUntil}" ist kein gültiges Datum (TT.MM.JJJJ oder JJJJ-MM-TT).`;
  }
  if (
    fields.regularAmount !== null &&
    (!Number.isFinite(fields.regularAmount) || fields.regularAmount < 0)
  ) {
    return "Regulärer Preis muss eine positive Zahl sein.";
  }
  if ((fields.regularAmount !== null) !== (fields.introUntil !== null)) {
    return "Für einen Aktionspreis bitte regulären Preis und Enddatum angeben.";
  }
  return null;
}
