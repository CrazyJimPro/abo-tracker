"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import {
  FIELD_ERRORS_MESSAGE,
  readSubscriptionFields,
  validateFields,
  type SubscriptionFieldErrors,
  type SubscriptionFieldName,
} from "@/lib/subscription-validation";

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

// Reihenfolge der Felder im Formular — das erste fehlerhafte bekommt den Fokus.
// Die ids der Felder sind gleich ihren name-Attributen.
const FIELD_ORDER: SubscriptionFieldName[] = [
  "name",
  "amount",
  "billing_interval",
  "status",
  "category_id",
  "new_category_name",
  "next_billing_date",
  "regular_amount",
  "intro_until",
];

type CategoryOption = { id: string; name: string };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

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
  const [isPending, startSave] = useTransition();
  const [isDuplicatePending, startDuplicate] = useTransition();
  const [categoryValue, setCategoryValue] = useState(defaultValues?.categoryId ?? "none");
  const isNewCategory = categoryValue === "__new__";

  const [errors, setErrors] = useState<SubscriptionFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  const hasFieldErrors = Object.keys(errors).length > 0;

  function clearError(name: string) {
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name as SubscriptionFieldName];
      return next;
    });
  }

  // Bewusst kein <form action={…}>: React setzt ein Formular nach jeder
  // abgeschlossenen Action zurück, und dann wären bei einem Fehler alle
  // Eingaben weg. Hier wird die Action selbst aufgerufen, das Formular bleibt
  // so stehen, wie es ausgefüllt wurde. Auch kein useActionState: die
  // Bearbeiten-Seite baut das Formular nach dem Speichern neu auf
  // (key={updatedAt}), dessen Ergebnis käme dort nie an — der Code nach dem
  // await hier läuft dagegen auf jeden Fall, die Meldung "Gespeichert" auch.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(e.currentTarget, submitter);

    const found = validateFields(readSubscriptionFields(formData));
    if (isNewCategory && !(formData.get("new_category_name") as string)?.trim()) {
      found.new_category_name = "Bitte einen Namen für die neue Kategorie angeben.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setMessage(null);
      const first = FIELD_ORDER.find((f) => found[f]);
      if (first) document.getElementById(first)?.focus();
      return;
    }

    setErrors({});
    setMessage(null);
    const isDuplicate = submitter?.dataset.action === "duplicate";
    const run = isDuplicate ? startDuplicate : startSave;
    const submit = isDuplicate && duplicateAction ? duplicateAction : action;
    run(async () => {
      // Anlegen und Duplizieren leiten bei Erfolg weiter und kommen hier
      // nicht mit einem Ergebnis zurück; nur Speichern meldet { error: null }.
      const result = await submit(initialState, formData);
      if (!result) return;
      setErrors(result.fieldErrors ?? {});
      setMessage(result.fieldErrors ? null : result.error);
      if (!result.error) toast.success("Gespeichert");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      onChange={(e) => {
        const target = e.target as EventTarget;
        if (target instanceof HTMLInputElement) clearError(target.name);
      }}
      noValidate
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name" className={errors.name ? "text-destructive" : undefined}>
          Name
        </Label>
        <Input
          id="name"
          name="name"
          required
          aria-invalid={errors.name ? true : undefined}
          defaultValue={defaultValues?.name}
          placeholder="z. B. Netflix"
        />
        <FieldError message={errors.name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount" className={errors.amount ? "text-destructive" : undefined}>
            Betrag (€)
          </Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            aria-invalid={errors.amount ? true : undefined}
            defaultValue={defaultValues?.amount}
            placeholder="9.99"
          />
          <FieldError message={errors.amount} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing_interval">Intervall</Label>
          <Select name="billing_interval" defaultValue={defaultValues?.billingInterval ?? "monthly"}>
            <SelectTrigger
              id="billing_interval"
              className="w-full"
              aria-invalid={errors.billing_interval ? true : undefined}
            >
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
          <FieldError message={errors.billing_interval} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={defaultValues?.status ?? "active"}>
            <SelectTrigger
              id="status"
              className="w-full"
              aria-invalid={errors.status ? true : undefined}
            >
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
          <FieldError message={errors.status} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category_id">Kategorie</Label>
          <Select
            name="category_id"
            value={categoryValue}
            onValueChange={(v) => {
              setCategoryValue(v ?? "none");
              clearError("new_category_name");
            }}
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
          <Label
            htmlFor="new_category_name"
            className={errors.new_category_name ? "text-destructive" : undefined}
          >
            Neue Kategorie
          </Label>
          <Input
            id="new_category_name"
            name="new_category_name"
            required
            autoFocus
            aria-invalid={errors.new_category_name ? true : undefined}
            placeholder="z. B. Haushalt"
          />
          <FieldError message={errors.new_category_name} />
          <p className="text-xs text-muted-foreground">
            Wird als deine private Kategorie angelegt und nur dir angezeigt.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label
          htmlFor="next_billing_date"
          className={errors.next_billing_date ? "text-destructive" : undefined}
        >
          Nächste Abrechnung
        </Label>
        <Input
          id="next_billing_date"
          name="next_billing_date"
          type="date"
          aria-invalid={errors.next_billing_date ? true : undefined}
          defaultValue={defaultValues?.nextBillingDate ?? ""}
        />
        <FieldError message={errors.next_billing_date} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label
            htmlFor="regular_amount"
            className={errors.regular_amount ? "text-destructive" : undefined}
          >
            Regulärer Preis (€)
          </Label>
          <Input
            id="regular_amount"
            name="regular_amount"
            type="number"
            step="0.01"
            min="0"
            aria-invalid={errors.regular_amount ? true : undefined}
            defaultValue={defaultValues?.regularAmount ?? ""}
            placeholder="optional"
          />
          <FieldError message={errors.regular_amount} />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="intro_until"
            className={errors.intro_until ? "text-destructive" : undefined}
          >
            Aktionspreis gilt bis
          </Label>
          <Input
            id="intro_until"
            name="intro_until"
            type="date"
            aria-invalid={errors.intro_until ? true : undefined}
            defaultValue={defaultValues?.introUntil ?? ""}
          />
          <FieldError message={errors.intro_until} />
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

      {(hasFieldErrors || message) && (
        <p className="text-sm text-destructive">{hasFieldErrors ? FIELD_ERRORS_MESSAGE : message}</p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending || isDuplicatePending}>
          {isPending ? "Speichern…" : submitLabel}
        </Button>
        {duplicateAction && (
          <Button
            type="submit"
            data-action="duplicate"
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
