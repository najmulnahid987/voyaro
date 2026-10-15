-- ============================================================================
-- Migration 05: Row Level Security (RLS) Policies on All Tables
-- Enforces strict owner-isolated access based on auth.uid()
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enable RLS on all public tables
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_budgets ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. Profiles Policies
-- Users can only read, insert, and update their own profile
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 3. Trips Policies
-- Users can only read, create, update, and delete trips they own
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own trips" ON public.trips;
CREATE POLICY "Users can insert their own trips"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trips" ON public.trips;
CREATE POLICY "Users can update their own trips"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own trips" ON public.trips;
CREATE POLICY "Users can delete their own trips"
  ON public.trips FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Itinerary Items Policies
-- Permitted only if the item's parent trip belongs to the authenticated user
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view itinerary items of their trips" ON public.itinerary_items;
CREATE POLICY "Users can view itinerary items of their trips"
  ON public.itinerary_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = itinerary_items.trip_id
      AND trips.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert itinerary items into their trips" ON public.itinerary_items;
CREATE POLICY "Users can insert itinerary items into their trips"
  ON public.itinerary_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = itinerary_items.trip_id
      AND trips.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update itinerary items of their trips" ON public.itinerary_items;
CREATE POLICY "Users can update itinerary items of their trips"
  ON public.itinerary_items FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = itinerary_items.trip_id
      AND trips.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = itinerary_items.trip_id
      AND trips.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete itinerary items of their trips" ON public.itinerary_items;
CREATE POLICY "Users can delete itinerary items of their trips"
  ON public.itinerary_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = itinerary_items.trip_id
      AND trips.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- 5. Expenses Policies
-- Permitted only if the parent trip belongs to the authenticated user
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view expenses of their trips" ON public.expenses;
CREATE POLICY "Users can view expenses of their trips"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = expenses.trip_id
      AND trips.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert expenses into their trips" ON public.expenses;
CREATE POLICY "Users can insert expenses into their trips"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = expenses.trip_id
      AND trips.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update expenses of their trips" ON public.expenses;
CREATE POLICY "Users can update expenses of their trips"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = expenses.trip_id
      AND trips.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = expenses.trip_id
      AND trips.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete expenses of their trips" ON public.expenses;
CREATE POLICY "Users can delete expenses of their trips"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = expenses.trip_id
      AND trips.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- 6. Trip Budgets Policies
-- Permitted only if the parent trip belongs to the authenticated user
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view budgets of their trips" ON public.trip_budgets;
CREATE POLICY "Users can view budgets of their trips"
  ON public.trip_budgets FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_budgets.trip_id
      AND trips.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert budgets into their trips" ON public.trip_budgets;
CREATE POLICY "Users can insert budgets into their trips"
  ON public.trip_budgets FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_budgets.trip_id
      AND trips.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update budgets of their trips" ON public.trip_budgets;
CREATE POLICY "Users can update budgets of their trips"
  ON public.trip_budgets FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_budgets.trip_id
      AND trips.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_budgets.trip_id
      AND trips.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete budgets of their trips" ON public.trip_budgets;
CREATE POLICY "Users can delete budgets of their trips"
  ON public.trip_budgets FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_budgets.trip_id
      AND trips.user_id = auth.uid()
  ));
