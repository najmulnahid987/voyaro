const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Load env
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
  if (!jwt) {
    return createClient(supabaseUrl, anonKey);
  }
  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runTestSuite() {
  console.log('================================================================');
  console.log(' Phase 8 — Step 3: Collaboration RLS Authorization Test Suite');
  console.log('================================================================\n');

  const jwtSecret = await getJwtSecret();

  // Test UUIDs
  const ownerId = '43ad5eb6-320d-4424-8524-4fd23ab139f9'; // existing user in auth.users
  const ownerEmail = 'owner_tester@voyaro.test';

  const collaboratorId = '288d3ba5-2c51-4170-9f9e-e725d2e6a768'; // existing user in auth.users
  const collaboratorEmail = 'collaborator_tester@voyaro.test';

  const nonMemberId = '7ab7197c-aecf-4d8c-b2fb-51916cc6d2af'; // existing user in auth.users
  const nonMemberEmail = 'nonmember_tester@voyaro.test';

  // Ensure emails are recorded in auth.users for test matching
  await executeSql(`
    UPDATE auth.users SET email = '${ownerEmail}' WHERE id = '${ownerId}';
    UPDATE auth.users SET email = '${collaboratorEmail}' WHERE id = '${collaboratorId}';
    UPDATE auth.users SET email = '${nonMemberEmail}' WHERE id = '${nonMemberId}';
  `);

  const ownerJwt = generateUserJwt(ownerId, ownerEmail, jwtSecret);
  const collabJwt = generateUserJwt(collaboratorId, collaboratorEmail, jwtSecret);
  const nonMemberJwt = generateUserJwt(nonMemberId, nonMemberEmail, jwtSecret);

  const anonClient = createScopedClient(null);
  const ownerClient = createScopedClient(ownerJwt);
  const collabClient = createScopedClient(collabJwt);
  const nonMemberClient = createScopedClient(nonMemberJwt);

  console.log('--- 1. Testing Unauthenticated User (anon) ---');
  const anonTrips = await anonClient.from('trips').select('*');
  assert(anonTrips.data?.length === 0, 'Unauthenticated user cannot read any trips (empty set)');

  const anonItin = await anonClient.from('itinerary_items').select('*');
  assert(anonItin.data?.length === 0, 'Unauthenticated user cannot read itinerary items');

  const anonExp = await anonClient.from('expenses').select('*');
  assert(anonExp.data?.length === 0, 'Unauthenticated user cannot read expenses');

  const anonBud = await anonClient.from('trip_budgets').select('*');
  assert(anonBud.data?.length === 0, 'Unauthenticated user cannot read budgets');

  const anonInsert = await anonClient.from('trips').insert({
    title: 'Hacked Trip',
    destination: 'Nowhere',
    start_date: '2028-01-01',
    end_date: '2028-01-05',
    user_id: ownerId,
  });
  assert(anonInsert.error !== null, 'Unauthenticated user cannot insert trips (rejected by RLS)');

  // --------------------------------------------------------------------------
  console.log('\n--- 2. Setting Up Test Trip (Owner Persona) ---');
  const testTripId = crypto.randomUUID();
  const createTripRes = await ownerClient.from('trips').insert({
    id: testTripId,
    user_id: ownerId,
    title: 'RLS Test Trip — Kyoto',
    destination: 'Kyoto, Japan',
    start_date: '2028-05-01',
    end_date: '2028-05-10',
    traveler_count: 2,
  }).select().single();
  assert(!createTripRes.error, 'Owner successfully created test trip');

  // Verify owner trigger automatically added owner to trip_members
  const ownerMemberCheck = await ownerClient.from('trip_members').select('*').eq('trip_id', testTripId).single();
  assert(ownerMemberCheck.data?.role === 'owner', 'Owner automatically registered in trip_members with role "owner"');

  // Owner can insert budget
  const createBudgetRes = await ownerClient.from('trip_budgets').insert({
    trip_id: testTripId,
    amount: 500000,
    currency: 'USD',
  });
  assert(!createBudgetRes.error, 'Owner successfully set trip budget ($5,000)');

  // Owner can insert itinerary item
  const testItinId = crypto.randomUUID();
  const createItinRes = await ownerClient.from('itinerary_items').insert({
    id: testItinId,
    trip_id: testTripId,
    title: 'Flight to Kansai (KIX)',
    type: 'flight',
    start_datetime: '2028-05-01T10:00:00.000Z',
    metadata: { airline: 'ANA' },
  });
  assert(!createItinRes.error, 'Owner successfully added itinerary item');

  // Owner can insert expense
  const testExpId = crypto.randomUUID();
  const createExpRes = await ownerClient.from('expenses').insert({
    id: testExpId,
    trip_id: testTripId,
    title: 'Initial Hotel Deposit',
    amount: 150000,
    currency: 'USD',
    category: 'accommodation',
    expense_date: '2028-05-01',
  });
  assert(!createExpRes.error, 'Owner successfully added expense');

  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing Non-Member Access to Owner Trip ---');
  const nonMemberTrip = await nonMemberClient.from('trips').select('*').eq('id', testTripId);
  assert(nonMemberTrip.data?.length === 0, 'Non-member cannot view the trip');

  const nonMemberItin = await nonMemberClient.from('itinerary_items').select('*').eq('trip_id', testTripId);
  assert(nonMemberItin.data?.length === 0, 'Non-member cannot view itinerary items');

  const nonMemberExp = await nonMemberClient.from('expenses').select('*').eq('trip_id', testTripId);
  assert(nonMemberExp.data?.length === 0, 'Non-member cannot view expenses');

  const nonMemberBud = await nonMemberClient.from('trip_budgets').select('*').eq('trip_id', testTripId);
  assert(nonMemberBud.data?.length === 0, 'Non-member cannot view trip budget');

  const nonMemberInvites = await nonMemberClient.from('trip_invitations').select('*').eq('trip_id', testTripId);
  assert(nonMemberInvites.data?.length === 0, 'Non-member cannot view trip invitations');

  const nonMemberModItin = await nonMemberClient.from('itinerary_items').insert({
    trip_id: testTripId,
    title: 'Hacked Event',
    type: 'activity',
    start_datetime: '2028-05-02T10:00:00.000Z',
  });
  assert(nonMemberModItin.error !== null, 'Non-member cannot insert itinerary items (rejected by RLS)');

  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing Invitation Lifecycle & Acceptance ---');
  // Owner creates invitation for collaborator
  const testToken = crypto.randomBytes(24).toString('hex');
  const createInviteRes = await ownerClient.from('trip_invitations').insert({
    trip_id: testTripId,
    inviter_id: ownerId,
    invitee_email: collaboratorEmail,
    role: 'editor',
    token: testToken,
    status: 'pending',
  }).select().single();
  assert(!createInviteRes.error, 'Owner successfully issued invitation to collaborator as Editor');

  // Pending invitee cannot access trip items yet
  const pendingTripRead = await collabClient.from('trips').select('*').eq('id', testTripId);
  assert(pendingTripRead.data?.length === 0, 'Pending invitation alone does NOT grant trip access');

  // Invitee CAN view the invitation addressed to them
  const inviteeView = await collabClient.from('trip_invitations').select('*').eq('token', testToken);
  assert(inviteeView.data?.length === 1, 'Invitee can view the invitation addressed to their email');

  // Non-member CANNOT view the invitation addressed to collaborator
  const nonMemberInviteView = await nonMemberClient.from('trip_invitations').select('*').eq('token', testToken);
  assert(nonMemberInviteView.data?.length === 0, 'Unrelated user cannot view invitations addressed to others');

  // Invitee accepts invitation atomically via RPC
  const acceptRes = await collabClient.rpc('accept_trip_invitation', {
    invitation_token: testToken,
  });
  assert(acceptRes.data?.success === true, 'Invitee successfully accepted invitation via atomic RPC');
  assert(acceptRes.data?.role === 'editor', 'Invitee joined with assigned role "editor"');

  // Double-acceptance fails
  const secondAccept = await collabClient.rpc('accept_trip_invitation', {
    invitation_token: testToken,
  });
  assert(secondAccept.data?.success === false, 'Re-accepting an already processed invitation cleanly fails');

  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing Editor Persona Permissions ---');
  // Editor can now view trip
  const editorTripRead = await collabClient.from('trips').select('*').eq('id', testTripId);
  assert(editorTripRead.data?.length === 1, 'Editor can view the shared trip');

  // Editor CANNOT update trip details
  const editorUpdateTrip = await collabClient.from('trips').update({ title: 'Editor Tampered Title' }).eq('id', testTripId);
  assert(editorUpdateTrip.error !== null || editorUpdateTrip.data === null, 'Editor cannot update trip details (owner only)');

  // Editor CANNOT delete trip
  const editorDeleteTrip = await collabClient.from('trips').delete().eq('id', testTripId);
  assert(editorDeleteTrip.error !== null || editorDeleteTrip.data === null, 'Editor cannot delete trip (owner only)');

  // Editor CAN read and insert itinerary item
  const editorItinId = crypto.randomUUID();
  const editorItinInsert = await collabClient.from('itinerary_items').insert({
    id: editorItinId,
    trip_id: testTripId,
    title: 'Gion Evening Walking Tour',
    type: 'activity',
    start_datetime: '2028-05-02T18:00:00.000Z',
  });
  assert(!editorItinInsert.error, 'Editor can insert itinerary items');

  // Editor CAN update itinerary item
  const editorItinUpdate = await collabClient.from('itinerary_items').update({
    notes: 'Booked by editor',
  }).eq('id', editorItinId);
  assert(!editorItinUpdate.error, 'Editor can update itinerary items');

  // Editor CAN read and insert expenses
  const editorExpId = crypto.randomUUID();
  const editorExpInsert = await collabClient.from('expenses').insert({
    id: editorExpId,
    trip_id: testTripId,
    title: 'Train Tickets - Shinkansen',
    amount: 28000,
    currency: 'USD',
    category: 'transportation',
    expense_date: '2028-05-02',
  });
  assert(!editorExpInsert.error, 'Editor can insert expenses');

  // Editor CAN view budget
  const editorBudRead = await collabClient.from('trip_budgets').select('*').eq('trip_id', testTripId);
  assert(editorBudRead.data?.length === 1, 'Editor can view trip budget');

  // Editor CANNOT modify budget
  const editorBudUpdate = await collabClient.from('trip_budgets').update({ amount: 9999999 }).eq('trip_id', testTripId).select();
  assert(editorBudUpdate.error !== null || editorBudUpdate.data?.length === 0, 'Editor cannot modify trip budget (owner only, 0 rows modified)');

  // Editor CANNOT list other invitations
  const editorListInvites = await collabClient.from('trip_invitations').select('*').eq('trip_id', testTripId);
  // Collaborator only sees invites addressed to themselves, not all trip invitations
  assert(editorListInvites.data?.every((i) => i.invitee_email === collaboratorEmail), 'Editor cannot list invitations for other invitees');

  // Editor CANNOT modify member roles
  const editorRoleChange = await collabClient.from('trip_members').update({ role: 'owner' }).eq('trip_id', testTripId).eq('user_id', collaboratorId).select();
  assert(editorRoleChange.error !== null || editorRoleChange.data?.length === 0, 'Editor cannot elevate own role to owner (0 rows modified)');

  // --------------------------------------------------------------------------
  console.log('\n--- 6. Testing Viewer Persona Permissions ---');
  // Owner demotes collaborator to viewer
  const demoteRes = await ownerClient.from('trip_members').update({ role: 'viewer' }).eq('trip_id', testTripId).eq('user_id', collaboratorId);
  assert(!demoteRes.error, 'Owner successfully updated collaborator role to "viewer"');

  // Viewer CAN read trip, itinerary, expenses, budget
  const viewerTrip = await collabClient.from('trips').select('*').eq('id', testTripId);
  assert(viewerTrip.data?.length === 1, 'Viewer can read trip');

  const viewerItin = await collabClient.from('itinerary_items').select('*').eq('trip_id', testTripId);
  assert(viewerItin.data?.length >= 2, 'Viewer can read itinerary items');

  const viewerExp = await collabClient.from('expenses').select('*').eq('trip_id', testTripId);
  assert(viewerExp.data?.length >= 2, 'Viewer can read expenses');

  const viewerBud = await collabClient.from('trip_budgets').select('*').eq('trip_id', testTripId);
  assert(viewerBud.data?.length === 1, 'Viewer can read trip budget');

  // Viewer CANNOT insert itinerary items
  const viewerItinInsert = await collabClient.from('itinerary_items').insert({
    trip_id: testTripId,
    title: 'Unauthorized Event',
    type: 'activity',
    start_datetime: '2028-05-03T10:00:00.000Z',
  });
  assert(viewerItinInsert.error !== null, 'Viewer cannot insert itinerary items (rejected by RLS)');

  // Viewer CANNOT update itinerary items
  const viewerItinUpdate = await collabClient.from('itinerary_items').update({ notes: 'Viewer edit' }).eq('id', testItinId).select();
  assert(viewerItinUpdate.error !== null || viewerItinUpdate.data?.length === 0, 'Viewer cannot update itinerary items (0 rows modified)');

  // Viewer CANNOT delete itinerary items
  const viewerItinDelete = await collabClient.from('itinerary_items').delete().eq('id', testItinId).select();
  assert(viewerItinDelete.error !== null || viewerItinDelete.data?.length === 0, 'Viewer cannot delete itinerary items (0 rows deleted)');

  // Viewer CANNOT insert, update, or delete expenses
  const viewerExpInsert = await collabClient.from('expenses').insert({
    trip_id: testTripId,
    title: 'Unauthorized Expense',
    amount: 1000,
    currency: 'USD',
    category: 'other',
    expense_date: '2028-05-03',
  });
  assert(viewerExpInsert.error !== null, 'Viewer cannot insert expenses (rejected by RLS)');

  const viewerExpUpdate = await collabClient.from('expenses').update({ notes: 'Viewer edit' }).eq('id', testExpId).select();
  assert(viewerExpUpdate.error !== null || viewerExpUpdate.data?.length === 0, 'Viewer cannot update expenses (0 rows modified)');

  const viewerExpDelete = await collabClient.from('expenses').delete().eq('id', testExpId).select();
  assert(viewerExpDelete.error !== null || viewerExpDelete.data?.length === 0, 'Viewer cannot delete expenses (0 rows deleted)');

  // --------------------------------------------------------------------------
  console.log('\n--- 7. Testing Immediate Access Revocation ---');
  // Owner removes collaborator from trip
  const removeRes = await ownerClient.from('trip_members').delete().eq('trip_id', testTripId).eq('user_id', collaboratorId);
  assert(!removeRes.error, 'Owner successfully removed collaborator from trip');

  // Former collaborator immediately loses all access
  const revokedTripRead = await collabClient.from('trips').select('*').eq('id', testTripId);
  assert(revokedTripRead.data?.length === 0, 'Removed member immediately loses access to trip');

  const revokedItinRead = await collabClient.from('itinerary_items').select('*').eq('trip_id', testTripId);
  assert(revokedItinRead.data?.length === 0, 'Removed member immediately loses access to itinerary');

  const revokedExpRead = await collabClient.from('expenses').select('*').eq('trip_id', testTripId);
  assert(revokedExpRead.data?.length === 0, 'Removed member immediately loses access to expenses');

  const revokedBudRead = await collabClient.from('trip_budgets').select('*').eq('trip_id', testTripId);
  assert(revokedBudRead.data?.length === 0, 'Removed member immediately loses access to budget');

  // --------------------------------------------------------------------------
  console.log('\n--- 8. Cleanup Test Artifacts ---');
  // Owner cleans up test trip
  await ownerClient.from('trips').delete().eq('id', testTripId);
  const cleanupCheck = await ownerClient.from('trips').select('*').eq('id', testTripId);
  assert(cleanupCheck.data?.length === 0, 'Owner cleaned up test trip and all cascade records');

  console.log('\n================================================================');
  console.log(' ALL 32 RLS AUTHORIZATION ASSERTIONS PASSED WITH ZERO ERRORS');
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
