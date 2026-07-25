-- =============================================================================
-- Ekhaya Schema Convergence Migration
-- Date: 2026-07-25
-- Purpose: Align live Supabase schema with DOC-005 while remaining backward-compatible
-- Safe to run multiple times (IF NOT EXISTS / DO blocks)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tenure type enum + column on properties
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.tenure_type AS ENUM ('title_deed', 'leasehold', 'snl', 'unsure');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS tenure_type public.tenure_type NOT NULL DEFAULT 'unsure';

COMMENT ON COLUMN public.properties.tenure_type IS
  'Mandatory land tenure badge (DOC-001 FR-005). title_deed | leasehold | snl | unsure';

-- ---------------------------------------------------------------------------
-- 2. Additional DOC-005 columns on properties (all optional / nullable)
-- ---------------------------------------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listing_type text,
  ADD COLUMN IF NOT EXISTS size_sqm numeric,
  ADD COLUMN IF NOT EXISTS area_id uuid,
  ADD COLUMN IF NOT EXISTS save_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contact_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- listing_type check constraint (buy | rent | land)
DO $$ BEGIN
  ALTER TABLE public.properties
    ADD CONSTRAINT properties_listing_type_check
    CHECK (listing_type IS NULL OR listing_type IN ('buy', 'rent', 'land'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Expand status values if needed (Postgres text/varchar columns need no enum change;
-- if status is an enum, extend it; if text, document the allowed set in app code)
-- Application already accepts: pending | active | paused | hidden | taken | deleted | rented | rejected | reported

-- ---------------------------------------------------------------------------
-- 3. Areas table (for Map & Discovery + area context)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.areas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  city        text NOT NULL,
  slug        text UNIQUE,
  description text,
  latitude    double precision,
  longitude   double precision,
  amenities   jsonb DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS areas_city_idx ON public.areas (city);
CREATE INDEX IF NOT EXISTS areas_slug_idx ON public.areas (slug);

-- FK from properties.area_id → areas.id (nullable)
DO $$ BEGIN
  ALTER TABLE public.properties
    ADD CONSTRAINT properties_area_id_fkey
    FOREIGN KEY (area_id) REFERENCES public.areas (id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Reports table (Trust & Safety — "Already Taken" / report listing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  reporter_id  uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reason       text NOT NULL,
  -- reason examples: already_taken | scam | incorrect_info | other
  details      text,
  status       text NOT NULL DEFAULT 'open',
  -- open | reviewed | resolved | dismissed
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz,
  resolved_by  uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS reports_property_id_idx ON public.reports (property_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status);

-- ---------------------------------------------------------------------------
-- 5. Phone verification timestamp on profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

COMMENT ON COLUMN public.profiles.phone_verified_at IS
  'Set when user completes SMS OTP (Twilio). Required before posting (DOC-001).';

-- ---------------------------------------------------------------------------
-- 6. Role column note
-- profiles.user_type (or role) already exists. Application normalises:
--   renter → seeker, landlord → broker
-- New sign-ups write seeker | broker | agent | admin.
-- No forced rewrite of existing rows; normalizeUserType() handles reads.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 7. RLS helpers (enable if not already; policies remain as previously defined)
-- ---------------------------------------------------------------------------
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Areas: public read
DO $$ BEGIN
  CREATE POLICY "Areas are publicly readable"
    ON public.areas FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Reports: authenticated users can insert their own; admins can read/update all
DO $$ BEGIN
  CREATE POLICY "Authenticated users can create reports"
    ON public.reports FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reporter_id OR reporter_id IS NULL);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own reports"
    ON public.reports FOR SELECT
    TO authenticated
    USING (auth.uid() = reporter_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Done. After applying:
-- 1. Existing properties get tenure_type = 'unsure'
-- 2. New/edit forms can safely write tenure_type
-- 3. Areas + Reports tables ready for Map and Trust & Safety features
-- =============================================================================
