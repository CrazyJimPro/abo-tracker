import type { Enums } from "@/types/database";

// Factor to normalize a per-interval price to a monthly figure.
export const MONTHLY_FACTOR: Record<Enums<"billing_interval">, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

type PricingFields = {
  amount: number;
  regular_amount: number | null;
  intro_until: string | null;
};

// The price a subscription actually costs today: the promotional `amount`
// while the promo runs, the `regular_amount` once `intro_until` has passed.
// Falls back to `amount` when no promo is configured. `today` is an ISO date
// (YYYY-MM-DD), compared lexically against `intro_until`.
export function effectiveAmount(sub: PricingFields, today: string): number {
  if (sub.regular_amount != null && sub.intro_until != null && today > sub.intro_until) {
    return sub.regular_amount;
  }
  return sub.amount;
}

// Whether a promo is configured and still running (the price will rise later).
export function promoActive(
  sub: Pick<PricingFields, "regular_amount" | "intro_until">,
  today: string
): boolean {
  return sub.regular_amount != null && sub.intro_until != null && today <= sub.intro_until;
}
