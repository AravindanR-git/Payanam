# Supabase Migration History Reconciliation

## Current State

The initial schema migration (`001_initial_schema_revised.sql`) was applied **manually** via the Supabase SQL Editor on `2026-08-16`. The Supabase CLI migration history table (`supabase_migrations.schema_migrations`) does not contain an entry for this migration.

## Verified Schema State

All 14 tables, 28 triggers, 11 functions, 40+ RLS policies, 11 Realtime publications, and default seed data are present and match `src/supabase/migrations/001_initial_schema_revised.sql`.

## Local Migration File

`supabase/migrations/20240101000000_baseline.sql` contains the exact SQL that was applied manually. This file exists for reference only.

## IMPORTANT: Do NOT run `supabase db push`

Running `supabase db push` will attempt to apply `20240101000000_baseline.sql` against the remote database and fail because the tables already exist.

## Recommended Workflow for Future Migrations

Since the initial migration was applied outside of Supabase CLI, use this workflow for all future schema changes:

1. **Create a new migration file** in `supabase/migrations/` with a descriptive name and timestamp, e.g.:
   ```
   supabase/migrations/20260816000000_add_user_metadata.sql
   ```

2. **Apply the migration manually** via the Supabase Dashboard SQL Editor:
   - Open https://supabase.com/dashboard/project/eywyzqvvoizvftctjswp/sql
   - Paste the SQL
   - Run

3. **Update the local file** if the executed SQL differs from what you wrote (due to errors, manual fixes, etc.)

4. **Do NOT run `supabase db push`** for this project. The CLI migration history is out of sync with the actual database state. Continue using the Dashboard SQL Editor for all schema changes.

## Alternative: Reset Migration History (Not Recommended)

If you want to fully adopt `supabase db push` in the future, you would need to:

1. Dump all data from the current database
2. Drop all tables
3. Run `supabase db push` to apply migrations via CLI
4. Restore the data

This is destructive and not recommended for a production project.

## Current Migration Files

- `src/supabase/migrations/001_initial_schema_revised.sql` — canonical source of truth
- `supabase/migrations/20240101000000_baseline.sql` — local copy for reference
