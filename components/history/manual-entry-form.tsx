"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormMessage } from "@/components/forms/field-error";
import { useFieldForm } from "@/components/forms/use-field-form";
import { addManualPriceHistoryEntry, type PriceHistoryActionState } from "@/lib/actions/price-history";
import { readPriceEntry } from "@/lib/price-history-validation";

const initialState: PriceHistoryActionState = { error: null };

export function ManualEntryForm({ subscriptionId }: { subscriptionId: string }) {
  const { isPending, errors, formMessage, formProps, invalid, labelClass } =
    useFieldForm<PriceHistoryActionState>({
      action: (formData) => addManualPriceHistoryEntry(subscriptionId, initialState, formData),
      validate: (formData) => {
        const parsed = readPriceEntry(formData);
        return "fieldErrors" in parsed ? parsed.fieldErrors : {};
      },
      // Nach dem Nachtragen leeren, damit gleich der nächste Preis folgen kann.
      onSuccess: (_result, form) => {
        form.reset();
        toast.success("Preis nachgetragen");
      },
    });

  return (
    <form {...formProps} className="flex flex-wrap items-start gap-3">
      <div className="space-y-2">
        <Label htmlFor="changed_at" className={labelClass("changed_at")}>
          Datum
        </Label>
        <Input
          id="changed_at"
          name="changed_at"
          type="date"
          required
          aria-invalid={invalid("changed_at")}
        />
        <FieldError message={errors.changed_at} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount" className={labelClass("amount")}>
          Betrag (€)
        </Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          aria-invalid={invalid("amount")}
          placeholder="9.99"
        />
        <FieldError message={errors.amount} />
      </div>
      <Button type="submit" variant="secondary" disabled={isPending} className="mt-[22px]">
        {isPending ? "Speichern…" : "Preis nachtragen"}
      </Button>
      <div className="w-full">
        <FormMessage message={formMessage} />
      </div>
    </form>
  );
}
