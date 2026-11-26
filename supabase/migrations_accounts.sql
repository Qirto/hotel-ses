-- =====================================================================
-- MIGRATION: personal accounts + database access by role
--
-- Before: one shared passcode per portal, a role cookie anyone could edit, and
-- "allow all" policies (the browser key could read and write every table).
-- After:  Supabase Auth accounts (username + password); the role lives in the
--         signed JWT (app_metadata.role, writable only with the secret key);
--         anonymous visitors get nothing; writes are allowed per table by role.
--
-- Roles: reception | rh | gm | admin.
-- Run it in the Supabase SQL editor, together with the matching app release:
-- from this point the old passcode app can no longer read or write.
-- =====================================================================

-- 1. Accounts -----------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  display_name text not null,
  role text not null check (role in ('reception', 'rh', 'gm', 'admin')),
  staff_id bigint references public.staff (id) on delete set null,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_role on public.profiles (role);
alter table public.profiles enable row level security;

-- 2. Role of the signed-in user, from the signed JWT ----------------------
create or replace function public.app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

-- 3. Remove every "allow all" policy --------------------------------------
drop policy if exists "Allow read access to rooms" on public.rooms;
drop policy if exists "Allow all access to rooms" on public.rooms;
drop policy if exists "Allow read access to residents" on public.residents;
drop policy if exists "Allow all access to residents" on public.residents;
drop policy if exists "Allow read access to staff" on public.staff;
drop policy if exists "Allow all access to staff" on public.staff;
drop policy if exists "Allow read access to reclamations" on public.reclamations;
drop policy if exists "Allow all access to reclamations" on public.reclamations;
drop policy if exists "Allow read access to departments" on public.departments;
drop policy if exists "Allow all access to departments" on public.departments;

-- (re-runnable: drop this migration's own policies too)
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('rooms', 'residents', 'staff', 'reclamations', 'departments', 'profiles')
      and policyname like 'acct_%'
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- 4. Read: signed-in staff only --------------------------------------------
create policy acct_read_rooms on public.rooms for select to authenticated using (public.app_role() <> '');
create policy acct_read_residents on public.residents for select to authenticated using (public.app_role() <> '');
create policy acct_read_staff on public.staff for select to authenticated using (public.app_role() <> '');
create policy acct_read_reclamations on public.reclamations for select to authenticated using (public.app_role() <> '');
create policy acct_read_departments on public.departments for select to authenticated using (public.app_role() <> '');
-- an account sees its own profile; the admin sees all (writes go through the secret key only)
create policy acct_read_profiles on public.profiles for select to authenticated using (id = auth.uid() or public.app_role() = 'admin');

-- 5. Write, per table, by role (the app checks each action more finely) ------
-- Requests: every portal creates and updates them (RH: absences, staff removal)
create policy acct_insert_reclamations on public.reclamations for insert to authenticated
  with check (public.app_role() in ('reception', 'rh', 'gm', 'admin'));
create policy acct_update_reclamations on public.reclamations for update to authenticated
  using (public.app_role() in ('reception', 'rh', 'gm', 'admin'))
  with check (public.app_role() in ('reception', 'rh', 'gm', 'admin'));
create policy acct_delete_reclamations on public.reclamations for delete to authenticated
  using (public.app_role() in ('reception', 'gm', 'admin'));

-- Rooms: everyone advances cleaning / stays; only the admin changes the inventory
create policy acct_update_rooms on public.rooms for update to authenticated
  using (public.app_role() in ('reception', 'rh', 'gm', 'admin'))
  with check (public.app_role() in ('reception', 'rh', 'gm', 'admin'));
create policy acct_insert_rooms on public.rooms for insert to authenticated with check (public.app_role() = 'admin');
create policy acct_delete_rooms on public.rooms for delete to authenticated using (public.app_role() = 'admin');

-- Staff and services: HR and admin
create policy acct_write_staff on public.staff for all to authenticated
  using (public.app_role() in ('rh', 'admin'))
  with check (public.app_role() in ('rh', 'admin'));
create policy acct_write_departments on public.departments for all to authenticated
  using (public.app_role() in ('rh', 'admin'))
  with check (public.app_role() in ('rh', 'admin'));

-- Guests: admin only (no screen writes them yet)
create policy acct_write_residents on public.residents for all to authenticated
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');
