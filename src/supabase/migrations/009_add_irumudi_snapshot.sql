-- Sabarimala Irumudi collection is part of the trip snapshot, not the expense ledger.
alter table public.trips
  add column if not exists irumudi_snapshot jsonb,
  add column if not exists temple_name text;
