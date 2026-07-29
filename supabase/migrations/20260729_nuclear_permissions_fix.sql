-- =============================================================================
-- NUCLEAR FIX: grants + RLS (run entire file in Supabase SQL Editor)
-- Fixes: cannot load tables, cannot verify phone, admin role stuck, empty app
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Schema + table privileges (very common after wipe)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- App roles
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

-- Explicit per-table (belt and suspenders)
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

GRANT SELECT ON public.properties TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.properties TO authenticated;

GRANT SELECT ON public.property_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.property_photos TO authenticated;

GRANT SELECT ON public.areas TO anon, authenticated;
GRANT SELECT ON public.reports TO authenticated;
GRANT INSERT, UPDATE ON public.reports TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_alerts TO authenticated;
GRANT SELECT, INSERT ON public.admin_activity_log TO authenticated;

-- phone_otps: service role only (API uses service key)
REVOKE ALL ON public.phone_otps FROM anon, authenticated;
GRANT ALL ON public.phone_otps TO service_role, postgres;

-- ---------------------------------------------------------------------------
-- B) Admin helper (SECURITY DEFINER — never query profiles from profiles RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- C) Drop EVERY policy on our tables (clean slate)
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'properties', 'property_photos', 'areas', 'reports',
        'phone_otps', 'saved_properties', 'search_alerts', 'admin_activity_log'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- D) Enable RLS
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

-- ---------------------------------------------------------------------------
-- E) Simple, non-recursive policies
-- ---------------------------------------------------------------------------

-- PROFILES
CREATE POLICY profiles_select_all
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY profiles_insert_own
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own_or_admin
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY profiles_delete_admin
  ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin());

-- PROPERTIES
CREATE POLICY properties_select
  ON public.properties FOR SELECT
  USING (
    status IN ('active', 'taken', 'rented', 'pending', 'paused', 'draft', 'rejected')
    OR landlord_id = auth.uid()
    OR public.is_admin()
  );

-- Note: public can see pending etc above so search never looks "empty" during launch;
-- tighten later to active-only if you prefer.

CREATE POLICY properties_insert
  ON public.properties FOR INSERT TO authenticated
  WITH CHECK (landlord_id = auth.uid() OR public.is_admin());

CREATE POLICY properties_update
  ON public.properties FOR UPDATE TO authenticated
  USING (landlord_id = auth.uid() OR public.is_admin())
  WITH CHECK (landlord_id = auth.uid() OR public.is_admin());

CREATE POLICY properties_delete
  ON public.properties FOR DELETE TO authenticated
  USING (landlord_id = auth.uid() OR public.is_admin());

-- PHOTOS
CREATE POLICY photos_select
  ON public.property_photos FOR SELECT
  USING (true);

CREATE POLICY photos_write
  ON public.property_photos FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.properties pr
      WHERE pr.id = property_id AND pr.landlord_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.properties pr
      WHERE pr.id = property_id AND pr.landlord_id = auth.uid()
    )
  );

-- AREAS
CREATE POLICY areas_select ON public.areas FOR SELECT USING (true);

-- REPORTS
CREATE POLICY reports_insert
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() OR reporter_id IS NULL);

CREATE POLICY reports_select
  ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin());

CREATE POLICY reports_update
  ON public.reports FOR UPDATE TO authenticated
  USING (public.is_admin());

-- SAVED + ALERTS
CREATE POLICY saved_own
  ON public.saved_properties FOR ALL TO authenticated
  USING (renter_id = auth.uid())
  WITH CHECK (renter_id = auth.uid());

CREATE POLICY alerts_own
  ON public.search_alerts FOR ALL TO authenticated
  USING (renter_id = auth.uid())
  WITH CHECK (renter_id = auth.uid());

-- ADMIN LOG
CREATE POLICY activity_select
  ON public.admin_activity_log FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY activity_insert
  ON public.admin_activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- phone_otps: no policies for anon/authenticated → only service_role (bypasses RLS)

-- ---------------------------------------------------------------------------
-- F) Signup trigger: never clobber admin / landlord once set
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
    user_type = CASE
      WHEN public.profiles.user_type IN ('admin', 'landlord', 'broker', 'agent')
        THEN public.profiles.user_type
      ELSE EXCLUDED.user_type
    END,
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
-- G) Storage grants (photos)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old storage policies for this bucket name pattern
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    -- only drop our known names; skip if none
    NULL;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Public read property photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload property photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth update own property photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete own property photos" ON storage.objects;

CREATE POLICY "Public read property photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-photos');

CREATE POLICY "Auth upload property photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Auth update own property photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Auth delete own property photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- AFTER THIS SCRIPT:
-- 1) Vercel env: SUPABASE_SERVICE_ROLE_KEY must be set (Settings → API → service_role)
--    Phone OTP will fail without it (phone_otps is locked to service role).
-- 2) Set admin once:
--      UPDATE public.profiles SET user_type = 'admin' WHERE email = 'you@email.com';
-- 3) Browser: clear site data for your Vercel domain, then log in again.
-- =============================================================================
