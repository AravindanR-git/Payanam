-- ============================================================
-- Add donor payment source to expenses
-- ============================================================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS paid_by_donor_id uuid REFERENCES public.contributions;

CREATE INDEX IF NOT EXISTS idx_expenses_paid_by_donor_id
  ON public.expenses(paid_by_donor_id);

-- ============================================================
-- End of migration
-- ============================================================
