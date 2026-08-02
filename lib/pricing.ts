import type { BillingInterval } from "@/lib/db/schema";

// Factor to normalize a per-interval price to a monthly figure.
export const MONTHLY_FACTOR: Record<BillingInterval, number> = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

type PricingFields = {
  amount: number;
  regularAmount: number | null;
  introUntil: string | null;
};

// The price a subscription actually costs today: the promotional `amount`
// while the promo runs, the `regularAmount` once `introUntil` has passed.
// Falls back to `amount` when no promo is configured. `today` is an ISO date
// (YYYY-MM-DD), compared lexically against `introUntil`.
export function effectiveAmount(sub: PricingFields, today: string): number {
  if (sub.regularAmount != null && sub.introUntil != null && today > sub.introUntil) {
    return sub.regularAmount;
  }
  return sub.amount;
}

// Monthly-equivalent cost of a single subscription, rounded to cents.
//
// Rounding per subscription rather than only at the end matters: floating-point
// addition is not associative, so an unrounded total can land either side of a
// half-cent boundary depending purely on the order rows came back in (the
// current data sums to exactly 70.575). Rounding first makes the headline
// figure stable, and makes the donut slices add up to it exactly.
export function monthlyAmount(
  sub: PricingFields & { billingInterval: BillingInterval },
  today: string
): number {
  return Math.round(effectiveAmount(sub, today) * MONTHLY_FACTOR[sub.billingInterval] * 100) / 100;
}

// Whether a promo is configured and still running (the price will rise later).
export function promoActive(
  sub: Pick<PricingFields, "regularAmount" | "introUntil">,
  today: string
): boolean {
  return sub.regularAmount != null && sub.introUntil != null && today <= sub.introUntil;
}
