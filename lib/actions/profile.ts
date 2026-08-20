"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { listVisibleCategories, setAboCategoryFilter, setAboStatusFilter, updateDisplayName } from "@/lib/db/queries";

export type ActionState = { error: string | null; success: boolean };

const ABO_STATUS_FILTER_VALUES = ["", "active", "paused", "cancelled", "all"];

export async function updateAboStatusFilter(status: string) {
  if (!ABO_STATUS_FILTER_VALUES.includes(status)) return;

  const user = await getCurrentUser();
  if (!user) return;

  setAboStatusFilter(user.id, status);
}

export async function updateAboCategoryFilter(categoryId: string) {
  const user = await getCurrentUser();
  if (!user) return;

  // "" means "Alle Kategorien"; anything else must be one of the user's own
  // visible categories (global + private), same set the select is built from.
  if (categoryId !== "" && !listVisibleCategories(user.id).some((c) => c.id === categoryId)) {
    return;
  }

  setAboCategoryFilter(user.id, categoryId);
}

export async function updateProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const displayName = (formData.get("display_name") as string)?.trim() || null;

  const user = await getCurrentUser();
  if (!user) return { error: "Nicht angemeldet.", success: false };

  // Scoped to the acting user's own row — role and other fields are never
  // touched here, which is what the old profiles_update_own policy enforced.
  updateDisplayName(user.id, displayName);

  revalidatePath("/einstellungen");
  revalidatePath("/");
  return { error: null, success: true };
}
