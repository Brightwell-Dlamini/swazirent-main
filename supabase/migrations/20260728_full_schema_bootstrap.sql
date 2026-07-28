-- =============================================================================
-- Ekhaya FULL SCHEMA BOOTSTRAP
-- Date: 2026-07-28
-- Purpose: Recreate all public tables, indexes, RLS, and auth trigger from scratch
-- Run once in Supabase → SQL Editor after an empty project / wiped database.
-- Safe to re-run (IF NOT EXISTS / DROP IF EXISTS patterns).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.tenure_type AS ENUM ('title_deed', 'leasehold', 'snl', 'unsure');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 1. profiles (extends auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email               text,
  full_name           text,
  phone               text,
  user_type           text NOT NULL DEFAULT 'seeker',
  is_verified         boolean NOT NULL DEFAULT false,
  verification_level  text,
  verified_by         uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  verified_at         timestamptz,
  phone_verified_at   timestamptz,
  is_banned           boolean NOT NULL DEFAULT false,
  ban_reason          text,
  avatar_url          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (
    user_type IS NULL
    OR user_type IN ('seeker', 'landlord', 'broker', 'agent', 'admin', 'renter')
  );

CREATE INDEX IF NOT EXISTS profiles_user_type_idx ON public.profiles (user_type);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);
CREATE INDEX IF NOT EXISTS profiles_is_verified_idx ON public.profiles (is_verified);
CREATE INDEX IF NOT EXISTS profiles_is_banned_idx ON public.profiles (is_banned);

-- ---------------------------------------------------------------------------
-- 2. areas (optional geo context)
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

-- ---------------------------------------------------------------------------
-- 3. properties
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id           uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,

  title                 text NOT NULL,
  description           text NOT NULL DEFAULT '',

  -- category model
  listing_intent        text,          -- sale | long_rent | short_stay
  asset_category        text,          -- residential | land | commercial
  property_subtype      text,
  property_type         text,          -- legacy
  listing_type          text,          -- buy | rent | land (legacy)

  price                 numeric NOT NULL DEFAULT 0,
  price_period          text,          -- month | year | once | night

  location_city         text NOT NULL,
  location_suburb       text NOT NULL DEFAULT '',
  location_address      text,
  area_id               uuid REFERENCES public.areas (id) ON DELETE SET NULL,
  latitude              double precision,
  longitude             double precision,
  country               text DEFAULT 'Eswatini',

  -- residential
  bedrooms              integer,
  bathrooms             numeric,
  size_sqm              numeric,
  is_furnished          boolean DEFAULT false,

  -- land
  land_size_ha          numeric,
  land_size_sqm         numeric,
  is_fenced             boolean,
  has_road_access       boolean,
  has_water             boolean,
  has_electricity       boolean,
  has_sewer             boolean,
  zoning_notes          text,

  -- commercial
  floor_area_sqm        numeric,
  floors                integer,
  parking_bays          integer,
  fit_out               text,
  has_loading_bay       boolean,
  has_street_frontage   boolean,
  power_notes           text,

  amenities             text[] DEFAULT '{}',
  lease_terms           text,
  tenure_type           public.tenure_type NOT NULL DEFAULT 'unsure',

  status                text NOT NULL DEFAULT 'pending',
  is_featured           boolean NOT NULL DEFAULT false,
  views                 integer NOT NULL DEFAULT 0,
  save_count            integer NOT NULL DEFAULT 0,
  contact_count         integer NOT NULL DEFAULT 0,
  report_count          integer NOT NULL DEFAULT 0,

  contact_phone         text NOT NULL,
  contact_whatsapp      text,

  published_at          timestamptz,
  expires_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS properties_landlord_id_idx ON public.properties (landlord_id);
CREATE INDEX IF NOT EXISTS properties_status_idx ON public.properties (status);
CREATE INDEX IF NOT EXISTS properties_city_idx ON public.properties (location_city);
CREATE INDEX IF NOT EXISTS properties_created_at_idx ON public.properties (created_at DESC);
CREATE INDEX IF NOT EXISTS properties_asset_category_idx ON public.properties (asset_category);
CREATE INDEX IF NOT EXISTS properties_listing_intent_idx ON public.properties (listing_intent);
CREATE INDEX IF NOT EXISTS properties_is_featured_idx ON public.properties (is_featured);

-- ---------------------------------------------------------------------------
-- 4. property_photos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  photo_url     text NOT NULL,
  caption       text,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_photos_property_id_idx ON public.property_photos (property_id);

-- ---------------------------------------------------------------------------
-- 5. reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  reporter_id  uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  reason       text NOT NULL,
  details      text,
  description  text,
  status       text NOT NULL DEFAULT 'pending',
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz,
  resolved_by  uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS reports_property_id_idx ON public.reports (property_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status);
CREATE INDEX IF NOT EXISTS reports_reporter_id_idx ON public.reports (reporter_id);

-- ---------------------------------------------------------------------------
-- 6. phone_otps
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  phone       text NOT NULL,
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  consumed    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_otps_user_id_idx ON public.phone_otps (user_id);
CREATE INDEX IF NOT EXISTS phone_otps_expires_idx ON public.phone_otps (expires_at);

-- ---------------------------------------------------------------------------
-- 7. saved_properties
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_properties (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  property_id  uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (renter_id, property_id)
);

CREATE INDEX IF NOT EXISTS saved_properties_renter_id_idx ON public.saved_properties (renter_id);
CREATE INDEX IF NOT EXISTS saved_properties_property_id_idx ON public.saved_properties (property_id);

-- ---------------------------------------------------------------------------
-- 8. search_alerts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name              text NOT NULL DEFAULT 'My alert',
  criteria          jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active         boolean NOT NULL DEFAULT true,
  last_notified_at  timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_alerts_renter_id_idx ON public.search_alerts (renter_id);

-- ---------------------------------------------------------------------------
-- 9. admin_activity_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action       text NOT NULL,
  target_type  text,
  target_id    uuid,
  details      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_activity_log_admin_id_idx ON public.admin_activity_log (admin_id);
CREATE INDEX IF NOT EXISTS admin_activity_log_created_at_idx ON public.admin_activity_log (created_at DESC);

-- ---------------------------------------------------------------------------
-- Auth trigger: create profile on signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_type text;
  canonical text;
BEGIN
  raw_type := lower(coalesce(new.raw_user_meta_data->>'user_type', 'seeker'));

  IF raw_type IN ('renter', 'seeker') THEN
    canonical := 'seeker';
  ELSIF raw_type = 'landlord' THEN
    canonical := 'landlord';
  ELSIF raw_type = 'broker' THEN
    canonical := 'broker';
  ELSIF raw_type = 'agent' THEN
    canonical := 'agent';
  ELSIF raw_type = 'admin' THEN
    canonical := 'admin';
  ELSE
    canonical := 'seeker';
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, phone, user_type, is_verified, created_at, updated_at
  )
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', NULL),
    canonical,
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    user_type = EXCLUDED.user_type,
    updated_at = now();

  RETURN new;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS properties_set_updated_at ON public.properties;
CREATE TRIGGER properties_set_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- properties: public can read active; owners manage own; admins full via service/role checks in app
DROP POLICY IF EXISTS "Active properties are public" ON public.properties;
CREATE POLICY "Active properties are public"
  ON public.properties FOR SELECT
  USING (
    status IN ('active', 'taken', 'rented')
    OR landlord_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can insert properties" ON public.properties;
CREATE POLICY "Owners can insert properties"
  ON public.properties FOR INSERT TO authenticated
  WITH CHECK (landlord_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update own properties" ON public.properties;
CREATE POLICY "Owners can update own properties"
  ON public.properties FOR UPDATE TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete own properties" ON public.properties;
CREATE POLICY "Owners can delete own properties"
  ON public.properties FOR DELETE TO authenticated
  USING (landlord_id = auth.uid());

-- Admin override: profiles marked admin can manage all properties/profiles
-- (app also uses service role for some ops; these policies allow client admin)
DROP POLICY IF EXISTS "Admins manage all properties" ON public.properties;
CREATE POLICY "Admins manage all properties"
  ON public.properties FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
CREATE POLICY "Admins manage all profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  );

-- property_photos
DROP POLICY IF EXISTS "Photos of visible properties are public" ON public.property_photos;
CREATE POLICY "Photos of visible properties are public"
  ON public.property_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties pr
      WHERE pr.id = property_id
        AND (
          pr.status IN ('active', 'taken', 'rented')
          OR pr.landlord_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Owners manage property photos" ON public.property_photos;
CREATE POLICY "Owners manage property photos"
  ON public.property_photos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties pr
      WHERE pr.id = property_id AND pr.landlord_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties pr
      WHERE pr.id = property_id AND pr.landlord_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  );

-- areas public read
DROP POLICY IF EXISTS "Areas are publicly readable" ON public.areas;
CREATE POLICY "Areas are publicly readable"
  ON public.areas FOR SELECT USING (true);

-- reports
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
CREATE POLICY "Authenticated users can create reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id OR reporter_id IS NULL);

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (
    auth.uid() = reporter_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins update reports" ON public.reports;
CREATE POLICY "Admins update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  );

-- phone_otps: no public policies (API / service role only)

-- saved_properties
DROP POLICY IF EXISTS "Users manage own saves" ON public.saved_properties;
CREATE POLICY "Users manage own saves"
  ON public.saved_properties FOR ALL TO authenticated
  USING (renter_id = auth.uid())
  WITH CHECK (renter_id = auth.uid());

-- search_alerts
DROP POLICY IF EXISTS "Users manage own alerts" ON public.search_alerts;
CREATE POLICY "Users manage own alerts"
  ON public.search_alerts FOR ALL TO authenticated
  USING (renter_id = auth.uid())
  WITH CHECK (renter_id = auth.uid());

-- admin activity
DROP POLICY IF EXISTS "Admins read activity log" ON public.admin_activity_log;
CREATE POLICY "Admins read activity log"
  ON public.admin_activity_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins insert activity log" ON public.admin_activity_log;
CREATE POLICY "Admins insert activity log"
  ON public.admin_activity_log FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket for listing photos (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read property photos" ON storage.objects;
CREATE POLICY "Public read property photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-photos');

DROP POLICY IF EXISTS "Auth upload property photos" ON storage.objects;
CREATE POLICY "Auth upload property photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Auth update own property photos" ON storage.objects;
CREATE POLICY "Auth update own property photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'property-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Auth delete own property photos" ON storage.objects;
CREATE POLICY "Auth delete own property photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- DONE
-- After running:
-- 1. Sign up a user via the app (creates profile via trigger)
-- 2. Promote yourself to admin:
--      UPDATE public.profiles SET user_type = 'admin' WHERE email = 'you@example.com';
-- 3. Confirm storage bucket property-photos exists under Storage
-- =============================================================================
