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
  return { name, amount, billingInterval, status, categoryId, nextBillingDate, notes };
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

  const { error } = await supabase.from("subscriptions").insert({
    owner_id: user.id,
    name: fields.name,
    amount: fields.amount,
    billing_interval: fields.billingInterval as Enums<"billing_interval">,
    status: fields.status as Enums<"subscription_status">,
    category_id: fields.categoryId,
    next_billing_date: fields.nextBillingDate,
    notes: fields.notes,
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
  const { error } = await supabase
    .from("subscriptions")
    .update({
      name: fields.name,
      amount: fields.amount,
      billing_interval: fields.billingInterval as Enums<"billing_interval">,
      status: fields.status as Enums<"subscription_status">,
      category_id: fields.categoryId,
      next_billing_date: fields.nextBillingDate,
      notes: fields.notes,
    })
    .eq("id", subscriptionId);

  if (error) return { error: error.message };

  revalidatePath(`/abos/${subscriptionId}`);
  revalidatePath("/abos");
  revalidatePath("/");
  return { error: null };
}

export async function deleteSubscription(subscriptionId: string) {
  const supabase = await createClient();
  await supabase.from("subscriptions").delete().eq("id", subscriptionId);

  revalidatePath("/abos");
  revalidatePath("/");
  redirect("/abos");
}
