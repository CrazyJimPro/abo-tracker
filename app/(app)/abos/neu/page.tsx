import { requireUser } from "@/lib/auth/guards";
import { listVisibleCategories } from "@/lib/db/queries";
import { createSubscription } from "@/lib/actions/subscriptions";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewSubscriptionPage() {
  const user = await requireUser();
  const categories = listVisibleCategories(user.id);

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Neues Abo</CardTitle>
      </CardHeader>
      <CardContent>
        <SubscriptionForm action={createSubscription} categories={categories} submitLabel="Anlegen" />
      </CardContent>
    </Card>
  );
}
