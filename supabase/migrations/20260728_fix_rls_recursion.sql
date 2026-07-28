-- =============================================================================
-- FIX: infinite recursion in profiles RLS + restore role/load behavior
-- Run this NOW in Supabase → SQL Editor
-- =============================================================================
-- Cause: policies on public.profiles that SELECT from public.profiles
-- (admin checks) trigger "infinite recursion detected in policy".
-- Result: profile reads fail → app falls back to seeker; joins/favorites break.
-- =============================================================================

-- 1) Security-definer helper (bypasses RLS when checking admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND user_type = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_type()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_type FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2) Drop recursive / conflicting policies on profiles
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 3) Clean profiles policies (no self-reference)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin());

-- 4) Properties: drop recursive admin policy; recreate safely
DROP POLICY IF EXISTS "Admins manage all properties" ON public.properties;
DROP POLICY IF EXISTS "Active properties are public" ON public.properties;
DROP POLICY IF EXISTS "Owners can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can delete own properties" ON public.properties;

-- Anyone can read listable statuses; owners see all their rows; admins see all
CREATE POLICY "Properties readable"
  ON public.properties FOR SELECT
  USING (
    status IN ('active', 'taken', 'rented')
    OR landlord_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Owners can insert properties"
  ON public.properties FOR INSERT TO authenticated
  WITH CHECK (landlord_id = auth.uid() OR public.is_admin());

CREATE POLICY "Owners or admins update properties"
  ON public.properties FOR UPDATE TO authenticated
  USING (landlord_id = auth.uid() OR public.is_admin())
  WITH CHECK (landlord_id = auth.uid() OR public.is_admin());

CREATE POLICY "Owners or admins delete properties"
  ON public.properties FOR DELETE TO authenticated
  USING (landlord_id = auth.uid() OR public.is_admin());

-- 5) Photos: admin via is_admin()
DROP POLICY IF EXISTS "Owners manage property photos" ON public.property_photos;
DROP POLICY IF EXISTS "Photos of visible properties are public" ON public.property_photos;

CREATE POLICY "Photos readable"
  ON public.property_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties pr
      WHERE pr.id = property_id
        AND (
          pr.status IN ('active', 'taken', 'rented')
          OR pr.landlord_id = auth.uid()
          OR public.is_admin()
        )
    )
  );

CREATE POLICY "Owners or admins manage photos"
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

-- 6) Reports / activity — admin via is_admin()
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins update reports" ON public.reports;

CREATE POLICY "Users or admins view reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.is_admin());

CREATE POLICY "Admins update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read activity log" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Admins insert activity log" ON public.admin_activity_log;

CREATE POLICY "Admins read activity log"
  ON public.admin_activity_log FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins insert activity log"
  ON public.admin_activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- 7) Ensure signup trigger still maps roles correctly (incl. after email confirm)
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
    -- Only overwrite role if still default seeker OR incoming is more specific
    user_type = CASE
      WHEN public.profiles.user_type IS NULL OR public.profiles.user_type = 'seeker'
        THEN EXCLUDED.user_type
      ELSE public.profiles.user_type
    END,
    updated_at = now();

  RETURN new;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN new;
END;
$$;

-- =============================================================================
-- After running: hard-refresh the site (or clear site data) so auth profile cache resets.
-- Fix any existing wrong roles manually if needed:
--   UPDATE public.profiles SET user_type = 'landlord' WHERE email = 'you@example.com';
--   UPDATE public.profiles SET user_type = 'admin' WHERE email = 'admin@example.com';
-- =============================================================================
