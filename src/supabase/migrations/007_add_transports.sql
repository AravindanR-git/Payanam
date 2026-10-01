-- Transport master records and immutable per-trip transport snapshots.
alter table public.trips add column if not exists transport_snapshot jsonb;
alter table public.expenses add column if not exists transport_settlement boolean not null default false;
alter table public.expenses add column if not exists transport_settlement_trip_id uuid references public.trips(id);
create unique index if not exists idx_expenses_transport_settlement_trip on public.expenses(transport_settlement_trip_id) where transport_settlement_trip_id is not null;

create table if not exists public.transports (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  vehicle_type text,
  vehicle_number text,
  ownership text not null default 'own' check (ownership in ('own','rented')),
  pricing_mode text not null default 'perKm' check (pricing_mode in ('perKm','package')),
  rate_per_km numeric not null default 0 check (rate_per_km >= 0),
  package_amount numeric not null default 0 check (package_amount >= 0),
  driver_name text,
  driver_phone text,
  additional_phone text,
  driver_beta_per_day numeric not null default 0 check (driver_beta_per_day >= 0),
  photo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_transports_user_id on public.transports(user_id);
alter table public.transports enable row level security;
drop policy if exists "transports select own" on public.transports;
create policy "transports select own" on public.transports for select using (auth.uid() = user_id);
drop policy if exists "transports insert own" on public.transports;
create policy "transports insert own" on public.transports for insert with check (auth.uid() = user_id);
drop policy if exists "transports update own" on public.transports;
create policy "transports update own" on public.transports for update using (auth.uid() = user_id);
drop policy if exists "transports delete own" on public.transports;
create policy "transports delete own" on public.transports for delete using (auth.uid() = user_id);
