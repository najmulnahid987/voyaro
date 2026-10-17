/**
 * Voyaro Phase 10 — Step 1: Quick-Add Data Persistence Test Suite
 *
 * Automated verification of Quick-Add persistence, real Supabase storage,
 * reload survival, demo data isolation, and RLS enforcement.
 */

const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || (env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/) ? env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1].trim() : '');
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || (env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/) ? env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim() : '');
const managementToken = process.env.SUPABASE_ACCESS_TOKEN || (env.match(/SUPABASE_ACCESS_TOKEN=(.*)/) ? env.match(/SUPABASE_ACCESS_TOKEN=(.*)/)[1].trim() : '');
const projectRef = process.env.SUPABASE_PROJECT_REF || (env.match(/SUPABASE_PROJECT_REF=(.*)/) ? env.match(/SUPABASE_PROJECT_REF=(.*)/)[1].trim() : 'ncpepgoukzhacywwiuok');

async function getJwtSecret() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/postgrest`, {
    headers: { 'Authorization': `Bearer ${managementToken}` },
  });
  const data = await res.json();
  return data.jwt_secret;
}

function generateUserJwt(userId, email, jwtSecret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      role: 'authenticated',
      email: email.toLowerCase(),
      exp: Math.floor(Date.now() / 1000) + 7200,
      aud: 'authenticated',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { display_name: email.split('@')[0] },
    })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function createScopedClient(jwt) {
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}

const testResults = [];

function recordTest(name, passed, message) {
  testResults.push({ name, passed, message });
  const symbol = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`  ${symbol}: ${name}${message ? ` (${message})` : ''}`);
}

async function runTests() {
  console.log('================================================================');
  console.log(' Voyaro Phase 10 — Step 1: Quick-Add Persistence Test Suite');
  console.log('================================================================\n');

  const jwtSecret = await getJwtSecret();

  // Registered test personas in Supabase auth.users
  const userA_Id = '43ad5eb6-320d-4424-8524-4fd23ab139f9';
  const userA_Email = 'owner_tester@voyaro.test';
  const userA_Jwt = generateUserJwt(userA_Id, userA_Email, jwtSecret);
  const clientA = createScopedClient(userA_Jwt);

  const userB_Id = 'ba03a532-a5e2-4735-a681-30d0fa851412';
  const userB_Email = 'outsider_tester@voyaro.test';
  const userB_Jwt = generateUserJwt(userB_Id, userB_Email, jwtSecret);
  const clientB = createScopedClient(userB_Jwt);

  let testTripId = null;
  let testExpenseId = null;
  let testItemId = null;

  try {
    // 0. Setup: Create real trip for User A
    console.log('--- 0. Setup: Real Supabase Trip Creation ---');
    const { data: tripData, error: tripErr } = await clientA
      .from('trips')
      .insert({
        title: 'Swiss Alps Hiking Journey',
        destination: 'Interlaken, Switzerland',
        start_date: '2027-06-15',
        end_date: '2027-06-25',
        user_id: userA_Id,
      })
      .select()
      .single();

    if (tripErr || !tripData) {
      throw new Error(`Failed to create test trip: ${tripErr?.message}`);
    }
    testTripId = tripData.id;
    recordTest('Setup real trip in Supabase', true, `Trip ID: ${testTripId}`);

    // --- Scenario 1 & 2: Quick-Add Expense uses real tripId ---
    console.log('\n--- Scenario 1 & 2: Quick-Add Expense Persistence ---');
    const expensePayload = {
      trip_id: testTripId,
      title: 'Alpine fondue dinner',
      amount: 4500, // $45.00
      currency: 'USD',
      category: 'food_drinks',
      expense_date: '2027-06-16',
      paid_by: userA_Id,
      notes: 'Fondue with team',
    };

    const { data: expData, error: expErr } = await clientA
      .from('expenses')
      .insert(expensePayload)
      .select()
      .single();

    recordTest('Expense insert succeeds in Supabase', !expErr && Boolean(expData), expErr ? expErr.message : `Expense ID: ${expData?.id}`);
    testExpenseId = expData?.id;

    recordTest(
      'Expense correctly associated with real tripId (NOT japan-adventure)',
      expData?.trip_id === testTripId && expData?.trip_id !== 'japan-adventure',
      `trip_id: ${expData?.trip_id}`
    );

    // --- Scenario 3: Expense appears in trip queries ---
    console.log('\n--- Scenario 3: Expense Query Verification ---');
    const { data: queryExpenses, error: queryErr } = await clientA
      .from('expenses')
      .select('*')
      .eq('trip_id', testTripId);

    recordTest(
      'Expense appears in trip screens/queries',
      !queryErr && queryExpenses.length === 1 && queryExpenses[0].id === testExpenseId,
      `Found ${queryExpenses?.length || 0} expense(s)`
    );

    // --- Scenario 4: Navigate away and re-open trip ---
    console.log('\n--- Scenario 4: Navigate Away & Reopen Trip ---');
    // Simulate user navigating to a different screen and querying again
    const { data: reloadedExpenses, error: reloadErr } = await clientA
      .from('expenses')
      .select('*')
      .eq('trip_id', testTripId);

    recordTest(
      'Expense remains present after navigating away and reopening',
      !reloadErr && reloadedExpenses.some((e) => e.id === testExpenseId),
      `Verified expense ID: ${testExpenseId}`
    );

    // --- Scenario 5: App Restart / Session Reload ---
    console.log('\n--- Scenario 5: Restart / Fresh Client Reload ---');
    // Instantiate a brand-new Supabase client to simulate app cold boot
    const freshClientA = createScopedClient(userA_Jwt);
    const { data: freshTripExpenses, error: freshErr } = await freshClientA
      .from('expenses')
      .select('*')
      .eq('trip_id', testTripId);

    recordTest(
      'Saved expense survives app restart / reload in PostgreSQL',
      !freshErr && freshTripExpenses.some((e) => e.id === testExpenseId),
      `Persistent expense confirmed on fresh client connection`
    );

    // --- Scenario 6: Reservation / Itinerary Item Persistence ---
    console.log('\n--- Scenario 6: Itinerary Item (Reservation) Persistence ---');
    const itemPayload = {
      trip_id: testTripId,
      type: 'flight',
      title: 'Flight to Zurich (LX18)',
      start_datetime: '2027-06-15T08:00:00Z',
      end_datetime: '2027-06-15T16:30:00Z',
      location: 'JFK → ZRH',
      confirmation_number: 'LX-489211',
      metadata: {
        airline: 'Swiss International Air Lines',
        flightNumber: 'LX18',
        departureAirport: 'JFK',
        arrivalAirport: 'ZRH',
        cabinClass: 'economy',
      },
    };

    const { data: itemData, error: itemErr } = await clientA
      .from('itinerary_items')
      .insert(itemPayload)
      .select()
      .single();

    recordTest('Itinerary item insert succeeds in Supabase', !itemErr && Boolean(itemData), itemErr ? itemErr.message : `Item ID: ${itemData?.id}`);
    testItemId = itemData?.id;

    recordTest(
      'Itinerary item associated with real tripId (NOT japan-adventure)',
      itemData?.trip_id === testTripId && itemData?.trip_id !== 'japan-adventure',
      `trip_id: ${itemData?.trip_id}`
    );

    // Verify reload survival for itinerary item
    const { data: freshItems, error: freshItemErr } = await freshClientA
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', testTripId);

    recordTest(
      'Saved reservation survives reload in PostgreSQL',
      !freshItemErr && freshItems.some((i) => i.id === testItemId),
      `Persistent itinerary item confirmed on fresh client connection`
    );

    // --- Scenario 7: Attempt Quick-Add without tripId ---
    console.log('\n--- Scenario 7: Quick-Add Without Selected Trip Handling ---');
    // Code validation test: ensure null/empty tripId cannot write to database
    let emptyTripSaveBlocked = false;
    let emptyTripErrorMessage = '';
    try {
      const { data, error } = await clientA
        .from('expenses')
        .insert({
          trip_id: null,
          amount: 1000,
          currency: 'USD',
          category: 'other',
        });
      if (error) {
        emptyTripSaveBlocked = true;
        emptyTripErrorMessage = error.message;
      }
    } catch (e) {
      emptyTripSaveBlocked = true;
      emptyTripErrorMessage = e.message;
    }

    recordTest(
      'Database rejects expense save with null tripId (NOT NULL constraint)',
      emptyTripSaveBlocked,
      emptyTripErrorMessage
    );

    // --- Scenario 8: Save Failure & Error Handling ---
    console.log('\n--- Scenario 8: Simulated Save Failure Does Not Falsely Report Success ---');
    const fakeTripId = '99999999-9999-9999-9999-999999999999';
    const { data: failedExp, error: failedExpErr } = await clientA
      .from('expenses')
      .insert({
        trip_id: fakeTripId,
        amount: 2500,
        currency: 'USD',
        category: 'other',
      })
      .select();

    recordTest(
      'Foreign key constraint prevents saving against nonexistent trip',
      Boolean(failedExpErr) && (!failedExp || failedExp.length === 0),
      failedExpErr?.message
    );

    // --- Scenario 9: Demo Data Isolation ---
    console.log('\n--- Scenario 9: Demo Data Isolation ---');
    // Verify that japan-adventure cannot be inserted into real trips or expenses table as a foreign key
    let demoFkBlocked = false;
    try {
      const { data, error } = await clientA
        .from('expenses')
        .insert({
          trip_id: 'japan-adventure', // string literal, not a UUID
          amount: 1000,
          currency: 'USD',
          category: 'other',
        });
      if (error) {
        demoFkBlocked = true;
      }
    } catch (e) {
      demoFkBlocked = true;
    }

    recordTest(
      'Demo trip id "japan-adventure" is rejected by PostgreSQL UUID schema',
      demoFkBlocked,
      'Invalid UUID format cannot be inserted into Supabase tables'
    );

    // --- Scenario 10: RLS Collaboration & Privacy Protection ---
    console.log('\n--- Scenario 10: RLS Isolation Between Users ---');
    // User B should NOT be able to read or write expenses to User A's private trip
    const { data: userBExpenses, error: userBErr } = await clientB
      .from('expenses')
      .select('*')
      .eq('trip_id', testTripId);

    recordTest(
      'Uninvited User B cannot read User A trip expenses (RLS Denied)',
      !userBErr && userBExpenses.length === 0,
      `User B returned ${userBExpenses?.length || 0} rows`
    );

    const { data: userBInsert, error: userBInsertErr } = await clientB
      .from('expenses')
      .insert({
        trip_id: testTripId,
        amount: 9999,
        currency: 'USD',
        category: 'other',
      })
      .select();

    recordTest(
      'Uninvited User B cannot insert expenses into User A trip (RLS Denied)',
      Boolean(userBInsertErr) || !userBInsert || userBInsert.length === 0,
      userBInsertErr ? userBInsertErr.message : 'Blocked'
    );

  } finally {
    // Cleanup test trip and cascade items
    if (testTripId) {
      console.log('\n--- Cleanup: Removing Test Trip Artifacts ---');
      const { error: delErr } = await clientA
        .from('trips')
        .delete()
        .eq('id', testTripId);
      if (delErr) {
        console.warn('  Cleanup warning:', delErr.message);
      } else {
        console.log(`  Cleanup completed for trip ID: ${testTripId}`);
      }
    }
  }

  console.log('\n================================================================');
  const allPassed = testResults.every((t) => t.passed);
  const passCount = testResults.filter((t) => t.passed).length;
  console.log(` Results: ${passCount}/${testResults.length} tests passed.`);
  if (allPassed) {
    console.log(' ✓ All Quick-Add Persistence Tests Succeeded!');
  } else {
    console.log(' ✗ Some tests failed.');
  }
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
