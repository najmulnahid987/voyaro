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
function recordResult(testName, passed, details = '') {
  testResults.push({ testName, passed, details });
  console.log(`${passed ? '✅ [PASS]' : '❌ [FAIL]'} ${testName} ${details ? `(${details})` : ''}`);
}

async function runStep7PermissionsTest() {
  console.log('================================================================');
  console.log('  VOYARO PHASE 8 — STEP 7: COMPREHENSIVE PERMISSIONS MATRIX TEST');
  console.log('================================================================\n');

  const jwtSecret = await getJwtSecret();
  if (!jwtSecret) {
    throw new Error('Failed to retrieve JWT secret from management API.');
  }

  // Exact registered test personas
  const ownerId = '43ad5eb6-320d-4424-8524-4fd23ab139f9';
  const ownerEmail = 'owner_tester@voyaro.test';

  const editorId = '288d3ba5-2c51-4170-9f9e-e725d2e6a768';
  const editorEmail = 'collaborator_tester@voyaro.test';

  const viewerId = '7ab7197c-aecf-4d8c-b2fb-51916cc6d2af';
  const viewerEmail = 'viewer_tester@voyaro.test';

  const outsiderId = 'ba03a532-a5e2-4735-a681-30d0fa851412';
  const outsiderEmail = 'outsider_tester@voyaro.test';

  console.log('Personas initialized:');
  console.log(' - Owner:     ', ownerEmail, `(${ownerId})`);
  console.log(' - Editor:    ', editorEmail, `(${editorId})`);
  console.log(' - Viewer:    ', viewerEmail, `(${viewerId})`);
  console.log(' - Non-Member:', outsiderEmail, `(${outsiderId})`);
  console.log('');

  // Scoped Supabase Clients
  const ownerClient = createScopedClient(generateUserJwt(ownerId, ownerEmail, jwtSecret));
  const editorClient = createScopedClient(generateUserJwt(editorId, editorEmail, jwtSecret));
  const viewerClient = createScopedClient(generateUserJwt(viewerId, viewerEmail, jwtSecret));
  const outsiderClient = createScopedClient(generateUserJwt(outsiderId, outsiderEmail, jwtSecret));

  // Create a clean dedicated test trip using Owner client
  const { data: createdTrip, error: createTripErr } = await ownerClient
    .from('trips')
    .insert({
      title: 'Permissions Matrix Grand Tour',
      destination: 'Kyoto · Tokyo',
      start_date: '2028-11-01',
      end_date: '2028-11-15',
      traveler_count: 3,
      status: 'upcoming',
      user_id: ownerId,
    })
    .select()
    .single();

  if (createTripErr || !createdTrip) {
    throw new Error(`Failed to create test trip: ${createTripErr?.message}`);
  }

  const tripId = createdTrip.id;
  console.log(`Created test trip ID: ${tripId}\n`);

  // Add Editor and Viewer to trip_members
  await executeSql(`
    INSERT INTO public.trip_members (trip_id, user_id, role)
    VALUES 
      ('${tripId}', '${editorId}', 'editor'),
      ('${tripId}', '${viewerId}', 'viewer')
    ON CONFLICT (trip_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  `);

  try {
    // -------------------------------------------------------------------------
    // TEST SECTION A: READ PERMISSIONS ACROSS ROLES
    // -------------------------------------------------------------------------
    console.log('--- SECTION A: READ PERMISSIONS ---');

    // A1: Owner read trip
    const { data: ownerTrip, error: ownerTripErr } = await ownerClient.from('trips').select('*').eq('id', tripId).single();
    recordResult('Owner can read trip details', !ownerTripErr && ownerTrip?.id === tripId);

    // A2: Editor read trip
    const { data: editorTrip, error: editorTripErr } = await editorClient.from('trips').select('*').eq('id', tripId).single();
    recordResult('Editor can read shared trip', !editorTripErr && editorTrip?.id === tripId);

    // A3: Viewer read trip
    const { data: viewerTrip, error: viewerTripErr } = await viewerClient.from('trips').select('*').eq('id', tripId).single();
    recordResult('Viewer can read shared trip', !viewerTripErr && viewerTrip?.id === tripId);

    // A4: Non-Member read trip (Should return NULL/empty)
    const { data: outsiderTrip, error: outsiderTripErr } = await outsiderClient.from('trips').select('*').eq('id', tripId).maybeSingle();
    recordResult('Non-Member cannot read private trip', outsiderTrip === null, outsiderTrip ? 'Found trip!' : 'Access denied as expected');

    // -------------------------------------------------------------------------
    // TEST SECTION B: ITINERARY ITEMS (ADD / EDIT / DELETE)
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION B: ITINERARY ITEMS PERMISSIONS ---');

    // B1: Editor can create an itinerary item
    const { data: editorItem, error: editorItemCreateErr } = await editorClient
      .from('itinerary_items')
      .insert({
        trip_id: tripId,
        title: 'Editor Activity: Fushimi Inari Shrine',
        type: 'activity',
        start_datetime: '2028-11-02T09:00:00Z',
        end_datetime: '2028-11-02T12:00:00Z',
        location: 'Kyoto',
      })
      .select()
      .single();
    recordResult('Editor can create itinerary item', !editorItemCreateErr && !!editorItem, editorItemCreateErr?.message);

    // B2: Editor can update their created item
    let editorUpdateSuccess = false;
    if (editorItem) {
      const { data: editorUpdated, error: editorUpdateErr } = await editorClient
        .from('itinerary_items')
        .update({ title: 'Editor Activity: Fushimi Inari Morning Walk' })
        .eq('id', editorItem.id)
        .select();
      editorUpdateSuccess = !editorUpdateErr && editorUpdated?.length > 0;
      recordResult('Editor can update itinerary item', editorUpdateSuccess, editorUpdateErr?.message);
    }

    // B3: Viewer CANNOT create an itinerary item
    const { data: viewerItem, error: viewerItemCreateErr } = await viewerClient
      .from('itinerary_items')
      .insert({
        trip_id: tripId,
        title: 'Viewer Attempt: Tea Ceremony',
        type: 'activity',
        start_datetime: '2028-11-03T15:00:00Z',
      })
      .select()
      .maybeSingle();
    recordResult(
      'Viewer CANNOT create itinerary item (RLS Denied)',
      !viewerItem && !!viewerItemCreateErr,
      viewerItemCreateErr ? viewerItemCreateErr.message : 'Viewer insertion allowed improperly'
    );

    // B4: Viewer CANNOT update an itinerary item
    if (editorItem) {
      const { data: viewerUpdated, error: viewerUpdateErr } = await viewerClient
        .from('itinerary_items')
        .update({ title: 'Viewer Hacked Title' })
        .eq('id', editorItem.id)
        .select();
      const { data: currentItem } = await ownerClient.from('itinerary_items').select('*').eq('id', editorItem.id).single();
      const prevented = (viewerUpdateErr !== null || (viewerUpdated && viewerUpdated.length === 0)) && currentItem?.title !== 'Viewer Hacked Title';
      recordResult(
        'Viewer CANNOT update itinerary item (RLS Denied)',
        prevented,
        prevented ? 'RLS filtered 0 rows, title unchanged' : 'Viewer update allowed improperly'
      );
    }

    // B5: Viewer CANNOT delete an itinerary item
    if (editorItem) {
      const { data: viewerDeleted, error: viewerDeleteErr } = await viewerClient
        .from('itinerary_items')
        .delete()
        .eq('id', editorItem.id)
        .select();
      const { data: currentItem } = await ownerClient.from('itinerary_items').select('*').eq('id', editorItem.id).single();
      const prevented = (viewerDeleteErr !== null || (viewerDeleted && viewerDeleted.length === 0)) && currentItem !== null;
      recordResult(
        'Viewer CANNOT delete itinerary item (RLS Denied)',
        prevented,
        prevented ? 'RLS filtered 0 rows, item preserved' : 'Viewer delete allowed improperly'
      );
    }

    // B6: Non-Member CANNOT create an itinerary item
    const { data: outsiderItem, error: outsiderItemCreateErr } = await outsiderClient
      .from('itinerary_items')
      .insert({
        trip_id: tripId,
        title: 'Outsider Activity',
        type: 'activity',
        start_datetime: '2028-11-04T10:00:00Z',
      })
      .select()
      .maybeSingle();
    recordResult(
      'Non-Member CANNOT create itinerary item (RLS Denied)',
      !outsiderItem && !!outsiderItemCreateErr,
      outsiderItemCreateErr ? outsiderItemCreateErr.message : 'Outsider insertion allowed improperly'
    );

    // B7: Owner can delete the itinerary item
    if (editorItem) {
      const { error: ownerDeleteErr } = await ownerClient
        .from('itinerary_items')
        .delete()
        .eq('id', editorItem.id);
      recordResult('Owner can delete itinerary item', !ownerDeleteErr, ownerDeleteErr?.message);
    }

    // -------------------------------------------------------------------------
    // TEST SECTION C: EXPENSES (ADD / EDIT / DELETE)
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION C: EXPENSES PERMISSIONS ---');

    // C1: Editor can create an expense
    const { data: editorExpense, error: editorExpenseCreateErr } = await editorClient
      .from('expenses')
      .insert({
        trip_id: tripId,
        amount: 8500, // bigint cents
        currency: 'USD',
        category: 'food_drinks',
        title: 'Editor Lunch: Kyoto Ramen',
        expense_date: '2028-11-02',
        paid_by: editorId,
      })
      .select()
      .single();
    recordResult('Editor can create expense', !editorExpenseCreateErr && !!editorExpense, editorExpenseCreateErr?.message);

    // C2: Editor can update the expense
    if (editorExpense) {
      const { data: editorExpUpdated, error: editorExpenseUpdateErr } = await editorClient
        .from('expenses')
        .update({ amount: 9500 })
        .eq('id', editorExpense.id)
        .select();
      const updatedOk = !editorExpenseUpdateErr && editorExpUpdated?.length > 0;
      recordResult('Editor can update expense', updatedOk, editorExpenseUpdateErr?.message);
    }

    // C3: Viewer CANNOT create an expense
    const { data: viewerExpense, error: viewerExpenseCreateErr } = await viewerClient
      .from('expenses')
      .insert({
        trip_id: tripId,
        amount: 3000,
        currency: 'USD',
        category: 'transportation',
        title: 'Viewer Subway Ticket',
        expense_date: '2028-11-02',
        paid_by: viewerId,
      })
      .select()
      .maybeSingle();
    recordResult(
      'Viewer CANNOT create expense (RLS Denied)',
      !viewerExpense && !!viewerExpenseCreateErr,
      viewerExpenseCreateErr ? viewerExpenseCreateErr.message : 'Viewer expense allowed improperly'
    );

    // C4: Viewer CANNOT update an expense
    if (editorExpense) {
      const { data: viewerExpUpdated, error: viewerExpenseUpdateErr } = await viewerClient
        .from('expenses')
        .update({ amount: 99900 })
        .eq('id', editorExpense.id)
        .select();
      const { data: currentExpense } = await ownerClient.from('expenses').select('*').eq('id', editorExpense.id).single();
      const expPrevented = (viewerExpenseUpdateErr !== null || (viewerExpUpdated && viewerExpUpdated.length === 0)) && currentExpense?.amount !== 99900;
      recordResult(
        'Viewer CANNOT update expense (RLS Denied)',
        expPrevented,
        expPrevented ? 'RLS filtered 0 rows, amount intact' : 'Viewer expense update allowed improperly'
      );
    }

    // C5: Non-Member CANNOT access or create expense
    const { data: outsiderExpense, error: outsiderExpenseCreateErr } = await outsiderClient
      .from('expenses')
      .insert({
        trip_id: tripId,
        amount: 5000,
        currency: 'USD',
        category: 'food_drinks',
        title: 'Outsider Dining',
        expense_date: '2028-11-02',
        paid_by: outsiderId,
      })
      .select()
      .maybeSingle();
    recordResult(
      'Non-Member CANNOT create expense (RLS Denied)',
      !outsiderExpense && !!outsiderExpenseCreateErr,
      outsiderExpenseCreateErr ? outsiderExpenseCreateErr.message : 'Outsider expense allowed improperly'
    );

    // C6: Owner can delete the expense
    if (editorExpense) {
      const { error: ownerExpenseDeleteErr } = await ownerClient
        .from('expenses')
        .delete()
        .eq('id', editorExpense.id);
      recordResult('Owner can delete expense', !ownerExpenseDeleteErr, ownerExpenseDeleteErr?.message);
    }

    // -------------------------------------------------------------------------
    // TEST SECTION D: TRIP BUDGETS (MVP RULE: ONLY OWNER CAN MODIFY)
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION D: TRIP BUDGETS PERMISSIONS ---');

    // D1: Owner can set / update trip budget
    const { data: ownerBudget, error: ownerBudgetErr } = await ownerClient
      .from('trip_budgets')
      .upsert({
        trip_id: tripId,
        amount: 6500,
        currency: 'USD',
      })
      .select()
      .single();
    recordResult('Owner can modify trip budget', !ownerBudgetErr && !!ownerBudget, ownerBudgetErr?.message);

    // D2: Editor can READ trip budget
    const { data: editorReadBudget, error: editorReadBudgetErr } = await editorClient
      .from('trip_budgets')
      .select('*')
      .eq('trip_id', tripId)
      .maybeSingle();
    recordResult('Editor can read trip budget', !editorReadBudgetErr && editorReadBudget?.amount === 6500, editorReadBudgetErr?.message);

    // D3: Viewer can READ trip budget
    const { data: viewerReadBudget, error: viewerReadBudgetErr } = await viewerClient
      .from('trip_budgets')
      .select('*')
      .eq('trip_id', tripId)
      .maybeSingle();
    recordResult('Viewer can read trip budget', !viewerReadBudgetErr && viewerReadBudget?.amount === 6500, viewerReadBudgetErr?.message);

    // D4: Editor CANNOT modify trip budget in this MVP
    const { data: editorModifiedBudget, error: editorModifyBudgetErr } = await editorClient
      .from('trip_budgets')
      .update({ amount: 99999 })
      .eq('trip_id', tripId)
      .select();
    const { data: checkBudgetAfterEditor } = await ownerClient.from('trip_budgets').select('*').eq('trip_id', tripId).single();
    const editorBudgetBlocked = (editorModifyBudgetErr !== null || (editorModifiedBudget && editorModifiedBudget.length === 0)) && checkBudgetAfterEditor?.amount === 6500;
    recordResult(
      'Editor CANNOT modify trip budget in MVP (RLS Denied)',
      editorBudgetBlocked,
      editorBudgetBlocked ? 'RLS filtered 0 rows, budget intact' : 'Editor budget modification allowed improperly'
    );

    // D5: Viewer CANNOT modify trip budget
    const { data: viewerModifiedBudget, error: viewerModifyBudgetErr } = await viewerClient
      .from('trip_budgets')
      .update({ amount: 10 })
      .eq('trip_id', tripId)
      .select();
    const { data: checkBudgetAfterViewer } = await ownerClient.from('trip_budgets').select('*').eq('trip_id', tripId).single();
    const viewerBudgetBlocked = (viewerModifyBudgetErr !== null || (viewerModifiedBudget && viewerModifiedBudget.length === 0)) && checkBudgetAfterViewer?.amount === 6500;
    recordResult(
      'Viewer CANNOT modify trip budget (RLS Denied)',
      viewerBudgetBlocked,
      viewerBudgetBlocked ? 'RLS filtered 0 rows, budget intact' : 'Viewer budget modification allowed improperly'
    );

    // D6: Non-Member CANNOT read trip budget
    const { data: outsiderBudget, error: outsiderBudgetErr } = await outsiderClient
      .from('trip_budgets')
      .select('*')
      .eq('trip_id', tripId)
      .maybeSingle();
    recordResult('Non-Member cannot read trip budget', outsiderBudget === null, outsiderBudget ? 'Budget leaked!' : 'Denied as expected');

    // -------------------------------------------------------------------------
    // TEST SECTION E: TRIP SETTINGS & DELETION
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION E: TRIP SETTINGS & DELETION ---');

    // E1: Owner can update trip details
    const { error: ownerTripUpdateErr } = await ownerClient
      .from('trips')
      .update({ title: 'Permissions Matrix Grand Tour (Updated)' })
      .eq('id', tripId);
    recordResult('Owner can update trip details', !ownerTripUpdateErr, ownerTripUpdateErr?.message);

    // E2: Editor CANNOT update trip details
    const { data: editorTripUpdated, error: editorTripUpdateErr } = await editorClient
      .from('trips')
      .update({ title: 'Editor Renamed Trip' })
      .eq('id', tripId)
      .select();
    const { data: checkTripAfterEditor } = await ownerClient.from('trips').select('*').eq('id', tripId).single();
    const editorTripBlocked = (editorTripUpdateErr !== null || (editorTripUpdated && editorTripUpdated.length === 0)) && checkTripAfterEditor?.title !== 'Editor Renamed Trip';
    recordResult(
      'Editor CANNOT update trip details (RLS Denied)',
      editorTripBlocked,
      editorTripBlocked ? 'RLS filtered 0 rows, trip details intact' : 'Editor trip update allowed improperly'
    );

    // E3: Viewer CANNOT update trip details
    const { data: viewerTripUpdated, error: viewerTripUpdateErr } = await viewerClient
      .from('trips')
      .update({ title: 'Viewer Renamed Trip' })
      .eq('id', tripId)
      .select();
    const { data: checkTripAfterViewer } = await ownerClient.from('trips').select('*').eq('id', tripId).single();
    const viewerTripBlocked = (viewerTripUpdateErr !== null || (viewerTripUpdated && viewerTripUpdated.length === 0)) && checkTripAfterViewer?.title !== 'Viewer Renamed Trip';
    recordResult(
      'Viewer CANNOT update trip details (RLS Denied)',
      viewerTripBlocked,
      viewerTripBlocked ? 'RLS filtered 0 rows, trip details intact' : 'Viewer trip update allowed improperly'
    );

    // E4: Editor CANNOT delete trip
    const { data: editorTripDeleted, error: editorDeleteTripErr } = await editorClient
      .from('trips')
      .delete()
      .eq('id', tripId)
      .select();
    const { data: checkTripStillExists } = await ownerClient.from('trips').select('*').eq('id', tripId).single();
    const editorDeleteBlocked = (editorDeleteTripErr !== null || (editorTripDeleted && editorTripDeleted.length === 0)) && checkTripStillExists !== null;
    recordResult(
      'Editor CANNOT delete trip (RLS Denied)',
      editorDeleteBlocked,
      editorDeleteBlocked ? 'RLS filtered 0 rows, trip preserved' : 'Editor trip delete allowed improperly'
    );

    // -------------------------------------------------------------------------
    // TEST SECTION F: MEMBERSHIP & INVITATIONS
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION F: MEMBERSHIP & INVITATIONS ---');

    // F1: Owner can create an invitation
    const { data: inviteRes, error: inviteErr } = await ownerClient
      .from('trip_invitations')
      .insert({
        trip_id: tripId,
        inviter_id: ownerId,
        invitee_email: 'newbie_guest@voyaro.test',
        role: 'viewer',
        status: 'pending',
      })
      .select()
      .single();
    recordResult('Owner can create trip invitation', !inviteErr && !!inviteRes?.id, inviteErr?.message);

    // F2: Editor CANNOT create an invitation
    const { data: editorInviteRes, error: editorInviteErr } = await editorClient
      .from('trip_invitations')
      .insert({
        trip_id: tripId,
        inviter_id: editorId,
        invitee_email: 'editor_friend@voyaro.test',
        role: 'viewer',
        status: 'pending',
      })
      .select()
      .maybeSingle();
    recordResult(
      'Editor CANNOT create trip invitation (RLS Denied)',
      !editorInviteRes && !!editorInviteErr,
      editorInviteErr ? editorInviteErr.message : 'Editor invitation creation allowed improperly'
    );

    // F3: Editor CANNOT change member roles
    const { data: editorRoleChanged, error: editorRoleChangeErr } = await editorClient
      .from('trip_members')
      .update({ role: 'editor' })
      .eq('trip_id', tripId)
      .eq('user_id', viewerId)
      .select();
    const { data: checkViewerMember } = await ownerClient.from('trip_members').select('*').eq('trip_id', tripId).eq('user_id', viewerId).single();
    const editorRoleBlocked = (editorRoleChangeErr !== null || (editorRoleChanged && editorRoleChanged.length === 0)) && checkViewerMember?.role === 'viewer';
    recordResult(
      'Editor CANNOT change member roles (RLS Denied)',
      editorRoleBlocked,
      editorRoleBlocked ? 'RLS filtered 0 rows, viewer role preserved' : 'Editor role modification allowed improperly'
    );

    // F4: Viewer CANNOT change member roles
    const { data: viewerRoleChanged, error: viewerRoleChangeErr } = await viewerClient
      .from('trip_members')
      .update({ role: 'owner' })
      .eq('trip_id', tripId)
      .eq('user_id', viewerId)
      .select();
    const { data: checkViewerMember2 } = await ownerClient.from('trip_members').select('*').eq('trip_id', tripId).eq('user_id', viewerId).single();
    const viewerRoleBlocked = (viewerRoleChangeErr !== null || (viewerRoleChanged && viewerRoleChanged.length === 0)) && checkViewerMember2?.role === 'viewer';
    recordResult(
      'Viewer CANNOT change member roles (RLS Denied)',
      viewerRoleBlocked,
      viewerRoleBlocked ? 'RLS filtered 0 rows, viewer role preserved' : 'Viewer role modification allowed improperly'
    );

    // F5: Collaborator can leave the trip (delete own row)
    const { error: viewerLeaveErr } = await viewerClient
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', viewerId);
    recordResult('Viewer can leave trip (delete own membership)', !viewerLeaveErr, viewerLeaveErr?.message);

    // E5: Owner can delete the trip
    const { error: ownerDeleteTripErr } = await ownerClient
      .from('trips')
      .delete()
      .eq('id', tripId);
    recordResult('Owner can delete their trip', !ownerDeleteTripErr, ownerDeleteTripErr?.message);

  } catch (err) {
    console.error('Unexpected error during test execution:', err);
  } finally {
    // Cleanup if trip was not deleted
    await executeSql(`DELETE FROM public.trips WHERE id = '${tripId}';`);
    console.log(`\nCleanup complete for trip ID: ${tripId}`);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  const total = testResults.length;
  const passed = testResults.filter(r => r.passed).length;
  const failed = total - passed;

  console.log('\n================================================================');
  console.log(`  PERMISSIONS MATRIX TEST RESULTS: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep7PermissionsTest().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
