-- ============================================================================
-- Migration 03: Itinerary Items Table, Constraints, GIN Indexes & Triggers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  location TEXT,
  notes TEXT,
  confirmation_number TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT itinerary_type_check CHECK (type IN ('flight', 'hotel', 'activity', 'transportation')),
  CONSTRAINT itinerary_datetime_order CHECK (end_datetime IS NULL OR end_datetime >= start_datetime)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_itinerary_trip_id ON public.itinerary_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_trip_start_datetime ON public.itinerary_items(trip_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_itinerary_trip_type ON public.itinerary_items(trip_id, type);
CREATE INDEX IF NOT EXISTS idx_itinerary_metadata_gin ON public.itinerary_items USING GIN (metadata);

-- Trigger for automated updated_at timestamps
CREATE OR REPLACE TRIGGER set_itinerary_updated_at
  BEFORE UPDATE ON public.itinerary_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
