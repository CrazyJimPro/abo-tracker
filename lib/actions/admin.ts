"use server";

import { revalidatePath } from "next/cache";

import { hashPassword } from "@/lib/auth/password";
import { destroyUserSessions, getCurrentUser } from "@/lib/auth/session";
import { generateTempPassword } from "@/lib/passwords";
import { getUserById, insertUser, setPassword } from "@/lib/db/queries";

// Both actions below create or overwrite other users' credentials, so the
// admin role is re-checked here explicitly — there is no RLS safety net.
async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
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

  const tempPassword = generateTempPassword();

  try {
    insertUser({
      email,
      passwordHash: await hashPassword(tempPassword),
      displayName,
      createdBy: admin.id,
      mustChangePassword: true,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return { error: "Es existiert bereits ein User mit dieser E-Mail.", result: null };
    }
    return {
      error: e instanceof Error ? e.message : "Fehler beim Anlegen des Users.",
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

  if (!getUserById(userId)) return { error: "User nicht gefunden.", tempPassword: null };

  const tempPassword = generateTempPassword();
  setPassword(userId, await hashPassword(tempPassword), true);
  // Kick the user out everywhere; the old password must not stay usable.
  destroyUserSessions(userId);

  revalidatePath("/admin");
  return { error: null, tempPassword };
}
