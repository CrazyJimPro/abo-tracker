import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCategory } from "@/lib/actions/categories";
import { CategoryForm } from "@/components/categories/category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewCategoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (currentProfile?.role !== "admin") redirect("/");

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Neue Kategorie</CardTitle>
      </CardHeader>
      <CardContent>
        <CategoryForm action={createCategory} submitLabel="Anlegen" />
      </CardContent>
    </Card>
  );
}
