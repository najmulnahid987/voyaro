-- ============================================================================
-- Voyaro Consolidated Database Schema & RLS Policies (Phases 7 & 8)
-- Tables: profiles, trips, trip_members, trip_invitations, itinerary_items, expenses, trip_budgets
-- Row Level Security (RLS) enabled on all tables
-- Safe trigger execution with search_path = public
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Automated Timestamp Trigger Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Profiles Table & Trigger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  travel_style TEXT CHECK (travel_style IS NULL OR travel_style IN ('solo', 'couple', 'family', 'friends', 'business')),
  interests TEXT[] NOT NULL DEFAULT '{}',
  travel_pace TEXT CHECK (travel_pace IS NULL OR travel_pace IN ('relaxed', 'balanced', 'packed')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to securely auto-create profile on Supabase auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.email, ''),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. Trips Table & Indexes
-- ----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON public.trips(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_trips_user_status ON public.trips(user_id, status);

CREATE OR REPLACE TRIGGER set_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Trip Members Table & Triggers (Phase 8 Collaboration)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_trip_member UNIQUE (trip_id, user_id)
);

-- Exactly one owner per trip constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_trip_owner 
  ON public.trip_members (trip_id) 
  WHERE role = 'owner';

CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON public.trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON public.trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_role ON public.trip_members(trip_id, role);

CREATE OR REPLACE TRIGGER set_trip_members_updated_at
  BEFORE UPDATE ON public.trip_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger function: auto-insert owner into trip_members on trip creation
CREATE OR REPLACE FUNCTION public.handle_new_trip_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, role, created_at, updated_at)
  VALUES (NEW.id, NEW.user_id, 'owner', NOW(), NOW())
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_trip_created_add_owner ON public.trips;
CREATE TRIGGER on_trip_created_add_owner
  AFTER INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_trip_owner();

-- ----------------------------------------------------------------------------
-- 5. Trip Invitations Table & Indexes (Phase 8 Collaboration)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'canceled', 'revoked', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT invitation_email_lowercase CHECK (invitee_email = lower(trim(invitee_email)))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_trip_invitation 
  ON public.trip_invitations (trip_id, invitee_email) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id ON public.trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_token ON public.trip_invitations(token);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_email ON public.trip_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_status ON public.trip_invitations(trip_id, status);

-- ----------------------------------------------------------------------------
-- 6. Itinerary Items Table & Indexes
-- ----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_itinerary_trip_id ON public.itinerary_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_trip_start_datetime ON public.itinerary_items(trip_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_itinerary_trip_type ON public.itinerary_items(trip_id, type);
CREATE INDEX IF NOT EXISTS idx_itinerary_metadata_gin ON public.itinerary_items USING GIN (metadata);

CREATE OR REPLACE TRIGGER set_itinerary_updated_at
  BEFORE UPDATE ON public.itinerary_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 7. Expenses Table & Indexes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  category TEXT NOT NULL,
  expense_date DATE NOT NULL,
  paid_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT expenses_amount_positive CHECK (amount >= 0),
  CONSTRAINT expenses_currency_check CHECK (currency IN ('USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD')),
  CONSTRAINT expenses_category_check CHECK (category IN (
    'accommodation', 'transportation', 'food_drinks', 'activities', 'shopping', 'flights', 'other'
  ))
);

CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_date ON public.expenses(trip_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_currency ON public.expenses(trip_id, currency);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_category ON public.expenses(trip_id, category);

CREATE OR REPLACE TRIGGER set_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 8. Trip Budgets Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_budgets (
  trip_id UUID PRIMARY KEY REFERENCES public.trips(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT budget_amount_positive CHECK (amount >= 0),
  CONSTRAINT budget_currency_check CHECK (currency IN ('USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD'))
);

CREATE OR REPLACE TRIGGER set_trip_budgets_updated_at
  BEFORE UPDATE ON public.trip_budgets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 9. Helper Functions (Non-Recursive SECURITY DEFINER)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_trip_member(lookup_trip_id UUID, lookup_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = lookup_trip_id AND user_id = lookup_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_trip_member_role(lookup_trip_id UUID, lookup_user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.trip_members
  WHERE trip_id = lookup_trip_id AND user_id = lookup_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_trip_owner(lookup_trip_id UUID, lookup_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = lookup_trip_id AND user_id = lookup_user_id AND role = 'owner'
  );
$$;

-- ----------------------------------------------------------------------------
-- 10. Atomic Invitation Acceptance RPC Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_trip_invitation(invitation_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT := lower(trim(auth.jwt()->>'email'));
  v_invite RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- 1. Fetch valid pending invitation
  SELECT * INTO v_invite
  FROM public.trip_invitations
  WHERE token = invitation_token
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invitation or it has already been processed.');
  END IF;

  IF v_invite.expires_at <= NOW() THEN
    UPDATE public.trip_invitations SET status = 'expired' WHERE id = v_invite.id;
    RETURN jsonb_build_object('success', false, 'error', 'This invitation has expired.');
  END IF;

  -- 2. Verify invitee email matches authenticated account
  IF v_user_email IS NULL OR v_invite.invitee_email <> v_user_email THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This invitation was issued to ' || v_invite.invitee_email || ', but you are signed in as ' || COALESCE(v_user_email, 'unknown') || '.'
    );
  END IF;

  -- 3. Upsert into trip_members
  INSERT INTO public.trip_members (trip_id, user_id, role, created_at, updated_at)
  VALUES (v_invite.trip_id, v_user_id, v_invite.role, NOW(), NOW())
  ON CONFLICT (trip_id, user_id) DO UPDATE
    SET role = v_invite.role, updated_at = NOW();

  -- 4. Mark invitation accepted
  UPDATE public.trip_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = v_user_id
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'trip_id', v_invite.trip_id,
    'role', v_invite.role
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_trip_invitation(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_trip_invitation(TEXT) TO authenticated;

-- ============================================================================
-- 11. Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_budgets ENABLE ROW LEVEL SECURITY;

-- ── 11.1 Profiles Policies ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile and co-traveler profiles" ON public.profiles;
CREATE POLICY "Users can view own profile and co-traveler profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.trip_members m1
      JOIN public.trip_members m2 ON m1.trip_id = m2.trip_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
    )
  );

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

-- ── 11.2 Trips Policies ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view trips they own or belong to as member" ON public.trips;
CREATE POLICY "Users can view trips they own or belong to as member"
  ON public.trips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_trip_member(id, auth.uid()));

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

-- ── 11.3 Itinerary Items Policies ───────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view itinerary items of their trips" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can view itinerary items" ON public.itinerary_items;
CREATE POLICY "Members can view itinerary items"
  ON public.itinerary_items FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert itinerary items into their trips" ON public.itinerary_items;
DROP POLICY IF EXISTS "Owners and editors can insert itinerary items" ON public.itinerary_items;
CREATE POLICY "Owners and editors can insert itinerary items"
  ON public.itinerary_items FOR INSERT
  TO authenticated
  WITH CHECK (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'));

DROP POLICY IF EXISTS "Users can update itinerary items of their trips" ON public.itinerary_items;
DROP POLICY IF EXISTS "Owners and editors can update itinerary items" ON public.itinerary_items;
CREATE POLICY "Owners and editors can update itinerary items"
  ON public.itinerary_items FOR UPDATE
  TO authenticated
  USING (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'))
  WITH CHECK (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'));

DROP POLICY IF EXISTS "Users can delete itinerary items of their trips" ON public.itinerary_items;
DROP POLICY IF EXISTS "Owners and editors can delete itinerary items" ON public.itinerary_items;
CREATE POLICY "Owners and editors can delete itinerary items"
  ON public.itinerary_items FOR DELETE
  TO authenticated
  USING (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'));

-- ── 11.4 Expenses Policies ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view expenses of their trips" ON public.expenses;
DROP POLICY IF EXISTS "Members can view trip expenses" ON public.expenses;
CREATE POLICY "Members can view trip expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert expenses into their trips" ON public.expenses;
DROP POLICY IF EXISTS "Owners and editors can insert expenses" ON public.expenses;
CREATE POLICY "Owners and editors can insert expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'));

DROP POLICY IF EXISTS "Users can update expenses of their trips" ON public.expenses;
DROP POLICY IF EXISTS "Owners and editors can update expenses" ON public.expenses;
CREATE POLICY "Owners and editors can update expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'))
  WITH CHECK (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'));

DROP POLICY IF EXISTS "Users can delete expenses of their trips" ON public.expenses;
DROP POLICY IF EXISTS "Owners and editors can delete expenses" ON public.expenses;
CREATE POLICY "Owners and editors can delete expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'));

-- ── 11.5 Trip Budgets Policies ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view budgets of their trips" ON public.trip_budgets;
DROP POLICY IF EXISTS "Members can view trip budgets" ON public.trip_budgets;
CREATE POLICY "Members can view trip budgets"
  ON public.trip_budgets FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

DROP POLICY IF EXISTS "Users can insert budgets into their trips" ON public.trip_budgets;
DROP POLICY IF EXISTS "Only trip owner can insert budgets" ON public.trip_budgets;
CREATE POLICY "Only trip owner can insert budgets"
  ON public.trip_budgets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

DROP POLICY IF EXISTS "Users can update budgets of their trips" ON public.trip_budgets;
DROP POLICY IF EXISTS "Only trip owner can update budgets" ON public.trip_budgets;
CREATE POLICY "Only trip owner can update budgets"
  ON public.trip_budgets FOR UPDATE
  TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid()))
  WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

DROP POLICY IF EXISTS "Users can delete budgets of their trips" ON public.trip_budgets;
DROP POLICY IF EXISTS "Only trip owner can delete budgets" ON public.trip_budgets;
CREATE POLICY "Only trip owner can delete budgets"
  ON public.trip_budgets FOR DELETE
  TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid()));

-- ── 11.6 Trip Members Policies ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Members can view co-travelers of their trips" ON public.trip_members;
CREATE POLICY "Members can view co-travelers of their trips"
  ON public.trip_members FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

DROP POLICY IF EXISTS "Only trip owners can add members directly" ON public.trip_members;
CREATE POLICY "Only trip owners can add members directly"
  ON public.trip_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

DROP POLICY IF EXISTS "Only trip owners can update member roles" ON public.trip_members;
CREATE POLICY "Only trip owners can update member roles"
  ON public.trip_members FOR UPDATE
  TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid()))
  WITH CHECK (
    public.is_trip_owner(trip_id, auth.uid())
    AND role IN ('editor', 'viewer')
  );

DROP POLICY IF EXISTS "Owners can remove members or members can leave trip" ON public.trip_members;
CREATE POLICY "Owners can remove members or members can leave trip"
  ON public.trip_members FOR DELETE
  TO authenticated
  USING (
    (public.is_trip_owner(trip_id, auth.uid()) AND role <> 'owner')
    OR (auth.uid() = user_id AND role <> 'owner')
  );

-- ── 11.7 Trip Invitations Policies ──────────────────────────────────────────
DROP POLICY IF EXISTS "Members and invitees can view invitations" ON public.trip_invitations;
CREATE POLICY "Members and invitees can view invitations"
  ON public.trip_invitations FOR SELECT
  TO authenticated
  USING (
    public.is_trip_member(trip_id, auth.uid())
    OR lower(invitee_email) = lower(trim(auth.jwt()->>'email'))
  );

DROP POLICY IF EXISTS "Only owners can create invitations" ON public.trip_invitations;
CREATE POLICY "Only owners can create invitations"
  ON public.trip_invitations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

DROP POLICY IF EXISTS "Owners and invitees can update invitations" ON public.trip_invitations;
CREATE POLICY "Owners and invitees can update invitations"
  ON public.trip_invitations FOR UPDATE
  TO authenticated
  USING (
    public.is_trip_owner(trip_id, auth.uid())
    OR lower(invitee_email) = lower(trim(auth.jwt()->>'email'))
  )
  WITH CHECK (
    public.is_trip_owner(trip_id, auth.uid())
    OR lower(invitee_email) = lower(trim(auth.jwt()->>'email'))
  );

DROP POLICY IF EXISTS "Only owners can delete invitations" ON public.trip_invitations;
CREATE POLICY "Only owners can delete invitations"
  ON public.trip_invitations FOR DELETE
  TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid()));
