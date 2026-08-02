import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { sessions, users, type User } from "@/lib/db/schema";

export const SESSION_COOKIE = "abo_session";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/*
 * Opaque server-side sessions replacing Supabase Auth. The cookie carries only
 * a random id; role and must_change_password are always read fresh from the
 * database, so revoking access or flipping a flag takes effect immediately
 * rather than waiting for a token to expire.
 *
 * `secure` is deliberately NOT set: the app is served over plain HTTP on the
 * local network (see scripts/start-prod.sh), and a secure cookie would never
 * be stored by the browser there.
 */
export async function createSession(userId: string): Promise<void> {
  const id = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_TTL_MS;

  db.insert(sessions).values({ id, userId, expiresAt }).run();

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

// Resolves a raw session id to its user. Kept token-based (rather than reading
// cookies itself) so the proxy, which only has the NextRequest, can reuse it.
export function getUserBySessionToken(token: string | undefined): User | null {
  if (!token) return null;

  const row = db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, token))
    .get();

  if (!row) return null;

  if (row.expiresAt <= Date.now()) {
    db.delete(sessions).where(eq(sessions.id, token)).run();
    return null;
  }

  return row.user;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  return getUserBySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) db.delete(sessions).where(eq(sessions.id, token)).run();
  cookieStore.delete(SESSION_COOKIE);
}

// Invalidates every session of a user — used when their password changes, so
// other devices can't keep using the old credentials.
export function destroyUserSessions(userId: string): void {
  db.delete(sessions).where(eq(sessions.userId, userId)).run();
}

export function deleteExpiredSessions(): void {
  db.delete(sessions).where(lt(sessions.expiresAt, Date.now())).run();
}
