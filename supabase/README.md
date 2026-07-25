# Supabase migrations — Ekhaya

## How to apply

### Option A — Supabase Dashboard (SQL Editor)
1. Open your project → **SQL Editor**
2. Paste the contents of `migrations/20260725_ekhaya_schema_convergence.sql`
3. Run

### Option B — Supabase CLI
```bash
supabase db push
# or
supabase migration up
```

## What this migration does

| Change | Why |
|--------|-----|
| `tenure_type` enum + column on `properties` | Mandatory land-tenure badge (DOC-001 FR-005) |
| `listing_type`, `size_sqm`, counters, dates | DOC-005 schema additions |
| `areas` table | Map & Discovery + area context |
| `reports` table | Trust & Safety / "Already Taken" |
| `phone_verified_at` on `profiles` | Phone OTP gate for posters |

All changes are **additive** and safe on existing data. Existing listings receive `tenure_type = 'unsure'`.

## After applying

- Add/Edit property forms can write `tenure_type` without errors.
- Tenure badges on cards and detail pages will show real values once set.
- Map, reports, and phone OTP features can be built against the new tables/columns.
