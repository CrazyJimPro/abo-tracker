"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionState } from "@/lib/actions/subscriptions";

const initialState: ActionState = { error: null };

const BILLING_INTERVAL_OPTIONS = [
  { value: "weekly", label: "Wöchentlich" },
  { value: "monthly", label: "Monatlich" },
  { value: "quarterly", label: "Vierteljährlich" },
  { value: "yearly", label: "Jährlich" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Aktiv" },
  { value: "paused", label: "Pausiert" },
  { value: "cancelled", label: "Gekündigt" },
];

type CategoryOption = { id: string; name: string };

export function SubscriptionForm({
  action,
  duplicateAction,
  categories,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  duplicateAction?: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  categories: CategoryOption[];
  defaultValues?: {
    name: string;
    amount: number;
    billingInterval: string;
    status: string;
    categoryId: string | null;
    nextBillingDate: string | null;
    notes: string | null;
    regularAmount: number | null;
    introUntil: string | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [duplicateState, duplicateFormAction, isDuplicatePending] = useActionState(
    duplicateAction ?? action,
    initialState
  );
  const [categoryValue, setCategoryValue] = useState(defaultValues?.categoryId ?? "none");
  const isNewCategory = categoryValue === "__new__";

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          placeholder="z. B. Netflix"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Betrag (€)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaultValues?.amount}
            placeholder="9.99"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing_interval">Intervall</Label>
          <Select name="billing_interval" defaultValue={defaultValues?.billingInterval ?? "monthly"}>
            <SelectTrigger id="billing_interval" className="w-full">
              <SelectValue placeholder="Intervall wählen" />
            </SelectTrigger>
            <SelectContent>
              {BILLING_INTERVAL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={defaultValues?.status ?? "active"}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue placeholder="Status wählen" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category_id">Kategorie</Label>
          <Select
            name="category_id"
            value={categoryValue}
            onValueChange={(v) => setCategoryValue(v ?? "none")}
          >
            <SelectTrigger id="category_id" className="w-full">
              <SelectValue placeholder="Kategorie wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Keine</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
              <SelectItem value="__new__">+ Neue Kategorie…</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isNewCategory && (
        <div className="space-y-2">
          <Label htmlFor="new_category_name">Neue Kategorie</Label>
          <Input
            id="new_category_name"
            name="new_category_name"
            required
            autoFocus
            placeholder="z. B. Haushalt"
          />
          <p className="text-xs text-muted-foreground">
            Wird als deine private Kategorie angelegt und nur dir angezeigt.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="next_billing_date">Nächste Abrechnung</Label>
        <Input
          id="next_billing_date"
          name="next_billing_date"
          type="date"
          defaultValue={defaultValues?.nextBillingDate ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="regular_amount">Regulärer Preis (€)</Label>
          <Input
            id="regular_amount"
            name="regular_amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.regularAmount ?? ""}
            placeholder="optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="intro_until">Aktionspreis gilt bis</Label>
          <Input
            id="intro_until"
            name="intro_until"
            type="date"
            defaultValue={defaultValues?.introUntil ?? ""}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Optional: Zahlst du aktuell einen Aktionspreis, trage ihn oben als „Betrag“ ein und hier den
        regulären Preis samt Enddatum der Aktion. Ab dann wird automatisch mit dem regulären Preis
        gerechnet.
      </p>

      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes ?? ""} rows={3} />
      </div>

      {(state.error || duplicateState.error) && (
        <p className="text-sm text-red-600">{state.error || duplicateState.error}</p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending || isDuplicatePending}>
          {isPending ? "Speichern…" : submitLabel}
        </Button>
        {duplicateAction && (
          <Button
            type="submit"
            formAction={duplicateFormAction}
            variant="secondary"
            disabled={isPending || isDuplicatePending}
          >
            {isDuplicatePending ? "Wird angelegt…" : "Duplizieren"}
          </Button>
        )}
      </div>
      {duplicateAction && (
        <p className="text-xs text-muted-foreground">
          Duplizieren legt ein neues Abo mit den obigen (auch geänderten) Werten an — das aktuelle
          bleibt unverändert erhalten.
        </p>
      )}
    </form>
  );
}
