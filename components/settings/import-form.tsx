"use client";

import { useActionState } from "react";
import { importSubscriptionsCsv, type ImportActionState } from "@/lib/actions/csv-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ImportActionState = { result: null, fatalError: null };

export function ImportForm() {
  const [state, formAction, isPending] = useActionState(importSubscriptionsCsv, initialState);

  return (
    <form action={formAction} className="space-y-2 border-t pt-4">
      <Label htmlFor="file">Import</Label>
      <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
      <p className="text-xs text-muted-foreground">
        Die ID-Spalte einer zuvor exportierten Datei sorgt dafür, dass ein erneuter Import bestehende
        Abos aktualisiert statt sie zu verdoppeln.
      </p>

      {state.fatalError && <p className="text-sm text-red-600">{state.fatalError}</p>}

      {state.result && (
        <div className="space-y-1 text-sm">
          <p className="text-primary">
            {state.result.inserted + state.result.updated} von{" "}
            {state.result.inserted +
              state.result.updated +
              state.result.skipped +
              state.result.errors.length}{" "}
            Zeilen importiert ({state.result.inserted} neu, {state.result.updated} aktualisiert
            {state.result.skipped > 0 && `, ${state.result.skipped} bereits vorhanden übersprungen`}).
          </p>
          {state.result.categoriesCreated.length > 0 && (
            <p className="text-muted-foreground">
              Neue Kategorien angelegt: {state.result.categoriesCreated.join(", ")}
            </p>
          )}
          {state.result.errors.length > 0 && (
            <ul className="text-red-600">
              {state.result.errors.map((e, i) => (
                <li key={i}>
                  Zeile {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Importiere…" : "CSV importieren"}
      </Button>
    </form>
  );
}
