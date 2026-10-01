-- Saved trip places are independent of expenses and retain their own coordinates and photo.
alter table public.places
  drop constraint if exists places_rating_range,
  drop constraint if exists places_latitude_range,
  drop constraint if exists places_longitude_range;

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

alter table public.places
  add constraint places_rating_range check (rating is null or rating between 1 and 5),
  add constraint places_latitude_range check (latitude is null or latitude between -90 and 90),
  add constraint places_longitude_range check (longitude is null or longitude between -180 and 180);

create index if not exists places_trip_id_idx on public.places(trip_id);
