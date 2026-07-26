-- Landlord is first-class (alongside seeker, broker, agent, admin)
-- Safe to re-run

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (
    user_type IS NULL
    OR user_type IN (
      'seeker', 'landlord', 'broker', 'agent', 'admin',
      'renter' -- legacy only
    )
  );

-- Do NOT remap landlord → broker. Landlords stay landlords.
UPDATE public.profiles SET user_type = 'seeker' WHERE user_type = 'renter';

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
