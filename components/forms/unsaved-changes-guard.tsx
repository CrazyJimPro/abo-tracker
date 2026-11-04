"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/*
 * Fragt nach, bevor eine Seite mit ungespeicherten Eingaben verlassen wird.
 * - Klick auf einen Link innerhalb der App: eigenes Fenster mit drei
 *   eindeutigen Knöpfen. Das window.confirm des Browsers hätte nur
 *   "OK"/"Abbrechen", und "Abbrechen" hieße dort "hierbleiben".
 * - Neu laden oder Tab schließen: Dort lässt der Browser nur seine eigene
 *   Rückfrage zu (beforeunload).
 * Knöpfe, die selbst per router.push weiterleiten (z. B. "Abbrechen"), sind
 * keine Links und laufen deshalb nicht durch diese Abfrage.
 */
export function UnsavedChangesGuard({
  title,
  description,
  saveLabel,
  onSave,
}: {
  title: string;
  description: string;
  saveLabel: string;
  onSave: () => void;
}) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    // Capture-Phase auf document: läuft vor dem Klick-Handler von next/link
    // (React hängt seine Handler tiefer, am Wurzelelement der App an).
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      e.preventDefault();
      e.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (!pendingHref) return;
    firstButton.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPendingHref(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pendingHref]);

  if (!pendingHref) return null;

  // Per Portal an <body>: Die Glas-Karten haben backdrop-filter, und darin
  // bezöge sich "fixed" auf die Karte statt auf das ganze Fenster.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setPendingHref(null);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-title"
        aria-describedby="unsaved-description"
        className="w-full max-w-sm space-y-4 rounded-lg border bg-background p-5 shadow-xl"
      >
        <div className="space-y-1">
          <p id="unsaved-title" className="font-medium">
            {title}
          </p>
          <p id="unsaved-description" className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            ref={firstButton}
            type="button"
            onClick={() => {
              setPendingHref(null);
              onSave();
            }}
          >
            {saveLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              const href = pendingHref;
              setPendingHref(null);
              router.push(href);
            }}
          >
            Nicht speichern
          </Button>
          <Button type="button" variant="ghost" onClick={() => setPendingHref(null)}>
            Weiter bearbeiten
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
