// Auswahl für die Vorlaufzeit der Benachrichtigungen (Einstellungen). Nicht
// in der "use server"-Datei, weil die nur async-Funktionen exportieren darf.
export const NOTIFY_DAYS_OPTIONS = [3, 7, 14, 30];

export const DEFAULT_NOTIFY_DAYS = 7;

// Bis zu diesem Tag (einschließlich) zählt eine Fälligkeit als "bald".
// UTC-Rechnung wie überall bei den Datumsangaben der App.
export function notifyCutoff(today: Date, days: number): string {
  const safeDays = NOTIFY_DAYS_OPTIONS.includes(days) ? days : DEFAULT_NOTIFY_DAYS;
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() + safeDays);
  return cutoff.toISOString().slice(0, 10);
}
