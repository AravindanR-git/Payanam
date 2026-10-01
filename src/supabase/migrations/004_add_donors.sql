-- ============================================================
-- Add donor support to contributions
-- ============================================================

ALTER TABLE public.contributions
  ALTER COLUMN participant_id DROP NOT NULL;

ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS donor_name text;

ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS donor_note text;

-- ============================================================
-- End of migration
-- ============================================================
