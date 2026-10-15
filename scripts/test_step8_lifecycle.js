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

async function runStep8LifecycleTest() {
  console.log('================================================================');
  console.log('  VOYARO PHASE 8 — STEP 8: MEMBERSHIP & INVITATION LIFECYCLE');
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
  console.log(' - Invitee:   ', outsiderEmail, `(${outsiderId})`);
  console.log('');

  // Scoped Supabase Clients
  const ownerClient = createScopedClient(generateUserJwt(ownerId, ownerEmail, jwtSecret));
  const editorClient = createScopedClient(generateUserJwt(editorId, editorEmail, jwtSecret));
  const viewerClient = createScopedClient(generateUserJwt(viewerId, viewerEmail, jwtSecret));
  const inviteeClient = createScopedClient(generateUserJwt(outsiderId, outsiderEmail, jwtSecret));

  // 1. Setup a dedicated test trip with owner
  const { data: createdTrip, error: createTripErr } = await ownerClient
    .from('trips')
    .insert({
      title: 'Lifecycle Verification Expedition',
      destination: 'Hokkaido, Japan',
      start_date: '2028-12-01',
      end_date: '2028-12-15',
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

  // 2. Add Editor and Viewer to trip_members
  await executeSql(`
    INSERT INTO public.trip_members (trip_id, user_id, role)
    VALUES 
      ('${tripId}', '${editorId}', 'editor'),
      ('${tripId}', '${viewerId}', 'viewer')
    ON CONFLICT (trip_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  `);

  // 3. Seed an itinerary item and an expense
  const { data: seededItem } = await ownerClient
    .from('itinerary_items')
    .insert({
      trip_id: tripId,
      title: 'Sapporo Snow Festival Tour',
      type: 'activity',
      start_datetime: '2028-12-02T10:00:00Z',
    })
    .select()
    .single();

  const { data: seededExpense } = await ownerClient
    .from('expenses')
    .insert({
      trip_id: tripId,
      title: 'Otaru Seafood Feast',
      category: 'food_drinks',
      amount: 12000,
      currency: 'USD',
      expense_date: '2028-12-02',
      paid_by: ownerId,
    })
    .select()
    .single();

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Owner removes editor
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: OWNER REMOVES EDITOR ---');
    const { data: deleteEditorRows, error: deleteEditorErr } = await ownerClient
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', editorId)
      .select();

    const editorRemovedOk = !deleteEditorErr && deleteEditorRows?.length === 1;
    recordResult('1. Owner successfully removes editor from trip_members', editorRemovedOk, deleteEditorErr?.message);

    // Verify editor is no longer present in trip_members
    const { data: checkMembersAfterEditor } = await ownerClient
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', editorId);
    recordResult('1b. Database confirms editor membership record is deleted', checkMembersAfterEditor?.length === 0);

    // -------------------------------------------------------------------------
    // TEST 2: Removed editor tries to open the trip
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: REMOVED EDITOR TRIES TO OPEN TRIP ---');
    const { data: editorTripRead, error: editorTripReadErr } = await editorClient
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .maybeSingle();

    const editorBlockedFromTrip = editorTripRead === null;
    recordResult(
      '2. Removed editor cannot read private trip (RLS Denied)',
      editorBlockedFromTrip,
      editorBlockedFromTrip ? '0 rows returned' : 'Trip leaked to removed editor!'
    );

    // -------------------------------------------------------------------------
    // TEST 3: Removed editor tries to query an itinerary item
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: REMOVED EDITOR TRIES TO QUERY ITINERARY ITEM ---');
    const { data: editorItemsRead, error: editorItemsReadErr } = await editorClient
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId);

    const editorBlockedFromItems = !editorItemsRead || editorItemsRead.length === 0;
    recordResult(
      '3. Removed editor cannot query itinerary items (RLS Denied)',
      editorBlockedFromItems,
      editorBlockedFromItems ? '0 items returned' : 'Items leaked to removed editor!'
    );

    // Also attempt mutation (insert)
    const { data: editorInsertAttempt, error: editorInsertErr } = await editorClient
      .from('itinerary_items')
      .insert({
        trip_id: tripId,
        title: 'Hacked Item After Removal',
        type: 'activity',
        start_datetime: '2028-12-05T12:00:00Z',
      })
      .select()
      .maybeSingle();
    recordResult(
      '3b. Removed editor cannot insert itinerary items (RLS Denied)',
      !editorInsertAttempt && !!editorInsertErr,
      editorInsertErr ? editorInsertErr.message : 'Insert allowed improperly'
    );

    // -------------------------------------------------------------------------
    // TEST 4: Owner removes viewer
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: OWNER REMOVES VIEWER ---');
    const { data: deleteViewerRows, error: deleteViewerErr } = await ownerClient
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', viewerId)
      .select();

    const viewerRemovedOk = !deleteViewerErr && deleteViewerRows?.length === 1;
    recordResult('4. Owner successfully removes viewer from trip_members', viewerRemovedOk, deleteViewerErr?.message);

    const { data: checkMembersAfterViewer } = await ownerClient
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', viewerId);
    recordResult('4b. Database confirms viewer membership record is deleted', checkMembersAfterViewer?.length === 0);

    // -------------------------------------------------------------------------
    // TEST 5: Viewer tries to access expenses
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: REMOVED VIEWER TRIES TO ACCESS EXPENSES ---');
    const { data: viewerExpensesRead, error: viewerExpensesReadErr } = await viewerClient
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId);

    const viewerBlockedFromExpenses = !viewerExpensesRead || viewerExpensesRead.length === 0;
    recordResult(
      '5. Removed viewer cannot access trip expenses (RLS Denied)',
      viewerBlockedFromExpenses,
      viewerBlockedFromExpenses ? '0 expenses returned' : 'Expenses leaked to removed viewer!'
    );

    // Also attempt reading trip budget
    const { data: viewerBudgetRead } = await viewerClient
      .from('trip_budgets')
      .select('*')
      .eq('trip_id', tripId)
      .maybeSingle();
    recordResult('5b. Removed viewer cannot access trip budget (RLS Denied)', viewerBudgetRead === null);

    // -------------------------------------------------------------------------
    // TEST 6: Owner revokes invitation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: OWNER REVOKES INVITATION ---');
    // First, owner creates an invitation
    const { data: inviteToRevoke, error: createInviteErr } = await ownerClient
      .from('trip_invitations')
      .insert({
        trip_id: tripId,
        inviter_id: ownerId,
        invitee_email: outsiderEmail,
        role: 'editor',
        status: 'pending',
      })
      .select()
      .single();

    recordResult('6a. Owner creates pending invitation for test', !createInviteErr && !!inviteToRevoke?.id, createInviteErr?.message);

    // Owner revokes the invitation
    const { data: revokedRows, error: revokeErr } = await ownerClient
      .from('trip_invitations')
      .update({ status: 'revoked' })
      .eq('id', inviteToRevoke.id)
      .eq('trip_id', tripId)
      .select();

    const revokeOk = !revokeErr && revokedRows?.length === 1 && revokedRows[0].status === 'revoked';
    recordResult('6b. Owner successfully revokes invitation', revokeOk, revokeErr?.message);

    // Non-owner cannot revoke invitations
    const { data: nonOwnerRevokeAttempt, error: nonOwnerRevokeErr } = await inviteeClient
      .from('trip_invitations')
      .update({ status: 'revoked' })
      .eq('id', inviteToRevoke.id)
      .select();
    recordResult(
      '6c. Non-owner CANNOT revoke invitations (RLS Denied)',
      !nonOwnerRevokeAttempt || nonOwnerRevokeAttempt.length === 0,
      '0 rows updated by non-owner'
    );

    // -------------------------------------------------------------------------
    // TEST 7: Invitee attempts acceptance of revoked invitation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: INVITEE ATTEMPTS ACCEPTANCE OF REVOKED INVITATION ---');
    const { data: acceptRevokedRes, error: acceptRevokedRpcErr } = await inviteeClient.rpc('accept_trip_invitation', {
      invitation_token: inviteToRevoke.token,
    });

    const acceptRevokedBlocked = acceptRevokedRes?.success === false && acceptRevokedRes?.error?.includes('revoked');
    recordResult(
      '7. Invitee acceptance of revoked invitation is rejected',
      acceptRevokedBlocked,
      acceptRevokedRes?.error || acceptRevokedRpcErr?.message
    );

    // Verify invitee was NOT added to trip_members
    const { data: checkInviteeMemberRevoked } = await ownerClient
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', outsiderId);
    recordResult('7b. Invitee was NOT granted membership after revoked acceptance attempt', checkInviteeMemberRevoked?.length === 0);

    // -------------------------------------------------------------------------
    // TEST 8: An expired invitation is accepted
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: ATTEMPT TO ACCEPT EXPIRED INVITATION ---');
    // Create an invitation and backdate its expiration
    const { data: expiredInvite, error: createExpiredErr } = await ownerClient
      .from('trip_invitations')
      .insert({
        trip_id: tripId,
        inviter_id: ownerId,
        invitee_email: outsiderEmail,
        role: 'viewer',
        status: 'pending',
        expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      })
      .select()
      .single();

    recordResult('8a. Owner creates invitation with past expiry timestamp', !createExpiredErr && !!expiredInvite?.id, createExpiredErr?.message);

    // Invitee tries to accept the expired invitation token
    const { data: acceptExpiredRes, error: acceptExpiredRpcErr } = await inviteeClient.rpc('accept_trip_invitation', {
      invitation_token: expiredInvite.token,
    });

    const acceptExpiredBlocked = acceptExpiredRes?.success === false && acceptExpiredRes?.error?.includes('expired');
    recordResult(
      '8b. Invitee acceptance of expired invitation is rejected',
      acceptExpiredBlocked,
      acceptExpiredRes?.error || acceptExpiredRpcErr?.message
    );

    // Verify invitee was NOT added to trip_members
    const { data: checkInviteeMemberExpired } = await ownerClient
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', outsiderId);
    recordResult('8c. Invitee was NOT granted membership after expired acceptance attempt', checkInviteeMemberExpired?.length === 0);

    // Verify invitation status transitioned to 'expired'
    const { data: checkInviteStatusExpired } = await ownerClient
      .from('trip_invitations')
      .select('status')
      .eq('id', expiredInvite.id)
      .single();
    recordResult('8d. Database status transitions to "expired"', checkInviteStatusExpired?.status === 'expired');

    // -------------------------------------------------------------------------
    // TEST 9: A user attempts to remove the owner
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: USER ATTEMPTS TO REMOVE TRIP OWNER ---');

    // 9A: Outsider / Non-Owner attempts direct DELETE on owner in trip_members
    const { data: outsiderDeleteOwner, error: outsiderDeleteOwnerErr } = await inviteeClient
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', ownerId)
      .select();
    const outsiderOwnerRemoveBlocked = !outsiderDeleteOwner || outsiderDeleteOwner.length === 0;
    recordResult(
      '9a. Non-owner CANNOT remove owner from trip_members (RLS Denied)',
      outsiderOwnerRemoveBlocked,
      '0 rows deleted'
    );

    // 9B: Owner attempts to remove themselves via ordinary member removal
    const { data: ownerSelfDelete, error: ownerSelfDeleteErr } = await ownerClient
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', ownerId)
      .select();
    const ownerSelfRemoveBlocked = !ownerSelfDelete || ownerSelfDelete.length === 0;
    recordResult(
      '9b. Owner cannot accidentally remove themselves via ordinary removal (RLS role <> owner)',
      ownerSelfRemoveBlocked,
      '0 rows deleted'
    );

    // 9C: Verify owner still authoritatively retains owner role in trip_members
    const { data: ownerMemberVerify } = await ownerClient
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', ownerId)
      .single();
    recordResult(
      '9c. Database confirms owner remains active and intact with "owner" role',
      ownerMemberVerify?.role === 'owner'
    );

  } catch (err) {
    console.error('Unexpected error during test execution:', err);
  } finally {
    // Cleanup test trip
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
  console.log(`  STEP 8 LIFECYCLE TEST RESULTS: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep8LifecycleTest().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
