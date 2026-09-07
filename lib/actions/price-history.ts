"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import {
  deletePriceHistoryEntry as deletePriceHistoryEntryRow,
  getSubscription,
  insertPriceHistoryEntry,
  updatePriceHistoryEntry as updatePriceHistoryEntryRow,
} from "@/lib/db/queries";

export type PriceHistoryActionState = { error: string | null };

function readAmountAndDate(formData: FormData): { amount: number; changedAt: string } | { error: string } {
  const amountRaw = (formData.get("amount") as string)?.trim();
  const amount = amountRaw ? Number(amountRaw) : NaN;
  const changedAt = (formData.get("changed_at") as string)?.trim();

  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Betrag muss eine positive Zahl sein." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(changedAt)) {
    return { error: "Bitte ein gültiges Datum angeben." };
  }
  if (changedAt > new Date().toISOString().slice(0, 10)) {
    return { error: "Datum darf nicht in der Zukunft liegen." };
  }
  return { amount, changedAt };
}

// Lets a user backfill a price they remember from before this feature
// existed — the automatic capture in updateSubscription only sees changes
// made through the edit form from now on.
export async function addManualPriceHistoryEntry(
  subscriptionId: string,
  _prevState: PriceHistoryActionState,
  formData: FormData
): Promise<PriceHistoryActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Nicht angemeldet." };

  const subscription = getSubscription(user.id, subscriptionId);
  if (!subscription) return { error: "Abo nicht gefunden." };

  const parsed = readAmountAndDate(formData);
  if ("error" in parsed) return parsed;

  insertPriceHistoryEntry(user.id, subscriptionId, { ...parsed, source: "manual" });

  revalidatePath(`/historie/${subscriptionId}`);
  return { error: null };
}

// Corrects an existing entry — most often the date, since an auto-captured
// change is stamped with the day it was edited in the app, which can lag the
// day the price actually changed in the real world.
export async function editPriceHistoryEntry(
  subscriptionId: string,
  entryId: string,
  _prevState: PriceHistoryActionState,
  formData: FormData
): Promise<PriceHistoryActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Nicht angemeldet." };

  const parsed = readAmountAndDate(formData);
  if ("error" in parsed) return parsed;

  updatePriceHistoryEntryRow(user.id, entryId, parsed);

  revalidatePath(`/historie/${subscriptionId}`);
  return { error: null };
}

export async function deletePriceHistoryEntry(subscriptionId: string, entryId: string) {
  const user = await getCurrentUser();
  if (!user) return;

  deletePriceHistoryEntryRow(user.id, entryId);

  revalidatePath(`/historie/${subscriptionId}`);
}
