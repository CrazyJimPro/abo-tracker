"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addManualPriceHistoryEntry, type PriceHistoryActionState } from "@/lib/actions/price-history";

const initialState: PriceHistoryActionState = { error: null };

export function ManualEntryForm({ subscriptionId }: { subscriptionId: string }) {
  const action = addManualPriceHistoryEntry.bind(null, subscriptionId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="changed_at">Datum</Label>
        <Input id="changed_at" name="changed_at" type="date" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Betrag (€)</Label>
        <Input id="amount" name="amount" type="number" step="0.01" min="0" required placeholder="9.99" />
      </div>
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Speichern…" : "Preis nachtragen"}
      </Button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
