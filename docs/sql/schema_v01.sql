-- Schema v0.1 for ShopSync (Supabase)
-- Run in Supabase SQL Editor (sequentially)

-- 0) Extensions (usually enabled by default)
create extension if not exists pgcrypto;

-- Legacy cleanup
drop table if exists public.list_invites cascade;

-- 1) Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  access_code text not null unique default upper(substring(md5(gen_random_uuid()::text), 1, 6)),
  created_at timestamp with time zone default now()
);

create table if not exists public.list_members (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  created_at timestamp with time zone default now(),
  primary key (list_id, user_id)
);

create table if not exists public.aliases (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  alias_id uuid references public.aliases(id) on delete set null,
  category text
);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  name text not null,
  quantity numeric not null default 1,
  unit text not null default 'pcs',
  priority int not null default 0,
  status text not null default 'open',
  assignee_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2) Indexes
create index if not exists idx_list_items_list_id on public.list_items(list_id);
create index if not exists idx_lists_owner_id on public.lists(owner_id);
create index if not exists idx_list_members_user on public.list_members(user_id);

alter table public.lists
  add column if not exists access_code text not null default upper(substring(md5(gen_random_uuid()::text), 1, 6));

create index if not exists idx_lists_access_code on public.lists(access_code);

-- 3) RLS
alter table public.profiles enable row level security;
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.list_items enable row level security;
alter table public.products enable row level security;
alter table public.aliases enable row level security;

-- Profiles: owner can see/update self
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- Allow insert own profile
drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- Lists: select only by owner (временно — во избежание рекурсий)
drop policy if exists "lists: select for members" on public.lists;
create policy "lists: select for members" on public.lists
  for select using (public.is_list_member(id));
-- Lists: owners can также видеть свои списки даже без membership bootstrap
drop policy if exists "lists: select for owners" on public.lists;
create policy "lists: select for owners" on public.lists
  for select using (owner_id = auth.uid());
-- Allow owners to create their lists
drop policy if exists "lists: insert by owner" on public.lists;
create policy "lists: insert by owner" on public.lists
  for insert with check (owner_id = auth.uid());
drop policy if exists "lists: modify for owner" on public.lists;
create policy "lists: modify for owner" on public.lists
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- List members: avoid self-recursive EXISTS;
-- Select: see your rows or rows in lists you own
drop policy if exists "list_members: select own/owner" on public.list_members;
drop policy if exists "list_members: select for members" on public.list_members;
create policy "list_members: select for members" on public.list_members
  for select using (public.is_list_member(list_members.list_id));
-- Manage memberships only by list owner
drop policy if exists "list_members: manage by owner" on public.list_members;
drop policy if exists "list_members: manage by editors" on public.list_members;
create policy "list_members: manage by editors" on public.list_members
  for all using (public.can_edit_list(list_members.list_id))
  with check (public.can_edit_list(list_members.list_id));
-- Bootstrap: allow owner of list to insert their own membership row
drop policy if exists "list_members: bootstrap owner" on public.list_members;
create policy "list_members: bootstrap owner" on public.list_members
  for insert with check (
    exists (
      select 1 from public.lists l where l.id = list_members.list_id and l.owner_id = auth.uid()
    )
  );

-- List items: visible to members; writable by owner/editor
drop policy if exists "list_items: select for members" on public.list_items;
create policy "list_items: select for members" on public.list_items
  for select using (
    exists (
      select 1 from public.list_members m
      where m.list_id = list_items.list_id and m.user_id = auth.uid()
    )
  );
drop policy if exists "list_items: modify for editors" on public.list_items;
create policy "list_items: modify for editors" on public.list_items
  for all using (
    exists (
      select 1 from public.list_members m
      where m.list_id = list_items.list_id and m.user_id = auth.uid() and m.role in ('owner','editor')
    )
  ) with check (
    exists (
      select 1 from public.list_members m
      where m.list_id = list_items.list_id and m.user_id = auth.uid() and m.role in ('owner','editor')
    )
  );

-- Products/Aliases: per-user optional; для простоты читают все участники любых списков
drop policy if exists "products: read" on public.products;
create policy "products: read" on public.products for select using (true);
drop policy if exists "aliases: read" on public.aliases;
create policy "aliases: read" on public.aliases for select using (true);

-- 4) Triggers
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

create or replace function public.generate_list_access_code()
returns text
language sql
as $$
  select upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6));
$$;

create or replace function public.join_list_by_code(p_access_code text)
returns public.lists
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := upper(trim(p_access_code));
  target_list public.lists;
begin
  if normalized is null or normalized = '' then
    raise exception 'ACCESS_CODE_REQUIRED';
  end if;

  select * into target_list
  from public.lists
  where upper(access_code) = normalized
  limit 1;

  if target_list is null then
    raise exception 'LIST_NOT_FOUND';
  end if;

  insert into public.list_members(list_id, user_id, role)
  values (target_list.id, auth.uid(), 'editor')
  on conflict (list_id, user_id) do nothing;

  return target_list;
end;
$$;

drop trigger if exists trg_set_updated_at on public.list_items;
create trigger trg_set_updated_at before update on public.list_items
for each row execute function public.set_updated_at();

-- 5) Helper functions to avoid recursive RLS lookups
create or replace function public.is_list_member(p_list_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.list_members lm
      where lm.list_id = p_list_id and lm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.lists l
      where l.id = p_list_id and l.owner_id = auth.uid()
    );
$$;

create or replace function public.can_edit_list(p_list_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.lists l
      where l.id = p_list_id and l.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.list_members lm
      where lm.list_id = p_list_id and lm.user_id = auth.uid() and lm.role in ('owner','editor')
    );
$$;

-- Recreate list_items policies using helper functions
drop policy if exists "list_items: select for members" on public.list_items;
create policy "list_items: select for members" on public.list_items
  for select using (public.is_list_member(list_id));

drop policy if exists "list_items: modify for editors" on public.list_items;
create policy "list_items: modify for editors" on public.list_items
  for all using (public.can_edit_list(list_id))
  with check (public.can_edit_list(list_id));

drop policy if exists "lists: update access code" on public.lists;
create policy "lists: update access code" on public.lists
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());


