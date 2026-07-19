-- ============================================================
-- Abo-Tracker schema
-- Applied via Supabase MCP `apply_migration`. This file is the
-- committed source of truth; if the schema evolves, add a new
-- supabase/migrations/000N_xxx.sql file rather than editing this
-- one in place.
-- ============================================================

-- ---------- profiles ----------
-- Mirrors auth.users 1:1, created automatically by a trigger.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  display_name text,
  must_change_password boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger-only function; revoke direct RPC access (it would error
-- anyway outside a trigger context, since `new` is unavailable).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- security-definer helper so RLS policies can check role without
-- recursively selecting from profiles (avoids infinite-recursion
-- policy errors on the profiles table itself).
create function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Must stay executable by `authenticated` (RLS policies call it), but
-- anon doesn't need direct RPC access. Calling it as `authenticated`
-- only ever reveals a boolean the caller already implicitly knows
-- (their own admin status), so leaving that path open is intentional.
revoke execute on function public.is_admin() from public, anon;

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());

-- users can update their own row, but NOT their own role
-- (prevents privilege escalation via a client-side update call)
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- inserts/role changes for OTHER users happen exclusively via the
-- service-role client in lib/actions/admin.ts (bypasses RLS by design)


-- ---------- categories ----------
-- Global shared lookup table, admin-managed.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories_select_authenticated"
  on public.categories for select
  to authenticated
  using (true);

create policy "categories_all_admin"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.categories (name, color, sort_order) values
  ('Streaming', '#8b5cf6', 10),
  ('Musik', '#ec4899', 20),
  ('Fitness', '#22c55e', 30),
  ('Software', '#3b82f6', 40),
  ('Gaming', '#f97316', 50),
  ('Nachrichten & Medien', '#eab308', 60),
  ('Cloud & Speicher', '#06b6d4', 70),
  ('Sonstiges', '#64748b', 999);


-- ---------- subscriptions ----------
-- The core entity. Fully private per user (owner_id = auth.uid()) —
-- deliberately NO admin-bypass policy, unlike profiles/categories.
create type public.billing_interval as enum ('weekly', 'monthly', 'quarterly', 'yearly');
create type public.subscription_status as enum ('active', 'paused', 'cancelled');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  billing_interval public.billing_interval not null default 'monthly',
  status public.subscription_status not null default 'active',
  next_billing_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_owner_id_idx on public.subscriptions(owner_id);
create index subscriptions_owner_status_idx on public.subscriptions(owner_id, status);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (owner_id = auth.uid());

create policy "subscriptions_insert_own"
  on public.subscriptions for insert
  with check (owner_id = auth.uid());

create policy "subscriptions_update_own"
  on public.subscriptions for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "subscriptions_delete_own"
  on public.subscriptions for delete
  using (owner_id = auth.uid());
