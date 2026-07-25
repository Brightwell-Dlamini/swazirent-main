-- Phone OTP codes table (DOC-001 mandatory SMS verification before posting)
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

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

-- Only service role / API should read/write; no public policies
