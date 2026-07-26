-- =============================================================================
-- FIX: signup roles + landlord first-class
-- Run in Supabase → SQL Editor (safe to re-run).
-- =============================================================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'profiles'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%user_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (
    user_type IS NULL
    OR user_type IN ('seeker', 'landlord', 'broker', 'agent', 'admin', 'renter')
  );

ALTER TABLE public.profiles ALTER COLUMN user_type SET DEFAULT 'seeker';

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

  INSERT INTO public.profiles (id, email, full_name, phone, user_type, is_verified, created_at, updated_at)
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

UPDATE public.profiles SET user_type = 'seeker' WHERE user_type = 'renter';
