-- =============================================================================
-- Listing model: residential + land (MVP)
-- listing_intent, asset_category, property_subtype, land fields, price_period
-- Safe to re-run.
-- =============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listing_intent text,
  ADD COLUMN IF NOT EXISTS asset_category text,
  ADD COLUMN IF NOT EXISTS property_subtype text,
  ADD COLUMN IF NOT EXISTS price_period text,
  ADD COLUMN IF NOT EXISTS land_size_ha numeric,
  ADD COLUMN IF NOT EXISTS land_size_sqm numeric,
  ADD COLUMN IF NOT EXISTS is_fenced boolean,
  ADD COLUMN IF NOT EXISTS has_road_access boolean,
  ADD COLUMN IF NOT EXISTS has_water boolean,
  ADD COLUMN IF NOT EXISTS has_electricity boolean,
  ADD COLUMN IF NOT EXISTS has_sewer boolean,
  ADD COLUMN IF NOT EXISTS zoning_notes text;

-- Backfill residential defaults from legacy rows
UPDATE public.properties
SET
  asset_category = COALESCE(asset_category, 'residential'),
  listing_intent = COALESCE(
    listing_intent,
    CASE
      WHEN listing_type = 'buy' OR price_period = 'once' THEN 'sale'
      WHEN listing_type = 'land' THEN 'sale'
      ELSE 'long_rent'
    END
  ),
  price_period = COALESCE(
    price_period,
    CASE
      WHEN listing_type = 'buy' THEN 'once'
      ELSE 'month'
    END
  )
WHERE asset_category IS NULL OR listing_intent IS NULL;

-- Mark explicit land rows
UPDATE public.properties
SET asset_category = 'land',
    listing_intent = COALESCE(listing_intent, 'sale'),
    price_period = COALESCE(price_period, 'once')
WHERE property_type = 'land'
   OR listing_type = 'land';

COMMENT ON COLUMN public.properties.listing_intent IS 'sale | long_rent | short_stay';
COMMENT ON COLUMN public.properties.asset_category IS 'residential | land | commercial';
COMMENT ON COLUMN public.properties.property_subtype IS 'house, apartment, residential_plot, etc.';
COMMENT ON COLUMN public.properties.land_size_ha IS 'Land size in hectares';
