// Übergabe "Duplizieren" → Seite "Neues Abo". Über sessionStorage statt über
// die URL: Notizen und Beträge gehören nicht in die Adresszeile, und die
// Werte sollen auch noch nicht gespeicherte Änderungen enthalten können.

export type SubscriptionDefaults = {
  name: string;
  amount: number | null;
  billingInterval: string;
  status: string;
  categoryId: string | null;
  nextBillingDate: string | null;
  notes: string | null;
  regularAmount: number | null;
  introUntil: string | null;
  contractEnd: string | null;
  noticePeriod: number | null;
  noticeUnit: string | null;
  paymentMethod: string | null;
};

export type SubscriptionCopy = { fromId: string; values: SubscriptionDefaults };

export const COPY_SUBSCRIPTION_PATH = "/abos/neu?kopie=1";

const STORAGE_KEY = "abo-tracker:abo-kopie";

export function storeSubscriptionCopy(fromId: string, values: SubscriptionDefaults) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ fromId, values }));
  } catch {
    // Ohne sessionStorage (privates Fenster mit Sperre) öffnet sich eben ein
    // leeres "Neues Abo".
  }
}

// Nur lesen, nicht gleich entfernen: React ruft Effects im Entwicklungsmodus
// zweimal auf, der zweite Aufruf fände sonst nichts mehr. Neu laden zeigt so
// auch weiter die Kopie.
export function readSubscriptionCopy(): SubscriptionCopy | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SubscriptionCopy;
    return parsed && typeof parsed.fromId === "string" && parsed.values ? parsed : null;
  } catch {
    return null;
  }
}

// Beim Absenden der Kopie: Nach dem Speichern und einem Schritt zurück im
// Browser soll nicht noch einmal dieselbe Kopie zum Speichern bereitstehen.
export function clearSubscriptionCopy() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // siehe storeSubscriptionCopy
  }
}
