"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/passwords";
import { revalidatePath } from "next/cache";

// Both actions below use the service-role client, which bypasses RLS
// entirely. is_admin() must therefore be re-checked here explicitly —
// there is no RLS safety net once the service-role client is in play.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;

  return user;
}

export type CreateUserState = {
  error: string | null;
  result: { email: string; tempPassword: string } | null;
};

export async function createMemberUser(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Nicht berechtigt.", result: null };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const displayName = (formData.get("display_name") as string)?.trim() || null;

  if (!email) return { error: "E-Mail ist erforderlich.", result: null };

  const adminClient = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (error || !data.user) {
    if (error?.code === "email_exists") {
      return { error: "Es existiert bereits ein User mit dieser E-Mail.", result: null };
    }
    return { error: error?.message ?? "Fehler beim Anlegen des Users.", result: null };
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ display_name: displayName, created_by: admin.id })
    .eq("id", data.user.id);

  if (profileError) {
    return {
      error: `User wurde angelegt, aber Profil-Update fehlgeschlagen: ${profileError.message}`,
      result: null,
    };
  }

  revalidatePath("/admin");
  return { error: null, result: { email, tempPassword } };
}

export type ResetPasswordState = {
  error: string | null;
  tempPassword: string | null;
};

export async function resetMemberPassword(
  userId: string,
  _prevState: ResetPasswordState,
  _formData: FormData
): Promise<ResetPasswordState> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Nicht berechtigt.", tempPassword: null };

  const adminClient = createAdminClient();
  const tempPassword = generateTempPassword();

  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    password: tempPassword,
  });
  if (authError) return { error: authError.message, tempPassword: null };

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", userId);
  if (profileError) return { error: profileError.message, tempPassword: null };

  revalidatePath("/admin");
  return { error: null, tempPassword };
}
