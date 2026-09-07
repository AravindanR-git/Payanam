-- ============================================================
-- Phase 1: Add default_key columns for stable default identity
-- ============================================================

-- Expense Categories: add nullable default_key
ALTER TABLE public.expense_categories
  ADD COLUMN IF NOT EXISTS default_key text;

-- Unique per user: only one 'transport' per user, multiple NULLs allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_categories_user_default_key
ON expense_categories(user_id, default_key)
WHERE default_key IS NOT NULL;

-- Expense Items: add nullable default_key
ALTER TABLE public.expense_items
  ADD COLUMN IF NOT EXISTS default_key text;

-- Unique per user: only one 'fuel' per user, multiple NULLs allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_items_user_default_key
ON expense_items(user_id, default_key)
WHERE default_key IS NOT NULL;

-- ============================================================
-- End of migration
-- ============================================================
