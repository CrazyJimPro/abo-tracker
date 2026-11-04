"use client";

import { useEffect, useState } from "react";
import type { ActionState } from "@/lib/actions/subscriptions";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import {
  clearSubscriptionCopy,
  readSubscriptionCopy,
  type SubscriptionCopy,
} from "@/components/subscriptions/subscription-copy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Seite "Neues Abo" als Kopie eines vorhandenen Abos. Die Werte kommen aus
// sessionStorage (siehe subscription-copy.ts) und sind erst im Browser
// lesbar, deshalb lädt das Formular einen Augenblick später.
export function CopySubscription({
  action,
  categories,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  categories: { id: string; name: string }[];
}) {
  const [copy, setCopy] = useState<SubscriptionCopy | null | undefined>(undefined);

  // sessionStorage gibt es nur im Browser; ein Lesen schon beim ersten
  // Rendern ergäbe auf dem Server etwas anderes als im Browser (Hydration-
  // Mismatch). Wie beim ThemeToggle bleibt dafür nur der Effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCopy(readSubscriptionCopy());
  }, []);

  // Schlägt das Anlegen fehl, bleiben die Werte trotzdem im Formular stehen.
  const submit = (prevState: ActionState, formData: FormData) => {
    clearSubscriptionCopy();
    return action(prevState, formData);
  };

  if (copy === undefined) return null;

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>{copy ? "Kopie anlegen" : "Neues Abo"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {copy && (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            Das ist eine Kopie und noch <strong>nicht gespeichert</strong>. Ändere, was anders sein
            soll, und klicke dann auf „Kopie speichern“.
          </p>
        )}
        <SubscriptionForm
          action={submit}
          categories={categories}
          defaultValues={copy?.values}
          copyOf={copy ? { cancelHref: `/abos/${copy.fromId}` } : undefined}
          submitLabel={copy ? "Kopie speichern" : "Anlegen"}
        />
      </CardContent>
    </Card>
  );
}
