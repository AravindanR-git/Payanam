-- Add account-owned place categories and durable offline-delete tombstones.
-- Existing entity rows are not dropped or rewritten by this migration.

-- Bring older manually-created cloud projects up to the columns/tables already
-- used by the current app. All operations are additive and preserve existing rows.
alter table public.trips
  add column if not exists temple_name text,
  add column if not exists transport_snapshot jsonb,
  add column if not exists irumudi_snapshot jsonb;

alter table public.contributions
  alter column participant_id drop not null,
  add column if not exists donor_name text,
  add column if not exists donor_note text;

alter table public.expenses
  add column if not exists paid_by_donor_id uuid references public.contributions(id),
  add column if not exists transport_settlement boolean not null default false,
  add column if not exists transport_settlement_trip_id uuid references public.trips(id);
create index if not exists idx_expenses_paid_by_donor_id on public.expenses(paid_by_donor_id);
create unique index if not exists idx_expenses_transport_settlement_trip
  on public.expenses(transport_settlement_trip_id) where transport_settlement_trip_id is not null;

alter table public.places
  add column if not exists trip_id uuid references public.trips(id) on delete cascade,
  add column if not exists category_name text not null default 'Other',
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists accuracy double precision,
  add column if not exists address text,
  add column if not exists rating smallint,
  add column if not exists description text,
  add column if not exists photo text,
  add column if not exists captured_at timestamptz;
create index if not exists places_trip_id_idx on public.places(trip_id);

create table if not exists public.transports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  vehicle_type text,
  vehicle_number text,
  ownership text not null default 'own' check (ownership in ('own','rented')),
  pricing_mode text not null default 'perKm' check (pricing_mode in ('perKm','package')),
  rate_per_km numeric not null default 0,
  package_amount numeric not null default 0,
  driver_name text,
  driver_phone text,
  additional_phone text,
  driver_beta_per_day numeric not null default 0,
  photo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_transports_user_id on public.transports(user_id);

create table if not exists public.expense_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  payment_source_type text not null check (payment_source_type in ('fund','participant','donor')),
  participant_id uuid references public.participants(id),
  donor_id uuid references public.contributions(id),
  amount numeric not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_expense_payment_allocations_user_id on public.expense_payment_allocations(user_id);
create index if not exists idx_expense_payment_allocations_expense_id on public.expense_payment_allocations(expense_id);
alter table public.expense_payment_allocations enable row level security;
drop policy if exists "expense_payment_allocations select" on public.expense_payment_allocations;
drop policy if exists "expense_payment_allocations insert" on public.expense_payment_allocations;
drop policy if exists "expense_payment_allocations update" on public.expense_payment_allocations;
drop policy if exists "expense_payment_allocations delete" on public.expense_payment_allocations;
drop policy if exists "expense_payment_allocations select own" on public.expense_payment_allocations;
drop policy if exists "expense_payment_allocations insert own" on public.expense_payment_allocations;
drop policy if exists "expense_payment_allocations update own" on public.expense_payment_allocations;
drop policy if exists "expense_payment_allocations delete own" on public.expense_payment_allocations;
create policy "expense_payment_allocations select own" on public.expense_payment_allocations
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "expense_payment_allocations insert own" on public.expense_payment_allocations;
create policy "expense_payment_allocations insert own" on public.expense_payment_allocations
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "expense_payment_allocations update own" on public.expense_payment_allocations;
create policy "expense_payment_allocations update own" on public.expense_payment_allocations
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "expense_payment_allocations delete own" on public.expense_payment_allocations;
create policy "expense_payment_allocations delete own" on public.expense_payment_allocations
  for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.place_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists place_categories_user_order_idx
  on public.place_categories(user_id, display_order);
alter table public.place_categories enable row level security;
drop policy if exists "place categories select own" on public.place_categories;
create policy "place categories select own" on public.place_categories
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "place categories insert own" on public.place_categories;
create policy "place categories insert own" on public.place_categories
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "place categories update own" on public.place_categories;
create policy "place categories update own" on public.place_categories
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "place categories delete own" on public.place_categories;
create policy "place categories delete own" on public.place_categories
  for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.sync_tombstones (
  entity text not null check (entity in (
    'trips', 'expenseCategories', 'expenseItems', 'participants', 'contributions',
    'expenses', 'expensePaymentAllocations', 'places', 'placeCategories', 'activities', 'transports'
  )),
  record_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (entity, record_id)
);
create index if not exists sync_tombstones_user_updated_idx
  on public.sync_tombstones(user_id, updated_at);
alter table public.sync_tombstones enable row level security;
drop policy if exists "sync tombstones select own" on public.sync_tombstones;
create policy "sync tombstones select own" on public.sync_tombstones
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "sync tombstones insert own" on public.sync_tombstones;
create policy "sync tombstones insert own" on public.sync_tombstones
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "sync tombstones update own" on public.sync_tombstones;
create policy "sync tombstones update own" on public.sync_tombstones
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "sync tombstones delete own" on public.sync_tombstones;
create policy "sync tombstones delete own" on public.sync_tombstones
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.place_categories, public.sync_tombstones to authenticated;
grant select, insert, update, delete on public.transports, public.expense_payment_allocations to authenticated;

-- Fix account ownership checks for profiles and Saved Vehicles, including
-- the resulting row on UPDATE as required by Postgres RLS.
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
drop policy if exists "trips update own" on public.trips;
create policy "trips update own" on public.trips
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "categories update own" on public.expense_categories;
create policy "categories update own" on public.expense_categories
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "items update own" on public.expense_items;
create policy "items update own" on public.expense_items
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "places update own" on public.places;
create policy "places update own" on public.places
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "transports select own" on public.transports;
create policy "transports select own" on public.transports
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "transports insert own" on public.transports;
create policy "transports insert own" on public.transports
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "transports update own" on public.transports;
create policy "transports update own" on public.transports
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "transports delete own" on public.transports;
create policy "transports delete own" on public.transports
  for delete to authenticated using ((select auth.uid()) = user_id);

-- This app has no cross-account trip sharing UI. Limit every trip child to
-- the Supabase Auth owner so a share row cannot expose another account's data.
drop policy if exists "participants select" on public.participants;
create policy "participants select own" on public.participants
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "participants insert" on public.participants;
create policy "participants insert own" on public.participants
  for insert to authenticated with check ((select auth.uid()) = user_id and public.user_owns_trip(trip_id, (select auth.uid())));
drop policy if exists "participants update" on public.participants;
create policy "participants update own" on public.participants
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.user_owns_trip(trip_id, (select auth.uid())));
drop policy if exists "participants delete" on public.participants;
create policy "participants delete own" on public.participants
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "contributions select" on public.contributions;
create policy "contributions select own" on public.contributions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "contributions insert" on public.contributions;
create policy "contributions insert own" on public.contributions
  for insert to authenticated with check ((select auth.uid()) = user_id and public.user_owns_trip(trip_id, (select auth.uid())));
drop policy if exists "contributions update" on public.contributions;
create policy "contributions update own" on public.contributions
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.user_owns_trip(trip_id, (select auth.uid())));
drop policy if exists "contributions delete" on public.contributions;
create policy "contributions delete own" on public.contributions
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "expenses select" on public.expenses;
create policy "expenses select own" on public.expenses
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "expenses insert" on public.expenses;
create policy "expenses insert own" on public.expenses
  for insert to authenticated with check ((select auth.uid()) = user_id and public.user_owns_trip(trip_id, (select auth.uid())));
drop policy if exists "expenses update" on public.expenses;
create policy "expenses update own" on public.expenses
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.user_owns_trip(trip_id, (select auth.uid())));
drop policy if exists "expenses delete" on public.expenses;
create policy "expenses delete own" on public.expenses
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "activities select" on public.activities;
create policy "activities select own" on public.activities
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "activities insert" on public.activities;
create policy "activities insert own" on public.activities
  for insert to authenticated with check ((select auth.uid()) = user_id and public.user_owns_trip(trip_id, (select auth.uid())));

drop policy if exists "trip_shares select" on public.trip_shares;
create policy "trip shares select owner" on public.trip_shares
  for select to authenticated using ((select auth.uid()) = owner_id);

-- Vehicle and profile image content is transferred in the existing data URLs
-- / avatar storage path; allow owners to manage only their avatar folder.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;
drop policy if exists "avatars owner select" on storage.objects;
create policy "avatars owner select" on storage.objects
  for select to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  ) with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['transports', 'expense_payment_allocations', 'place_categories', 'sync_tombstones'] loop
      if to_regclass('public.' || table_name) is not null and not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end $$;
