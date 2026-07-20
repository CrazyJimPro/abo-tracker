import { createClient } from "@/lib/supabase/server";
import { createSubscription } from "@/lib/actions/subscriptions";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewSubscriptionPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("sort_order");

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Neues Abo</CardTitle>
      </CardHeader>
      <CardContent>
        <SubscriptionForm action={createSubscription} categories={categories ?? []} submitLabel="Anlegen" />
      </CardContent>
    </Card>
  );
}
