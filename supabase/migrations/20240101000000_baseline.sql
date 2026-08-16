-- ============================================================
-- Payanam — Revised Supabase Schema + RLS
-- ============================================================
--
-- Addresses:
-- 1. Cross-user reference prevention via ownership-chain triggers
-- 2. Hardened SECURITY DEFINER functions with safe search_path
-- 3. Automatic updated_at via reusable trigger
-- 4. Realtime enabled for all tables
-- 5. Default categories/items via dedicated template tables
-- 6. Trip sharing RLS (future-ready)
-- 7. user_id immutability after insert
--
-- Run in Supabase SQL Editor. Do NOT run against production
-- until this entire file is reviewed and approved.
-- ============================================================

-- ============================================================
-- 0. Reusable updated_at trigger function
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 0b. Prevent user_id ownership changes
-- ============================================================
-- Blocks UPDATE that attempts to change user_id to a
-- different UUID. INSERT is unaffected.

create or replace function public.prevent_user_id_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.user_id <> old.user_id then
    raise exception 'user_id cannot be changed after insert';
  end if;
  return new;
end;
$$;

-- ============================================================
-- 1. Profiles (1:1 with auth.users)
-- ============================================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger prevent_profiles_user_id_change
  before update on public.profiles
  for each row execute function public.prevent_user_id_change();

-- Auto-create profile on new auth user
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name, phone, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. Trips (user-owned)
-- ============================================================

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  trip_name text not null,
  trip_type text not null default 'friends',
  status text not null default 'ACTIVE',
  default_contribution_per_person numeric default 0,
  ended_at timestamptz,
  end_date timestamptz,
  continuation_closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_trip_type check (trip_type in ('friends', 'family', 'temple'))
);

create index idx_trips_user_id on public.trips(user_id);

create trigger set_trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

create trigger prevent_trips_user_id_change
  before update on public.trips
  for each row execute function public.prevent_user_id_change();

-- ============================================================
-- 3. Participants (belong to a trip, owned by user)
-- ============================================================

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  type text not null default 'friend',
  name text not null,
  adults int default 1,
  children int default 0,
  member_count int default 1,
  initial_contribution numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_participant_type check (type in ('friend', 'family'))
);

create index idx_participants_trip_id on public.participants(trip_id);
create index idx_participants_user_id on public.participants(user_id);

create trigger set_participants_updated_at
  before update on public.participants
  for each row execute function public.set_updated_at();

create trigger prevent_participants_user_id_change
  before update on public.participants
  for each row execute function public.prevent_user_id_change();

-- ============================================================
-- 4. Contributions (belong to a participant/trip, owned by user)
-- ============================================================

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  participant_id uuid references public.participants on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  amount numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_contributions_trip_id on public.contributions(trip_id);
create index idx_contributions_user_id on public.contributions(user_id);

create trigger set_contributions_updated_at
  before update on public.contributions
  for each row execute function public.set_updated_at();

create trigger prevent_contributions_user_id_change
  before update on public.contributions
  for each row execute function public.prevent_user_id_change();

-- ============================================================
-- 5. Expense Categories (user-owned)
-- ============================================================

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  icon text,
  color text,
  trip_types text[] default '{}',
  display_order int default 0,
  is_default boolean default false,
  usage_count int default 0,
  last_used timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_expense_categories_user_id on public.expense_categories(user_id);

create trigger set_expense_categories_updated_at
  before update on public.expense_categories
  for each row execute function public.set_updated_at();

create trigger prevent_expense_categories_user_id_change
  before update on public.expense_categories
  for each row execute function public.prevent_user_id_change();

-- ============================================================
-- 6. Expense Items (belong to a category, owned by user)
-- ============================================================

create table public.expense_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.expense_categories on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  icon text,
  display_order int default 0,
  is_default boolean default false,
  usage_count int default 0,
  last_used timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_expense_items_category_id on public.expense_items(category_id);
create index idx_expense_items_user_id on public.expense_items(user_id);

create trigger set_expense_items_updated_at
  before update on public.expense_items
  for each row execute function public.set_updated_at();

create trigger prevent_expense_items_user_id_change
  before update on public.expense_items
  for each row execute function public.prevent_user_id_change();

-- ============================================================
-- 7. Places (user-owned)
-- ============================================================

create table public.places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_places_user_id on public.places(user_id);

create trigger set_places_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

create trigger prevent_places_user_id_change
  before update on public.places
  for each row execute function public.prevent_user_id_change();

-- ============================================================
-- 8. Expenses (belong to a trip, owned by user)
-- ============================================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  category_id uuid references public.expense_categories,
  item_id uuid references public.expense_items,
  category_name text,
  selected_items jsonb,
  expense_time timestamptz,
  amount numeric not null,
  notes text,
  payment_source text default 'fund',
  paid_by_participant_id uuid references public.participants,
  latitude double precision,
  longitude double precision,
  location_name text,
  location_source text default 'none',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_expenses_trip_id on public.expenses(trip_id);
create index idx_expenses_user_id on public.expenses(user_id);

create trigger set_expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

create trigger prevent_expenses_user_id_change
  before update on public.expenses
  for each row execute function public.prevent_user_id_change();

-- ============================================================
-- 9. Activities (belong to a trip, owned by user)
-- ============================================================

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  type text default 'expense',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_activities_trip_id on public.activities(trip_id);

create trigger set_activities_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

create trigger prevent_activities_user_id_change
  before update on public.activities
  for each row execute function public.prevent_user_id_change();

-- ============================================================
-- 10. Sync Log (append-only, owned by user)
-- ============================================================

create table public.sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  table_name text not null,
  record_id uuid not null,
  operation text not null,
  payload jsonb not null,
  client_created_at timestamptz,
  server_received_at timestamptz default now(),
  synced_at timestamptz default now()
);

create index idx_sync_log_user_id on public.sync_log(user_id);
create index idx_sync_log_received on public.sync_log(server_received_at);

-- ============================================================
-- 11. Device Sessions (owned by user)
-- ============================================================

create table public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  device_id text not null,
  last_sync_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, device_id)
);

create index idx_device_sessions_user_id on public.device_sessions(user_id);

create trigger set_device_sessions_updated_at
  before update on public.device_sessions
  for each row execute function public.set_updated_at();

create trigger prevent_device_sessions_user_id_change
  before update on public.device_sessions
  for each row execute function public.prevent_user_id_change();

-- ============================================================
-- 12. Trip Shares (future: shared trip access)
-- ============================================================

create table public.trip_shares (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  owner_id uuid references auth.users on delete cascade not null,
  shared_with_user_id uuid references auth.users on delete cascade not null,
  permission text not null default 'view',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(trip_id, shared_with_user_id)
);

create index idx_trip_shares_trip on public.trip_shares(trip_id);
create index idx_trip_shares_shared_with on public.trip_shares(shared_with_user_id);

create trigger set_trip_shares_updated_at
  before update on public.trip_shares
  for each row execute function public.set_updated_at();

create trigger prevent_trip_shares_user_id_change
  before update on public.trip_shares
  for each row execute function public.prevent_user_id_change();

-- ============================================================
-- 13. Default Template Tables (system-owned, immutable)
-- ============================================================
-- These hold the immutable default categories/items.
-- New users get copies via seed_user_defaults().
-- RLS blocks authenticated DML; seed_user_defaults() runs
-- as SECURITY DEFINER and bypasses RLS.

create table public.default_expense_categories (
  id text primary key,
  name text not null,
  icon text,
  color text,
  trip_types text[] default '{}',
  display_order int default 0
);

create table public.default_expense_items (
  id text primary key,
  category_id text references public.default_expense_categories not null,
  name text not null,
  display_order int default 0
);

-- Seed defaults (run once)
insert into public.default_expense_categories (id, name, icon, color, trip_types, display_order) values
  ('transport', 'Transport', 'Car', '#2563EB', ARRAY['all'], 1),
  ('food', 'Food', 'UtensilsCrossed', '#F97316', ARRAY['all'], 2),
  ('stay', 'Accommodation', 'Hotel', '#14B8A6', ARRAY['friends','family'], 3),
  ('shopping', 'Shopping', 'ShoppingBag', '#EC4899', ARRAY['all'], 4),
  ('medical', 'Medical', 'Cross', '#DC2626', ARRAY['all'], 5),
  ('temple', 'Temple', 'Landmark', '#7C3AED', ARRAY['temple'], 6),
  ('donation', 'Donation', 'HeartHandshake', '#EAB308', ARRAY['temple'], 7),
  ('entertainment', 'Entertainment', 'PartyPopper', '#8B5CF6', ARRAY['friends','family'], 8),
  ('misc', 'Miscellaneous', 'Package', '#6B7280', ARRAY['all'], 9);

insert into public.default_expense_items (id, category_id, name, display_order) values
  ('fuel', 'transport', 'Fuel', 1),
  ('diesel', 'transport', 'Diesel', 2),
  ('toll', 'transport', 'Toll', 3),
  ('parking', 'transport', 'Parking', 4),
  ('breakfast', 'food', 'Breakfast', 1),
  ('lunch', 'food', 'Lunch', 2),
  ('tea', 'food', 'Tea', 3),
  ('dinner', 'food', 'Dinner', 4),
  ('hotel', 'stay', 'Hotel', 1),
  ('shopping-item', 'shopping', 'Shopping', 1),
  ('medicine', 'medical', 'Medicine', 1),
  ('darshan-ticket', 'temple', 'Darshan Ticket', 1),
  ('pooja', 'temple', 'Pooja / Archana', 2),
  ('prasadam', 'temple', 'Prasadam', 3),
  ('special-entry', 'temple', 'Special Entry', 4),
  ('hundi', 'donation', 'Hundi Donation', 1),
  ('annadanam', 'donation', 'Annadanam', 2);

-- Function to copy defaults to a new user (called from app layer)
create or replace function public.seed_user_defaults(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.expense_categories (user_id, name, icon, color, trip_types, display_order, is_default)
  select
    p_user_id, name, icon, color, trip_types, display_order, false
  from public.default_expense_categories;

  insert into public.expense_items (category_id, user_id, name, display_order, is_default)
  select
    ec.id, p_user_id, di.name, di.display_order, false
  from public.default_expense_items di
  join public.expense_categories ec
    on ec.user_id = p_user_id
    and ec.name = (
      select dec.name
      from public.default_expense_categories dec
      where dec.id = di.category_id
    );
end;
$$;

-- ============================================================
-- 14. Cross-user reference prevention triggers
-- ============================================================
-- These ensure a record cannot reference a parent owned by
-- a different user. RLS alone is insufficient because FK
-- constraints don't check ownership.

create or replace function public.validate_trip_ownership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id <> (select user_id from public.trips where id = new.trip_id) then
    raise exception 'Cannot create record for trip owned by another user';
  end if;
  return new;
end;
$$;

create or replace function public.validate_category_ownership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id <> (select user_id from public.expense_categories where id = new.category_id) then
    raise exception 'Cannot create record for category owned by another user';
  end if;
  return new;
end;
$$;

-- Validates expenses.paid_by_participant_id
create or replace function public.validate_paid_by_participant_ownership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.paid_by_participant_id is not null then
    if new.user_id <> (select user_id from public.participants where id = new.paid_by_participant_id) then
      raise exception 'Cannot create expense for participant owned by another user';
    end if;
  end if;
  return new;
end;
$$;

-- Validates contributions.participant_id
create or replace function public.validate_contribution_participant_ownership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id <> (select user_id from public.participants where id = new.participant_id) then
    raise exception 'Cannot create record for participant owned by another user';
  end if;
  return new;
end;
$$;

-- Apply triggers
create trigger validate_expense_trip_owner
  before insert or update on public.expenses
  for each row execute function public.validate_trip_ownership();

create trigger validate_expense_category_owner
  before insert or update on public.expenses
  for each row execute function public.validate_category_ownership();

create trigger validate_expense_paid_by_participant_owner
  before insert or update on public.expenses
  for each row execute function public.validate_paid_by_participant_ownership();

create trigger validate_contribution_trip_owner
  before insert or update on public.contributions
  for each row execute function public.validate_trip_ownership();

create trigger validate_contribution_participant_owner
  before insert or update on public.contributions
  for each row execute function public.validate_contribution_participant_ownership();

create trigger validate_item_category_owner
  before insert or update on public.expense_items
  for each row execute function public.validate_category_ownership();

create trigger validate_activity_trip_owner
  before insert or update on public.activities
  for each row execute function public.validate_trip_ownership();

-- ============================================================
-- 15. Row Level Security (RLS) Policies
-- ============================================================

-- Helper: check if user owns the trip
create or replace function public.user_owns_trip(p_trip_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.trips
    where id = p_trip_id and user_id = p_user_id
  );
$$;

-- Helper: check if user owns the category
create or replace function public.user_owns_category(p_category_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.expense_categories
    where id = p_category_id and user_id = p_user_id
  );
$$;

-- Helper: check if user has access to trip (owner or shared)
create or replace function public.user_can_access_trip(p_trip_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.trips where id = p_trip_id and user_id = p_user_id
    union
    select 1 from public.trip_shares where trip_id = p_trip_id and shared_with_user_id = p_user_id
  );
$$;

-- Profiles
alter table public.profiles enable row level security;
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

-- Trips
alter table public.trips enable row level security;
create policy "trips select own" on public.trips for select using (auth.uid() = user_id);
create policy "trips insert own" on public.trips for insert with check (auth.uid() = user_id);
create policy "trips update own" on public.trips for update using (auth.uid() = user_id);
create policy "trips delete own" on public.trips for delete using (auth.uid() = user_id);

-- Participants (user can access if they own the trip)
alter table public.participants enable row level security;
create policy "participants select" on public.participants
  for select using (
    auth.uid() = user_id
    or public.user_can_access_trip(trip_id, auth.uid())
  );
create policy "participants insert" on public.participants
  for insert with check (
    auth.uid() = user_id
    and public.user_owns_trip(trip_id, auth.uid())
  );
create policy "participants update" on public.participants
  for update using (
    auth.uid() = user_id
    and public.user_owns_trip(trip_id, auth.uid())
  );
create policy "participants delete" on public.participants
  for delete using (
    auth.uid() = user_id
    and public.user_owns_trip(trip_id, auth.uid())
  );

-- Contributions (user can access if they own the trip)
alter table public.contributions enable row level security;
create policy "contributions select" on public.contributions
  for select using (
    auth.uid() = user_id
    or public.user_can_access_trip(trip_id, auth.uid())
  );
create policy "contributions insert" on public.contributions
  for insert with check (
    auth.uid() = user_id
    and public.user_owns_trip(trip_id, auth.uid())
  );
create policy "contributions update" on public.contributions
  for update using (
    auth.uid() = user_id
    and public.user_owns_trip(trip_id, auth.uid())
  );
create policy "contributions delete" on public.contributions
  for delete using (
    auth.uid() = user_id
    and public.user_owns_trip(trip_id, auth.uid())
  );

-- Expense Categories (owner only)
alter table public.expense_categories enable row level security;
create policy "categories select own" on public.expense_categories for select using (auth.uid() = user_id);
create policy "categories insert own" on public.expense_categories for insert with check (auth.uid() = user_id);
create policy "categories update own" on public.expense_categories for update using (auth.uid() = user_id);
create policy "categories delete own" on public.expense_categories for delete using (auth.uid() = user_id);

-- Expense Items (owner only)
alter table public.expense_items enable row level security;
create policy "items select own" on public.expense_items for select using (auth.uid() = user_id);
create policy "items insert own" on public.expense_items for insert with check (auth.uid() = user_id);
create policy "items update own" on public.expense_items for update using (auth.uid() = user_id);
create policy "items delete own" on public.expense_items for delete using (auth.uid() = user_id);

-- Places (owner only)
alter table public.places enable row level security;
create policy "places select own" on public.places for select using (auth.uid() = user_id);
create policy "places insert own" on public.places for insert with check (auth.uid() = user_id);
create policy "places update own" on public.places for update using (auth.uid() = user_id);
create policy "places delete own" on public.places for delete using (auth.uid() = user_id);

-- Expenses (user can access if they own the trip)
alter table public.expenses enable row level security;
create policy "expenses select" on public.expenses
  for select using (
    auth.uid() = user_id
    or public.user_can_access_trip(trip_id, auth.uid())
  );
create policy "expenses insert" on public.expenses
  for insert with check (
    auth.uid() = user_id
    and public.user_owns_trip(trip_id, auth.uid())
    and (
      category_id is null
      or public.user_owns_category(category_id, auth.uid())
    )
  );
create policy "expenses update" on public.expenses
  for update using (
    auth.uid() = user_id
    and public.user_owns_trip(trip_id, auth.uid())
  );
create policy "expenses delete" on public.expenses
  for delete using (
    auth.uid() = user_id
    and public.user_owns_trip(trip_id, auth.uid())
  );

-- Activities (user can access if they own the trip)
alter table public.activities enable row level security;
create policy "activities select" on public.activities
  for select using (
    auth.uid() = user_id
    or public.user_can_access_trip(trip_id, auth.uid())
  );
create policy "activities insert" on public.activities
  for insert with check (
    auth.uid() = user_id
    and public.user_owns_trip(trip_id, auth.uid())
  );

-- Sync Log (owner only)
alter table public.sync_log enable row level security;
create policy "sync_log select own" on public.sync_log for select using (auth.uid() = user_id);
create policy "sync_log insert own" on public.sync_log for insert with check (auth.uid() = user_id);

-- Device Sessions (owner only)
alter table public.device_sessions enable row level security;
create policy "sessions select own" on public.device_sessions for select using (auth.uid() = user_id);
create policy "sessions insert own" on public.device_sessions for insert with check (auth.uid() = user_id);
create policy "sessions update own" on public.device_sessions for update using (auth.uid() = user_id);
create policy "sessions delete own" on public.device_sessions for delete using (auth.uid() = user_id);

-- Trip Shares (owner and shared user)
alter table public.trip_shares enable row level security;
create policy "trip_shares select" on public.trip_shares
  for select using (
    auth.uid() = owner_id
    or auth.uid() = shared_with_user_id
  );
create policy "trip_shares insert" on public.trip_shares
  for insert with check (auth.uid() = owner_id);
create policy "trip_shares delete" on public.trip_shares
  for delete using (auth.uid() = owner_id);

-- Default Template Tables: RLS blocks authenticated DML.
-- seed_user_defaults() runs as SECURITY DEFINER and bypasses RLS.
alter table public.default_expense_categories enable row level security;
create policy "default_categories select service_role"
  on public.default_expense_categories
  for select
  using (auth.role() = 'service_role');

alter table public.default_expense_items enable row level security;
create policy "default_items select service_role"
  on public.default_expense_items
  for select
  using (auth.role() = 'service_role');

-- ============================================================
-- 16. Realtime
-- ============================================================
-- Enable replication for all user-facing tables.
-- Run this ALTER PUBLICATION in SQL Editor, or enable via
-- Dashboard: Database → Replication → Add tables to publication.

alter publication supabase_realtime add table
  public.profiles,
  public.trips,
  public.participants,
  public.contributions,
  public.expense_categories,
  public.expense_items,
  public.places,
  public.expenses,
  public.activities,
  public.sync_log,
  public.trip_shares;

-- ============================================================
-- End of migration
-- ============================================================
