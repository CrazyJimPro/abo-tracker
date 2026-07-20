"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    sort_order: number;
  };
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          placeholder="z. B. Streaming"
        />
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
          <Label htmlFor="sort_order">Sortierung</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={defaultValues?.sort_order ?? 0}
          />
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Speichern…" : submitLabel}
      </Button>
    </form>
  );
}
