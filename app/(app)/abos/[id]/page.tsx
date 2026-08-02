import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getSubscription, listVisibleCategories } from "@/lib/db/queries";
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
  const user = await requireUser();

  const subscription = getSubscription(user.id, id);
  if (!subscription) notFound();

  const categories = listVisibleCategories(user.id);

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
            categories={categories}
            defaultValues={subscription}
            submitLabel="Speichern"
          />

          <div className="flex items-center gap-2 border-t pt-4">
            {subscription.nextBillingDate && (
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
