import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser } from "./session";
import type { User } from "@/lib/db/schema";

/*
 * With Postgres RLS gone, these guards are the enforcement boundary rather
 * than a convenience layer: every page and action that touches user data must
 * go through one of them and then scope its queries to the returned user.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
