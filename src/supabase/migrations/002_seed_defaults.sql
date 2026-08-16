-- ============================================================
-- Payanam — Global Default Categories & Items
-- ============================================================
--
-- These records have is_default = true and are used as templates.
-- On user signup, a copy is created for the user.
--
-- The global defaults use a fixed UUID as user_id (system user).
-- In production, use a proper system user or null with a separate is_global flag.

-- Global default categories
insert into public.expense_categories (id, user_id, name, icon, color, trip_types, display_order, is_default) values
  ('transport', '00000000-0000-0000-0000-000000000000', 'Transport', 'Car', '#2563EB', ARRAY['all'], 1, true),
  ('food', '00000000-0000-0000-0000-000000000000', 'Food', 'UtensilsCrossed', '#F97316', ARRAY['all'], 2, true),
  ('stay', '00000000-0000-0000-0000-000000000000', 'Accommodation', 'Hotel', '#14B8A6', ARRAY['friends','family'], 3, true),
  ('shopping', '00000000-0000-0000-0000-000000000000', 'Shopping', 'ShoppingBag', '#EC4899', ARRAY['all'], 4, true),
  ('medical', '00000000-0000-0000-0000-000000000000', 'Medical', 'Cross', '#DC2626', ARRAY['all'], 5, true),
  ('temple', '00000000-0000-0000-0000-000000000000', 'Temple', 'Landmark', '#7C3AED', ARRAY['temple'], 6, true),
  ('donation', '00000000-0000-0000-0000-000000000000', 'Donation', 'HeartHandshake', '#EAB308', ARRAY['temple'], 7, true),
  ('entertainment', '00000000-0000-0000-0000-000000000000', 'Entertainment', 'PartyPopper', '#8B5CF6', ARRAY['friends','family'], 8, true),
  ('misc', '00000000-0000-0000-0000-000000000000', 'Miscellaneous', 'Package', '#6B7280', ARRAY['all'], 9, true);

-- Global default items
insert into public.expense_items (id, category_id, user_id, name, display_order, is_default) values
  ('fuel', 'transport', '00000000-0000-0000-0000-000000000000', 'Fuel', 1, true),
  ('diesel', 'transport', '00000000-0000-0000-0000-000000000000', 'Diesel', 2, true),
  ('toll', 'transport', '00000000-0000-0000-0000-000000000000', 'Toll', 3, true),
  ('parking', 'transport', '00000000-0000-0000-0000-000000000000', 'Parking', 4, true),
  ('breakfast', 'food', '00000000-0000-0000-0000-000000000000', 'Breakfast', 1, true),
  ('lunch', 'food', '00000000-0000-0000-0000-000000000000', 'Lunch', 2, true),
  ('tea', 'food', '00000000-0000-0000-0000-000000000000', 'Tea', 3, true),
  ('dinner', 'food', '00000000-0000-0000-0000-000000000000', 'Dinner', 4, true),
  ('hotel', 'stay', '00000000-0000-0000-0000-000000000000', 'Hotel', 1, true),
  ('shopping', 'shopping', '00000000-0000-0000-0000-000000000000', 'Shopping', 1, true),
  ('medicine', 'medical', '00000000-0000-0000-0000-000000000000', 'Medicine', 1, true),
  ('darshan-ticket', 'temple', '00000000-0000-0000-0000-000000000000', 'Darshan Ticket', 1, true),
  ('pooja', 'temple', '00000000-0000-0000-0000-000000000000', 'Pooja / Archana', 2, true),
  ('prasadam', 'temple', '00000000-0000-0000-0000-000000000000', 'Prasadam', 3, true),
  ('special-entry', 'temple', '00000000-0000-0000-0000-000000000000', 'Special Entry', 4, true),
  ('hundi', 'donation', '00000000-0000-0000-0000-000000000000', 'Hundi Donation', 1, true),
  ('annadanam', 'donation', '00000000-0000-0000-0000-000000000000', 'Annadanam', 2, true);

-- Function to copy global defaults to a new user
create or replace function public.seed_user_defaults(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  insert into public.expense_categories (
    user_id, name, icon, color, trip_types, display_order, is_default
  )
  select
    p_user_id, name, icon, color, trip_types, display_order, false
  from public.expense_categories
  where is_default = true;

  insert into public.expense_items (
    category_id, user_id, name, display_order, is_default
  )
  select
    (select id from public.expense_categories ec where ec.name = 'Transport' and ec.user_id = p_user_id),
    p_user_id, name, display_order, false
  from public.expense_items
  where is_default = true and category_id = 'transport';

  insert into public.expense_items (
    category_id, user_id, name, display_order, is_default
  )
  select
    (select id from public.expense_categories ec where ec.name = 'Food' and ec.user_id = p_user_id),
    p_user_id, name, display_order, false
  from public.expense_items
  where is_default = true and category_id = 'food';

  insert into public.expense_items (
    category_id, user_id, name, display_order, is_default
  )
  select
    (select id from public.expense_categories ec where ec.name = 'Accommodation' and ec.user_id = p_user_id),
    p_user_id, name, display_order, false
  from public.expense_items
  where is_default = true and category_id = 'stay';

  insert into public.expense_items (
    category_id, user_id, name, display_order, is_default
  )
  select
    (select id from public.expense_categories ec where ec.name = 'Shopping' and ec.user_id = p_user_id),
    p_user_id, name, display_order, false
  from public.expense_items
  where is_default = true and category_id = 'shopping';

  insert into public.expense_items (
    category_id, user_id, name, display_order, is_default
  )
  select
    (select id from public.expense_categories ec where ec.name = 'Medical' and ec.user_id = p_user_id),
    p_user_id, name, display_order, false
  from public.expense_items
  where is_default = true and category_id = 'medical';

  insert into public.expense_items (
    category_id, user_id, name, display_order, is_default
  )
  select
    (select id from public.expense_categories ec where ec.name = 'Temple' and ec.user_id = p_user_id),
    p_user_id, name, display_order, false
  from public.expense_items
  where is_default = true and category_id = 'temple';

  insert into public.expense_items (
    category_id, user_id, name, display_order, is_default
  )
  select
    (select id from public.expense_categories ec where ec.name = 'Donation' and ec.user_id = p_user_id),
    p_user_id, name, display_order, false
  from public.expense_items
  where is_default = true and category_id = 'donation';

  insert into public.expense_items (
    category_id, user_id, name, display_order, is_default
  )
  select
    (select id from public.expense_categories ec where ec.name = 'Entertainment' and ec.user_id = p_user_id),
    p_user_id, name, display_order, false
  from public.expense_items
  where is_default = true and category_id = 'entertainment';

  insert into public.expense_items (
    category_id, user_id, name, display_order, is_default
  )
  select
    (select id from public.expense_categories ec where ec.name = 'Miscellaneous' and ec.user_id = p_user_id),
    p_user_id, name, display_order, false
  from public.expense_items
  where is_default = true and category_id = 'misc';
end;
$$;
