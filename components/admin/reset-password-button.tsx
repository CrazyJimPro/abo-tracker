"use client";

import { useActionState } from "react";
import { resetMemberPassword, type ResetPasswordState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

const initialState: ResetPasswordState = { error: null, tempPassword: null };

export function ResetPasswordButton({ userId }: { userId: string }) {
  const action = resetMemberPassword.bind(null, userId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  if (state.tempPassword) {
    return (
      <p className="text-xs">
        Neues Passwort: <span className="font-mono font-medium">{state.tempPassword}</span>
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {isPending ? "…" : "Passwort zurücksetzen"}
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
