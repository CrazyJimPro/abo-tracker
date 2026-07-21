-- Intro/promotional pricing: a subscription can have a promotional price
-- (the existing `amount`) that applies through `intro_until`, after which
-- `regular_amount` takes over. Both nullable — existing rows keep behaving
-- exactly as before (no promo).
alter table public.subscriptions
  add column regular_amount numeric(10, 2) check (regular_amount is null or regular_amount >= 0),
  add column intro_until date;

comment on column public.subscriptions.regular_amount is 'Regular price that applies after the promotional period ends (null = no promo).';
comment on column public.subscriptions.intro_until is 'Last date the promotional price (amount) applies; after this, regular_amount takes over.';
