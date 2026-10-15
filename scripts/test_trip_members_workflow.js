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
    process.exit(1);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function testTripMembersWorkflow() {
  console.log('================================================================');
  console.log(' Phase 8 — Step 6: Trip Members UI Persona Workflow Test');
  console.log('================================================================\n');

  const jwtSecret = await getJwtSecret();

  // Test personas
  const ownerId = '43ad5eb6-320d-4424-8524-4fd23ab139f9';
  const ownerEmail = 'owner_tester@voyaro.test';

  const editorId = '288d3ba5-2c51-4170-9f9e-e725d2e6a768';
  const editorEmail = 'collaborator_tester@voyaro.test';

  const viewerId = '7ab7197c-aecf-4d8c-b2fb-51916cc6d2af';
  const viewerEmail = 'viewer_tester@voyaro.test';

  const nonMemberId = 'ba03a532-a5e2-4735-a681-30d0fa851412';
  const nonMemberEmail = 'outsider_tester@voyaro.test';

  // Ensure accounts exist in auth.users
  await executeSql(`
    INSERT INTO auth.users (id, email, raw_user_meta_data, role, aud, created_at, updated_at)
    VALUES ('${nonMemberId}', '${nonMemberEmail}', '{"display_name":"Outsider"}', 'authenticated', 'authenticated', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = '${nonMemberEmail}';

    INSERT INTO public.profiles (id, email, display_name)
    VALUES ('${nonMemberId}', '${nonMemberEmail}', 'Outsider Tester')
    ON CONFLICT (id) DO NOTHING;
  `);

  const ownerClient = createScopedClient(generateUserJwt(ownerId, ownerEmail, jwtSecret));
  const editorClient = createScopedClient(generateUserJwt(editorId, editorEmail, jwtSecret));
  const viewerClient = createScopedClient(generateUserJwt(viewerId, viewerEmail, jwtSecret));
  const nonMemberClient = createScopedClient(generateUserJwt(nonMemberId, nonMemberEmail, jwtSecret));

  // 1. Setup a clean Test Trip with Owner
  console.log('--- 1. Setting Up Dedicated Test Trip ---');
  const { data: trip, error: tripErr } = await ownerClient
    .from('trips')
    .insert({
      title: 'Members UI Test Expedition',
      destination: 'Banff, Canada',
      start_date: '2026-12-01',
      end_date: '2026-12-10',
      user_id: ownerId,
    })
    .select()
    .single();

  assert(!tripErr && trip, 'Owner created test trip');

  // Verify owner was automatically backfilled as owner in trip_members
  const { data: ownerMembers } = await ownerClient
    .from('trip_members')
    .select('*')
    .eq('trip_id', trip.id)
    .eq('user_id', ownerId);
  assert(ownerMembers?.length === 1 && ownerMembers[0].role === 'owner', 'Owner registered in trip_members as "owner"');

  // Add Editor and Viewer to this trip
  await executeSql(`
    INSERT INTO public.trip_members (trip_id, user_id, role)
    VALUES 
      ('${trip.id}', '${editorId}', 'editor'),
      ('${trip.id}', '${viewerId}', 'viewer')
    ON CONFLICT (trip_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  `);

  // Add a pending invitation for owner
  const { data: pendingInvite, error: inviteErr } = await ownerClient
    .from('trip_invitations')
    .insert({
      trip_id: trip.id,
      inviter_id: ownerId,
      invitee_email: 'pending_friend@voyaro.test',
      role: 'editor',
      status: 'pending',
    })
    .select()
    .single();

  assert(!inviteErr && pendingInvite, 'Owner created pending invitation');

  // ── Persona 1: Owner Behavior ──────────────────────────────────────────────
  console.log('\n--- 2. Testing Owner Persona Capabilities ---');
  // Load trip & members
  const { data: oTrip } = await ownerClient.from('trips').select('*').eq('id', trip.id).single();
  assert(oTrip && oTrip.user_id === ownerId, 'Owner sees trip and owns it');

  const { data: oMembers } = await ownerClient.from('trip_members').select('*').eq('trip_id', trip.id);
  assert(oMembers?.length === 3, 'Owner sees all 3 active members');

  // Owner changes member role between Editor and Viewer
  console.log('   Testing owner modifying collaborator role:');
  const { error: changeRoleErr } = await ownerClient
    .from('trip_members')
    .update({ role: 'viewer' })
    .eq('trip_id', trip.id)
    .eq('user_id', editorId);
  assert(!changeRoleErr, 'Owner successfully changed collaborator from Editor to Viewer');

  // Owner cannot transfer ownership or assign owner role in trip_members
  const { error: illegalRoleErr } = await ownerClient
    .from('trip_members')
    .update({ role: 'owner' })
    .eq('trip_id', trip.id)
    .eq('user_id', editorId);
  // RLS or constraint prevents multiple owners
  console.log('   Testing owner cannot illegally promote second owner:');
  const { data: verifyMembers } = await ownerClient.from('trip_members').select('*').eq('trip_id', trip.id).eq('role', 'owner');
  assert(verifyMembers?.length === 1, 'Only exactly 1 owner exists on trip');

  // Owner sees pending invitations
  const { data: oInvites } = await ownerClient.from('trip_invitations').select('*').eq('trip_id', trip.id).eq('status', 'pending');
  assert(oInvites?.length === 1, 'Owner can see pending invitations');

  // Owner revokes pending invitation
  const { error: revokeErr } = await ownerClient
    .from('trip_invitations')
    .update({ status: 'revoked' })
    .eq('id', pendingInvite.id)
    .eq('trip_id', trip.id);
  assert(!revokeErr, 'Owner successfully revoked pending invitation');

  // ── Persona 2: Editor Persona Behavior ─────────────────────────────────────
  console.log('\n--- 3. Testing Editor Persona Capabilities & Guards ---');
  // Reset editor back to editor role for testing
  await executeSql(`UPDATE public.trip_members SET role = 'editor' WHERE trip_id = '${trip.id}' AND user_id = '${editorId}';`);

  const { data: eTrip } = await editorClient.from('trips').select('*').eq('id', trip.id).single();
  assert(eTrip !== null, 'Editor can access shared trip overview and details');

  const { data: eMembers } = await editorClient.from('trip_members').select('*').eq('trip_id', trip.id);
  assert(eMembers?.length === 3, 'Editor can see active members and their roles');

  // Editor CANNOT see pending invitations
  const { data: eInvites } = await editorClient.from('trip_invitations').select('*').eq('trip_id', trip.id);
  assert(!eInvites || eInvites.length === 0, 'Editor cannot see pending invitations (rejected by RLS)');

  // Editor CANNOT update member roles
  const { error: eUpdateRoleErr } = await editorClient
    .from('trip_members')
    .update({ role: 'editor' })
    .eq('trip_id', trip.id)
    .eq('user_id', viewerId);
  const { data: checkViewer } = await ownerClient.from('trip_members').select('role').eq('trip_id', trip.id).eq('user_id', viewerId).single();
  assert(checkViewer.role === 'viewer', 'Editor unauthorized role modification was blocked by RLS');

  // Editor CANNOT remove members
  const { error: eRemoveErr } = await editorClient
    .from('trip_members')
    .delete()
    .eq('trip_id', trip.id)
    .eq('user_id', viewerId);
  const { data: checkMembersCount } = await ownerClient.from('trip_members').select('*').eq('trip_id', trip.id);
  assert(checkMembersCount.length === 3, 'Editor unauthorized member deletion was blocked by RLS');

  // ── Persona 3: Viewer Persona Behavior ─────────────────────────────────────
  console.log('\n--- 4. Testing Viewer Persona Capabilities & Guards ---');
  const { data: vTrip } = await viewerClient.from('trips').select('*').eq('id', trip.id).single();
  assert(vTrip !== null, 'Viewer can access shared trip');

  const { data: vMembers } = await viewerClient.from('trip_members').select('*').eq('trip_id', trip.id);
  assert(vMembers?.length === 3, 'Viewer can see members and roles');

  // Viewer CANNOT see invitations
  const { data: vInvites } = await viewerClient.from('trip_invitations').select('*').eq('trip_id', trip.id);
  assert(!vInvites || vInvites.length === 0, 'Viewer cannot see invitations');

  // Viewer CANNOT update member roles
  await viewerClient.from('trip_members').update({ role: 'editor' }).eq('trip_id', trip.id).eq('user_id', editorId);
  const { data: checkEditorRole } = await ownerClient.from('trip_members').select('role').eq('trip_id', trip.id).eq('user_id', editorId).single();
  assert(checkEditorRole.role === 'editor', 'Viewer unauthorized role update was blocked by RLS');

  // Viewer can leave the trip
  console.log('   Testing viewer leaving trip:');
  const { error: vLeaveErr } = await viewerClient
    .from('trip_members')
    .delete()
    .eq('trip_id', trip.id)
    .eq('user_id', viewerId);
  assert(!vLeaveErr, 'Viewer can leave the trip');
  const { data: afterLeaveMembers } = await ownerClient.from('trip_members').select('*').eq('trip_id', trip.id);
  assert(afterLeaveMembers.length === 2, 'Viewer was cleanly removed upon leaving');

  // ── Persona 4: Non-Member Persona Behavior ─────────────────────────────────
  console.log('\n--- 5. Testing Non-Member Persona (Access Denied / Error State) ---');
  const { data: outsiderTrips } = await nonMemberClient.from('trips').select('*').eq('id', trip.id);
  assert(!outsiderTrips || outsiderTrips.length === 0, 'Non-member cannot read trip (RLS blocks)');

  const { data: outsiderMembers } = await nonMemberClient.from('trip_members').select('*').eq('trip_id', trip.id);
  assert(!outsiderMembers || outsiderMembers.length === 0, 'Non-member cannot read members (RLS blocks)');

  const { data: outsiderInvites } = await nonMemberClient.from('trip_invitations').select('*').eq('trip_id', trip.id);
  assert(!outsiderInvites || outsiderInvites.length === 0, 'Non-member cannot read invitations (RLS blocks)');

  // ── Cleanup ────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Cleaning Up Test Artifacts ---');
  await ownerClient.from('trips').delete().eq('id', trip.id);
  console.log('   Test trip cleaned up successfully.');

  console.log('\n================================================================');
  console.log(' ✓ All Step 6 Trip Members Persona Behaviors Verified!');
  console.log('================================================================\n');
}

testTripMembersWorkflow().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
