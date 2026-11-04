"use client";

import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, FormMessage } from "@/components/forms/field-error";
import { useFieldForm } from "@/components/forms/use-field-form";
import { readPriceEntry } from "@/lib/price-history-validation";
import {
  deletePriceHistoryEntry,
  editPriceHistoryEntry,
  type PriceHistoryActionState,
} from "@/lib/actions/price-history";

const initialState: PriceHistoryActionState = { error: null };

const SOURCE_LABELS: Record<string, string> = {
  initial: "Start",
  auto: "automatisch erfasst",
  manual: "manuell nachgetragen",
};

function formatEuro(value: number) {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PriceHistoryRow({
  subscriptionId,
  entry,
  deltaPct,
}: {
  subscriptionId: string;
  entry: { id: string; changedAt: string; amount: number; source: string };
  deltaPct: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const deleteAction = deletePriceHistoryEntry.bind(null, subscriptionId, entry.id);
  // Bei einem Fehler bleibt die Zeile im Bearbeiten-Modus, damit man die
  // markierten Felder gleich korrigieren kann; zu geht sie erst bei Erfolg.
  const { isPending, errors, formMessage, formProps, invalid } =
    useFieldForm<PriceHistoryActionState>({
      action: (formData) =>
        editPriceHistoryEntry(subscriptionId, entry.id, initialState, formData),
      validate: (formData) => {
        const parsed = readPriceEntry(formData);
        return "fieldErrors" in parsed ? parsed.fieldErrors : {};
      },
      onSuccess: () => setEditing(false),
    });

  if (editing) {
    return (
      <div className="space-y-2 px-4 py-2 text-sm">
        <form {...formProps} className="flex flex-wrap items-end gap-2">
          <Input
            name="changed_at"
            type="date"
            defaultValue={entry.changedAt}
            required
            aria-invalid={invalid("changed_at")}
            aria-label="Datum"
            className="h-8 w-36"
          />
          <Input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={entry.amount}
            required
            aria-invalid={invalid("amount")}
            aria-label="Betrag"
            className="h-8 w-24"
          />
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Speichern…" : "Speichern"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </form>
        <FieldError message={errors.changed_at} />
        <FieldError message={errors.amount} />
        <FormMessage message={formMessage} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 text-sm">
      <div className="flex items-center gap-3">
        <span className="font-medium">{new Date(entry.changedAt).toLocaleDateString("de-DE")}</span>
        <span>{formatEuro(entry.amount)} €</span>
        {deltaPct !== null && deltaPct !== 0 && (
          <span className={deltaPct > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}>
            {deltaPct > 0 ? "+" : ""}
            {deltaPct.toLocaleString("de-DE", { maximumFractionDigits: 1 })}%
          </span>
        )}
        <span className="text-xs text-muted-foreground">{SOURCE_LABELS[entry.source] ?? entry.source}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Eintrag bearbeiten"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <form action={deleteAction}>
          <Button type="submit" variant="ghost" size="sm" aria-label="Eintrag löschen">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
