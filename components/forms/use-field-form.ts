"use client";

import { useState, useTransition } from "react";

// Fehler pro Feld, Schlüssel = name-Attribut. Ein leerer Text markiert das
// Feld nur rot, ohne eigenen Hinweis darunter (z. B. beim Login, wo bewusst
// nicht verraten wird, ob E-Mail oder Passwort falsch war).
export type FieldErrors = Record<string, string>;

export type FieldFormResult = { error: string | null; fieldErrors?: FieldErrors };

export const FIELD_ERRORS_MESSAGE = "Bitte die rot markierten Felder prüfen.";

/*
 * Gemeinsamer Ablauf für die Formulare der App:
 * - Absenden ohne <form action={…}>: React setzt so ein Formular nach jeder
 *   Action zurück, bei einem Fehler wären alle Eingaben weg. Hier wird die
 *   Action selbst aufgerufen, das Formular bleibt stehen.
 * - Optional erst im Browser prüfen; dann geht bei Fehlern gar nichts raus.
 * - Fehler des Servers (fieldErrors) landen genauso am Feld.
 * - Tippen in ein markiertes Feld nimmt dessen Markierung weg.
 *
 * Bewusst ohne useActionState: manche Seiten bauen das Formular nach dem
 * Speichern neu auf (key=…), dessen Ergebnis käme dort nie an. Der Code nach
 * dem await läuft dagegen immer, onSuccess (z. B. eine Meldung) also auch.
 */
export function useFieldForm<R extends FieldFormResult>({
  action,
  validate,
  onSuccess,
}: {
  // submitter ist der gedrückte Knopf; so kann ein Formular mit zwei Knöpfen
  // (Speichern / Duplizieren) je Knopf eine andere Action wählen.
  action: (formData: FormData, submitter: HTMLElement | null) => Promise<R | undefined>;
  validate?: (formData: FormData) => FieldErrors;
  onSuccess?: (result: R, form: HTMLFormElement) => void;
}) {
  const [isPending, startTransition] = useTransition();
  // data-action des Knopfs, dessen Action gerade läuft ("" = ohne data-action).
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<R | null>(null);

  function clearError(name: string) {
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(form, submitter);

    const found = validate?.(formData) ?? {};
    const names = Object.keys(found);
    if (names.length > 0) {
      setErrors(found);
      setMessage(null);
      // Erstes markiertes Feld in Formular-Reihenfolge fokussieren.
      const first = [...form.elements].find(
        (el) => el instanceof HTMLElement && names.includes((el as HTMLInputElement).name)
      );
      (first as HTMLElement | undefined)?.focus();
      return;
    }

    setErrors({});
    setMessage(null);
    setPendingAction(submitter?.dataset.action ?? "");
    startTransition(async () => {
      // Actions, die bei Erfolg weiterleiten, kommen hier ohne Ergebnis zurück.
      const res = await action(formData, submitter);
      setPendingAction(null);
      if (!res) return;
      setResult(res);
      setErrors(res.fieldErrors ?? {});
      setMessage(res.error);
      if (!res.error && !res.fieldErrors) onSuccess?.(res, form);
    });
  }

  const hasFieldErrors = Object.keys(errors).length > 0;

  return {
    isPending,
    pendingAction: isPending ? pendingAction : null,
    errors,
    result,
    // Meldung unter dem Formular: Hinweis auf markierte Felder oder ein
    // allgemeiner Fehler ohne Feldbezug (z. B. "Nicht angemeldet.").
    formMessage: message ?? (hasFieldErrors ? FIELD_ERRORS_MESSAGE : null),
    formProps: {
      onSubmit,
      onChange: (e: React.FormEvent<HTMLFormElement>) => {
        const target = e.target as EventTarget;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          clearError(target.name);
        }
      },
      noValidate: true,
    },
    clearError,
    invalid: (name: string) => (name in errors ? true : undefined),
    labelClass: (name: string) => (name in errors ? "text-destructive" : undefined),
  };
}
