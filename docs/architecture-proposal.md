# Payanam — Architecture Proposal: Supabase Auth + Multi-Device Sync

## 1. Executive Summary

Replace the current JSON-file backend with Supabase (Auth + PostgreSQL + Realtime) while preserving the existing Dexie/IndexedDB offline-first client architecture. Every user-owned record will be tied to `auth.uid()` via PostgreSQL Row Level Security (RLS). The Express server is retained until migration is fully verified.

---

## 2. Supabase Architecture

### 2.1 Supabase Services
- **Auth**: Supabase Auth (email/password + email OTP verification).
- **Database**: PostgreSQL on Supabase.
- **Realtime**: PostgreSQL logical replication streams for database record changes (NOT broadcast messages).
- **Storage**: Not required for this phase.

### 2.2 Client Packages to Add
- `@supabase/supabase-js` — Supabase JS client.

### 2.3 Environment Variables
Add to `.env` (client):
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```
The existing `VITE_API_BASE` is retained for the Express server during transition.

---

## 3. Source of Truth

| Layer | Role |
|---|---|
| **Supabase PostgreSQL** | Authoritative cloud source of truth for all synchronized user data. |
| **Dexie / IndexedDB** | Local cache and offline working database. |
| **pendingSync queue** | Local queue of changes not yet successfully persisted to Supabase. |

Supabase is the **sole** cloud source of truth. Dexie is a **local cache** that mirrors Supabase data. Changes originate locally, are written to Dexie first, then pushed to Supabase via `pendingSync`. When online, Supabase changes propagate back to all devices via PostgreSQL Realtime.

Dexie and Supabase must **never** become competing permanent sources of truth. The sync architecture follows:

```
Local change
  → Dexie write (immediate offline access)
  → enqueueSync() → pendingSync table (offline queue)
  → SyncService flushes queue to Supabase (online)
  → Supabase PostgreSQL (source of truth)
  → PostgreSQL Realtime → other devices (online)
  → Local Dexie updated via Realtime subscription
```

---

## 4. Database Schema

### 4.1 Tables

```sql
-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trips
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  trip_name text not null,
  trip_type text not null default 'friends',
  status text not null default 'ACTIVE',
  default_contribution_per_person numeric default 0,
  ended_at timestamptz,
  end_date timestamptz,
  continuation_closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Participants
create table public.participants (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  user_id uuid references auth.users not null,
  type text not null default 'friend',
  name text not null,
  adults int default 1,
  children int default 0,
  member_count int default 1,
  initial_contribution numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contributions
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  participant_id uuid references public.participants on delete cascade not null,
  user_id uuid references auth.users not null,
  amount numeric default 0,
  created_at timestamptz default now()
);

-- Expense Categories (user-owned copies of global defaults)
create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  icon text,
  color text,
  trip_types text[] default '{}',
  display_order int default 0,
  is_default boolean default false,
  usage_count int default 0,
  last_used timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Expense Items (user-owned copies of global defaults)
create table public.expense_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.expense_categories on delete cascade not null,
  user_id uuid references auth.users not null,
  name text not null,
  icon text,
  display_order int default 0,
  is_default boolean default false,
  usage_count int default 0,
  last_used timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Places
create table public.places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Expenses
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  user_id uuid references auth.users not null,
  category_id uuid references public.expense_categories,
  item_id uuid references public.expense_items,
  category_name text,
  selected_items jsonb,
  expense_time timestamptz,
  amount numeric not null,
  notes text,
  payment_source text default 'fund',
  paid_by_participant_id uuid references public.participants,
  latitude double precision,
  longitude double precision,
  location_name text,
  location_source text default 'none',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activities
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  user_id uuid references auth.users not null,
  type text default 'expense',
  created_at timestamptz default now()
);

-- Sync log (for pull-based fallback sync)
create table public.sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  table_name text not null,
  record_id uuid not null,
  operation text not null,
  payload jsonb not null,
  client_created_at timestamptz,
  server_received_at timestamptz default now(),
  synced_at timestamptz default now()
);

-- Device sessions
create table public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  device_id text not null,
  last_sync_at timestamptz,
  created_at timestamptz default now()
);

-- Trip shares (prepared for future sharing, not implemented)
create table public.trip_shares (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips on delete cascade not null,
  owner_id uuid references auth.users not null,
  shared_with_user_id uuid references auth.users not null,
  permission text not null default 'view',
  created_at timestamptz default now(),
  unique(trip_id, shared_with_user_id)
);
```

### 4.2 Indexes
```sql
create index idx_trips_user_id on public.trips(user_id);
create index idx_participants_trip_id on public.participants(trip_id);
create index idx_participants_user_id on public.participants(user_id);
create index idx_contributions_trip_id on public.contributions(trip_id);
create index idx_expense_categories_user_id on public.expense_categories(user_id);
create index idx_expense_items_category_id on public.expense_items(category_id);
create index idx_expense_items_user_id on public.expense_items(user_id);
create index idx_places_user_id on public.places(user_id);
create index idx_expenses_trip_id on public.expenses(trip_id);
create index idx_expenses_user_id on public.expenses(user_id);
create index idx_activities_trip_id on public.activities(trip_id);
create index idx_sync_log_user_id on public.sync_log(user_id);
create index idx_sync_log_received on public.sync_log(server_received_at);
create unique index idx_device_sessions_user_device on public.device_sessions(user_id, device_id);
create index idx_trip_shares_trip on public.trip_shares(trip_id, shared_with_user_id);
```

---

## 5. Row Level Security (RLS) Strategy

All user-owned tables use `auth.uid()` for row-level filtering. Client code **never** passes `user_id` — the authenticated `auth.uid()` is always used.

### 5.1 Profiles
```sql
alter table public.profiles enable row level security;
create policy "select own" on public.profiles for select using (auth.uid() = id);
create policy "insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "update own" on public.profiles for update using (auth.uid() = id);
```

### 5.2 Trips
```sql
alter table public.trips enable row level security;
create policy "select own" on public.trips for select using (auth.uid() = user_id);
create policy "insert own" on public.trips for insert with check (auth.uid() = user_id);
create policy "update own" on public.trips for update using (auth.uid() = user_id);
create policy "delete own" on public.trips for delete using (auth.uid() = user_id);
```

### 5.3 Participants
```sql
alter table public.participants enable row level security;
create policy "participants select own" on public.participants for select using (auth.uid() = user_id);
create policy "participants insert own" on public.participants for insert with check (auth.uid() = user_id);
create policy "participants update own" on public.participants for update using (auth.uid() = user_id);
create policy "participants delete own" on public.participants for delete using (auth.uid() = user_id);
```

### 5.4 Contributions
```sql
alter table public.contributions enable row level security;
create policy "contributions select own" on public.contributions for select using (auth.uid() = user_id);
create policy "contributions insert own" on public.contributions for insert with check (auth.uid() = user_id);
create policy "contributions update own" on public.contributions for update using (auth.uid() = user_id);
create policy "contributions delete own" on public.contributions for delete using (auth.uid() = user_id);
```

### 5.5 Expense Categories
```sql
alter table public.expense_categories enable row level security;
create policy "categories select own" on public.expense_categories for select using (auth.uid() = user_id);
create policy "categories insert own" on public.expense_categories for insert with check (auth.uid() = user_id);
create policy "categories update own" on public.expense_categories for update using (auth.uid() = user_id);
create policy "categories delete own" on public.expense_categories for delete using (auth.uid() = user_id);
```

### 5.6 Expense Items
```sql
alter table public.expense_items enable row level security;
create policy "items select own" on public.expense_items for select using (auth.uid() = user_id);
create policy "items insert own" on public.expense_items for insert with check (auth.uid() = user_id);
create policy "items update own" on public.expense_items for update using (auth.uid() = user_id);
create policy "items delete own" on public.expense_items for delete using (auth.uid() = user_id);
```

### 5.7 Places
```sql
alter table public.places enable row level security;
create policy "places select own" on public.places for select using (auth.uid() = user_id);
create policy "places insert own" on public.places for insert with check (auth.uid() = user_id);
create policy "places update own" on public.places for update using (auth.uid() = user_id);
create policy "places delete own" on public.places for delete using (auth.uid() = user_id);
```

### 5.8 Expenses
```sql
alter table public.expenses enable row level security;
create policy "expenses select own" on public.expenses for select using (auth.uid() = user_id);
create policy "expenses insert own" on public.expenses for insert with check (auth.uid() = user_id);
create policy "expenses update own" on public.expenses for update using (auth.uid() = user_id);
create policy "expenses delete own" on public.expenses for delete using (auth.uid() = user_id);
```

### 5.9 Activities
```sql
alter table public.activities enable row level security;
create policy "activities select own" on public.activities for select using (auth.uid() = user_id);
create policy "activities insert own" on public.activities for insert with check (auth.uid() = user_id);
```

### 5.10 Sync Log
```sql
alter table public.sync_log enable row level security;
create policy "sync_log select own" on public.sync_log for select using (auth.uid() = user_id);
create policy "sync_log insert own" on public.sync_log for insert with check (auth.uid() = user_id);
```

### 5.11 Device Sessions
```sql
alter table public.device_sessions enable row level security;
create policy "sessions select own" on public.device_sessions for select using (auth.uid() = user_id);
create policy "sessions insert own" on public.device_sessions for insert with check (auth.uid() = user_id);
create policy "sessions update own" on public.device_sessions for update using (auth.uid() = user_id);
create policy "sessions delete own" on public.device_sessions for delete using (auth.uid() = user_id);
```

### 5.12 Trip Shares (reserved for future)
```sql
alter table public.trip_shares enable row level security;
create policy "trip_shares select own" on public.trip_shares for select using (auth.uid() = owner_id or auth.uid() = shared_with_user_id);
create policy "trip_shares insert own" on public.trip_shares for insert with check (auth.uid() = owner_id);
```

---

## 6. Authentication & Session Flow

### 6.1 Supabase Client Initialization
Create `src/services/supabaseClient.js`:
```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
```

### 6.2 Signup Flow
1. User enters email, display name, optional phone, password.
2. Frontend calls `supabase.auth.signUp({ email, password, options: { data: { display_name, phone } } })`.
3. Supabase sends email verification OTP/link.
4. Frontend shows "Verify your email" screen with code entry.
5. After verification, Supabase establishes session automatically.
6. A database trigger creates the `profiles` row from `auth.users` metadata.
7. On first login, global default categories/items are copied as user-owned records.
8. Navigate to `/`.

### 6.3 Login Flow
1. User enters email + password.
2. Frontend calls `supabase.auth.signInWithPassword({ email, password })`.
3. Supabase requires email verification — if unverified, show verification prompt.
4. On success, session is stored by Supabase JS client (in-memory + localStorage by default).
5. Navigate to `/`.

### 6.4 Forgot Password Flow
1. User taps "Forgot password".
2. Frontend calls `supabase.auth.resetPasswordForEmail(email)`.
3. Supabase sends reset email (does not reveal whether email is registered).
4. User sets new password via a recovery page or Supabase's hosted UI.

### 6.5 Session Restoration
- Supabase JS client automatically restores session from `localStorage` on app load.
- `AuthContext` calls `supabase.auth.getSession()` at startup to resolve initial auth state.
- If no valid session → redirect to `/login`.
- `onAuthStateChange` listener detects login/logout changes in real time.

### 6.6 Logout (Safe Logout)
Before logout, the application must:
1. Check if `pendingSync` queue has unsynchronized entries for the current user.
2. If online, attempt to flush the queue to Supabase.
3. If sync fails and pending changes exist, warn the user: "You have unsynced changes. Logging out will leave them in the local database. Continue?"
4. If safe to proceed, call `supabase.auth.signOut()`.
5. Clear the user-specific local Dexie data for the current user (NOT all Dexie data).
6. Clear localStorage auth keys (`tripledger_token`, `tripledger_device_id`).
7. Navigate to `/login`.

**Preventing cross-user data leakage**: All Dexie queries that return user data must be scoped to the current `user_id`. When a new user logs in, existing records from the previous user are either cleared or filtered by `user_id`.

### 6.7 Auth Context
Create `src/contexts/AuthContext.jsx`:
```jsx
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize: check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (event === 'SIGNED_OUT') {
          // Clear user-specific local cache
          clearUserCache();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 6.8 Routing Guard
- `App.jsx` checks `AuthContext.loading` → show splash.
- If no session → render `<Login />` or `<Signup />` based on route.
- Protected routes wrapped in `<RequireAuth>` → redirects to `/login` if no session.

---

## 7. User Profile

### 7.1 Profile Structure
Stored in `public.profiles` table, linked 1:1 with `auth.users`:

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key, references `auth.users.id` |
| `display_name` | Text | User's display name for greetings |
| `phone` | Text (nullable) | Optional phone number |
| `created_at` | Timestamptz | |
| `updated_at` | Timestamptz | |

### 7.2 Profile Population
- On signup, `display_name` and optional `phone` are passed via `supabase.auth.signUp` user metadata.
- A Supabase database trigger auto-creates the `profiles` row from `auth.users`:

```sql
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute sql $$
    insert into public.profiles (id, display_name, phone)
    values (
      new.id,
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'phone'
    );
  $$;
```

### 7.3 Profile Usage
- Display name used in `Home.jsx` header (replacing hardcoded "Aravin").
- Phone used for future passwordless login (not implemented this phase).

---

## 8. User-Specific Data Ownership

### 8.1 Ownership Model
Every user-owned record has a `user_id UUID REFERENCES auth.users`. The repositories always use `auth.uid()` (via the Supabase client) when creating records — **never** a client-provided user ID.

### 8.2 Categories and Items — Per-User Copies
- Global defaults exist in `expense_categories` / `expense_items` with `is_default = true` and a known `user_id` (e.g., a system UUID or null with a separate `is_global_default` flag).
- On first login after signup, a service function copies all `is_default = true` categories and their children items into the new user's own records with their `user_id`.
- The user can then freely modify, delete, or add to their own copies. Changes never affect another user's copies.

**Implementation detail**: The `is_default` flag in Dexie marks records that came from the seed. In Supabase, defaults are flagged with `is_default = true` AND a separate mechanism to identify global templates.

---

## 9. Multi-Device Synchronization

### 9.1 Supported Devices
The same Payanam account can be logged in on Android, iPhone, Windows browser, etc. simultaneously. All devices share the same Supabase backend.

### 9.2 Synchronization Flow
```
Device A: local write → Dexie → pendingSync
Device A: online → push to Supabase (via SyncService)
Supabase: PostgreSQL (source of truth)
Supabase Realtime → Device B & Device C: postgres_changes subscription
Device B: receive Realtime event → update local Dexie
Device B: reconcile with pendingSync (avoid infinite loops)

Offline scenario:
Device C: local write → Dexie → pendingSync (queued)
Device C: offline → queue remains until online
Device C: reconnect → push to Supabase → Realtime to A & B
```

### 9.3 Realtime via PostgreSQL Changes
```js
// Subscribe to expense changes for current user
const subscription = supabase
  .channel('public:expenses:user_id=eq.<uid>')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'expenses',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    applyRemoteChangeToDexie(payload);
  })
  .subscribe();
```

### 9.4 Pull-Based Fallback
When Realtime is unavailable (offline→online reconnect), `SyncService.syncNow()` queries:
```sql
SELECT * FROM sync_log WHERE user_id = auth.uid() AND server_received_at > lastSyncAt ORDER BY server_received_at ASC
```
And applies changes to local Dexie.

### 9.5 Conflict Detection & Resolution
**Strategy: Last-Write-Wins using `updated_at` timestamps.**

- Every record has `created_at` and `updated_at` (timestamptz).
- Supabase server sets `updated_at = now()` on writes (via trigger or client).
- On conflict (same record ID modified on two devices):
  1. Compare `updated_at` timestamps.
  2. The newer timestamp wins.
  3. The older record is overwritten with the newer data.
  4. If timestamps are identical, compare `created_at`; if still equal, local change wins.

**Documented limitation**: LWW can lose concurrent offline edits. This is acceptable as an initial strategy. A CRDT or merge-based strategy can be introduced later if needed.

---

## 10. Offline-First Compatibility

| Component | Behavior |
|---|---|
| **Dexie** | Primary local store; data available immediately without network. |
| **pendingSync** | Queues all local writes until successfully pushed to Supabase. |
| **SyncService** | Flushes `pendingSync` when `navigator.onLine === true`. |
| **Realtime** | Active when online; subscriptions automatically resume on reconnect. |
| **Pull fallback** | On reconnect, queries `sync_log` for missed changes. |

---

## 11. Trip Sharing (Future Preparation)

### 11.1 Data Model
A `trip_shares` table is created (Section 4.1) but not populated in this phase.

### 11.2 Authorization Model
- Trip ownership = `trips.user_id = auth.uid()`.
- Future: `trip_shares` grants additional users SELECT/UPDATE on specific trips.
- RLS policies on `trips` will be extended to:
  ```sql
  create policy "users can read shared trips" on public.trips
    for select using (
      auth.uid() = user_id OR
      EXISTS (SELECT 1 FROM trip_shares WHERE trips.id = trip_id AND shared_with_user_id = auth.uid())
    );
  ```

### 11.3 Isolation Guarantee
Sharing Trip A with User B does **not** expose:
- User A's other trips
- User A's categories
- User A's items
- User A's settings
- User A's expenses from other trips

Only the shared trip and its direct children (participants, contributions, expenses of that trip) are visible to User B.

---

## 12. Environment Variables Required

| Variable | Purpose | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes |
| `VITE_GEOAPIFY_API_KEY` | Existing location service | Keep existing |
| `VITE_API_BASE` | Express backend proxy (retained during transition) | Temporary |

**Never** store `service_role` key in the frontend.

---

## 13. Express Backend Deprecation Policy

The existing Express server (`server/` folder) is **KEPT** during the migration. It will only be removed after explicit verification that:
- [ ] Supabase authentication works (signup, login, logout, forgot password, session restore)
- [ ] Supabase database works (all CRUD operations)
- [ ] RLS is verified with two different accounts (User A cannot see User B's data)
- [ ] Existing data functionality works (trips, expenses, categories, items)
- [ ] Offline sync works (pendingSync queue → Supabase push)
- [ ] Multi-device synchronization works (Postgres Realtime → other devices)
- [ ] Existing application features continue working (all screens, i18n, theme, Capacitor)

---

## 14. Existing Functionality Preservation

| Component | Status |
|---|---|
| React application | Preserved; auth wrapping added |
| Existing UI components | Preserved; Login/Signup updated to use Supabase |
| i18n/language system | Preserved; new auth text uses existing `useLanguage()` |
| Tamil translations | Preserved; new keys added to both `en` and `ta` |
| Dexie/offline architecture | Preserved as local cache |
| Trip functionality | Preserved; data tied to `auth.uid()` |
| Expense functionality | Preserved; data tied to `auth.uid()` |
| Categories/items | Preserved; user-owned copies after signup |
| Capacitor configuration | Preserved; `capacitor.config.json` unchanged |

---

## 15. Files to Be Changed (Phase 3)

### New Files
- `src/services/supabaseClient.js` — Supabase client initialization
- `src/contexts/AuthContext.jsx` — Auth context + provider
- `src/contexts/AuthProvider.jsx` — AuthProvider component (if separate)
- `src/pages/ForgotPassword/ForgotPassword.jsx` — Forgot password screen
- `src/pages/ForgotPassword/ForgotPassword.css` — Styling
- `src/utils/userData.js` — Copy global defaults to new user

### Modified Files
- `src/main.jsx` — Wrap app with `AuthProvider`
- `src/App.jsx` — Add auth-aware routing guard
- `src/pages/Login/Login.jsx` — Use `supabase.auth.signInWithPassword`
- `src/pages/Login/Login.css` — Add "Forgot password" link styling
- `src/pages/Signup/Signup.jsx` — Use `supabase.auth.signUp` + email verification
- `src/pages/Signup/Signup.css` — Add phone field
- `src/pages/Settings/Settings.jsx` — Add logout button + profile info
- `src/pages/Home/Home.jsx` — Use user's display name from profile
- `src/i18n/translations.js` — Add auth-related keys for EN + TA
- `src/database/db.js` — Add `userId` to Dexie store keys where needed
- `src/database/seed/seedDatabase.js` — Update to handle per-user seeding
- `src/services/syncService.js` — Push/pull via Supabase client + Realtime
- `src/database/repositories/TripRepository.js` — Accept and pass `userId`
- `src/database/repositories/ExpenseRepository.js` — Same
- `src/database/repositories/CategoryRepository.js` — Scope reads to `userId`
- `src/database/repositories/ItemRepository.js` — Same
- `src/database/repositories/ParticipantRepository.js` — Same
- `src/database/repositories/ContributionRepository.js` — Same
- `src/database/repositories/PlaceRepository.js` — Same
- `src/database/repositories/ActivityRepository.js` — Same
- `src/database/repositories/SyncRepository.js` — Same

### Server (kept during transition, later removed)
- `server/` — Retained until migration verified; auth routes deprecated

---

## 16. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Data loss during migration | Keep Dexie + Express as fallback; migrate incrementally |
| RLS misconfiguration | Test with 2 distinct accounts; verify User A cannot read User B's data |
| Realtime cost/limits | Use Realtime for frequently-changed tables; fallback to polling |
| Conflict resolution edge cases | LWW documented; monitor for data loss; add versioning if needed |
| Email deliverability | Supabase built-in email; configure custom SMTP if needed |
| Cross-user data leakage | All queries scope by `user_id`; Dexie stores user-specific records |
| Capacitor behavior | Test auth flows on iOS/Android builds after migration |
| Large dataset initial sync | Paginate initial pull; lazy-load historical data |
| Default data seeding per user | Seed on first login; idempotent checks |

---

## 17. Authentication Scope (This Phase)

**Implemented:**
- Email + password signup
- Email verification (OTP/Link)
- Login (email + password, requires verified account)
- Logout (with pending changes check)
- Forgot password
- Session restoration (Supabase JS client auto-restores from localStorage)
- User profile (profiles table)
- Protected application routes (RequireAuth)

**NOT implemented (designed for future):**
- Phone authentication (Supabase supports it; just not enabled now)
- Trip sharing UI (schema prepared; RLS extensible)
- Social login (OAuth providers)
- Passwordless email/TOTP
