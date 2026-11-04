"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import {
  deletePriceHistoryEntry as deletePriceHistoryEntryRow,
  getSubscription,
  insertPriceHistoryEntry,
  updatePriceHistoryEntry as updatePriceHistoryEntryRow,
} from "@/lib/db/queries";
import { readPriceEntry } from "@/lib/price-history-validation";

export type PriceHistoryActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

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

  const parsed = readPriceEntry(formData);
  if ("fieldErrors" in parsed) return { error: null, fieldErrors: parsed.fieldErrors };

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

  const parsed = readPriceEntry(formData);
  if ("fieldErrors" in parsed) return { error: null, fieldErrors: parsed.fieldErrors };

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
