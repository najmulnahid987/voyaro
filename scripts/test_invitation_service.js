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

async function runInvitationTests() {
  console.log('================================================================');
  console.log(' Phase 8 — Step 4: Invitation Service Integration Test Suite');
  console.log('================================================================\n');

  const jwtSecret = await getJwtSecret();

  // Test User Accounts
  const ownerId = '43ad5eb6-320d-4424-8524-4fd23ab139f9';
  const ownerEmail = 'owner_service_test@voyaro.test';

  const inviteeId = '288d3ba5-2c51-4170-9f9e-e725d2e6a768';
  const inviteeEmail = 'invitee_target@voyaro.test';

  const wrongUserId = '7ab7197c-aecf-4d8c-b2fb-51916cc6d2af';
  const wrongUserEmail = 'wrong_account@voyaro.test';

  // Ensure test emails are present in auth.users
  await executeSql(`
    UPDATE auth.users SET email = '${ownerEmail}' WHERE id = '${ownerId}';
    UPDATE auth.users SET email = '${inviteeEmail}' WHERE id = '${inviteeId}';
    UPDATE auth.users SET email = '${wrongUserEmail}' WHERE id = '${wrongUserId}';
  `);

  const ownerClient = createScopedClient(generateUserJwt(ownerId, ownerEmail, jwtSecret));
  const inviteeClient = createScopedClient(generateUserJwt(inviteeId, inviteeEmail, jwtSecret));
  const wrongUserClient = createScopedClient(generateUserJwt(wrongUserId, wrongUserEmail, jwtSecret));

  // 1. Create a clean test trip
  console.log('--- 1. Setting Up Test Trip (Owner) ---');
  const testTripId = crypto.randomUUID();
  const tripRes = await ownerClient.from('trips').insert({
    id: testTripId,
    user_id: ownerId,
    title: 'Voyaro Invitation Suite Trip',
    destination: 'Osaka, Japan',
    start_date: '2028-06-01',
    end_date: '2028-06-10',
    traveler_count: 1,
  }).select().single();
  assert(!tripRes.error, 'Owner created test trip');

  // Verify owner was automatically added
  const memberCheck = await ownerClient.from('trip_members').select('*').eq('trip_id', testTripId).single();
  assert(memberCheck.data?.role === 'owner', 'Author automatically registered as trip owner');

  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Valid Invitation Creation & Listing ---');
  const validToken = crypto.randomBytes(24).toString('hex');
  const createInviteRes = await ownerClient.from('trip_invitations').insert({
    trip_id: testTripId,
    inviter_id: ownerId,
    invitee_email: inviteeEmail,
    role: 'editor',
    token: validToken,
    status: 'pending',
  }).select().single();
  assert(!createInviteRes.error, 'Owner successfully created valid invitation for invitee as "editor"');
  const validInviteId = createInviteRes.data.id;

  // Owner lists invitations
  const ownerList = await ownerClient.from('trip_invitations').select('*').eq('trip_id', testTripId);
  assert(ownerList.data?.length === 1, 'Owner can list pending invitations for the trip');

  // Non-owner (wrong user) cannot list invitations
  const wrongList = await wrongUserClient.from('trip_invitations').select('*').eq('trip_id', testTripId);
  assert(wrongList.data?.length === 0, 'Unrelated user cannot list trip invitations');

  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing Wrong-Email Acceptance Protection ---');
  // Wrong user tries to accept valid token
  const wrongAcceptRes = await wrongUserClient.rpc('accept_trip_invitation', {
    invitation_token: validToken,
  });
  assert(wrongAcceptRes.data?.success === false, 'Wrong user acceptance was rejected');
  assert(
    wrongAcceptRes.data?.error?.includes(inviteeEmail),
    `Error properly indicates email mismatch (expected: ${inviteeEmail})`
  );

  // Verify wrong user is NOT in trip_members
  const wrongMemberCheck = await ownerClient.from('trip_members').select('*').eq('trip_id', testTripId).eq('user_id', wrongUserId);
  assert(wrongMemberCheck.data?.length === 0, 'Wrong user was NOT added to trip_members');

  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing Valid Invitation Acceptance ---');
  // Intended invitee accepts
  const validAcceptRes = await inviteeClient.rpc('accept_trip_invitation', {
    invitation_token: validToken,
  });
  assert(validAcceptRes.data?.success === true, 'Intended invitee successfully accepted invitation');
  assert(validAcceptRes.data?.role === 'editor', 'Invitee joined with assigned role "editor"');

  // Verify invitee is now an active member
  const inviteeMemberCheck = await inviteeClient.from('trip_members').select('*').eq('trip_id', testTripId).eq('user_id', inviteeId).single();
  assert(inviteeMemberCheck.data?.role === 'editor', 'Invitee is confirmed active member in trip_members');

  // Verify invitation status is marked 'accepted'
  const acceptedStatusCheck = await ownerClient.from('trip_invitations').select('*').eq('id', validInviteId).single();
  assert(acceptedStatusCheck.data?.status === 'accepted', 'Invitation record status transitioned to "accepted"');
  assert(acceptedStatusCheck.data?.accepted_by === inviteeId, 'Invitation records accepted_by user ID');

  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing Already-Accepted Invitation Re-attempt ---');
  // Re-attempt acceptance with the same token
  const reAcceptRes = await inviteeClient.rpc('accept_trip_invitation', {
    invitation_token: validToken,
  });
  assert(reAcceptRes.data?.success === false, 'Re-accepting already accepted invitation fails');
  assert(
    reAcceptRes.data?.error?.includes('already been accepted'),
    'Error cleanly states: "This invitation has already been accepted."'
  );

  // Verify no duplicate membership was created
  const memberCount = await ownerClient.from('trip_members').select('*', { count: 'exact' }).eq('trip_id', testTripId).eq('user_id', inviteeId);
  assert(memberCount.data?.length === 1, 'No duplicate membership was created');

  // --------------------------------------------------------------------------
  console.log('\n--- 6. Testing Revoked / Canceled Invitation ---');
  const revokedToken = crypto.randomBytes(24).toString('hex');
  const createRevokeInvite = await ownerClient.from('trip_invitations').insert({
    trip_id: testTripId,
    inviter_id: ownerId,
    invitee_email: 'revoked_target@voyaro.test',
    role: 'viewer',
    token: revokedToken,
    status: 'pending',
  }).select().single();
  assert(!createRevokeInvite.error, 'Created invitation for revocation testing');

  // Owner revokes invitation
  const revokeRes = await ownerClient.from('trip_invitations').update({ status: 'revoked' }).eq('id', createRevokeInvite.data.id);
  assert(!revokeRes.error, 'Owner successfully revoked the invitation');

  // Attempt to accept revoked invitation
  // Set email of wrong user to matching email to isolate revoked status check
  await executeSql(`UPDATE auth.users SET email = 'revoked_target@voyaro.test' WHERE id = '${wrongUserId}';`);
  const revokedAcceptClient = createScopedClient(generateUserJwt(wrongUserId, 'revoked_target@voyaro.test', jwtSecret));

  const acceptRevokedRes = await revokedAcceptClient.rpc('accept_trip_invitation', {
    invitation_token: revokedToken,
  });
  assert(acceptRevokedRes.data?.success === false, 'Accepting revoked invitation is rejected');
  assert(
    acceptRevokedRes.data?.error?.includes('revoked'),
    'Error cleanly states: "This invitation was revoked by the trip owner."'
  );

  // --------------------------------------------------------------------------
  console.log('\n--- 7. Testing Expired Invitation ---');
  const expiredToken = crypto.randomBytes(24).toString('hex');
  // Insert invitation with expired timestamp in the past
  await executeSql(`
    INSERT INTO public.trip_invitations (trip_id, inviter_id, invitee_email, role, token, status, expires_at)
    VALUES ('${testTripId}', '${ownerId}', 'expired_target@voyaro.test', 'viewer', '${expiredToken}', 'pending', NOW() - INTERVAL '1 hour');
  `);

  await executeSql(`UPDATE auth.users SET email = 'expired_target@voyaro.test' WHERE id = '${wrongUserId}';`);
  const expiredAcceptClient = createScopedClient(generateUserJwt(wrongUserId, 'expired_target@voyaro.test', jwtSecret));

  const acceptExpiredRes = await expiredAcceptClient.rpc('accept_trip_invitation', {
    invitation_token: expiredToken,
  });
  assert(acceptExpiredRes.data?.success === false, 'Accepting expired invitation is rejected');
  assert(
    acceptExpiredRes.data?.error?.includes('expired'),
    'Error cleanly states: "This invitation has expired."'
  );

  // --------------------------------------------------------------------------
  console.log('\n--- 8. Testing Incompatible Role: Owner Cannot Demote Self ---');
  const selfInviteToken = crypto.randomBytes(24).toString('hex');
  await executeSql(`
    INSERT INTO public.trip_invitations (trip_id, inviter_id, invitee_email, role, token, status)
    VALUES ('${testTripId}', '${ownerId}', '${ownerEmail}', 'viewer', '${selfInviteToken}', 'pending');
  `);

  const ownerSelfAccept = await ownerClient.rpc('accept_trip_invitation', {
    invitation_token: selfInviteToken,
  });
  assert(ownerSelfAccept.data?.success === false, 'Trip owner cannot accept an invitation to demote themselves');
  assert(
    ownerSelfAccept.data?.error?.includes('already the owner'),
    'Error cleanly states: "You are already the owner of this trip."'
  );

  // Verify owner remains owner
  const finalOwnerCheck = await ownerClient.from('trip_members').select('*').eq('trip_id', testTripId).eq('user_id', ownerId).single();
  assert(finalOwnerCheck.data?.role === 'owner', 'Owner role remained strictly intact');

  // --------------------------------------------------------------------------
  console.log('\n--- 9. Cleanup Test Artifacts ---');
  await ownerClient.from('trips').delete().eq('id', testTripId);
  const cleanupCheck = await ownerClient.from('trips').select('*').eq('id', testTripId);
  assert(cleanupCheck.data?.length === 0, 'Cleaned up test trip and all cascade records');

  console.log('\n================================================================');
  console.log(' ALL 20 INVITATION SERVICE INTEGRATION TESTS PASSED');
  console.log('================================================================\n');
}

runInvitationTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
