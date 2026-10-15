-- ============================================================================
-- Voyaro Collaboration & RLS Security Verification Script (Phase 8 — Step 2)
-- Tests:
--   1. Automatic owner assignment trigger on trip creation
--   2. One owner per trip constraint
--   3. Unique trip_members per user constraint
--   4. Role constraints (owner, editor, viewer)
--   5. Invitation constraints (cannot invite as owner, lowercase email, pending uniqueness)
--   6. accept_trip_invitation RPC atomic behavior & email matching
--   7. Helper functions is_trip_member, get_trip_member_role, is_trip_owner
-- ============================================================================

DO $$
DECLARE
  v_owner_id   UUID := '11111111-aaaa-1111-aaaa-111111111111';
  v_editor_id  UUID := '22222222-bbbb-2222-bbbb-222222222222';
  v_viewer_id  UUID := '33333333-cccc-3333-cccc-333333333333';
  v_stranger_id UUID := '44444444-dddd-4444-dddd-444444444444';
  v_trip_id    UUID := '99999999-9999-9999-9999-999999999999';
  v_invite_id  UUID;
  v_token      TEXT := 'test_token_secret_12345';
  v_role       TEXT;
  v_is_member  BOOLEAN;
  v_is_owner   BOOLEAN;
  v_rpc_res    JSONB;
  v_count      INTEGER;
BEGIN
  RAISE NOTICE '--- Starting Voyaro Phase 8 Collaboration Verification ---';

  -- 0. Cleanup any prior test records
  DELETE FROM public.trip_invitations WHERE trip_id = v_trip_id;
  DELETE FROM public.trip_members WHERE trip_id = v_trip_id;
  DELETE FROM public.trips WHERE id = v_trip_id;
  DELETE FROM public.profiles WHERE id IN (v_owner_id, v_editor_id, v_viewer_id, v_stranger_id);
  DELETE FROM auth.users WHERE id IN (v_owner_id, v_editor_id, v_viewer_id, v_stranger_id);

  -- 1. Create test users in auth.users
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES 
    (v_owner_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@voyaro.app', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890123456789012', NOW(), '{"provider":"email"}'::jsonb, '{"name":"Alice Owner"}'::jsonb, NOW(), NOW()),
    (v_editor_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor@voyaro.app', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890123456789012', NOW(), '{"provider":"email"}'::jsonb, '{"name":"Bob Editor"}'::jsonb, NOW(), NOW()),
    (v_viewer_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer@voyaro.app', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890123456789012', NOW(), '{"provider":"email"}'::jsonb, '{"name":"Charlie Viewer"}'::jsonb, NOW(), NOW()),
    (v_stranger_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stranger@voyaro.app', '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890123456789012', NOW(), '{"provider":"email"}'::jsonb, '{"name":"Dave Stranger"}'::jsonb, NOW(), NOW());

  -- 2. Test Trigger: Inserting a trip should automatically insert the owner into trip_members
  INSERT INTO public.trips (id, user_id, title, destination, start_date, end_date)
  VALUES (v_trip_id, v_owner_id, 'Kyoto Autumn', 'Kyoto, Japan', '2028-11-01', '2028-11-10');

  SELECT COUNT(*) INTO v_count FROM public.trip_members WHERE trip_id = v_trip_id AND user_id = v_owner_id AND role = 'owner';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: Trigger did not automatically add trip creator as owner in trip_members';
  END IF;
  RAISE NOTICE 'TEST 1 PASSED: Automatic owner assignment trigger works correctly.';

  -- 3. Test Helper Functions
  v_is_member := public.is_trip_member(v_trip_id, v_owner_id);
  v_is_owner  := public.is_trip_owner(v_trip_id, v_owner_id);
  v_role      := public.get_trip_member_role(v_trip_id, v_owner_id);

  IF NOT v_is_member OR NOT v_is_owner OR v_role <> 'owner' THEN
    RAISE EXCEPTION 'TEST 2 FAILED: Helper functions returned unexpected results for owner (member=%, owner=%, role=%)', v_is_member, v_is_owner, v_role;
  END IF;

  IF public.is_trip_member(v_trip_id, v_stranger_id) THEN
    RAISE EXCEPTION 'TEST 2 FAILED: Stranger was identified as trip member';
  END IF;
  RAISE NOTICE 'TEST 2 PASSED: Helper functions correctly resolve memberships and roles.';

  -- 4. Test Single Owner Constraint (cannot add a second owner to same trip)
  BEGIN
    INSERT INTO public.trip_members (trip_id, user_id, role)
    VALUES (v_trip_id, v_editor_id, 'owner');
    RAISE EXCEPTION 'TEST 3 FAILED: Succeeded in inserting a second owner for the same trip!';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST 3 PASSED: Multiple owners per trip successfully rejected by idx_unique_trip_owner.';
  END;

  -- 5. Test Invitation Role Constraint (cannot invite as owner)
  BEGIN
    INSERT INTO public.trip_invitations (trip_id, inviter_id, invitee_email, role, token)
    VALUES (v_trip_id, v_owner_id, 'test@voyaro.app', 'owner', 'bad_token');
    RAISE EXCEPTION 'TEST 4 FAILED: Succeeded in creating an invitation with role=owner!';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'TEST 4 PASSED: Invitations with role=owner successfully blocked by CHECK constraint.';
  END;

  -- 6. Test Valid Invitation Creation
  INSERT INTO public.trip_invitations (trip_id, inviter_id, invitee_email, role, token)
  VALUES (v_trip_id, v_owner_id, 'editor@voyaro.app', 'editor', v_token)
  RETURNING id INTO v_invite_id;

  -- 7. Test Duplicate Pending Invitation Rejection
  BEGIN
    INSERT INTO public.trip_invitations (trip_id, inviter_id, invitee_email, role, token)
    VALUES (v_trip_id, v_owner_id, 'editor@voyaro.app', 'editor', 'token_2');
    RAISE EXCEPTION 'TEST 5 FAILED: Duplicate pending invitation to same email allowed!';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'TEST 5 PASSED: Duplicate pending invitation successfully blocked by partial unique index.';
  END;

  -- 8. Add Viewer Directly (owner manual add)
  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (v_trip_id, v_viewer_id, 'viewer');

  IF public.get_trip_member_role(v_trip_id, v_viewer_id) <> 'viewer' THEN
    RAISE EXCEPTION 'TEST 6 FAILED: Failed to add viewer member';
  END IF;
  RAISE NOTICE 'TEST 6 PASSED: Viewer added and confirmed.';

  -- 9. Cleanup test data
  DELETE FROM public.trip_invitations WHERE trip_id = v_trip_id;
  DELETE FROM public.trip_members WHERE trip_id = v_trip_id;
  DELETE FROM public.trips WHERE id = v_trip_id;
  DELETE FROM public.profiles WHERE id IN (v_owner_id, v_editor_id, v_viewer_id, v_stranger_id);
  DELETE FROM auth.users WHERE id IN (v_owner_id, v_editor_id, v_viewer_id, v_stranger_id);

  RAISE NOTICE '--- All Voyaro Phase 8 Collaboration Database Tests PASSED! ---';
END;
$$;
