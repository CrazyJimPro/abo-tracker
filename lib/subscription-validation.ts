import type { BillingInterval, NoticeUnit, SubscriptionStatus } from "@/lib/db/schema";

// Shared by lib/actions/subscriptions.ts (form-based create/update) and
// lib/actions/csv-import.ts (CSV import) so both stay in sync. Deliberately
// NOT in a "use server" file: Next.js requires every export of a "use
// server" module to be an async function, so this plain validation/constant
// logic has to live outside lib/actions/subscriptions.ts.

export const BILLING_INTERVALS: BillingInterval[] = ["weekly", "monthly", "quarterly", "yearly"];
export const STATUSES: SubscriptionStatus[] = ["active", "paused", "cancelled"];
export const NOTICE_UNITS: NoticeUnit[] = ["days", "weeks", "months"];

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
  contractEnd: string | null;
  noticePeriod: number | null;
  noticeUnit: string | null;
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

// Liest die Abo-Felder aus dem Formular. Liegt hier statt in
// lib/actions/subscriptions.ts, damit auch das Formular selbst vor dem
// Absenden genau dieselben Werte prüfen kann wie der Server.
export function readSubscriptionFields(formData: FormData): SubscriptionFields {
  const name = (formData.get("name") as string)?.trim();
  const amountRaw = (formData.get("amount") as string)?.trim();
  const amount = amountRaw ? Number(amountRaw) : NaN;
  const billingInterval = formData.get("billing_interval") as string;
  const status = formData.get("status") as string;
  const categoryIdRaw = (formData.get("category_id") as string)?.trim();
  const categoryId = categoryIdRaw && categoryIdRaw !== "none" ? categoryIdRaw : null;
  const nextBillingDate = (formData.get("next_billing_date") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const regularAmountRaw = (formData.get("regular_amount") as string)?.trim();
  const regularAmount = regularAmountRaw ? Number(regularAmountRaw) : null;
  const introUntil = (formData.get("intro_until") as string)?.trim() || null;
  const contractEnd = (formData.get("contract_end") as string)?.trim() || null;
  const noticePeriodRaw = (formData.get("notice_period") as string)?.trim();
  const noticePeriod = noticePeriodRaw ? Number(noticePeriodRaw) : null;
  // Die Einheit zählt nur zusammen mit einer Frist.
  const noticeUnit =
    noticePeriod !== null ? (formData.get("notice_unit") as string)?.trim() || "months" : null;
  return {
    name,
    amount,
    billingInterval,
    status,
    categoryId,
    nextBillingDate,
    notes,
    regularAmount,
    introUntil,
    contractEnd,
    noticePeriod,
    noticeUnit,
  };
}

// Schlüssel sind die name-Attribute der Formularfelder, damit das Formular
// jeden Fehler direkt dem richtigen Feld zuordnen kann.
export type SubscriptionFieldName =
  | "name"
  | "amount"
  | "billing_interval"
  | "status"
  | "category_id"
  | "new_category_name"
  | "next_billing_date"
  | "regular_amount"
  | "intro_until"
  | "contract_end"
  | "notice_period"
  | "notice_unit";

export type SubscriptionFieldErrors = Partial<Record<SubscriptionFieldName, string>>;


// Sammelt alle Fehler auf einmal, damit das Formular jedes betroffene Feld
// gleichzeitig markieren kann statt eines nach dem anderen.
export function validateFields(fields: SubscriptionFields): SubscriptionFieldErrors {
  const errors: SubscriptionFieldErrors = {};
  if (!fields.name) errors.name = "Name ist erforderlich.";
  if (!Number.isFinite(fields.amount) || fields.amount < 0) {
    errors.amount = "Betrag muss eine positive Zahl sein.";
  }
  if (!BILLING_INTERVALS.includes(fields.billingInterval as BillingInterval)) {
    errors.billing_interval = "Ungültiges Intervall.";
  }
  if (!STATUSES.includes(fields.status as SubscriptionStatus)) {
    errors.status = "Ungültiger Status.";
  }
  if (fields.nextBillingDate !== null && !isValidIsoDate(fields.nextBillingDate)) {
    errors.next_billing_date = `Nächste Abrechnung "${fields.nextBillingDate}" ist kein gültiges Datum (TT.MM.JJJJ oder JJJJ-MM-TT).`;
  }
  if (fields.introUntil !== null && !isValidIsoDate(fields.introUntil)) {
    errors.intro_until = `Aktionspreis gilt bis "${fields.introUntil}" ist kein gültiges Datum (TT.MM.JJJJ oder JJJJ-MM-TT).`;
  }
  if (
    fields.regularAmount !== null &&
    (!Number.isFinite(fields.regularAmount) || fields.regularAmount < 0)
  ) {
    errors.regular_amount = "Regulärer Preis muss eine positive Zahl sein.";
  }
  // Aktionspreis braucht beides: markiert wird das Feld, das noch fehlt.
  if (fields.regularAmount !== null && fields.introUntil === null) {
    errors.intro_until ??= "Für einen Aktionspreis bitte auch das Enddatum angeben.";
  }
  if (fields.regularAmount === null && fields.introUntil !== null) {
    errors.regular_amount ??= "Für einen Aktionspreis bitte auch den regulären Preis angeben.";
  }
  if (fields.contractEnd !== null && !isValidIsoDate(fields.contractEnd)) {
    errors.contract_end = `Vertrag läuft bis "${fields.contractEnd}" ist kein gültiges Datum (TT.MM.JJJJ oder JJJJ-MM-TT).`;
  }
  if (
    fields.noticePeriod !== null &&
    (!Number.isInteger(fields.noticePeriod) || fields.noticePeriod < 0 || fields.noticePeriod > 999)
  ) {
    errors.notice_period = "Kündigungsfrist bitte als ganze Zahl angeben.";
  }
  if (fields.noticeUnit !== null && !NOTICE_UNITS.includes(fields.noticeUnit as NoticeUnit)) {
    errors.notice_unit = "Ungültige Einheit der Kündigungsfrist.";
  }
  return errors;
}

export function validate(fields: SubscriptionFields): string | null {
  return Object.values(validateFields(fields))[0] ?? null;
}
