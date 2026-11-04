"use server";

import { redirect } from "next/navigation";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  destroySession,
  destroyUserSessions,
  getCurrentUser,
} from "@/lib/auth/session";
import { getUserByEmail, setPassword } from "@/lib/db/queries";

export type ActionState = { error: string | null; fieldErrors?: Record<string, string> };

// Beide Felder rot, ohne zu verraten, welches falsch war.
const LOGIN_FAILED: ActionState = {
  error: "E-Mail oder Passwort ist falsch.",
  fieldErrors: { email: "", password: "" },
};

export async function signIn(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) return LOGIN_FAILED;

  const user = getUserByEmail(email);
  // Same message whether the account is unknown or the password is wrong, so
  // the form can't be used to probe which addresses exist.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return LOGIN_FAILED;
  }

  await createSession(user.id);
  redirect("/");
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}

export async function changePassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const password = formData.get("password") as string;
  const passwordConfirm = formData.get("passwordConfirm") as string;

  if (password.length < 8) {
    return {
      error: null,
      fieldErrors: { password: "Das Passwort muss mindestens 8 Zeichen lang sein." },
    };
  }
  if (password !== passwordConfirm) {
    return {
      error: null,
      fieldErrors: { passwordConfirm: "Die Passwörter stimmen nicht überein." },
    };
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  setPassword(user.id, await hashPassword(password), false);

  // Drop every existing session (other devices, and the temp-password one) and
  // issue a fresh cookie so the current browser stays signed in.
  destroyUserSessions(user.id);
  await createSession(user.id);

  redirect("/");
}
