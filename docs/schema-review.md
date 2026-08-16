# Payanam Supabase Schema — Pre-Deployment Review

## Executive Summary

The original migration (`001_initial_schema.sql`) has 8 issues that must be addressed before running against production. This document provides the analysis, the revised migration, and the complete security model.

---

## 1. Cross-User Reference Prevention

### Problem

An expense created by User A could reference User B's category, item, participant, or trip by supplying the UUID directly. The original RLS only checked `expenses.user_id = auth.uid()`, but did not verify that the referenced `trip_id`, `category_id`, `item_id`, or `paid_by_participant_id` belonged to the same user.

### Solution

**Two layers of defense:**

1. **Database triggers** — `validate_trip_ownership()`, `validate_category_ownership()`, `validate_participant_ownership()` fire on INSERT/UPDATE for expenses, contributions, expense_items, and activities. They query the parent table and raise an exception if the parent belongs to a different user.

2. **RLS policies with EXISTS checks** — For example, the `expenses insert` policy checks:
   ```sql
   auth.uid() = user_id
   AND public.user_owns_trip(trip_id, auth.uid())
   AND (category_id IS NULL OR public.user_owns_category(category_id, auth.uid()))
   ```

### How User A is prevented from accessing User B's data

| Attack Vector | Prevention |
|---------------|-----------|
| Direct API call with User B's trip_id | Trigger `validate_trip_ownership()` checks trips.user_id |
| Direct API call with User B's category_id | Trigger `validate_category_ownership()` checks expense_categories.user_id |
| Direct API call with User B's participant_id | Trigger `validate_participant_ownership()` checks participants.user_id |
| Bypassing RLS via service_role key | Triggers fire at the database level regardless of RLS |
| Reading User B's data via shared trip | Trip sharing RLS uses `trip_shares` table; without a share entry, access is denied |

---

## 2. Ownership Model

```
auth.users (Supabase managed)
  └── profiles (1:1)
  └── trips (1:many, user_id)
       └── participants (1:many, trip_id + user_id)
            └── contributions (1:many, participant_id + trip_id + user_id)
       └── expenses (1:many, trip_id + user_id)
            ├── references expense_categories (user_id)
            ├── references expense_items (user_id via category)
            └── references participants (user_id via trip)
       └── activities (1:many, trip_id + user_id)
  └── expense_categories (1:many, user_id)
       └── expense_items (1:many, category_id + user_id)
  └── places (1:many, user_id)
  └── trip_shares (many:many, trip_id + owner_id + shared_with_user_id)
```

**Key principle:** Every record has a `user_id` that is the owner. Child records reference parents via FK, but ownership is enforced separately via triggers + RLS.

---

## 3. Table Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        auth.users                            │
│                   (Supabase managed)                         │
└──────────┬──────────────────────────────────────────────────┘
           │
           ├─── profiles (1:1)
           │
           ├─── trips (1:many)
           │      ├── participants (1:many)
           │      │      └── contributions (1:many)
           │      ├── expenses (1:many)
           │      │      ├── category_id → expense_categories
           │      │      ├── item_id → expense_items
           │      │      └── paid_by_participant_id → participants
           │      ├── activities (1:many)
           │      └── trip_shares (many:many, future)
           │
           ├─── expense_categories (1:many)
           │      └── expense_items (1:many)
           │
           ├─── places (standalone)
           │
           ├─── sync_log (append-only)
           │
           └─── device_sessions (1:many)

┌─────────────────────────────────────────────────────────────┐
│              default_expense_categories (system)             │
│              default_expense_items (system)                  │
│              (immutable templates, copied on signup)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | own | own | own | — |
| trips | own | own | own | own |
| participants | own + shared trip | own + own trip | own + own trip | own + own trip |
| contributions | own + shared trip | own + own trip | own + own trip | own + own trip |
| expense_categories | own | own | own | own |
| expense_items | own | own | own | own |
| places | own | own | own | own |
| expenses | own + shared trip | own + own trip + own category | own + own trip | own + own trip |
| activities | own + shared trip | own + own trip | — | — |
| sync_log | own | own | — | — |
| device_sessions | own | own | own | own |
| trip_shares | owner + shared user | owner | owner | owner |

**"Shared trip"** means the user appears in `trip_shares` for that trip_id, or is the trip owner.

---

## 5. Realtime Tables

The following tables are enabled for Supabase Realtime via `ALTER PUBLICATION`:

- `profiles`
- `trips`
- `participants`
- `contributions`
- `expense_categories`
- `expense_items`
- `places`
- `expenses`
- `activities`
- `sync_log`
- `trip_shares`

**Dashboard alternative:** If the ALTER PUBLICATION fails, go to Supabase Dashboard → Database → Replication → Add each table to the `supabase_realtime` publication.

---

## 6. `updated_at` Trigger Strategy

A single reusable function `public.set_updated_at()` sets `updated_at = now()` on every UPDATE. Triggers are applied to all tables that have an `updated_at` column:

- profiles
- trips
- participants
- contributions
- expense_categories
- expense_items
- places
- expenses
- activities
- device_sessions
- trip_shares

The trigger function is `SECURITY DEFINER` with `SET search_path = public, pg_temp` to prevent search_path injection.

---

## 7. Default Category/Item Initialization Strategy

### Architecture

```
default_expense_categories (immutable, system-owned)
         ↓ seed_user_defaults(p_user_id)
expense_categories (user-owned, is_default = false)
         ↓
expense_items (user-owned, is_default = false)
```

### How it works

1. **Global templates** exist in `default_expense_categories` and `default_expense_items`. These are **immutable** — no RLS, no user can modify them.

2. **On user signup**, the app calls `seed_user_defaults(user_id)` which:
   - Copies all default categories into the user's `expense_categories` with `is_default = false`
   - Copies all default items into the user's `expense_items`, joining to the user's copied categories

3. **Users customize independently** — since the copies are regular user-owned records, users can rename, delete, or reorder them without affecting other users or the global defaults.

### Why this is safe

- Default templates are in separate tables with no RLS (only accessible via the SECURITY DEFINER function)
- The `seed_user_defaults()` function uses `SET search_path = public, pg_temp` to prevent SQL injection
- Each user gets their own independent copies

---

## 8. Trip Sharing Architecture (Future-Ready)

The `trip_shares` table allows an owner to grant access to another user for a specific trip. RLS policies ensure:

- **Owner** has full access to the trip and all related data
- **Shared user** can SELECT/INSERT/UPDATE/DELETE participants, contributions, expenses, and activities for the shared trip
- **Shared user** CANNOT access the owner's other trips, categories, items, or places
- **No public access** — all policies require `auth.uid()` to match either `owner_id` or `shared_with_user_id`

When implemented, the app will insert a row into `trip_shares`:
```sql
INSERT INTO trip_shares (trip_id, owner_id, shared_with_user_id, permission)
VALUES ('trip-uuid', 'owner-uuid', 'shared-user-uuid', 'view');
```

---

## 9. SECURITY DEFINER Hardening

All SECURITY DEFINER functions now include:

```sql
create function public.function_name()
returns ...
language plpgsql
security definer
set search_path = public, pg_temp
as $$
...
$$;
```

**Why `set search_path = public, pg_temp`:**
- Prevents `search_path` injection attacks where a malicious user could create a function in their own schema that shadows built-in functions
- `pg_temp` allows temporary tables for internal use
- `public` allows access to normal tables

---

## 10. What Was Changed From Original

| Issue | Original | Revised |
|--------|----------|---------|
| Cross-user references | No prevention | Triggers + RLS with EXISTS checks |
| `updated_at` | Manual only | Automatic via reusable trigger |
| Realtime | Commented out | Active ALTER PUBLICATION |
| Default categories | Fixed UUID in user table | Separate template tables + copy function |
| `handle_new_user()` | No search_path | `SET search_path = public, pg_temp` |
| Trip sharing | Basic RLS | Full access chain for shared trips |
| Ownership checks | Only `user_id` column | Full chain validation via triggers |
| `seed_user_defaults()` | Broken category name matching | Uses category name join instead of hardcoded names |

---

## Next Steps

1. **Review this document and the revised migration**
2. **Confirm with your Supabase project** that all tables are empty or can be dropped
3. **Apply the revised migration** in Supabase SQL Editor
4. **Run the seed data** (default categories/items are included in the migration)
5. **Test** signup, login, trip creation, expense creation, and trip sharing

**Do NOT run the original `001_initial_schema.sql` against production.**
