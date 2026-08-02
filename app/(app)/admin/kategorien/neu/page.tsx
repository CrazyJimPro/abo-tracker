import { requireAdmin } from "@/lib/auth/guards";
import { createCategory } from "@/lib/actions/categories";
import { CategoryForm } from "@/components/categories/category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewCategoryPage() {
  await requireAdmin();

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
