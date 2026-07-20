"use client";

import { useActionState } from "react";
import { updateProfile, type ActionState } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { error: null, success: false };

export function ProfileForm({ defaultDisplayName }: { defaultDisplayName: string }) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="display_name">Anzeigename</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={defaultDisplayName}
          placeholder="z. B. Christian"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-primary">Gespeichert.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
