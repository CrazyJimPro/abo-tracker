"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type ActionState = { error: string | null };

function readCategoryFields(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const color = (formData.get("color") as string)?.trim() || null;
  const sortOrderRaw = formData.get("sort_order") as string;
  const sortOrder = sortOrderRaw?.trim() ? Number(sortOrderRaw) : 0;
  return { name, color, sortOrder };
}

export async function createCategory(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { name, color, sortOrder } = readCategoryFields(formData);

  if (!name) return { error: "Name ist erforderlich." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, color, sort_order: sortOrder })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Es gibt bereits eine Kategorie mit diesem Namen." };
    return { error: error.message };
  }

  revalidatePath("/admin/kategorien");
  redirect(`/admin/kategorien/${data.id}`);
}

export async function updateCategory(
  categoryId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { name, color, sortOrder } = readCategoryFields(formData);

  if (!name) return { error: "Name ist erforderlich." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name, color, sort_order: sortOrder })
    .eq("id", categoryId);

  if (error) {
    if (error.code === "23505") return { error: "Es gibt bereits eine Kategorie mit diesem Namen." };
    return { error: error.message };
  }

  revalidatePath(`/admin/kategorien/${categoryId}`);
  revalidatePath("/admin/kategorien");
  return { error: null };
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createClient();
  await supabase.from("categories").delete().eq("id", categoryId);

  revalidatePath("/admin/kategorien");
  redirect("/admin/kategorien");
}
