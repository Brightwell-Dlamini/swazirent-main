# Ekhaya — What you must do (ops checklist)

Code is on `main`. These are **your** steps for the product to work in production.

## 1. Supabase SQL migrations

In Supabase → SQL Editor, run **in order** any migrations under `supabase/migrations/` that you have not applied yet, especially:

- Role / `user_type` constraint (landlord, broker, agent, seeker, admin)
- `phone_otps` table + `profiles.phone_verified_at`
- Listing category columns: `listing_intent`, `asset_category`, `property_subtype`, `price_period`, land fields, commercial fields

If signup fails with “Database error saving new user”, the auth trigger / `user_type` constraint is still wrong — re-run that migration.

## 2. Vercel environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Needed for OTP + admin server routes |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | For map | Mapbox public token |
| `NEXT_PUBLIC_SITE_URL` | Recommended | e.g. `https://eswaproperty.vercel.app` |
| `TWILIO_ACCOUNT_SID` | For real SMS | Leave empty = dev mode (code shown in UI) |
| `TWILIO_AUTH_TOKEN` | For real SMS | |
| `TWILIO_PHONE_NUMBER` | For real SMS | E.164 |
| `PHONE_OTP_HIDE_DEV_CODE` | Optional | Set `true` to never return `devCode` |

Redeploy after changing env vars.

## 3. PWA icons (one-time)

```bash
node scripts/generate-pwa-icons.mjs
```

Writes solid indigo `icon-192.png`, `icon-512.png`, and `icon-maskable-512.png` under `public/icons/`.  
Optional: replace with designed assets exported from `public/icons/icon.svg`.

Commit and push the PNGs, then redeploy.

**Install on phone (after deploy):**

- **Android Chrome:** site menu → “Install app” / “Add to Home screen” (or the in-app Install banner).
- **iPhone Safari:** Share → **Add to Home Screen** (iOS ignores `beforeinstallprompt`).

Service worker registers only in **production** builds.

## 4. Supabase Storage

- Bucket: `property-photos` (public read)
- Policies: authenticated users can upload under `{user_id}/…`

## 5. Admin account

Set your profile `user_type = 'admin'` in Supabase for the admin dashboard and listing approvals.

## 6. Twilio (when ready)

1. Create Twilio account, get SID + Auth Token + a number that can SMS Eswatini.
2. Add the three `TWILIO_*` vars on Vercel.
3. Redeploy — OTP dialog stops showing the yellow dev code; SMS is sent instead.

## 7. Smoke test after deploy

1. Sign up as seeker / landlord / broker  
2. Verify phone (dev code or SMS)  
3. Submit verification docs (if needed)  
4. Admin approves verification  
5. Add listing with ≥1 photo → pending  
6. Admin approves property → Search + Map  
7. WhatsApp / Call from listing page  
8. Install PWA from phone  

## Native app?

You do **not** need a separate App Store / Play Store app to launch.  
The **PWA** installs to the home screen, opens fullscreen, and caches recent pages offline.  
React Native / Flutter / Capacitor is only worth it later for mandatory native push, deep OS APIs, or store marketing — not for v1.

## Not in scope (by design)

- Short-stay / Airbnb calendar  
- Cloudflare image CDN variants (client-side compress is in place)  
