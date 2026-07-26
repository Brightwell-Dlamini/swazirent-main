-- Phase 2 commercial listing fields
-- Safe to re-run

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS floor_area_sqm numeric,
  ADD COLUMN IF NOT EXISTS floors integer,
  ADD COLUMN IF NOT EXISTS parking_bays integer,
  ADD COLUMN IF NOT EXISTS fit_out text,
  ADD COLUMN IF NOT EXISTS has_loading_bay boolean,
  ADD COLUMN IF NOT EXISTS has_street_frontage boolean,
  ADD COLUMN IF NOT EXISTS power_notes text;

COMMENT ON COLUMN public.properties.floor_area_sqm IS 'Commercial floor area m²';
COMMENT ON COLUMN public.properties.fit_out IS 'shell | semi | fitted';
