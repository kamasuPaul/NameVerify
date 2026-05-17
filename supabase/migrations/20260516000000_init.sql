-- nameVerify initial schema
-- Run this in the Supabase SQL editor, or via `supabase db push` if using the CLI.

-- ============================================================
-- Tables
-- ============================================================

-- 1:1 with auth.users; holds role + display info
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- Admin-issued invites; consumed on first sign-in
create table public.invites (
  email text primary key,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Saved lists
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create index lists_owner_id_idx on public.lists(owner_id);

create table public.list_rows (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  name text not null,
  phone text not null,                    -- E.164, e.g. +256755030178
  amount numeric(14, 2) not null,
  telco_name text,
  lookup_status text check (lookup_status in ('matched', 'mismatch', 'not_found', 'error')),
  position int not null
);

create index list_rows_list_id_idx on public.list_rows(list_id);

-- ============================================================
-- Helper: is_admin()
-- security definer so RLS on profiles doesn't recurse when policies call this
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.lists enable row level security;
alter table public.list_rows enable row level security;

-- profiles: self-read or admin-read; only admin can update role/info
create policy "profiles_select_self_or_admin" on public.profiles
  for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_admin" on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- invites: admin-only for everything
create policy "invites_admin_all" on public.invites
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- lists: owner sees own; admin sees all
create policy "lists_select_owner_or_admin" on public.lists
  for select
  using (owner_id = auth.uid() or public.is_admin());

create policy "lists_insert_owner" on public.lists
  for insert
  with check (owner_id = auth.uid());

create policy "lists_update_owner_or_admin" on public.lists
  for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "lists_delete_owner_or_admin" on public.lists
  for delete
  using (owner_id = auth.uid() or public.is_admin());

-- list_rows: inherit access from the parent list
create policy "list_rows_select_via_parent" on public.list_rows
  for select
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "list_rows_insert_via_parent" on public.list_rows
  for insert
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_id and l.owner_id = auth.uid()
    )
  );

create policy "list_rows_update_via_parent" on public.list_rows
  for update
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "list_rows_delete_via_parent" on public.list_rows
  for delete
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_id
        and (l.owner_id = auth.uid() or public.is_admin())
    )
  );

-- ============================================================
-- Signup gate
-- Only emails listed in `invites` can complete sign-in.
-- The trigger runs in the same transaction as the auth.users insert,
-- so raising an exception rolls back the signup cleanly.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invited public.invites%rowtype;
begin
  select * into invited
  from public.invites
  where lower(email) = lower(new.email);

  if not found then
    raise exception 'No invite found for %', new.email
      using errcode = 'P0001';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      invited.full_name,
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    invited.role
  );

  delete from public.invites where email = invited.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
