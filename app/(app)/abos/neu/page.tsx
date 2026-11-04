import { requireUser } from "@/lib/auth/guards";
import { listVisibleCategories } from "@/lib/db/queries";
import { createSubscription } from "@/lib/actions/subscriptions";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { CopySubscription } from "@/components/subscriptions/copy-subscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ kopie?: string }>;
}) {
  const user = await requireUser();
  const categories = listVisibleCategories(user.id);

  // Von "Duplizieren" auf der Bearbeiten-Seite: vorausgefüllt, aber erst mit
  // "Kopie speichern" angelegt.
  if ((await searchParams).kopie) {
    return <CopySubscription action={createSubscription} categories={categories} />;
  }

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
