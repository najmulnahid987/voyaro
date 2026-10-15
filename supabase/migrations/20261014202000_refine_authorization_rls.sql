-- ============================================================================
-- Migration 07: Refine RLS and Secure Database Authorization (Phase 8 — Step 3)
--
-- Enhancements:
--   1. Restrict trip_invitations SELECT strictly to the trip owner and target invitee (editors/viewers cannot list invitations).
--   2. Restrict trip_invitations UPDATE strictly to the trip owner (invitees accept atomically via accept_trip_invitation RPC).
--   3. Explicitly pin search_path = public on all helper functions with schema-qualified table references.
--   4. Restrict execution privileges on internal SECURITY DEFINER helpers (revoke from PUBLIC).
--   5. Ensure immediate access revocation when a membership is removed.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper Functions Hardening
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

-- Restrict execution privileges
REVOKE EXECUTE ON FUNCTION public.is_trip_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_trip_member(UUID, UUID) TO authenticated, anon;

REVOKE EXECUTE ON FUNCTION public.get_trip_member_role(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trip_member_role(UUID, UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_trip_owner(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_trip_owner(UUID, UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. Refined Invitations Authorization Policies
-- ----------------------------------------------------------------------------

-- Only trip owners and the targeted invitee may view invitations
DROP POLICY IF EXISTS "Members and invitees can view invitations" ON public.trip_invitations;
DROP POLICY IF EXISTS "Owners and invitees can view invitations" ON public.trip_invitations;

CREATE POLICY "Owners and invitees can view invitations"
  ON public.trip_invitations FOR SELECT
  TO authenticated
  USING (
    public.is_trip_owner(trip_id, auth.uid())
    OR lower(invitee_email) = lower(trim(auth.jwt()->>'email'))
  );

-- Only trip owners can update or revoke invitations (acceptance is via atomic RPC)
DROP POLICY IF EXISTS "Owners and invitees can update invitations" ON public.trip_invitations;
DROP POLICY IF EXISTS "Only owners can update invitations" ON public.trip_invitations;

CREATE POLICY "Only owners can update invitations"
  ON public.trip_invitations FOR UPDATE
  TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid()))
  WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

-- Only owners can delete invitations
DROP POLICY IF EXISTS "Only owners can delete invitations" ON public.trip_invitations;

CREATE POLICY "Only owners can delete invitations"
  ON public.trip_invitations FOR DELETE
  TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid()));

-- Only owners can create invitations (cannot invite as owner)
DROP POLICY IF EXISTS "Only owners can create invitations" ON public.trip_invitations;

CREATE POLICY "Only owners can create invitations"
  ON public.trip_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_trip_owner(trip_id, auth.uid())
    AND role IN ('editor', 'viewer')
  );
