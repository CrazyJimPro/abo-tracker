"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import {
  createPrivateCategory,
  deleteSubscription as deleteSubscriptionRow,
  getSubscription,
  insertSubscription,
  setNextBillingDate,
  updateSubscription as updateSubscriptionRow,
  type SubscriptionValues,
} from "@/lib/db/queries";
import type { BillingInterval, SubscriptionStatus } from "@/lib/db/schema";
import {
  CATEGORY_COLORS,
  readSubscriptionFields,
  validateFields,
  type SubscriptionFieldErrors,
} from "@/lib/subscription-validation";

export type ActionState = { error: string | null; fieldErrors?: SubscriptionFieldErrors };

function fieldErrorState(fieldErrors: SubscriptionFieldErrors): ActionState | null {
  if (Object.keys(fieldErrors).length === 0) return null;
  return { error: null, fieldErrors };
}

// Resolves the submitted category selection to a category id. The special
// "__new__" value means the user typed a new category name in the form; we
// create it as a private category (owned by the user) on the fly and return
// its id. Any other value passes through unchanged.
function resolveCategoryId(
  userId: string,
  categoryId: string | null,
  formData: FormData
): { categoryId: string | null } | { error: string } {
  if (categoryId !== "__new__") return { categoryId };

  const newName = (formData.get("new_category_name") as string)?.trim();
  if (!newName) return { error: "Bitte einen Namen für die neue Kategorie angeben." };

  const color = CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];

  try {
    return { categoryId: createPrivateCategory(userId, newName, color) };
  } catch (e) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return { error: "Du hast bereits eine Kategorie mit diesem Namen." };
    }
    throw e;
  }
}

function toValues(
  fields: ReturnType<typeof readSubscriptionFields>,
  categoryId: string | null
): SubscriptionValues {
  return {
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
}

export async function createSubscription(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const fields = readSubscriptionFields(formData);
  const invalid = fieldErrorState(validateFields(fields));
  if (invalid) return invalid;

  const user = await getCurrentUser();
  if (!user) return { error: "Nicht angemeldet." };

  const resolved = resolveCategoryId(user.id, fields.categoryId, formData);
  if ("error" in resolved) {
    return { error: null, fieldErrors: { new_category_name: resolved.error } };
  }

  insertSubscription(user.id, toValues(fields, resolved.categoryId));

  revalidatePath("/abos");
  revalidatePath("/");
  redirect("/abos");
}

export async function updateSubscription(
  subscriptionId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const fields = readSubscriptionFields(formData);
  const invalid = fieldErrorState(validateFields(fields));
  if (invalid) return invalid;

  const user = await getCurrentUser();
  if (!user) return { error: "Nicht angemeldet." };

  const resolved = resolveCategoryId(user.id, fields.categoryId, formData);
  if ("error" in resolved) {
    return { error: null, fieldErrors: { new_category_name: resolved.error } };
  }

  updateSubscriptionRow(user.id, subscriptionId, toValues(fields, resolved.categoryId));

  revalidatePath(`/abos/${subscriptionId}`);
  revalidatePath("/abos");
  revalidatePath("/");
  revalidatePath("/benachrichtigungen");
  return { error: null };
}

export async function deleteSubscription(subscriptionId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  deleteSubscriptionRow(user.id, subscriptionId);

  revalidatePath("/abos");
  revalidatePath("/");
  redirect("/abos");
}

// Advances an ISO date string (YYYY-MM-DD) by exactly one billing interval.
// UTC math keeps the calendar date stable regardless of server timezone.
function advanceBillingDate(date: string, interval: BillingInterval): string {
  const d = new Date(`${date}T00:00:00Z`);
  switch (interval) {
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case "quarterly":
      d.setUTCMonth(d.getUTCMonth() + 3);
      break;
    case "yearly":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
  }
  return d.toISOString().slice(0, 10);
}

// Records one billing cycle: pushes next_billing_date forward by a single
// interval. One click = one cycle, so a subscription overdue by N cycles is
// advanced N clicks (predictable rather than silently skipping missed cycles).
export async function markBilled(subscriptionId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sub = getSubscription(user.id, subscriptionId);
  if (!sub?.nextBillingDate) return;

  setNextBillingDate(
    user.id,
    subscriptionId,
    advanceBillingDate(sub.nextBillingDate, sub.billingInterval)
  );

  revalidatePath("/abos");
  revalidatePath(`/abos/${subscriptionId}`);
  revalidatePath("/");
  revalidatePath("/benachrichtigungen");
}
