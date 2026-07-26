-- =============================================================================
-- FIX: "Database error saving new user" on signup
-- Date: 2026-07-26
--
-- Cause: profiles.user_type (or a trigger inserting into profiles) only allowed
--        legacy values 'renter' | 'landlord'. App now sends seeker | broker | agent.
--        Auth insert → trigger fails → Supabase returns that error message.
--
-- Run this in Supabase → SQL Editor → Run (safe to re-run).
-- =============================================================================

-- 1) Widen user_type check constraint (drop any existing check on user_type)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'profiles'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%user_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Allow canonical + legacy values
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (
    user_type IS NULL
    OR user_type IN (
      'seeker', 'broker', 'agent', 'admin',
      'renter', 'landlord'  -- legacy
    )
  );

-- Sensible default for new rows if column has no default
ALTER TABLE public.profiles
  ALTER COLUMN user_type SET DEFAULT 'seeker';

-- 2) Replace handle_new_user trigger function (name may vary; cover common ones)
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

  -- Map legacy + new personas
  IF raw_type IN ('renter', 'seeker') THEN
    canonical := 'seeker';
  ELSIF raw_type IN ('landlord', 'broker') THEN
    canonical := 'broker';
  ELSIF raw_type = 'agent' THEN
    canonical := 'agent';
  ELSIF raw_type = 'admin' THEN
    canonical := 'admin';
  ELSE
    canonical := 'seeker';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    user_type,
    is_verified,
    created_at,
    updated_at
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
    -- Never block auth.users insert; log and continue
    RAISE WARNING 'handle_new_user failed: %', SQLERRM;
    RETURN new;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Alternate name used by some projects
CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.handle_new_user();
END;
$$;

-- 3) Optional legacy role labels in existing profiles (optional, non-destructive intent)
UPDATE public.profiles SET user_type = 'seeker'  WHERE user_type = 'renter';
UPDATE public.profiles SET user_type = 'broker'  WHERE user_type = 'landlord';

COMMENT ON COLUMN public.profiles.user_type IS
  'Ekhaya roles: seeker | broker | agent | admin. Legacy renter/landlord still accepted by CHECK.';
