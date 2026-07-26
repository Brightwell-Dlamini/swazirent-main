# Supabase migrations — Ekhaya

## CRITICAL (signup broken without this)

If signup shows **"Database error saving new user"**, run this first in
**Supabase → SQL Editor**:

`migrations/20260726_fix_signup_user_types.sql`

That widens `profiles.user_type` and fixes the `handle_new_user` trigger so
`seeker` / `broker` / `agent` are accepted.

## How to apply any migration

### Option A — Supabase Dashboard (SQL Editor)
1. Open your project → **SQL Editor**
2. Paste the file contents
3. Run

### Option B — Supabase CLI
```bash
supabase db push
```

## Migration order

1. `20260725_ekhaya_schema_convergence.sql` — tenure, areas, reports, phone_verified_at
2. `20260725_phone_otps.sql` — OTP table
3. `20260726_fix_signup_user_types.sql` — **signup fix (roles + trigger)**

## What each does

| File | Purpose |
|------|--------|
| schema convergence | tenure, areas, reports, phone_verified_at |
| phone_otps | SMS OTP storage |
| fix_signup_user_types | Allow seeker/broker/agent; safe handle_new_user |
