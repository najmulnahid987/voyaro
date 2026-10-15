-- ============================================================================
-- Migration 02: Trips Table, Constraints, Indexes & Triggers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  cities TEXT[] NOT NULL DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  traveler_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'upcoming',
  category TEXT,
  cover_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trips_date_order CHECK (end_date >= start_date),
  CONSTRAINT trips_traveler_count CHECK (traveler_count >= 1),
  CONSTRAINT trips_status_check CHECK (status IN ('ongoing', 'upcoming', 'past', 'current')),
  CONSTRAINT trips_category_check CHECK (category IS NULL OR category IN ('flight', 'landscape', 'beach', 'city'))
);

-- Performance & Ownership Indexes
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON public.trips(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_trips_user_status ON public.trips(user_id, status);

-- Trigger for automated updated_at timestamps
CREATE OR REPLACE TRIGGER set_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
