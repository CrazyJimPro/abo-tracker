"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionState = { error: string | null; success: boolean };

export async function updateProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const displayName = (formData.get("display_name") as string)?.trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet.", success: false };

  // RLS (profiles_update_own) allows updating your own row as long as the
  // role stays unchanged; display_name is fine via the regular client.
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) return { error: error.message, success: false };

  revalidatePath("/einstellungen");
  revalidatePath("/");
  return { error: null, success: true };
}
