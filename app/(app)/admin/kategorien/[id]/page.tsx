import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { countSubscriptionsInCategory, getGlobalCategory } from "@/lib/db/queries";
import { updateCategory, deleteCategory } from "@/lib/actions/categories";
import { CategoryForm } from "@/components/categories/category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const category = getGlobalCategory(id);
  if (!category) notFound();

  const subscriptionCount = countSubscriptionsInCategory(id);

  const updateAction = updateCategory.bind(null, id);
  const deleteAction = deleteCategory.bind(null, id);
  const inUse = subscriptionCount > 0;

  return (
    <div className="space-y-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{category.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CategoryForm action={updateAction} defaultValues={category} submitLabel="Speichern" />

          <div className="border-t pt-4">
            <p className="mb-2 text-xs text-muted-foreground">
              {inUse
                ? `Wird von ${subscriptionCount} Abo(s) verwendet — beim Löschen wird dort nur die Kategorie entfernt, die Abos bleiben erhalten.`
                : "Wird aktuell von keinem Abo verwendet."}
            </p>
            <form action={deleteAction}>
              <Button type="submit" variant="outline" size="sm">
                Kategorie löschen
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
