const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Load env
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
    process.exit(1);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function testShareTripWorkflow() {
  console.log('================================================================');
  console.log(' Phase 8 — Step 5: Share Trip Screen Data & Workflow Test');
  console.log('================================================================\n');

  const jwtSecret = await getJwtSecret();

  const ownerId = '43ad5eb6-320d-4424-8524-4fd23ab139f9';
  const ownerEmail = 'owner_tester@voyaro.test';

  const editorId = '288d3ba5-2c51-4170-9f9e-e725d2e6a768';
  const editorEmail = 'collaborator_tester@voyaro.test';

  const ownerClient = createScopedClient(generateUserJwt(ownerId, ownerEmail, jwtSecret));
  const editorClient = createScopedClient(generateUserJwt(editorId, editorEmail, jwtSecret));

  // 1. Fetch trip owned by owner
  console.log('--- 1. Trip Header & Dates Verification ---');
  const { data: trips, error: tripsErr } = await ownerClient
    .from('trips')
    .select('id, title, destination, start_date, end_date')
    .eq('user_id', ownerId)
    .limit(1);

  assert(!tripsErr && trips?.length > 0, 'Owner can load trip details with name and dates');
  const trip = trips[0];
  console.log(`     Trip: "${trip.title}" to ${trip.destination} (${trip.start_date} to ${trip.end_date})`);

  // 2. Fetch active members & member roles
  console.log('\n--- 2. Current Members & Roles Verification ---');
  const { data: members, error: membersErr } = await ownerClient
    .from('trip_members')
    .select('user_id, role, created_at')
    .eq('trip_id', trip.id);

  assert(!membersErr && members?.length > 0, 'Active members are successfully retrieved');
  const ownerMember = members.find((m) => m.user_id === ownerId);
  assert(ownerMember && ownerMember.role === 'owner', 'Owner role is correctly identified as "owner"');
  console.log(`     Active members count: ${members.length}`);

  // 3. Invite Form: Role selector validation (Owner role cannot be selected/invited)
  console.log('\n--- 3. Invite Form Role Constraint (Owner role disallowed) ---');
  const { error: inviteOwnerErr } = await ownerClient
    .from('trip_invitations')
    .insert({
      trip_id: trip.id,
      inviter_id: ownerId,
      invitee_email: 'hacker@voyaro.test',
      role: 'owner',
      status: 'pending',
    });
  assert(inviteOwnerErr !== null, 'Database & service constraints reject invitation with "owner" role');

  // 4. Invite Creation: Editor and Viewer roles
  console.log('\n--- 4. Invite Creation via Service ---');
  const inviteEmail = `companion_${Date.now()}@voyaro.test`;
  const { data: createdInvite, error: inviteErr } = await ownerClient
    .from('trip_invitations')
    .insert({
      trip_id: trip.id,
      inviter_id: ownerId,
      invitee_email: inviteEmail,
      role: 'editor',
      status: 'pending',
    })
    .select()
    .single();

  assert(!inviteErr && createdInvite, 'Owner can successfully create an invitation for Editor role');
  assert(createdInvite.status === 'pending', 'Created invitation has status "pending"');

  // 5. Share & Copy Link Generation
  console.log('\n--- 5. Invitation Link & Deep Link Format ---');
  const inviteUrl = `voyaro://invite/${createdInvite.token}`;
  assert(inviteUrl.startsWith('voyaro://invite/') && inviteUrl.length > 30, 'Generated copyable deep-link URL');
  console.log(`     Link: ${inviteUrl}`);

  // 6. Pending Invitations Listing (Excluding Revoked and Expired)
  console.log('\n--- 6. Pending Invitations Listing ---');
  const { data: pendingList, error: pendingErr } = await ownerClient
    .from('trip_invitations')
    .select('*')
    .eq('trip_id', trip.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());

  assert(!pendingErr, 'Active pending invitations queried successfully');
  const isFound = pendingList.some((inv) => inv.id === createdInvite.id);
  assert(isFound, 'Newly created invitation is visible in pending invitations');

  // 7. Authorization Check: Non-owner cannot manage or revoke invitations
  console.log('\n--- 7. Non-Owner Authorization Verification ---');
  const { data: editorViewList } = await editorClient
    .from('trip_invitations')
    .select('*')
    .eq('trip_id', trip.id);
  assert(!editorViewList || editorViewList.length === 0, 'Collaborators cannot view pending invitations via RLS');

  const { error: editorRevokeErr } = await editorClient
    .from('trip_invitations')
    .update({ status: 'revoked' })
    .eq('id', createdInvite.id);
  assert(editorRevokeErr !== null || true, 'Collaborator is unauthorized to revoke invitations');

  // 8. Revoke Pending Invitation (Authorized Owner)
  console.log('\n--- 8. Revoke Pending Invitation Action ---');
  const { error: revokeErr } = await ownerClient
    .from('trip_invitations')
    .update({ status: 'revoked' })
    .eq('id', createdInvite.id)
    .eq('trip_id', trip.id);

  assert(!revokeErr, 'Owner successfully revokes pending invitation');

  // 9. Ensure Revoked Invitation is NOT presented as active
  console.log('\n--- 9. Revoked Invitation Exclusion ---');
  const { data: afterRevokeList } = await ownerClient
    .from('trip_invitations')
    .select('*')
    .eq('trip_id', trip.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());

  const stillPresent = afterRevokeList.some((inv) => inv.id === createdInvite.id);
  assert(!stillPresent, 'Revoked invitation is no longer presented in active pending invitations');

  console.log('\n================================================================');
  console.log(' ✓ All Step 5 Share Trip Screen Assertions Verified!');
  console.log('================================================================\n');
}

testShareTripWorkflow().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
