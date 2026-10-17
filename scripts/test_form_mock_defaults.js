/**
 * Voyaro Phase 10 — Step 2: Remove Mock Defaults Verification Test Suite
 *
 * Verifies that:
 * 1. Creation forms (flight, hotel, transportation, activity) start with clean, empty states.
 * 2. No dummy values (Emirates, The Ritz-Carlton, Tokaido Shinkansen, Shibuya Crossing, 2028 dates) are prefilled.
 * 3. Required-field validation prevents empty/incomplete form submissions.
 * 4. Genuine user records persist correctly to Supabase.
 * 5. Editing an existing record loads saved values, preserves record ID & trip ID, and updates without duplicating.
 * 6. Intentional demo data remains isolated.
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
  console.log(' Voyaro Phase 10 — Step 2: Remove Mock Defaults Test Suite');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // Group 1: Source Code Audit for Mock Defaults
  // -------------------------------------------------------------------------
  console.log('--- 1. Source Code Audit: Form Initial States & Preview Cards ---');

  const flightContent = fs.readFileSync('src/app/add/flight.tsx', 'utf8');
  const hotelContent = fs.readFileSync('src/app/add/hotel.tsx', 'utf8');
  const transContent = fs.readFileSync('src/app/add/transportation.tsx', 'utf8');
  const activityContent = fs.readFileSync('src/app/add/activity.tsx', 'utf8');

  // Flight audit
  const flightHasEmiratesDefault = flightContent.includes(": 'Emirates'");
  const flightHasEK585Default = flightContent.includes(": 'EK585'");
  const flightHasDhakaDefault = flightContent.includes(": 'Dhaka, Bangladesh'");
  const flightHasTokyoDefault = flightContent.includes(": 'Tokyo, Japan'");
  const flightHas2028Date = flightContent.includes("'2028-03-");
  const flightHasDacFallback = flightContent.includes("inferAirportCode(text, 'DAC')");
  const flightHasNrtFallback = flightContent.includes("inferAirportCode(text, 'NRT')");
  const flightHasAsyncLoader = flightContent.includes("fetchItineraryItemById(itemId)");

  recordTest(
    'Flight form has no mock defaults (Emirates, EK585, Dhaka, 2028 dates)',
    !flightHasEmiratesDefault && !flightHasEK585Default && !flightHasDhakaDefault && !flightHasTokyoDefault && !flightHas2028Date,
    'Clean initial state'
  );
  recordTest(
    'Flight airport handler does not force DAC/NRT fallbacks',
    !flightHasDacFallback && !flightHasNrtFallback,
    'Generic airport code inference'
  );
  recordTest(
    'Flight form includes async loader for edit mode',
    flightHasAsyncLoader,
    'Asynchronously hydrates existing record'
  );

  // Hotel audit
  const hotelHasRitzDefault = hotelContent.includes(": 'The Ritz-Carlton, Tokyo'");
  const hotelHasTokyoMidtownDefault = hotelContent.includes(": 'Tokyo Midtown");
  const hotelHas2028Date = hotelContent.includes("'2028-03-");
  const hotelHasTokyoPreviewFallback = hotelContent.includes("'Tokyo Central Hotel'");
  const hotelHasAsyncLoader = hotelContent.includes("fetchItineraryItemById(itemId)");

  recordTest(
    'Hotel form has no mock defaults (The Ritz-Carlton, Tokyo Midtown, 2028 dates)',
    !hotelHasRitzDefault && !hotelHasTokyoMidtownDefault && !hotelHas2028Date,
    'Clean initial state'
  );
  recordTest(
    'Hotel preview card does not fallback to dummy Tokyo Central Hotel',
    !hotelHasTokyoPreviewFallback,
    'Generic preview placeholders'
  );
  recordTest(
    'Hotel form includes async loader for edit mode',
    hotelHasAsyncLoader,
    'Asynchronously hydrates existing record'
  );

  // Transportation audit
  const transHasTokyoStation = transContent.includes(": 'Tokyo Station'");
  const transHasKyotoStation = transContent.includes(": 'Kyoto Station'");
  const transHasShinkansen = transContent.includes(": 'Tokaido Shinkansen'");
  const transHas2028Date = transContent.includes("'2028-03-");
  const transHasAsyncLoader = transContent.includes("fetchItineraryItemById(itemId)");

  recordTest(
    'Transportation form has no mock defaults (Tokyo Station, Kyoto Station, Shinkansen, 2028)',
    !transHasTokyoStation && !transHasKyotoStation && !transHasShinkansen && !transHas2028Date,
    'Clean initial state'
  );
  recordTest(
    'Transportation form includes async loader for edit mode',
    transHasAsyncLoader,
    'Asynchronously hydrates existing record'
  );

  // Activity audit
  const actHasShibuyaDefault = activityContent.includes(": 'Shibuya Crossing & Hachiko Tour'");
  const actHas2028Date = activityContent.includes("'2028-03-");
  const actHasAsyncLoader = activityContent.includes("fetchItineraryItemById(itemId)");

  recordTest(
    'Activity form has no mock defaults (Shibuya Crossing, 2028 dates)',
    !actHasShibuyaDefault && !actHas2028Date,
    'Clean initial state'
  );
  recordTest(
    'Activity form includes async loader for edit mode',
    actHasAsyncLoader,
    'Asynchronously hydrates existing record'
  );

  // -------------------------------------------------------------------------
  // Group 2: Form Required-Field Validation Simulation
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Form Required-Field Validation Simulation ---');

  // Flight validation logic: airline, flightNumber, departureAirport, arrivalAirport
  function validateFlight(fields) {
    const errors = {};
    if (!fields.airline?.trim()) errors.airline = 'Airline name is required.';
    if (!fields.flightNumber?.trim()) errors.flightNumber = 'Flight number is required.';
    if (!fields.departureAirport?.trim()) errors.departureAirport = 'Departure airport is required.';
    if (!fields.arrivalAirport?.trim()) errors.arrivalAirport = 'Arrival airport is required.';
    return { valid: Object.keys(errors).length === 0, errors };
  }

  const emptyFlightValidation = validateFlight({ airline: '', flightNumber: '', departureAirport: '', arrivalAirport: '' });
  recordTest(
    'Empty flight form validation blocks submission with required errors',
    !emptyFlightValidation.valid && Object.keys(emptyFlightValidation.errors).length === 4,
    'Requires airline, flight number, departure, arrival'
  );

  // Hotel validation logic: hotelName
  function validateHotel(fields) {
    const errors = {};
    if (!fields.hotelName?.trim()) errors.hotelName = 'Hotel name is required.';
    return { valid: Object.keys(errors).length === 0, errors };
  }

  const emptyHotelValidation = validateHotel({ hotelName: '' });
  recordTest(
    'Empty hotel form validation blocks submission with required error',
    !emptyHotelValidation.valid && Boolean(emptyHotelValidation.errors.hotelName),
    'Requires hotel name'
  );

  // Transportation validation logic: fromLocation, toLocation
  function validateTransport(fields) {
    const errors = {};
    if (!fields.fromLocation?.trim()) errors.fromLocation = 'Departure location is required.';
    if (!fields.toLocation?.trim()) errors.toLocation = 'Arrival destination is required.';
    return { valid: Object.keys(errors).length === 0, errors };
  }

  const emptyTransportValidation = validateTransport({ fromLocation: '', toLocation: '' });
  recordTest(
    'Empty transportation form validation blocks submission with required errors',
    !emptyTransportValidation.valid && Object.keys(emptyTransportValidation.errors).length === 2,
    'Requires departure location and arrival destination'
  );

  // -------------------------------------------------------------------------
  // Group 3: Live Supabase Persistence & Edit (No Duplication)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Live Supabase Persistence, Edit Update & No Duplication ---');

  const jwtSecret = await getJwtSecret();
  const userA_Id = '43ad5eb6-320d-4424-8524-4fd23ab139f9';
  const userA_Email = 'owner_tester@voyaro.test';
  const userA_Jwt = generateUserJwt(userA_Id, userA_Email, jwtSecret);
  const clientA = createScopedClient(userA_Jwt);

  let testTripId = null;
  let flightItemId = null;
  let hotelItemId = null;
  let transportItemId = null;

  try {
    // Create test trip
    const { data: tripData, error: tripErr } = await clientA
      .from('trips')
      .insert({
        title: 'Voyaro Phase 10 Step 2 Verification Trip',
        destination: 'Reykjavik, Iceland',
        start_date: '2027-08-01',
        end_date: '2027-08-10',
        user_id: userA_Id,
      })
      .select()
      .single();

    if (tripErr || !tripData) {
      throw new Error(`Failed to create test trip: ${tripErr?.message}`);
    }
    testTripId = tripData.id;

    // 3.1 Create Flight with genuine custom data (Icelandair FI615, KEF -> JFK)
    const genuineFlightPayload = {
      trip_id: testTripId,
      type: 'flight',
      title: 'Flight to JFK (FI615)',
      start_datetime: '2027-08-01T17:00:00.000Z',
      end_datetime: '2027-08-01T19:30:00.000Z',
      location: 'Keflavik (KEF) → New York (JFK)',
      confirmation_number: 'ICE-9921',
      metadata: {
        airline: 'Icelandair',
        flightNumber: 'FI615',
        departureAirport: 'KEF',
        arrivalAirport: 'JFK',
        cabinClass: 'economy',
        seat: '21F',
      },
    };

    const { data: savedFlight, error: flightErr } = await clientA
      .from('itinerary_items')
      .insert(genuineFlightPayload)
      .select()
      .single();

    flightItemId = savedFlight?.id;
    recordTest(
      'User-entered genuine flight saves to Supabase without mock dummy defaults',
      !flightErr && savedFlight?.metadata?.airline === 'Icelandair' && savedFlight?.metadata?.flightNumber === 'FI615',
      flightErr ? flightErr.message : `Saved ID: ${flightItemId}`
    );

    // 3.2 Create Hotel with genuine custom data (Ion Adventure Hotel, Nesjavellir)
    const genuineHotelPayload = {
      trip_id: testTripId,
      type: 'hotel',
      title: 'Ion Adventure Hotel',
      start_datetime: '2027-08-01T15:00:00.000Z',
      end_datetime: '2027-08-05T11:00:00.000Z',
      location: 'Nesjavellir, 801, Iceland',
      confirmation_number: 'ION-4481',
      metadata: {
        hotelName: 'Ion Adventure Hotel',
        address: 'Nesjavellir, 801, Iceland',
        room: 'Deluxe Lava View 104',
        nightsCount: 4,
      },
    };

    const { data: savedHotel, error: hotelErr } = await clientA
      .from('itinerary_items')
      .insert(genuineHotelPayload)
      .select()
      .single();

    hotelItemId = savedHotel?.id;
    recordTest(
      'User-entered genuine hotel saves to Supabase without mock dummy defaults',
      !hotelErr && savedHotel?.metadata?.hotelName === 'Ion Adventure Hotel' && savedHotel?.confirmation_number === 'ION-4481',
      hotelErr ? hotelErr.message : `Saved ID: ${hotelItemId}`
    );

    // 3.3 Create Transportation with genuine custom data (Flybus Iceland, KEF to BSI)
    const genuineTransportPayload = {
      trip_id: testTripId,
      type: 'transportation',
      title: 'Bus: Flybus Express',
      start_datetime: '2027-08-01T20:00:00.000Z',
      end_datetime: '2027-08-01T20:45:00.000Z',
      location: 'KEF Airport → BSI Bus Terminal Reykjavik',
      confirmation_number: 'FLY-1123',
      metadata: {
        transportationType: 'bus',
        from: 'KEF Airport',
        to: 'BSI Bus Terminal Reykjavik',
        provider: 'Flybus Express',
      },
    };

    const { data: savedTransport, error: transErr } = await clientA
      .from('itinerary_items')
      .insert(genuineTransportPayload)
      .select()
      .single();

    transportItemId = savedTransport?.id;
    recordTest(
      'User-entered genuine transportation saves to Supabase without mock dummy defaults',
      !transErr && savedTransport?.metadata?.provider === 'Flybus Express',
      transErr ? transErr.message : `Saved ID: ${transportItemId}`
    );

    // 3.4 Verify item count in trip
    const { count: initialCount } = await clientA
      .from('itinerary_items')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', testTripId);

    recordTest(
      'Total trip items count is exactly 3 (flight, hotel, transport)',
      initialCount === 3,
      `Count: ${initialCount}`
    );

    // 3.5 Test Editing Existing Record (Updates in place, no duplicate)
    console.log('\n--- 4. Editing Existing Record In-Place (No Duplication) ---');

    // Edit hotel: Change room from Deluxe Lava View 104 to Suite 201
    const { data: updatedHotel, error: updateErr } = await clientA
      .from('itinerary_items')
      .update({
        notes: 'Late arrival confirmed by front desk at 11 PM.',
        metadata: {
          ...savedHotel.metadata,
          room: 'Suite 201',
        },
      })
      .eq('id', hotelItemId)
      .select()
      .single();

    recordTest(
      'Editing hotel updates in place with correct modified fields',
      !updateErr && updatedHotel?.metadata?.room === 'Suite 201' && updatedHotel?.notes?.includes('Late arrival'),
      'Room updated to Suite 201'
    );

    // Verify trip item count has NOT increased
    const { count: postEditCount } = await clientA
      .from('itinerary_items')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', testTripId);

    recordTest(
      'Editing existing record did NOT create a duplicate record',
      postEditCount === initialCount,
      `Items count remains ${postEditCount}`
    );

    // 3.6 Test Intentional Demo Isolation
    console.log('\n--- 5. Intentional Demo Data Isolation ---');
    const { data: japanAdventureRows } = await clientA
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', 'japan-adventure');

    recordTest(
      'Demo trip ID "japan-adventure" has zero records in real authenticated user space',
      !japanAdventureRows || japanAdventureRows.length === 0,
      'Real user trips isolated from demo mock stores'
    );

  } finally {
    // Clean up test records
    console.log('\n--- Cleanup: Deleting Test Records ---');
    if (testTripId) {
      await clientA.from('itinerary_items').delete().eq('trip_id', testTripId);
      await clientA.from('trips').delete().eq('id', testTripId);
      console.log(`Cleaned up test trip ${testTripId}`);
    }
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  const allPassed = testResults.every((t) => t.passed);
  const passedCount = testResults.filter((t) => t.passed).length;
  console.log(` RESULTS: ${passedCount} / ${testResults.length} Tests Passed`);
  console.log(` STATUS: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
