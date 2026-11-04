"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// "Abo löschen" mit Rückfrage: der erste Klick fragt nur nach, gelöscht wird
// erst mit "Ja, löschen".
export function DeleteSubscriptionButton({
  name,
  action,
}: {
  name: string;
  action: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Abo löschen
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <span className="text-sm">„{name}“ wirklich löschen?</span>
      <Button type="submit" variant="destructive" size="sm" autoFocus>
        Ja, löschen
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Abbrechen
      </Button>
    </form>
  );
}
