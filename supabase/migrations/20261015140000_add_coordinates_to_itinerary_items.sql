-- ============================================================================
-- Migration: Add Geographic Coordinates to Itinerary Items (Phase 9 — Step 2)
--
-- Adds nullable geographic coordinates to public.itinerary_items:
--  - latitude & longitude: Origin / primary coordinates (hotel/activity venue, departure point)
--  - end_latitude & end_longitude: Destination coordinates for transit items (flights, transportation)
--
-- Preserves 100% of existing records (all new columns are NULLable by default).
-- Enforces standard WGS84 coordinate bounds:
--  - Latitude: [-90.0, 90.0]
--  - Longitude: [-180.0, 180.0]
-- ============================================================================

ALTER TABLE public.itinerary_items
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS end_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS end_longitude DOUBLE PRECISION;

-- Range validation constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'itinerary_latitude_range'
  ) THEN
    ALTER TABLE public.itinerary_items
      ADD CONSTRAINT itinerary_latitude_range
      CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'itinerary_longitude_range'
  ) THEN
    ALTER TABLE public.itinerary_items
      ADD CONSTRAINT itinerary_longitude_range
      CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'itinerary_end_latitude_range'
  ) THEN
    ALTER TABLE public.itinerary_items
      ADD CONSTRAINT itinerary_end_latitude_range
      CHECK (end_latitude IS NULL OR (end_latitude >= -90.0 AND end_latitude <= 90.0));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'itinerary_end_longitude_range'
  ) THEN
    ALTER TABLE public.itinerary_items
      ADD CONSTRAINT itinerary_end_longitude_range
      CHECK (end_longitude IS NULL OR (end_longitude >= -180.0 AND end_longitude <= 180.0));
  END IF;
END $$;

-- Spatial query performance indexes (sparse index only indexing non-null coordinates)
CREATE INDEX IF NOT EXISTS idx_itinerary_coordinates 
  ON public.itinerary_items(latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_itinerary_end_coordinates 
  ON public.itinerary_items(end_latitude, end_longitude) 
  WHERE end_latitude IS NOT NULL AND end_longitude IS NOT NULL;
