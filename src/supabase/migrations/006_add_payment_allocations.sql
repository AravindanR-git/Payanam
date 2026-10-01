-- ============================================================
-- Add expense payment allocations
-- ============================================================
-- Allocations split an expense's payment across multiple sources:
--   fund | participant | donor
-- Each allocation row records one slice of an expense's total.
-- Ownership is derived from the parent expense (user_id must match
-- the expense's user_id), consistent with the expenses/contributions
-- ownership-chain pattern in migration 001.
--
-- Dependency order (critical):
--   1. create table
--   2. indexes
--   3. helper functions that reference the table
--   4. triggers
--   5. RLS policies
--   6. realtime publication
-- ============================================================

-- 1. Table
-- ----------------------------------------------------------

create table public.expense_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.expenses on delete cascade not null,
  payment_source_type text not null check (payment_source_type in ('fund','participant','donor')),
  participant_id uuid references public.participants,
  donor_id uuid references public.contributions,
  amount numeric not null,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Indexes
-- ----------------------------------------------------------

create index idx_expense_payment_allocations_expense_id
  on public.expense_payment_allocations(expense_id);

create index idx_expense_payment_allocations_donor_id
  on public.expense_payment_allocations(donor_id);

create index idx_expense_payment_allocations_participant_id
  on public.expense_payment_allocations(participant_id);

create index idx_expense_payment_allocations_user_id
  on public.expense_payment_allocations(user_id);

-- 3. Helper functions (reference the table, so must come after step 1)
-- ----------------------------------------------------------

-- Resolve the owning user_id for an allocation by joining to its
-- parent expense. Used by RLS policies below.

create or replace function public.allocation_owner_id(p_allocation_id uuid)
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select e.user_id
  from public.expense_payment_allocations a
  join public.expenses e on e.id = a.expense_id
  where a.id = p_allocation_id
$$;

-- Ensure an allocation's user_id matches its parent expense's user_id.
-- This closes the cross-user reference gap that RLS alone cannot cover.

create or replace function public.validate_allocation_expense_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id <> (select user_id from public.expenses where id = new.expense_id) then
    raise exception 'Cannot create allocation for expense owned by another user';
  end if;
  return new;
end;
$$;

-- 4. Triggers
-- ----------------------------------------------------------

-- Reuses project-wide helpers from migration 001:
--   public.set_updated_at()
--   public.prevent_user_id_change()

create trigger set_expense_payment_allocations_updated_at
  before update on public.expense_payment_allocations
  for each row execute function public.set_updated_at();

create trigger prevent_expense_payment_allocations_user_id_change
  before update on public.expense_payment_allocations
  for each row execute function public.prevent_user_id_change();

create trigger validate_allocation_expense_owner
  before insert or update on public.expense_payment_allocations
  for each row execute function public.validate_allocation_expense_owner();

-- 5. Row Level Security (RLS) Policies
-- ----------------------------------------------------------

alter table public.expense_payment_allocations enable row level security;

create policy "expense_payment_allocations select" on public.expense_payment_allocations
  for select using (
    auth.uid() = user_id
    or auth.uid() = public.allocation_owner_id(id)
  );

create policy "expense_payment_allocations insert" on public.expense_payment_allocations
  for insert with check (
    auth.uid() = user_id
    and auth.uid() = (select user_id from public.expenses where id = expense_id)
  );

create policy "expense_payment_allocations update" on public.expense_payment_allocations
  for update using (
    auth.uid() = user_id
    or auth.uid() = public.allocation_owner_id(id)
  );

create policy "expense_payment_allocations delete" on public.expense_payment_allocations
  for delete using (
    auth.uid() = user_id
    or auth.uid() = public.allocation_owner_id(id)
  );

-- 6. Realtime
-- ----------------------------------------------------------
-- Allocations are hydrated on session start and pushed via the
-- pending-sync queue. They are not subscribed to live in the UI
-- (AuthContext realtime list), so no realtime callback wiring is
-- required. The table is added to the publication for parity with
-- the other synced entities and so the schema cache resolves it.

alter publication supabase_realtime add table
  public.expense_payment_allocations;

-- ============================================================
-- End of migration
-- ============================================================