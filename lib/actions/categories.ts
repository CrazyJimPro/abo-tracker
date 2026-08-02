"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import {
  createGlobalCategory,
  deleteGlobalCategory,
  updateGlobalCategory,
} from "@/lib/db/queries";

export type ActionState = { error: string | null };

function readCategoryFields(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const color = (formData.get("color") as string)?.trim() || null;
  const sortOrderRaw = formData.get("sort_order") as string;
  const sortOrder = sortOrderRaw?.trim() ? Number(sortOrderRaw) : 0;
  return { name, color, sortOrder };
}

// These actions manage the shared, global categories (owner_id null). The
// admin check used to be an RLS policy; without RLS it has to happen here.
async function requireAdminUser() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

export async function createCategory(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await requireAdminUser())) return { error: "Nicht berechtigt." };

  const { name, color, sortOrder } = readCategoryFields(formData);
  if (!name) return { error: "Name ist erforderlich." };

  let id: string;
  try {
    id = createGlobalCategory(name, color, sortOrder);
  } catch (e) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return { error: "Es gibt bereits eine Kategorie mit diesem Namen." };
    }
    throw e;
  }

  revalidatePath("/admin/kategorien");
  redirect(`/admin/kategorien/${id}`);
}

export async function updateCategory(
  categoryId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await requireAdminUser())) return { error: "Nicht berechtigt." };

  const { name, color, sortOrder } = readCategoryFields(formData);
  if (!name) return { error: "Name ist erforderlich." };

  try {
    updateGlobalCategory(categoryId, { name, color, sortOrder });
  } catch (e) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return { error: "Es gibt bereits eine Kategorie mit diesem Namen." };
    }
    throw e;
  }

  revalidatePath(`/admin/kategorien/${categoryId}`);
  revalidatePath("/admin/kategorien");
  return { error: null };
}

export async function deleteCategory(categoryId: string) {
  if (!(await requireAdminUser())) redirect("/");

  deleteGlobalCategory(categoryId);

  revalidatePath("/admin/kategorien");
  redirect("/admin/kategorien");
}
