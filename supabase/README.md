# Supabase — Ekhaya

## If the database was wiped (empty project)

Run **one file** in **Supabase → SQL Editor**:

`migrations/20260728_full_schema_bootstrap.sql`

That creates every table, index, RLS policy, signup trigger, and the `property-photos` storage bucket.

Then:

1. Sign up once through the app (profile is created by trigger).
2. Promote yourself to admin:

```sql
UPDATE public.profiles
SET user_type = 'admin'
WHERE email = 'your@email.com';
```

3. Confirm **Storage → property-photos** exists and is public.

## Incremental migrations (already applied / optional)

If you still have an older DB and only need deltas, the older files remain:

| File | Purpose |
|------|--------|
| `20260725_ekhaya_schema_convergence.sql` | tenure, areas, reports |
| `20260725_phone_otps.sql` | OTP table |
| `20260726_fix_signup_user_types.sql` | roles + trigger |
| `20260726_landlord_first_class_role.sql` | landlord role |
| `20260726_listing_category_model.sql` | land/residential fields |
| `20260726_commercial_fields.sql` | commercial fields |
| **`20260728_full_schema_bootstrap.sql`** | **full recreate from zero** |

## Tables created by bootstrap

- `profiles`
- `properties`
- `property_photos`
- `areas`
- `reports`
- `phone_otps`
- `saved_properties`
- `search_alerts`
- `admin_activity_log`
- storage bucket `property-photos`
