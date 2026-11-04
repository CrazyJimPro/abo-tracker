import { isValidIsoDate } from "@/lib/subscription-validation";

// Gemeinsam für lib/actions/price-history.ts und die Formulare der Historie,
// damit Browser und Server dieselben Fehler an dieselben Felder hängen. Nicht
// in der "use server"-Datei, weil die nur async-Funktionen exportieren darf.
export function readPriceEntry(
  formData: FormData,
  today: string = new Date().toISOString().slice(0, 10)
): { amount: number; changedAt: string } | { fieldErrors: Record<string, string> } {
  const amountRaw = (formData.get("amount") as string)?.trim();
  const amount = amountRaw ? Number(amountRaw) : NaN;
  const changedAt = (formData.get("changed_at") as string)?.trim() ?? "";

  const fieldErrors: Record<string, string> = {};
  if (!Number.isFinite(amount) || amount < 0) {
    fieldErrors.amount = "Betrag muss eine positive Zahl sein.";
  }
  if (!isValidIsoDate(changedAt)) {
    fieldErrors.changed_at = "Bitte ein gültiges Datum angeben.";
  } else if (changedAt > today) {
    fieldErrors.changed_at = "Datum darf nicht in der Zukunft liegen.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
  return { amount, changedAt };
}
