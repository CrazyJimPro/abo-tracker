import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateSubscription, deleteSubscription, markBilled } from "@/lib/actions/subscriptions";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: subscription }, { data: categories }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "id, name, amount, billing_interval, status, category_id, next_billing_date, notes, regular_amount, intro_until"
      )
      .eq("id", id)
      .single(),
    supabase.from("categories").select("id, name").order("sort_order"),
  ]);

  if (!subscription) notFound();

  const updateAction = updateSubscription.bind(null, id);
  const deleteAction = deleteSubscription.bind(null, id);
  const markBilledAction = markBilled.bind(null, id);

  return (
    <div className="space-y-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{subscription.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SubscriptionForm
            action={updateAction}
            categories={categories ?? []}
            defaultValues={subscription}
            submitLabel="Speichern"
          />

          <div className="flex items-center gap-2 border-t pt-4">
            {subscription.next_billing_date && (
              <form action={markBilledAction}>
                <Button type="submit" variant="secondary" size="sm">
                  Abgerechnet
                </Button>
              </form>
            )}
            <form action={deleteAction}>
              <Button type="submit" variant="outline" size="sm">
                Abo löschen
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
