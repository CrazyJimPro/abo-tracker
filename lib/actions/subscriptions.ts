"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Enums } from "@/types/database";

export type ActionState = { error: string | null };

const BILLING_INTERVALS: Enums<"billing_interval">[] = ["weekly", "monthly", "quarterly", "yearly"];
const STATUSES: Enums<"subscription_status">[] = ["active", "paused", "cancelled"];

function readSubscriptionFields(formData: FormData) {
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
  };
}

// Palette for auto-coloring newly created categories, mirroring the tones of
// the global seed categories so a fresh private category looks at home in the
// list and donut chart instead of falling back to grey.
const CATEGORY_COLORS = [
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

// Resolves the submitted category selection to a category id. The special
// "__new__" value means the user typed a new category name in the form; we
// create it as a private category (owner_id = the user) on the fly and return
// its id. Any other value passes through unchanged.
async function resolveCategoryId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  categoryId: string | null,
  formData: FormData
): Promise<{ categoryId: string | null } | { error: string }> {
  if (categoryId !== "__new__") return { categoryId };

  const newName = (formData.get("new_category_name") as string)?.trim();
  if (!newName) return { error: "Bitte einen Namen für die neue Kategorie angeben." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const color = CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];
  const { data, error } = await supabase
    .from("categories")
    .insert({ owner_id: user.id, name: newName, color })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Du hast bereits eine Kategorie mit diesem Namen." };
    return { error: error.message };
  }

  return { categoryId: data.id };
}

function validate(fields: ReturnType<typeof readSubscriptionFields>): string | null {
  if (!fields.name) return "Name ist erforderlich.";
  if (!Number.isFinite(fields.amount) || fields.amount < 0) {
    return "Betrag muss eine positive Zahl sein.";
  }
  if (!BILLING_INTERVALS.includes(fields.billingInterval as Enums<"billing_interval">)) {
    return "Ungültiges Intervall.";
  }
  if (!STATUSES.includes(fields.status as Enums<"subscription_status">)) {
    return "Ungültiger Status.";
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

export async function createSubscription(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const fields = readSubscriptionFields(formData);
  const validationError = validate(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const resolved = await resolveCategoryId(supabase, fields.categoryId, formData);
  if ("error" in resolved) return { error: resolved.error };

  const { error } = await supabase.from("subscriptions").insert({
    owner_id: user.id,
    name: fields.name,
    amount: fields.amount,
    billing_interval: fields.billingInterval as Enums<"billing_interval">,
    status: fields.status as Enums<"subscription_status">,
    category_id: resolved.categoryId,
    next_billing_date: fields.nextBillingDate,
    notes: fields.notes,
    regular_amount: fields.regularAmount,
    intro_until: fields.introUntil,
  });

  if (error) return { error: error.message };

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
  const validationError = validate(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();

  const resolved = await resolveCategoryId(supabase, fields.categoryId, formData);
  if ("error" in resolved) return { error: resolved.error };

  const { error } = await supabase
    .from("subscriptions")
    .update({
      name: fields.name,
      amount: fields.amount,
      billing_interval: fields.billingInterval as Enums<"billing_interval">,
      status: fields.status as Enums<"subscription_status">,
      category_id: resolved.categoryId,
      next_billing_date: fields.nextBillingDate,
      notes: fields.notes,
      regular_amount: fields.regularAmount,
      intro_until: fields.introUntil,
    })
    .eq("id", subscriptionId);

  if (error) return { error: error.message };

  revalidatePath(`/abos/${subscriptionId}`);
  revalidatePath("/abos");
  revalidatePath("/");
  revalidatePath("/benachrichtigungen");
  return { error: null };
}

export async function deleteSubscription(subscriptionId: string) {
  const supabase = await createClient();
  await supabase.from("subscriptions").delete().eq("id", subscriptionId);

  revalidatePath("/abos");
  revalidatePath("/");
  redirect("/abos");
}

// Advances an ISO date string (YYYY-MM-DD) by exactly one billing interval.
// UTC math keeps the calendar date stable regardless of server timezone.
function advanceBillingDate(date: string, interval: Enums<"billing_interval">): string {
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
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("next_billing_date, billing_interval")
    .eq("id", subscriptionId)
    .single();

  if (!sub?.next_billing_date) return;

  const next = advanceBillingDate(sub.next_billing_date, sub.billing_interval);
  await supabase
    .from("subscriptions")
    .update({ next_billing_date: next })
    .eq("id", subscriptionId);

  revalidatePath("/abos");
  revalidatePath(`/abos/${subscriptionId}`);
  revalidatePath("/");
  revalidatePath("/benachrichtigungen");
}
