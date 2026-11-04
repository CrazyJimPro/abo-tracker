// Kurzer roter Hinweis unter einem Formularfeld.
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

// Meldung unter dem ganzen Formular.
export function FormMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}
