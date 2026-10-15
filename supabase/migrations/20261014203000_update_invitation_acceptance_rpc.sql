-- ============================================================================
-- Migration 08: Enhanced Atomic Invitation Acceptance RPC (Phase 8 — Step 4)
--
-- Features:
--   1. Specific diagnostics for already-accepted, revoked, expired, and wrong-email invitations.
--   2. Incompatible role protection: trip owner cannot accept an invite to demote themselves.
--   3. Atomic upsert into trip_members and status transition to 'accepted'.
--   4. Idempotent repeated acceptance handling without creating duplicate memberships.
-- ============================================================================

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
  v_existing_role TEXT;
BEGIN
  -- 1. Ensure caller is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required to accept invitations.');
  END IF;

  -- 2. Fetch invitation by token
  SELECT * INTO v_invite
  FROM public.trip_invitations
  WHERE token = trim(invitation_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found. Please check your link.');
  END IF;

  -- 3. Check status
  IF v_invite.status = 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation has already been accepted.');
  END IF;

  IF v_invite.status IN ('revoked', 'canceled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation was revoked by the trip owner.');
  END IF;

  IF v_invite.status = 'declined' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation was previously declined.');
  END IF;

  -- 4. Check expiration
  IF v_invite.status = 'expired' OR v_invite.expires_at <= NOW() THEN
    IF v_invite.status <> 'expired' THEN
      UPDATE public.trip_invitations SET status = 'expired' WHERE id = v_invite.id;
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'This invitation has expired.');
  END IF;

  -- 5. Verify invitee email matches authenticated account
  IF v_user_email IS NULL OR v_invite.invitee_email <> v_user_email THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This invitation was issued to ' || v_invite.invitee_email || ', but you are signed in as ' || COALESCE(v_user_email, 'unknown') || '.'
    );
  END IF;

  -- 6. Incompatible role check: trip owner cannot accept an invite to their own trip
  SELECT role INTO v_existing_role
  FROM public.trip_members
  WHERE trip_id = v_invite.trip_id AND user_id = v_user_id;

  IF v_existing_role = 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are already the owner of this trip.');
  END IF;

  -- 7. Atomically upsert membership with invited role
  INSERT INTO public.trip_members (trip_id, user_id, role, created_at, updated_at)
  VALUES (v_invite.trip_id, v_user_id, v_invite.role, NOW(), NOW())
  ON CONFLICT (trip_id, user_id) DO UPDATE
    SET role = v_invite.role, updated_at = NOW();

  -- 8. Mark invitation accepted
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
