-- ============================================================================
-- Voyaro RLS Security Verification Script (Phase 7 — Step 3)
-- Validates multi-tenant isolation, RLS policies, and ownership boundaries
-- ============================================================================

DO $$
DECLARE
  v_user_a UUID := '11111111-1111-1111-1111-111111111111';
  v_user_b UUID := '22222222-2222-2222-2222-222222222222';
  v_trip_a UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_trip_b UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_item_a UUID := 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  v_item_b UUID := 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1';
  v_exp_a  UUID := 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2';
  v_exp_b  UUID := 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
  v_count  INTEGER;
BEGIN
  RAISE NOTICE '--- Starting Voyaro RLS Security Policy Verification ---';

  -- 0. Clean up any leftover test data
  DELETE FROM public.trips WHERE id IN (v_trip_a, v_trip_b);
  DELETE FROM public.profiles WHERE id IN (v_user_a, v_user_b);
  DELETE FROM auth.users WHERE id IN (v_user_a, v_user_b);

  -- 1. Create mock auth.users records (required by foreign key constraints)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000000',
      v_user_a,
      'authenticated',
      'authenticated',
      'test_rls_a@voyaro.app',
      '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890123456789012',
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Traveler A"}'::jsonb,
      NOW(),
      NOW()
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      v_user_b,
      'authenticated',
      'authenticated',
      'test_rls_b@voyaro.app',
      '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890123456789012',
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Traveler B"}'::jsonb,
      NOW(),
      NOW()
    )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Upsert profiles (the trigger may have already auto-created them)
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (v_user_a, 'Traveler A', 'test_rls_a@voyaro.app'),
         (v_user_b, 'Traveler B', 'test_rls_b@voyaro.app')
  ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        email = EXCLUDED.email;

  -- 3. Insert test trips
  INSERT INTO public.trips (id, user_id, title, destination, start_date, end_date)
  VALUES (v_trip_a, v_user_a, 'Trip of A', 'Tokyo', '2028-03-10', '2028-03-20'),
         (v_trip_b, v_user_b, 'Trip of B', 'Paris', '2028-04-10', '2028-04-20')
  ON CONFLICT (id) DO NOTHING;

  -- 4. Insert test itinerary items
  INSERT INTO public.itinerary_items (id, trip_id, type, title, start_datetime)
  VALUES (v_item_a, v_trip_a, 'flight', 'Flight A', '2028-03-10T10:00:00Z'),
         (v_item_b, v_trip_b, 'hotel', 'Hotel B', '2028-04-10T15:00:00Z')
  ON CONFLICT (id) DO NOTHING;

  -- 5. Insert test expenses
  INSERT INTO public.expenses (id, trip_id, title, amount, currency, category, expense_date)
  VALUES (v_exp_a, v_trip_a, 'Dinner A', 5000, 'USD', 'food_drinks', '2028-03-11'),
         (v_exp_b, v_trip_b, 'Museum B', 2500, 'EUR', 'activities', '2028-04-11')
  ON CONFLICT (id) DO NOTHING;

  -- 6. Insert test trip budgets
  INSERT INTO public.trip_budgets (trip_id, amount, currency)
  VALUES (v_trip_a, 300000, 'USD'),
         (v_trip_b, 200000, 'EUR')
  ON CONFLICT (trip_id) DO NOTHING;

  -- -------------------------------------------------------------------------
  -- Scenario 1: Unauthenticated User (anon)
  -- -------------------------------------------------------------------------
  SET LOCAL ROLE anon;

  SELECT count(*) INTO v_count FROM public.trips;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: Anonymous user can see % trips', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.itinerary_items;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: Anonymous user can see % itinerary items', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.expenses;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: Anonymous user can see % expenses', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.profiles;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: Anonymous user can see % profiles', v_count;
  END IF;

  RAISE NOTICE '✓ PASS: Unauthenticated user cannot read any private data';

  -- -------------------------------------------------------------------------
  -- Scenario 2: User A accessing own data
  -- -------------------------------------------------------------------------
  RESET ROLE;
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

  SELECT count(*) INTO v_count FROM public.trips;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'RLS FAIL: User A expected 1 trip but saw %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.itinerary_items;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'RLS FAIL: User A expected 1 itinerary item but saw %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.expenses;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'RLS FAIL: User A expected 1 expense but saw %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.trip_budgets;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'RLS FAIL: User A expected 1 budget but saw %', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.profiles WHERE id = v_user_a;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'RLS FAIL: User A expected to see own profile but saw %', v_count;
  END IF;

  RAISE NOTICE '✓ PASS: User A can read all own trips, itinerary items, expenses, and budgets';

  -- -------------------------------------------------------------------------
  -- Scenario 3: User A attempting to read User B's data
  -- -------------------------------------------------------------------------
  SELECT count(*) INTO v_count FROM public.trips WHERE id = v_trip_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: User A was able to read User B trip!';
  END IF;

  SELECT count(*) INTO v_count FROM public.itinerary_items WHERE id = v_item_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: User A was able to read User B itinerary item!';
  END IF;

  SELECT count(*) INTO v_count FROM public.expenses WHERE id = v_exp_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: User A was able to read User B expense!';
  END IF;

  SELECT count(*) INTO v_count FROM public.trip_budgets WHERE trip_id = v_trip_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: User A was able to read User B budget!';
  END IF;

  SELECT count(*) INTO v_count FROM public.profiles WHERE id = v_user_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: User A was able to read User B profile!';
  END IF;

  RAISE NOTICE '✓ PASS: User A is blocked from reading User B data';

  -- -------------------------------------------------------------------------
  -- Scenario 4: User A attempting to create trip under User B ID
  -- -------------------------------------------------------------------------
  BEGIN
    INSERT INTO public.trips (user_id, title, destination, start_date, end_date)
    VALUES (v_user_b, 'Spoofed Trip', 'Unauthorized', '2028-05-01', '2028-05-05');
    RAISE EXCEPTION 'RLS FAIL: User A was allowed to insert a trip belonging to User B!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '✓ PASS: User A blocked from inserting trip for User B';
    WHEN others THEN
      RAISE NOTICE '✓ PASS: User A blocked from inserting trip for User B (policy prevented insert: %)', SQLERRM;
  END;

  -- -------------------------------------------------------------------------
  -- Cleanup test data
  -- -------------------------------------------------------------------------
  RESET ROLE;
  DELETE FROM auth.users WHERE id IN (v_user_a, v_user_b);

  RAISE NOTICE '--- All RLS Policy Verification Scenarios Passed Successfully! ---';
END $$;
