"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormMessage } from "@/components/forms/field-error";
import { useFieldForm } from "@/components/forms/use-field-form";
import type { ActionState } from "@/lib/actions/categories";

const initialState: ActionState = { error: null };

export function CategoryForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: {
    name: string;
    color: string | null;
    sortOrder: number;
  };
  submitLabel: string;
}) {
  const { isPending, errors, formMessage, formProps, invalid, labelClass } =
    useFieldForm<ActionState>({
      action: (formData) => action(initialState, formData),
      validate: (formData) => {
        const found: Record<string, string> = {};
        if (!(formData.get("name") as string)?.trim()) found.name = "Name ist erforderlich.";
        const sortOrder = (formData.get("sort_order") as string)?.trim();
        if (sortOrder && !Number.isInteger(Number(sortOrder))) {
          found.sort_order = "Bitte eine ganze Zahl angeben.";
        }
        return found;
      },
      // Nur Speichern kommt mit Erfolg zurück; Anlegen leitet weiter.
      onSuccess: () => toast.success("Gespeichert"),
    });

  return (
    <form {...formProps} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className={labelClass("name")}>
          Name
        </Label>
        <Input
          id="name"
          name="name"
          required
          aria-invalid={invalid("name")}
          defaultValue={defaultValues?.name}
          placeholder="z. B. Streaming"
        />
        <FieldError message={errors.name} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="color">Farbe</Label>
          <div className="flex items-center gap-2">
            <Input
              id="color"
              name="color"
              type="color"
              defaultValue={defaultValues?.color ?? "#94a3b8"}
              className="h-8 w-14 p-1"
            />
            <span className="text-xs text-muted-foreground">Für Badges in der Liste</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort_order" className={labelClass("sort_order")}>
            Sortierung
          </Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            aria-invalid={invalid("sort_order")}
            defaultValue={defaultValues?.sortOrder ?? 0}
          />
          <FieldError message={errors.sort_order} />
        </div>
      </div>
      <FormMessage message={formMessage} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Speichern…" : submitLabel}
      </Button>
    </form>
  );
}
