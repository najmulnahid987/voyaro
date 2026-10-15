-- ============================================================================
-- Migration 06: Trip Collaboration, Memberships, Invitations & Shared RLS
-- (Voyaro Phase 8 — Trip Collaboration)
--
-- Features:
--   1. trip_members table with owner / editor / viewer roles
--   2. trip_invitations table with secure tokens, expiration, and status tracking
--   3. Unique owner constraint per trip (exactly one owner per trip)
--   4. Automatic owner assignment trigger on trip creation
--   5. Deterministic backfill preserving ownership of all existing trips
--   6. Recursion-safe SECURITY DEFINER membership helper functions
--   7. Collaborative RLS policies for profiles, trips, itinerary, expenses, budgets, members, invitations
--   8. Atomic invitation acceptance RPC function (public.accept_trip_invitation)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create Trip Members Table & Constraints
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

-- Trigger for trip_members updated_at
CREATE OR REPLACE TRIGGER set_trip_members_updated_at
  BEFORE UPDATE ON public.trip_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 2. Create Trip Invitations Table & Constraints
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

-- At most one active pending invitation per email per trip
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_trip_invitation 
  ON public.trip_invitations (trip_id, invitee_email) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id ON public.trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_token ON public.trip_invitations(token);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_email ON public.trip_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_status ON public.trip_invitations(trip_id, status);

-- ----------------------------------------------------------------------------
-- 3. Automatic Trip Owner Trigger Function
-- ----------------------------------------------------------------------------
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
-- 4. Data Migration Backfill (Existing Trips Ownership Preservation)
-- ----------------------------------------------------------------------------
INSERT INTO public.trip_members (trip_id, user_id, role, created_at, updated_at)
SELECT 
  t.id AS trip_id,
  t.user_id AS user_id,
  'owner' AS role,
  t.created_at AS created_at,
  t.updated_at AS updated_at
FROM public.trips t
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. Non-Recursive SECURITY DEFINER Helper Functions
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
-- 6. Atomic Invitation Acceptance RPC Function
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

-- Revoke execute from public/anon, grant to authenticated
REVOKE EXECUTE ON FUNCTION public.accept_trip_invitation(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_trip_invitation(TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. Row Level Security Policies
-- ----------------------------------------------------------------------------

ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invitations ENABLE ROW LEVEL SECURITY;

-- ── 7.1 Profiles Policies ──────────────────────────────────────────────────
-- Allow reading own profile OR profiles of fellow travelers on shared trips
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

-- ── 7.2 Trips Policies ─────────────────────────────────────────────────────
-- View: owner OR member
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view trips they own or belong to as member" ON public.trips;

CREATE POLICY "Users can view trips they own or belong to as member"
  ON public.trips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_trip_member(id, auth.uid()));

-- Insert, Update, Delete: strictly owner
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

-- ── 7.3 Itinerary Items Policies ───────────────────────────────────────────
-- View: all trip members (owner, editor, viewer)
DROP POLICY IF EXISTS "Users can view itinerary items of their trips" ON public.itinerary_items;
DROP POLICY IF EXISTS "Members can view itinerary items" ON public.itinerary_items;

CREATE POLICY "Members can view itinerary items"
  ON public.itinerary_items FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

-- Insert / Update / Delete: owner or editor
DROP POLICY IF EXISTS "Users can insert itinerary items into their trips" ON public.itinerary_items;
DROP POLICY IF EXISTS "Users can update itinerary items of their trips" ON public.itinerary_items;
DROP POLICY IF EXISTS "Users can delete itinerary items of their trips" ON public.itinerary_items;
DROP POLICY IF EXISTS "Owners and editors can insert itinerary items" ON public.itinerary_items;
DROP POLICY IF EXISTS "Owners and editors can update itinerary items" ON public.itinerary_items;
DROP POLICY IF EXISTS "Owners and editors can delete itinerary items" ON public.itinerary_items;

CREATE POLICY "Owners and editors can insert itinerary items"
  ON public.itinerary_items FOR INSERT
  TO authenticated
  WITH CHECK (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Owners and editors can update itinerary items"
  ON public.itinerary_items FOR UPDATE
  TO authenticated
  USING (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'))
  WITH CHECK (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Owners and editors can delete itinerary items"
  ON public.itinerary_items FOR DELETE
  TO authenticated
  USING (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'));

-- ── 7.4 Expenses Policies ──────────────────────────────────────────────────
-- View: all trip members
DROP POLICY IF EXISTS "Users can view expenses of their trips" ON public.expenses;
DROP POLICY IF EXISTS "Members can view trip expenses" ON public.expenses;

CREATE POLICY "Members can view trip expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

-- Insert / Update / Delete: owner or editor
DROP POLICY IF EXISTS "Users can insert expenses into their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can update expenses of their trips" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete expenses of their trips" ON public.expenses;
DROP POLICY IF EXISTS "Owners and editors can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owners and editors can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owners and editors can delete expenses" ON public.expenses;

CREATE POLICY "Owners and editors can insert expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Owners and editors can update expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'))
  WITH CHECK (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "Owners and editors can delete expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (public.get_trip_member_role(trip_id, auth.uid()) IN ('owner', 'editor'));

-- ── 7.5 Trip Budgets Policies ──────────────────────────────────────────────
-- View: all trip members
DROP POLICY IF EXISTS "Users can view budgets of their trips" ON public.trip_budgets;
DROP POLICY IF EXISTS "Members can view trip budgets" ON public.trip_budgets;

CREATE POLICY "Members can view trip budgets"
  ON public.trip_budgets FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

-- Insert / Update / Delete: owner only
DROP POLICY IF EXISTS "Users can insert budgets into their trips" ON public.trip_budgets;
DROP POLICY IF EXISTS "Users can update budgets of their trips" ON public.trip_budgets;
DROP POLICY IF EXISTS "Users can delete budgets of their trips" ON public.trip_budgets;
DROP POLICY IF EXISTS "Only trip owner can insert budgets" ON public.trip_budgets;
DROP POLICY IF EXISTS "Only trip owner can update budgets" ON public.trip_budgets;
DROP POLICY IF EXISTS "Only trip owner can delete budgets" ON public.trip_budgets;

CREATE POLICY "Only trip owner can insert budgets"
  ON public.trip_budgets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

CREATE POLICY "Only trip owner can update budgets"
  ON public.trip_budgets FOR UPDATE
  TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid()))
  WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

CREATE POLICY "Only trip owner can delete budgets"
  ON public.trip_budgets FOR DELETE
  TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid()));

-- ── 7.6 Trip Members Policies ──────────────────────────────────────────────
-- View: any member can view the member list of their trip
DROP POLICY IF EXISTS "Members can view co-travelers of their trips" ON public.trip_members;
CREATE POLICY "Members can view co-travelers of their trips"
  ON public.trip_members FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()));

-- Insert: owner only
DROP POLICY IF EXISTS "Only trip owners can add members directly" ON public.trip_members;
CREATE POLICY "Only trip owners can add members directly"
  ON public.trip_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

-- Update: owner can change member roles (only editor or viewer; cannot make another owner)
DROP POLICY IF EXISTS "Only trip owners can update member roles" ON public.trip_members;
CREATE POLICY "Only trip owners can update member roles"
  ON public.trip_members FOR UPDATE
  TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid()))
  WITH CHECK (
    public.is_trip_owner(trip_id, auth.uid())
    AND role IN ('editor', 'viewer')
  );

-- Delete: owner can remove members (except self), or member can self-leave (except owner)
DROP POLICY IF EXISTS "Owners can remove members or members can leave trip" ON public.trip_members;
CREATE POLICY "Owners can remove members or members can leave trip"
  ON public.trip_members FOR DELETE
  TO authenticated
  USING (
    (public.is_trip_owner(trip_id, auth.uid()) AND role <> 'owner')
    OR (auth.uid() = user_id AND role <> 'owner')
  );

-- ── 7.7 Trip Invitations Policies ──────────────────────────────────────────
-- View: trip members can see invitations sent; invitee can see invitation addressed to them
DROP POLICY IF EXISTS "Members and invitees can view invitations" ON public.trip_invitations;
CREATE POLICY "Members and invitees can view invitations"
  ON public.trip_invitations FOR SELECT
  TO authenticated
  USING (
    public.is_trip_member(trip_id, auth.uid())
    OR lower(invitee_email) = lower(trim(auth.jwt()->>'email'))
  );

-- Insert: owner only
DROP POLICY IF EXISTS "Only owners can create invitations" ON public.trip_invitations;
CREATE POLICY "Only owners can create invitations"
  ON public.trip_invitations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

-- Update: owner can cancel, invitee can decline/update status
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

-- Delete: owner only
DROP POLICY IF EXISTS "Only owners can delete invitations" ON public.trip_invitations;
CREATE POLICY "Only owners can delete invitations"
  ON public.trip_invitations FOR DELETE
  TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid()));
