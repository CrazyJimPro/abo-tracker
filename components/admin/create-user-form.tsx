"use client";

import { useActionState } from "react";
import { createMemberUser, type CreateUserState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateUserState = { error: null, result: null };

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(createMemberUser, initialState);

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" name="email" type="email" required placeholder="name@beispiel.de" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display_name">Anzeigename</Label>
          <Input id="display_name" name="display_name" placeholder="z. B. Sam" />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Anlegen…" : "User anlegen"}
        </Button>
      </form>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      {state.result && (
        <div className="max-w-md rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-medium">User angelegt: {state.result.email}</p>
          <p className="mt-1">
            Temporäres Passwort:{" "}
            <span className="font-mono font-medium">{state.result.tempPassword}</span>
          </p>
          <p className="mt-1 text-muted-foreground">
            Wird nur einmal angezeigt. Muss beim ersten Login geändert werden.
          </p>
        </div>
      )}
    </div>
  );
}
