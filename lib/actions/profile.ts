"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { updateDisplayName } from "@/lib/db/queries";

export type ActionState = { error: string | null; success: boolean };

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
