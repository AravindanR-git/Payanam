-- ============================================================
-- Payanam — Initial Supabase Schema + RLS
-- ============================================================
--
-- This migration creates all user-owned tables, their RLS policies,
-- indexes, and the profile auto-creation trigger.
--
-- Run this in the Supabase SQL Editor (or via supabase db push).

-- ============================================================
-- 1. Profiles table (1:1 with auth.users)
-- ============================================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on new auth user
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
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
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- 2. Trips
-- ============================================================

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  trip_name text not null,
  trip_type text not null default 'friends',
  status text not null default 'ACTIVE',
  default_contribution_per_person numeric default 0,
  ended_at timestamptz,
  end_date timestamptz,
  continuation_closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_trips_user_id on public.trips(user_id);

-- ============================================================
-- 3. Participants
-- ============================================================

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  user_id uuid references auth.users not null,
  type text not null default 'friend',
  name text not null,
  adults int default 1,
  children int default 0,
  member_count int default 1,
  initial_contribution numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_participants_trip_id on public.participants(trip_id);
create index idx_participants_user_id on public.participants(user_id);

-- ============================================================
-- 4. Contributions
-- ============================================================

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  participant_id uuid references public.participants on delete cascade not null,
  user_id uuid references auth.users not null,
  amount numeric default 0,
  created_at timestamptz default now()
);

create index idx_contributions_trip_id on public.contributions(trip_id);

-- ============================================================
-- 5. Expense Categories
-- ============================================================

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
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

-- ============================================================
-- 6. Expense Items
-- ============================================================

create table public.expense_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.expense_categories on delete cascade not null,
  user_id uuid references auth.users not null,
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

-- ============================================================
-- 7. Places
-- ============================================================

create table public.places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_places_user_id on public.places(user_id);

-- ============================================================
-- 8. Expenses
-- ============================================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  user_id uuid references auth.users not null,
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

-- ============================================================
-- 9. Activities
-- ============================================================

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  user_id uuid references auth.users not null,
  type text default 'expense',
  created_at timestamptz default now()
);

create index idx_activities_trip_id on public.activities(trip_id);

-- ============================================================
-- 10. Sync Log
-- ============================================================

create table public.sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
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
-- 11. Device Sessions
-- ============================================================

create table public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  device_id text not null,
  last_sync_at timestamptz,
  created_at timestamptz default now()
);

create unique index idx_device_sessions_user_device on public.device_sessions(user_id, device_id);

-- ============================================================
-- 12. Trip Shares (reserved for future)
-- ============================================================

create table public.trip_shares (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  owner_id uuid references auth.users not null,
  shared_with_user_id uuid references auth.users not null,
  permission text not null default 'view',
  created_at timestamptz default now(),
  unique(trip_id, shared_with_user_id)
);

create index idx_trip_shares_trip on public.trip_shares(trip_id, shared_with_user_id);

-- ============================================================
-- 13. Row Level Security (RLS) Policies
-- ============================================================

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

-- Participants
alter table public.participants enable row level security;
create policy "participants select own" on public.participants for select using (auth.uid() = user_id);
create policy "participants insert own" on public.participants for insert with check (auth.uid() = user_id);
create policy "participants update own" on public.participants for update using (auth.uid() = user_id);
create policy "participants delete own" on public.participants for delete using (auth.uid() = user_id);

-- Contributions
alter table public.contributions enable row level security;
create policy "contributions select own" on public.contributions for select using (auth.uid() = user_id);
create policy "contributions insert own" on public.contributions for insert with check (auth.uid() = user_id);
create policy "contributions update own" on public.contributions for update using (auth.uid() = user_id);
create policy "contributions delete own" on public.contributions for delete using (auth.uid() = user_id);

-- Expense Categories
alter table public.expense_categories enable row level security;
create policy "categories select own" on public.expense_categories for select using (auth.uid() = user_id);
create policy "categories insert own" on public.expense_categories for insert with check (auth.uid() = user_id);
create policy "categories update own" on public.expense_categories for update using (auth.uid() = user_id);
create policy "categories delete own" on public.expense_categories for delete using (auth.uid() = user_id);

-- Expense Items
alter table public.expense_items enable row level security;
create policy "items select own" on public.expense_items for select using (auth.uid() = user_id);
create policy "items insert own" on public.expense_items for insert with check (auth.uid() = user_id);
create policy "items update own" on public.expense_items for update using (auth.uid() = user_id);
create policy "items delete own" on public.expense_items for delete using (auth.uid() = user_id);

-- Places
alter table public.places enable row level security;
create policy "places select own" on public.places for select using (auth.uid() = user_id);
create policy "places insert own" on public.places for insert with check (auth.uid() = user_id);
create policy "places update own" on public.places for update using (auth.uid() = user_id);
create policy "places delete own" on public.places for delete using (auth.uid() = user_id);

-- Expenses
alter table public.expenses enable row level security;
create policy "expenses select own" on public.expenses for select using (auth.uid() = user_id);
create policy "expenses insert own" on public.expenses for insert with check (auth.uid() = user_id);
create policy "expenses update own" on public.expenses for update using (auth.uid() = user_id);
create policy "expenses delete own" on public.expenses for delete using (auth.uid() = user_id);

-- Activities
alter table public.activities enable row level security;
create policy "activities select own" on public.activities for select using (auth.uid() = user_id);
create policy "activities insert own" on public.activities for insert with check (auth.uid() = user_id);

-- Sync Log
alter table public.sync_log enable row level security;
create policy "sync_log select own" on public.sync_log for select using (auth.uid() = user_id);
create policy "sync_log insert own" on public.sync_log for insert with check (auth.uid() = user_id);

-- Device Sessions
alter table public.device_sessions enable row level security;
create policy "sessions select own" on public.device_sessions for select using (auth.uid() = user_id);
create policy "sessions insert own" on public.device_sessions for insert with check (auth.uid() = user_id);
create policy "sessions update own" on public.device_sessions for update using (auth.uid() = user_id);
create policy "sessions delete own" on public.device_sessions for delete using (auth.uid() = user_id);

-- Trip Shares (future)
alter table public.trip_shares enable row level security;
create policy "trip_shares select own" on public.trip_shares for select using (
  auth.uid() = owner_id or auth.uid() = shared_with_user_id
);
create policy "trip_shares insert own" on public.trip_shares for insert with check (auth.uid() = owner_id);

-- ============================================================
-- 14. Realtime: Enable replication for all tables
-- ============================================================

-- Supabase enables this via the dashboard or:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.trips, public.participants, public.contributions, public.expense_categories, public.expense_items, public.places, public.expenses, public.activities;
