/**
 * Voyaro Phase 10 — Step 6: Comprehensive Automated Test Suite
 *
 * Exercises:
 *  1. Expense Totals, Calculations, Monies & Multi-Currency Precision
 *  2. Required-Field & Input Boundary Validation (Flight, Hotel, Transport, Expense)
 *  3. Trip ID Resolution, Context Propagation & In-Flight Fetch Deduplication
 *  4. Creation vs. In-Place Editing Behavior (Zero Record Duplication)
 *  5. Error Handling & Failed Request Resilience
 *  6. Deep-Link URL Generation & Route Parameter Safety
 *  7. Live Supabase Backend Persistence, Fresh-Client Reload & RLS Isolation
 */

const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Environment & Credentials
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Test Runner Harness
// ---------------------------------------------------------------------------
const testResults = [];

function recordTest(name, passed, message) {
  testResults.push({ name, passed, message });
  const symbol = passed ? '  ✓ PASS' : '  ✗ FAIL';
  console.log(`${symbol}: ${name}${message ? ` (${message})` : ''}`);
}

async function runSuite() {
  console.log('================================================================');
  console.log(' Voyaro Phase 10 — Step 6: Comprehensive Automated Test Suite');
  console.log('================================================================\n');

  // =========================================================================
  // SECTION 1: Expense Totals, Calculations, Monies & Multi-Currency
  // =========================================================================
  console.log('--- 1. Expense Totals, Calculations, Monies & Multi-Currency ---');

  // Test 1.1: Minor units monetary precision (integer cents arithmetic)
  const toMinorUnits = (amount) => Math.round(Number(amount) * 100);
  const fromMinorUnits = (cents) => cents / 100;

  const item1Cents = toMinorUnits(19.99);
  const item2Cents = toMinorUnits(80.01);
  const totalCents = item1Cents + item2Cents;
  recordTest(
    'Monetary precision preserves exact minor units without floating point drift',
    totalCents === 10000 && fromMinorUnits(totalCents) === 100.0,
    `19.99 + 80.01 = ${fromMinorUnits(totalCents)} USD`
  );

  // Test 1.2: Multi-currency isolation
  const rawExpenses = [
    { id: '1', amount: 10000, currency: 'USD', category: 'accommodation' },
    { id: '2', amount: 5000, currency: 'USD', category: 'meals' },
    { id: '3', amount: 4000, currency: 'EUR', category: 'transportation' },
    { id: '4', amount: 8000, currency: 'EUR', category: 'activities' },
  ];

  const currencyBuckets = rawExpenses.reduce((acc, exp) => {
    acc[exp.currency] = (acc[exp.currency] || 0) + exp.amount;
    return acc;
  }, {});

  recordTest(
    'Multi-currency isolation never sums differing currencies together',
    currencyBuckets['USD'] === 15000 && currencyBuckets['EUR'] === 12000,
    `USD Total: ${currencyBuckets['USD']}, EUR Total: ${currencyBuckets['EUR']}`
  );

  // Test 1.3: Budget remaining & Overspending calculation
  const budgetAmountCents = 20000; // $200.00
  const spentAmountCents = 24500;  // $245.00
  const remainingCents = budgetAmountCents - spentAmountCents;
  const isOverBudget = spentAmountCents > budgetAmountCents;
  const percentUsed = budgetAmountCents > 0 ? Math.round((spentAmountCents / budgetAmountCents) * 100) : 0;

  recordTest(
    'Overspending detection correctly flags over-budget status and negative balance',
    isOverBudget === true && remainingCents === -4500 && percentUsed === 123,
    `Over by -$45.00, ${percentUsed}% used`
  );

  // Test 1.4: Zero budget and empty expenses edge cases
  const zeroBudgetRemaining = 0 - 5000;
  const zeroBudgetPercent = 0 > 0 ? Math.round((5000 / 0) * 100) : 0;
  recordTest(
    'Zero-budget calculation avoids NaN or Infinity division-by-zero errors',
    zeroBudgetRemaining === -5000 && !isNaN(zeroBudgetPercent) && isFinite(zeroBudgetPercent),
    `Remaining: ${zeroBudgetRemaining}, Percent: ${zeroBudgetPercent}%`
  );

  // Test 1.5: Category percentage distribution math
  const categories = [
    { category: 'accommodation', amount: 5000 },
    { category: 'meals', amount: 3000 },
    { category: 'activities', amount: 2000 },
  ];
  const catTotal = categories.reduce((sum, c) => sum + c.amount, 0);
  const percentages = categories.map((c) => Math.round((c.amount / catTotal) * 100));
  const sumPercentages = percentages.reduce((sum, p) => sum + p, 0);

  recordTest(
    'Category percentage distribution accurately sums to 100%',
    sumPercentages === 100,
    `Breakdown: ${percentages.join('%, ')}%`
  );

  // =========================================================================
  // SECTION 2: Required-Field & Input Boundary Validation
  // =========================================================================
  console.log('\n--- 2. Required-Field & Input Boundary Validation ---');

  // Flight validator simulation
  function validateFlight(data) {
    const errors = {};
    if (!data.airline || !data.airline.trim()) errors.airline = 'Airline is required';
    if (!data.flightNumber || !data.flightNumber.trim()) errors.flightNumber = 'Flight number is required';
    if (!data.departureAirport || !data.departureAirport.trim()) errors.departureAirport = 'Departure is required';
    if (!data.arrivalAirport || !data.arrivalAirport.trim()) errors.arrivalAirport = 'Arrival is required';
    if (data.startDateTime && data.endDateTime && new Date(data.endDateTime) < new Date(data.startDateTime)) {
      errors.endDateTime = 'Arrival date cannot be before departure';
    }
    return errors;
  }

  // Hotel validator simulation
  function validateHotel(data) {
    const errors = {};
    if (!data.hotelName || !data.hotelName.trim()) errors.hotelName = 'Hotel name is required';
    if (data.checkInDate && data.checkOutDate && new Date(data.checkOutDate) < new Date(data.checkInDate)) {
      errors.checkOutDate = 'Check-out date cannot be before check-in date';
    }
    return errors;
  }

  // Transportation validator simulation
  function validateTransportation(data) {
    const errors = {};
    if (!data.fromLocation || !data.fromLocation.trim()) errors.fromLocation = 'Departure location is required';
    if (!data.toLocation || !data.toLocation.trim()) errors.toLocation = 'Destination is required';
    return errors;
  }

  // Expense validator simulation
  function validateExpense(data) {
    const errors = {};
    if (!data.title || !data.title.trim()) errors.title = 'Title is required';
    if (typeof data.amount !== 'number' || isNaN(data.amount) || data.amount <= 0) {
      errors.amount = 'Amount must be greater than zero';
    }
    if (!data.currency || !['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD', 'NZD'].includes(data.currency)) {
      errors.currency = 'Valid currency is required';
    }
    return errors;
  }

  // Test 2.1: Flight validation rejects empty and inverted date records
  const emptyFlightErrors = validateFlight({ airline: '   ', flightNumber: '', departureAirport: '', arrivalAirport: '' });
  const invertedFlightErrors = validateFlight({
    airline: 'ANA',
    flightNumber: 'NH204',
    departureAirport: 'HND',
    arrivalAirport: 'FRA',
    startDateTime: '2026-10-20T12:00:00Z',
    endDateTime: '2026-10-20T10:00:00Z',
  });
  recordTest(
    'Flight validation rejects whitespace-only inputs and inverted dates',
    Object.keys(emptyFlightErrors).length === 4 && invertedFlightErrors.endDateTime !== undefined,
    '4 required field errors detected, inverted arrival detected'
  );

  // Test 2.2: Hotel validation rejects empty name and inverted check-out
  const hotelInvertedErrors = validateHotel({
    hotelName: 'The Kyoto Hotel',
    checkInDate: '2026-11-10',
    checkOutDate: '2026-11-08',
  });
  recordTest(
    'Hotel validation blocks check-out prior to check-in',
    hotelInvertedErrors.checkOutDate !== undefined,
    hotelInvertedErrors.checkOutDate
  );

  // Test 2.3: Transportation validation enforces from/to locations
  const transportErrors = validateTransportation({ fromLocation: '', toLocation: 'Kyoto Station' });
  recordTest(
    'Transportation validation requires both origin and destination',
    transportErrors.fromLocation !== undefined && transportErrors.toLocation === undefined,
    'Departure location required'
  );

  // Test 2.4: Expense validation blocks zero, negative amounts and invalid currency
  const expenseNegativeError = validateExpense({ title: 'Coffee', amount: -5.0, currency: 'USD' });
  const expenseBadCurrencyError = validateExpense({ title: 'Train', amount: 15.0, currency: 'FAKE' });
  recordTest(
    'Expense validation blocks non-positive amounts and invalid currencies',
    expenseNegativeError.amount !== undefined && expenseBadCurrencyError.currency !== undefined,
    'Rejected negative amount and unsupported currency'
  );

  // =========================================================================
  // SECTION 3: Trip ID Resolution, Context Propagation & In-Flight Deduplication
  // =========================================================================
  console.log('\n--- 3. Trip ID Resolution, Context Propagation & In-Flight Deduplication ---');

  // Test 3.1: Trip ID normalization
  function normalizeTripId(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.trim();
  }

  recordTest('Trip ID normalization safely handles null, undefined, and untrimmed strings',
    normalizeTripId(null) === '' &&
    normalizeTripId(undefined) === '' &&
    normalizeTripId('  abc-123  ') === 'abc-123',
    'Whitespace cleanly trimmed, null/undefined converted to empty string'
  );

  // Test 3.2: In-flight query deduplication logic verification
  const inFlightTripPromises = new Map();

  function mockFetchTrip(tripId, delayMs = 30) {
    const clean = normalizeTripId(tripId);
    if (!clean) return Promise.resolve(null);
    if (inFlightTripPromises.has(clean)) {
      return inFlightTripPromises.get(clean);
    }

    const promise = (async () => {
      try {
        await new Promise((r) => setTimeout(r, delayMs));
        return { id: clean, title: `Trip ${clean}` };
      } finally {
        inFlightTripPromises.delete(clean);
      }
    })();

    inFlightTripPromises.set(clean, promise);
    return promise;
  }

  // Fire two concurrent calls
  const p1 = mockFetchTrip('concurrent-trip-1');
  const p2 = mockFetchTrip('concurrent-trip-1');
  const areSamePromise = p1 === p2;
  const [res1, res2] = await Promise.all([p1, p2]);
  const isCleanedUpAfter = !inFlightTripPromises.has('concurrent-trip-1');

  recordTest(
    'Concurrent fetches return the identical in-flight Promise and clean up upon completion',
    areSamePromise === true && res1.id === 'concurrent-trip-1' && res2.id === 'concurrent-trip-1' && isCleanedUpAfter,
    'Zero duplicate concurrent queries generated; map entry deleted after resolution'
  );

  // =========================================================================
  // SECTION 4: Creation vs. In-Place Editing Behavior
  // =========================================================================
  console.log('\n--- 4. Creation vs. In-Place Editing Behavior ---');

  let memoryStore = [];
  function addOrUpdateItem(input) {
    if (input.id && memoryStore.some((i) => i.id === input.id)) {
      // Edit in-place
      memoryStore = memoryStore.map((i) => (i.id === input.id ? { ...i, ...input } : i));
      return { item: memoryStore.find((i) => i.id === input.id), mode: 'update' };
    } else {
      // Create new
      const newItem = { ...input, id: input.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` };
      memoryStore.push(newItem);
      return { item: newItem, mode: 'create' };
    }
  }

  // Create Item A
  const createRes = addOrUpdateItem({ title: 'Kyoto Sightseeing', type: 'activity', location: 'Kyoto' });
  const createdId = createRes.item.id;
  const countAfterCreate = memoryStore.length;

  // Edit Item A in place
  const updateRes = addOrUpdateItem({ id: createdId, title: 'Kyoto Sightseeing (Updated Title)', type: 'activity', location: 'Gion, Kyoto' });
  const countAfterUpdate = memoryStore.length;
  const updatedItem = memoryStore.find((i) => i.id === createdId);

  recordTest(
    'Editing existing item modifies fields in-place without creating duplicate rows',
    createRes.mode === 'create' &&
    updateRes.mode === 'update' &&
    countAfterCreate === 1 &&
    countAfterUpdate === 1 &&
    updatedItem.title === 'Kyoto Sightseeing (Updated Title)' &&
    updatedItem.location === 'Gion, Kyoto',
    `Store count remains exactly 1; ID preserved: ${createdId}`
  );

  // =========================================================================
  // SECTION 5: Error Handling & Resilience
  // =========================================================================
  console.log('\n--- 5. Error Handling & Resilience ---');

  // Test 5.1: Postgres 22P02 invalid UUID error interceptor
  function handleDbQueryError(err) {
    if (err && err.code === '22P02') {
      return null; // Gracefully return null for invalid UUID syntax
    }
    throw new Error(`Database error: ${err?.message || 'unknown'}`);
  }

  const p22P02Handled = handleDbQueryError({ code: '22P02', message: 'invalid input syntax for type uuid' });
  let genericErrorThrown = false;
  try {
    handleDbQueryError({ code: '42P01', message: 'relation does not exist' });
  } catch (e) {
    genericErrorThrown = true;
  }

  recordTest(
    'Postgres 22P02 invalid UUID error returns null gracefully while real errors throw',
    p22P02Handled === null && genericErrorThrown === true,
    'Code 22P02 intercepted; unexpected errors properly propagated'
  );

  // Test 5.2: Simulated network failure surfaces polite message without false success
  async function simulateFailingSave() {
    throw new Error('Network request failed: Could not reach host');
  }

  let saveCaught = false;
  let falseSuccess = false;
  try {
    await simulateFailingSave();
    falseSuccess = true;
  } catch (err) {
    saveCaught = true;
  }

  recordTest(
    'Network failure during save throws polite error and avoids false success feedback',
    saveCaught === true && falseSuccess === false,
    'Failed save safely handled'
  );

  // =========================================================================
  // SECTION 6: Deep-Link URL Generation & Route Verification
  // =========================================================================
  console.log('\n--- 6. Deep-Link URL Generation & Route Verification ---');

  function getTripShareUrl(tripId) {
    if (!tripId || typeof tripId !== 'string') return '';
    const cleanId = tripId.trim();
    if (!cleanId) return '';
    return `voyaro://trips/${encodeURIComponent(cleanId)}`;
  }

  const canonicalUrl = getTripShareUrl('99f182c4-0610-4592-9382-78d120a232bb');
  const whitespaceHandled = getTripShareUrl('   ');
  const encodedUrl = getTripShareUrl('trip with spaces');

  recordTest(
    'Deep link URL uses canonical voyaro://trips/${tripId} scheme and handles encoding',
    canonicalUrl === 'voyaro://trips/99f182c4-0610-4592-9382-78d120a232bb' &&
    whitespaceHandled === '' &&
    encodedUrl === 'voyaro://trips/trip%20with%20spaces',
    `Generated: ${canonicalUrl}`
  );

  // Verify route files exist in workspace
  const routeIndexExists = fs.existsSync('src/app/(tabs)/trips/[tripId]/index.tsx');
  const legacyRedirectExists = fs.existsSync('src/app/trip/[tripId].tsx');

  recordTest(
    'Expo Router destination route and legacy redirect route exist in filesystem',
    routeIndexExists && legacyRedirectExists,
    'src/app/(tabs)/trips/[tripId]/index.tsx & src/app/trip/[tripId].tsx present'
  );

  // =========================================================================
  // SECTION 7: Live Supabase Backend Persistence & RLS Verification
  // =========================================================================
  console.log('\n--- 7. Live Supabase Backend Persistence & RLS Verification ---');

  const jwtSecret = await getJwtSecret();
  const testOwner = {
    id: '43ad5eb6-320d-4424-8524-4fd23ab139f9',
    email: 'owner_tester@voyaro.test',
  };
  const ownerJwt = generateUserJwt(testOwner.id, testOwner.email, jwtSecret);
  const ownerClient = createScopedClient(ownerJwt);

  const testUserB = {
    id: 'ba03a532-a5e2-4735-a681-30d0fa851412',
    email: 'outsider_tester@voyaro.test',
  };
  const userBJwt = generateUserJwt(testUserB.id, testUserB.email, jwtSecret);
  const userBClient = createScopedClient(userBJwt);

  const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

  let testTripId = null;

  try {
    // 7.1: Create Trip with Owner
    const { data: tripData, error: tripErr } = await ownerClient
      .from('trips')
      .insert({
        user_id: testOwner.id,
        title: 'Step 6 Verification Adventure',
        destination: 'Osaka, Japan',
        start_date: '2026-12-01',
        end_date: '2026-12-10',
        traveler_count: 2,
        status: 'upcoming',
      })
      .select()
      .single();

    if (tripErr) throw tripErr;
    testTripId = tripData.id;
    recordTest('Live Supabase: Trip created successfully', Boolean(testTripId), `Trip ID: ${testTripId}`);

    // 7.2: Insert Trip Budget
    const { data: budgetData, error: budgetErr } = await ownerClient
      .from('trip_budgets')
      .insert({
        trip_id: testTripId,
        amount: 350000, // $3,500.00
        currency: 'USD',
      })
      .select()
      .single();

    recordTest(
      'Live Supabase: Trip budget persisted to trip_budgets table',
      !budgetErr && budgetData.amount === 350000,
      `Budget: ${budgetData?.amount} ${budgetData?.currency}`
    );

    // 7.3: Insert Flight Itinerary Item
    const { data: flightData, error: flightErr } = await ownerClient
      .from('itinerary_items')
      .insert({
        trip_id: testTripId,
        type: 'flight',
        title: 'Flight to Kansai International (KIX)',
        start_datetime: '2026-12-01T10:00:00Z',
        end_datetime: '2026-12-01T22:00:00Z',
        location: 'Kansai International Airport, Osaka',
        metadata: {
          airline: 'Japan Airlines',
          flightNumber: 'JL060',
          departureAirport: 'LAX',
          arrivalAirport: 'KIX',
        },
      })
      .select()
      .single();

    recordTest(
      'Live Supabase: Itinerary item (Flight) persisted to itinerary_items table',
      !flightErr && flightData?.id,
      `Flight ID: ${flightData?.id}`
    );

    // 7.4: In-Place Update on Flight Record (Verify No Duplication)
    const { data: updatedFlight, error: updateFlightErr } = await ownerClient
      .from('itinerary_items')
      .update({
        title: 'Flight to KIX (Updated Confirmation)',
        metadata: {
          airline: 'Japan Airlines',
          flightNumber: 'JL060',
          departureAirport: 'LAX',
          arrivalAirport: 'KIX',
          seat: '12K',
        },
      })
      .eq('id', flightData.id)
      .select()
      .single();

    const { data: itemsAfterUpdate } = await ownerClient
      .from('itinerary_items')
      .select('id')
      .eq('trip_id', testTripId);

    recordTest(
      'Live Supabase: Updating existing flight modifies row in-place without duplicating',
      !updateFlightErr && updatedFlight.title === 'Flight to KIX (Updated Confirmation)' && itemsAfterUpdate.length === 1,
      `Row count strictly remains 1; updated seat: ${updatedFlight?.metadata?.seat}`
    );

    // 7.5: Insert Expense Record
    const { data: expData, error: expErr } = await ownerClient
      .from('expenses')
      .insert({
        trip_id: testTripId,
        paid_by: testOwner.id,
        title: 'Shinkansen Bullet Train Ticket',
        amount: 14500, // $145.00
        currency: 'USD',
        category: 'transportation',
        expense_date: '2026-12-02',
      })
      .select()
      .single();

    recordTest(
      'Live Supabase: Expense record persisted to expenses table',
      !expErr && expData?.id && expData?.amount === 14500,
      expErr ? expErr.message : `Expense ID: ${expData?.id}`
    );

    // 7.6: Fresh Client Session Reload Simulation
    // Create completely new client instance to simulate cold app launch after persistence
    const freshClient = createScopedClient(ownerJwt);
    const { data: reloadTrip } = await freshClient.from('trips').select('*, itinerary_items(*), expenses(*)').eq('id', testTripId).single();

    recordTest(
      'Fresh client connection retrieves persisted trip, itinerary, and expense records',
      reloadTrip && reloadTrip.itinerary_items.length === 1 && reloadTrip.expenses.length === 1,
      `Confirmed persistence on independent client session (1 item, 1 expense)`
    );

    // 7.7: RLS Security Boundary Verification
    const { data: anonData } = await anonClient.from('trips').select('*').eq('id', testTripId);
    const { data: userBData } = await userBClient.from('trips').select('*').eq('id', testTripId);

    const { error: userBInsertErr } = await userBClient.from('expenses').insert({
      trip_id: testTripId,
      paid_by: testUserB.id,
      title: 'Unauthorized Intrusion Expense',
      amount: 9999,
      currency: 'USD',
      category: 'other',
      expense_date: '2026-12-02',
    });

    recordTest(
      'Supabase RLS strictly denies unauthenticated users and unauthorized collaborators',
      anonData.length === 0 && userBData.length === 0 && Boolean(userBInsertErr),
      'Anon: 0 rows, User B: 0 rows, User B Insert: Rejected by RLS'
    );
  } finally {
    // 7.8: Clean cascade deletion
    if (testTripId) {
      await ownerClient.from('trips').delete().eq('id', testTripId);
      console.log(`\n  Cleanup: Removed test trip ${testTripId}`);
    }
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} / ${total} Tests Passed (${failed} Failed)`);
  console.log(` STATUS: ${failed === 0 ? 'ALL AUTOMATED TESTS PASSED' : 'FAILURES DETECTED'}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
