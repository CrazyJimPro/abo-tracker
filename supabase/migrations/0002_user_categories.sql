-- Per-user private categories. Until now categories were a global,
-- admin-managed lookup table. Now any user can create their own private
-- categories (visible only to them) directly while adding a subscription,
-- while the original seed categories stay global (owner_id null) and
-- admin-managed.
alter table public.categories
  add column owner_id uuid references public.profiles(id) on delete cascade;

comment on column public.categories.owner_id is 'Owner of a private category; null = global, admin-managed category visible to everyone.';

-- The old global-unique constraint on `name` blocks a user from reusing a
-- name that already exists globally (or for another user). Replace it with
-- scoped uniqueness: names are unique among global categories, and unique
-- per owner among private ones.
alter table public.categories drop constraint categories_name_key;

create unique index categories_name_global_key
  on public.categories (name)
  where owner_id is null;

create unique index categories_name_owner_key
  on public.categories (owner_id, name)
  where owner_id is not null;

-- Rework RLS: everyone sees global + their own categories; the existing
-- admin policy is narrowed to global rows only (so admins manage the shared
-- lookup table, not other users' private categories); users get full control
-- over their own categories.
drop policy "categories_select_authenticated" on public.categories;
drop policy "categories_all_admin" on public.categories;

create policy "categories_select_visible"
  on public.categories for select
  to authenticated
  using (owner_id is null or owner_id = auth.uid());

create policy "categories_admin_global"
  on public.categories for all
  to authenticated
  using (public.is_admin() and owner_id is null)
  with check (public.is_admin() and owner_id is null);

create policy "categories_insert_own"
  on public.categories for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "categories_update_own"
  on public.categories for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "categories_delete_own"
  on public.categories for delete
  to authenticated
  using (owner_id = auth.uid());
