"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  createPrivateCategory,
  findMatchingSubscription,
  getSubscription,
  insertSubscription,
  listVisibleCategories,
  updateSubscription,
  type SubscriptionValues,
} from "@/lib/db/queries";
import type { BillingInterval, SubscriptionStatus } from "@/lib/db/schema";
import { CATEGORY_COLORS, validate } from "@/lib/subscription-validation";
import { billingIntervalFromLabel, parseGermanDecimal, parseSubscriptionsCsv, statusFromLabel } from "@/lib/csv";

export type ImportResult = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
  categoriesCreated: string[];
};

export type ImportActionState = { result: ImportResult | null; fatalError: string | null };

export async function importSubscriptionsCsv(
  _prevState: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  const user = await getCurrentUser();
  if (!user) return { result: null, fatalError: "Nicht angemeldet." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { result: null, fatalError: "Bitte eine CSV-Datei auswählen." };
  }

  const text = await file.text();
  const { rows, parseError } = parseSubscriptionsCsv(text);
  if (parseError) return { result: null, fatalError: parseError };

  const categoryByName = new Map(listVisibleCategories(user.id).map((c) => [c.name, c.id]));

  const errors: ImportResult["errors"] = [];
  const categoriesCreated: string[] = [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  db.transaction(() => {
    for (const { raw, rowNumber } of rows) {
      const name = (raw["Name"] ?? "").trim();
      const amount = parseGermanDecimal(raw["Betrag"] ?? "");
      const billingInterval = billingIntervalFromLabel(raw["Intervall"] ?? "") ?? "";
      const status = statusFromLabel(raw["Status"] ?? "") ?? "";
      const nextBillingDate = (raw["Nächste Abrechnung"] ?? "").trim() || null;
      const notes = (raw["Notizen"] ?? "").trim() || null;
      const regularAmountRaw = (raw["Regulärer Preis"] ?? "").trim();
      const regularAmount = regularAmountRaw ? parseGermanDecimal(regularAmountRaw) : null;
      const introUntil = (raw["Aktionspreis gilt bis"] ?? "").trim() || null;

      const fields = {
        name,
        amount,
        billingInterval,
        status,
        categoryId: null as string | null,
        nextBillingDate,
        notes,
        regularAmount,
        introUntil,
      };

      const validationError = validate(fields);
      if (validationError) {
        errors.push({ row: rowNumber, message: validationError });
        continue;
      }

      // Category resolution happens only for an otherwise-valid row, so a
      // row that gets rejected below never leaves behind a stray new
      // category as a side effect.
      const categoryName = (raw["Kategorie"] ?? "").trim();
      let categoryId: string | null = null;
      if (categoryName) {
        categoryId = categoryByName.get(categoryName) ?? null;
        if (!categoryId) {
          const color = CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];
          try {
            categoryId = createPrivateCategory(user.id, categoryName, color);
            categoryByName.set(categoryName, categoryId);
            categoriesCreated.push(categoryName);
          } catch {
            errors.push({
              row: rowNumber,
              message: `Kategorie "${categoryName}" konnte nicht angelegt werden.`,
            });
            continue;
          }
        }
      }

      const values: SubscriptionValues = {
        name: fields.name,
        amount: fields.amount,
        billingInterval: fields.billingInterval as BillingInterval,
        status: fields.status as SubscriptionStatus,
        categoryId,
        nextBillingDate: fields.nextBillingDate,
        notes: fields.notes,
        regularAmount: fields.regularAmount,
        introUntil: fields.introUntil,
      };

      // Ownership-safe upsert: getSubscription is scoped to (id, ownerId), so
      // an id that belongs to someone else — or doesn't exist — simply isn't
      // found here, and we fall through to a fresh insert owned by the
      // current user. No column from the CSV is ever trusted as an owner id.
      const rowId = (raw["ID"] ?? "").trim();
      const existing = rowId ? getSubscription(user.id, rowId) : undefined;
      if (existing) {
        updateSubscription(user.id, rowId, values);
        updated++;
      } else if (findMatchingSubscription(user.id, values)) {
        // No id match, but every field is identical to a subscription this
        // user already has — re-importing a file whose rows never got
        // matched by id (e.g. the first import into a different database,
        // like a test VM) would otherwise duplicate each row exactly.
        skipped++;
      } else {
        // Reuse the CSV's own id when there is one, so re-importing this
        // file later — even into a different database — recognizes these
        // rows by id next time instead of relying on the content check
        // above. Falls back to a fresh id on the rare chance it's taken.
        try {
          insertSubscription(user.id, values, rowId || undefined);
        } catch (e) {
          if (!(e instanceof Error && e.message.includes("UNIQUE"))) throw e;
          insertSubscription(user.id, values);
        }
        inserted++;
      }
    }
  });

  revalidatePath("/abos");
  revalidatePath("/");
  revalidatePath("/benachrichtigungen");
  revalidatePath("/einstellungen");

  return {
    result: { inserted, updated, skipped, errors, categoriesCreated },
    fatalError: null,
  };
}
