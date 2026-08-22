"use client";

import { useEffect } from "react";

// Bittet den Browser explizit um dauerhaften Speicher (localStorage/IndexedDB),
// damit z.B. die Theme-Wahl nicht vom "Cookies/Website-Daten beim Beenden
// loeschen"-Sanitizer mit erfasst wird. Firefox entscheidet nach eigenen
// Site-Engagement-Kriterien, ob der Aufruf tatsaechlich greift - kein Fehler,
// wenn er lautlos folgenlos bleibt.
export function PersistStorage() {
  useEffect(() => {
    navigator.storage?.persist?.();
  }, []);

  return null;
}
