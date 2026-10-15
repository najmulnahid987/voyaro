const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || (env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/) ? env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1].trim() : '');
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || (env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/) ? env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim() : '');
const managementToken = process.env.SUPABASE_ACCESS_TOKEN || (env.match(/SUPABASE_ACCESS_TOKEN=(.*)/) ? env.match(/SUPABASE_ACCESS_TOKEN=(.*)/)[1].trim() : '');
const projectRef = process.env.SUPABASE_PROJECT_REF || (env.match(/SUPABASE_PROJECT_REF=(.*)/) ? env.match(/SUPABASE_PROJECT_REF=(.*)/)[1].trim() : 'ncpepgoukzhacywwiuok');

async function executeSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${managementToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

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
function record(name, passed, detail = '') {
  testResults.push({ name, passed, detail });
  const icon = passed ? '✓ PASS:' : '✗ FAIL:';
  console.log(`  ${icon} ${name}${detail ? ` (${detail})` : ''}`);
}

async function runRegressionSuite() {
  console.log('================================================================');
  console.log(' Voyaro Phase 8 — Comprehensive Regression Test Suite');
  console.log('================================================================\n');

  const jwtSecret = await getJwtSecret();
  const ownerUser = {
    id: '43ad5eb6-320d-4424-8524-4fd23ab139f9',
    email: 'owner_tester@voyaro.test',
  };
  const ownerJwt = generateUserJwt(ownerUser.id, ownerUser.email, jwtSecret);
  const ownerClient = createScopedClient(ownerJwt);

  let testTripId = null;
  let testItemId = null;
  let testExpenseId = null;

  try {
    // -------------------------------------------------------------
    // 1. Authentication Still Works
    // -------------------------------------------------------------
    console.log('--- 1. Regression Check: Authentication ---');
    const { data: profileData, error: profileError } = await ownerClient
      .from('profiles')
      .select('*')
      .eq('id', ownerUser.id)
      .single();

    record(
      'Authenticated client can query own profile',
      !profileError && profileData?.id === ownerUser.id,
      profileError ? profileError.message : `email: ${profileData.email}`
    );

    // Profile update
    const newName = `Regression Tester ${Date.now()}`;
    const { error: updateProfileError } = await ownerClient
      .from('profiles')
      .update({ display_name: newName })
      .eq('id', ownerUser.id);

    record(
      'Authenticated client can update own profile',
      !updateProfileError,
      updateProfileError ? updateProfileError.message : 'Display name updated successfully'
    );

    // -------------------------------------------------------------
    // 2. Home and Trips Querying Still Works
    // -------------------------------------------------------------
    console.log('\n--- 2. Regression Check: Home & Trips Feed ---');
    const { data: tripsData, error: tripsError } = await ownerClient
      .from('trips')
      .select('*, trip_members(role)')
      .order('created_at', { ascending: false });

    record(
      'Owner can list accessible trips with membership info',
      !tripsError && Array.isArray(tripsData) && tripsData.length > 0,
      tripsError ? tripsError.message : `Found ${tripsData?.length} trips`
    );

    // -------------------------------------------------------------
    // 3. Create Trip Still Works (and auto-assigns owner role via trigger)
    // -------------------------------------------------------------
    console.log('\n--- 3. Regression Check: Create Trip & Trigger Verification ---');
    const newTripPayload = {
      title: `Regression Test Trip ${Date.now()}`,
      destination: 'Kyoto, Japan',
      start_date: '2026-11-01',
      end_date: '2026-11-10',
      user_id: ownerUser.id,
    };

    const { data: createdTrip, error: createTripError } = await ownerClient
      .from('trips')
      .insert(newTripPayload)
      .select()
      .single();

    if (createTripError || !createdTrip) {
      throw new Error(`Failed to create test trip: ${createTripError?.message}`);
    }
    testTripId = createdTrip.id;
    record(
      'Owner creates new trip record successfully',
      true,
      `Trip ID: ${testTripId}`
    );

    // Verify handle_new_trip_owner trigger automatically created trip_members row
    const { data: memberRow, error: memberRowError } = await ownerClient
      .from('trip_members')
      .select('*')
      .eq('trip_id', testTripId)
      .eq('user_id', ownerUser.id)
      .single();

    record(
      'Automatic owner membership created by DB trigger handle_new_trip_owner',
      !memberRowError && memberRow?.role === 'owner',
      memberRowError ? memberRowError.message : `Role: ${memberRow?.role}`
    );

    // -------------------------------------------------------------
    // 4. Itinerary CRUD Still Works
    // -------------------------------------------------------------
    console.log('\n--- 4. Regression Check: Itinerary CRUD ---');
    // Create
    const itineraryItemPayload = {
      trip_id: testTripId,
      title: 'Fushimi Inari Morning Hike',
      type: 'activity',
      start_datetime: '2026-11-02T08:00:00Z',
      end_datetime: '2026-11-02T11:00:00Z',
      location: 'Kyoto, Japan',
      notes: 'Wear comfortable walking shoes',
    };

    const { data: createdItem, error: createItemError } = await ownerClient
      .from('itinerary_items')
      .insert(itineraryItemPayload)
      .select()
      .single();

    testItemId = createdItem?.id;
    record(
      'Insert itinerary item',
      !createItemError && !!testItemId,
      createItemError ? createItemError.message : `Item ID: ${testItemId}`
    );

    // Read
    const { data: readItems, error: readItemError } = await ownerClient
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', testTripId);

    record(
      'Read itinerary items for trip',
      !readItemError && readItems?.length === 1 && readItems[0].id === testItemId,
      readItemError ? readItemError.message : `Found ${readItems?.length} item`
    );

    // Update
    const { data: updatedItem, error: updateItemError } = await ownerClient
      .from('itinerary_items')
      .update({ notes: 'Updated: Bring camera and water bottle' })
      .eq('id', testItemId)
      .select()
      .single();

    record(
      'Update itinerary item',
      !updateItemError && updatedItem?.notes.includes('Bring camera'),
      updateItemError ? updateItemError.message : `Updated notes: ${updatedItem?.notes}`
    );

    // Delete
    const { error: deleteItemError } = await ownerClient
      .from('itinerary_items')
      .delete()
      .eq('id', testItemId);

    const { data: remainingItems } = await ownerClient
      .from('itinerary_items')
      .select('*')
      .eq('id', testItemId);

    record(
      'Delete itinerary item',
      !deleteItemError && (!remainingItems || remainingItems.length === 0),
      deleteItemError ? deleteItemError.message : 'Item cleanly deleted'
    );

    // -------------------------------------------------------------
    // 5. Expense CRUD Still Works
    // -------------------------------------------------------------
    console.log('\n--- 5. Regression Check: Expense CRUD ---');
    // Create
    const expensePayload = {
      trip_id: testTripId,
      title: 'Traditional Ryokan Stay',
      amount: 45000, // 450.00 in minor units / cents
      category: 'accommodation',
      expense_date: '2026-11-02',
      currency: 'USD',
      notes: 'Includes kaiseki dinner',
    };

    const { data: createdExpense, error: createExpenseError } = await ownerClient
      .from('expenses')
      .insert(expensePayload)
      .select()
      .single();

    testExpenseId = createdExpense?.id;
    record(
      'Insert expense record',
      !createExpenseError && !!testExpenseId,
      createExpenseError ? createExpenseError.message : `Expense ID: ${testExpenseId}`
    );

    // Read
    const { data: readExpenses, error: readExpenseError } = await ownerClient
      .from('expenses')
      .select('*')
      .eq('trip_id', testTripId);

    record(
      'Read expenses for trip',
      !readExpenseError && readExpenses?.length === 1 && readExpenses[0].id === testExpenseId,
      readExpenseError ? readExpenseError.message : `Found ${readExpenses?.length} expense`
    );

    // Update
    const { data: updatedExpense, error: updateExpenseError } = await ownerClient
      .from('expenses')
      .update({ amount: 50000 }) // Updated to 500.00
      .eq('id', testExpenseId)
      .select()
      .single();

    record(
      'Update expense record',
      !updateExpenseError && updatedExpense?.amount === 50000,
      updateExpenseError ? updateExpenseError.message : `Updated amount: ${updatedExpense?.amount}`
    );

    // Delete
    const { error: deleteExpenseError } = await ownerClient
      .from('expenses')
      .delete()
      .eq('id', testExpenseId);

    const { data: remainingExpenses } = await ownerClient
      .from('expenses')
      .select('*')
      .eq('id', testExpenseId);

    record(
      'Delete expense record',
      !deleteExpenseError && (!remainingExpenses || remainingExpenses.length === 0),
      deleteExpenseError ? deleteExpenseError.message : 'Expense cleanly deleted'
    );

    // -------------------------------------------------------------
    // 6. Budget Calculations Still Work
    // -------------------------------------------------------------
    console.log('\n--- 6. Regression Check: Budget & Analytics Calculations ---');
    // Setup budget of $2000.00 (200,000 minor units)
    const { data: budgetData, error: budgetError } = await ownerClient
      .from('trip_budgets')
      .insert({
        trip_id: testTripId,
        amount: 200000,
        currency: 'USD',
      })
      .select()
      .single();

    record(
      'Insert trip budget record',
      !budgetError && budgetData?.amount === 200000,
      budgetError ? budgetError.message : `Budget amount: ${budgetData?.amount}`
    );

    // Insert sample expenses across different categories
    const testExpenses = [
      { trip_id: testTripId, title: 'Hotel Kyoto', amount: 80000, category: 'accommodation', expense_date: '2026-11-01', currency: 'USD' },
      { trip_id: testTripId, title: 'Shinkansen Bullet Train', amount: 30000, category: 'transportation', expense_date: '2026-11-02', currency: 'USD' },
      { trip_id: testTripId, title: 'Ramen & Matcha', amount: 15000, category: 'food_drinks', expense_date: '2026-11-03', currency: 'USD' },
      { trip_id: testTripId, title: 'Tea Ceremony', amount: 10000, category: 'activities', expense_date: '2026-11-04', currency: 'USD' },
    ];

    const { error: batchInsertError } = await ownerClient
      .from('expenses')
      .insert(testExpenses);

    record(
      'Insert multi-category expenses for budget calculation',
      !batchInsertError,
      batchInsertError ? batchInsertError.message : 'Inserted 4 expenses'
    );

    // Retrieve and compute
    const { data: calcExpenses } = await ownerClient
      .from('expenses')
      .select('amount, category')
      .eq('trip_id', testTripId);

    const totalSpent = (calcExpenses || []).reduce((sum, item) => sum + Number(item.amount), 0);
    const totalBudget = Number(budgetData?.amount || 0);
    const remainingBudget = totalBudget - totalSpent;

    const categoryBreakdown = (calcExpenses || []).reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
      return acc;
    }, {});

    const expectedTotal = 80000 + 30000 + 15000 + 10000; // 135,000 cents ($1,350)
    const expectedRemaining = 200000 - 135000; // 65,000 cents ($650)

    record(
      'Total spent calculation matches sum of expenses',
      totalSpent === expectedTotal,
      `Calculated: ${totalSpent}, Expected: ${expectedTotal}`
    );

    record(
      'Remaining budget calculation matches budget minus spent',
      remainingBudget === expectedRemaining,
      `Calculated: ${remainingBudget}, Expected: ${expectedRemaining}`
    );

    record(
      'Category breakdown math is accurate',
      categoryBreakdown['accommodation'] === 80000 &&
      categoryBreakdown['transportation'] === 30000 &&
      categoryBreakdown['food_drinks'] === 15000 &&
      categoryBreakdown['activities'] === 10000,
      `Accommodation: ${categoryBreakdown['accommodation']}, Transportation: ${categoryBreakdown['transportation']}`
    );

    // -------------------------------------------------------------
    // 7. Membership Remains Correct After App Restart (Simulated State Reload)
    // -------------------------------------------------------------
    console.log('\n--- 7. Regression Check: State Persistence Across Restarts ---');
    // Simulate fresh client instance (cold boot)
    const freshClient = createScopedClient(ownerJwt);
    const { data: reloadedTrip, error: reloadError } = await freshClient
      .from('trips')
      .select('*, trip_members(user_id, role)')
      .eq('id', testTripId)
      .single();

    record(
      'Fresh client instance preserves membership on trip query',
      !reloadError && reloadedTrip?.trip_members?.length === 1 && reloadedTrip.trip_members[0].role === 'owner',
      reloadError ? reloadError.message : `Member role: ${reloadedTrip?.trip_members?.[0]?.role}`
    );

    // -------------------------------------------------------------
    // 8. Navigation & Safe Areas Static Analysis
    // -------------------------------------------------------------
    console.log('\n--- 8. Regression Check: Navigation & Safe Area Structure ---');
    const screenFiles = [
      'src/app/(tabs)/trips/[tripId]/travelers.tsx',
      'src/app/share/[tripId].tsx',
      'src/app/invite/[token].tsx',
      'src/app/(tabs)/trips/[tripId]/index.tsx',
      'src/app/(tabs)/trips/[tripId]/itinerary.tsx',
      'src/app/(tabs)/trips/[tripId]/settings.tsx',
    ];

    let allScreensUseSafeAreas = true;
    for (const file of screenFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const hasSafeArea =
          content.includes('useShellInsets') ||
          content.includes('useSafeAreaInsets') ||
          content.includes('SafeAreaView');
        if (!hasSafeArea) {
          allScreensUseSafeAreas = false;
          record(`Safe area in ${file}`, false, 'Missing safe area hook or view');
        }
      }
    }

    record(
      'All collaboration & trip screens implement safe areas',
      allScreensUseSafeAreas,
      `Audited ${screenFiles.length} screens`
    );

  } catch (err) {
    console.error('Test execution error:', err);
    record('Regression execution', false, err.message);
  } finally {
    // Cleanup test trip
    if (testTripId) {
      console.log('\n--- Cleaning Up Regression Test Artifacts ---');
      await executeSql(`DELETE FROM public.trips WHERE id = '${testTripId}';`);
      console.log('   Regression test trip cleaned up.');
    }
  }

  console.log('\n================================================================');
  const allPassed = testResults.every(r => r.passed);
  const total = testResults.length;
  const passedCount = testResults.filter(r => r.passed).length;
  console.log(` Results: ${passedCount}/${total} tests passed.`);
  if (allPassed) {
    console.log(' ✓ All Regression Checks Succeeded!');
  } else {
    console.log(' ✗ Some Regression Checks Failed!');
  }
  console.log('================================================================\n');
}

runRegressionSuite();
