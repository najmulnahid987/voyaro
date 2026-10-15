const fs = require('fs');

const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
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

async function auditDatabase() {
  console.log('================================================================');
  console.log('         VOYARO PHASE 8: DATABASE & SECURITY AUDIT');
  console.log('================================================================\n');

  // 1. Check RLS on all public tables
  console.log('--- 1. ROW LEVEL SECURITY (RLS) STATUS ON TABLES ---');
  const rlsRes = await executeSql(`
    SELECT 
      schemaname, 
      tablename, 
      rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);

  rlsRes.forEach(t => {
    console.log(` - Table: ${t.tablename.padEnd(20)} | RLS Enabled: ${t.rowsecurity ? '✅ YES' : '❌ NO'}`);
  });

  // 2. List all RLS Policies
  console.log('\n--- 2. ALL RLS POLICIES BY TABLE ---');
  const policiesRes = await executeSql(`
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, cmd, policyname;
  `);

  const policiesByTable = {};
  policiesRes.forEach(p => {
    if (!policiesByTable[p.tablename]) policiesByTable[p.tablename] = [];
    policiesByTable[p.tablename].push(p);
  });

  Object.keys(policiesByTable).forEach(tableName => {
    console.log(`\nTable: [${tableName}] (${policiesByTable[tableName].length} policies)`);
    policiesByTable[tableName].forEach(p => {
      console.log(`   • [${p.cmd}] "${p.policyname}" (Roles: ${p.roles})`);
      if (p.qual) console.log(`       USING: ${p.qual}`);
      if (p.with_check) console.log(`       WITH CHECK: ${p.with_check}`);
    });
  });

  // 3. Verify Helper Functions Security & Search Path
  console.log('\n--- 3. HELPER FUNCTIONS SECURITY DEFINER & SEARCH PATH ---');
  const funcsRes = await executeSql(`
    SELECT 
      proname,
      prosecdef,
      proconfig
    FROM pg_proc
    JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
    WHERE pg_namespace.nspname = 'public'
      AND proname IN (
        'is_trip_member',
        'get_trip_member_role',
        'is_trip_owner',
        'is_trip_editor_or_owner',
        'accept_trip_invitation',
        'handle_new_trip_owner'
      );
  `);

  funcsRes.forEach(f => {
    const isSecDef = f.prosecdef ? '✅ YES' : '❌ NO';
    const hasSearchPath = (f.proconfig && f.proconfig.some(c => c.includes('search_path=public'))) ? '✅ PINNED' : '❌ UNPINNED';
    console.log(` - Function: ${f.proname.padEnd(28)} | SecDef: ${isSecDef} | SearchPath: ${hasSearchPath}`);
  });

  // 4. Verify Trip Ownership & Members Preservation
  console.log('\n--- 4. EXISTING TRIPS AND MEMBERSHIP PRESERVATION ---');
  const tripsCountRes = await executeSql(`SELECT COUNT(*) AS total_trips FROM public.trips;`);
  const membersCountRes = await executeSql(`SELECT COUNT(*) AS total_members FROM public.trip_members;`);
  const ownersCountRes = await executeSql(`SELECT COUNT(*) AS total_owners FROM public.trip_members WHERE role = 'owner';`);
  const unownedTripsRes = await executeSql(`
    SELECT t.id, t.title 
    FROM public.trips t
    LEFT JOIN public.trip_members m ON t.id = m.trip_id AND m.role = 'owner'
    WHERE m.id IS NULL;
  `);

  console.log(` - Total Trips:           ${tripsCountRes[0]?.total_trips}`);
  console.log(` - Total Member Records:  ${membersCountRes[0]?.total_members}`);
  console.log(` - Total Owner Records:   ${ownersCountRes[0]?.total_owners}`);
  console.log(` - Trips Lacking Owner:   ${unownedTripsRes.length} ${unownedTripsRes.length === 0 ? '✅ (All trips have authoritative owner)' : '❌ (Orphan trips found!)'}`);

  // 5. Function Grants Check
  console.log('\n--- 5. FUNCTION EXECUTE GRANTS ---');
  const grantsRes = await executeSql(`
    SELECT 
      routine_name, 
      grantee, 
      privilege_type
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name IN ('accept_trip_invitation', 'is_trip_owner', 'is_trip_member')
    ORDER BY routine_name, grantee;
  `);

  grantsRes.forEach(g => {
    console.log(` - ${g.routine_name.padEnd(25)} | Grantee: ${g.grantee.padEnd(16)} | Privilege: ${g.privilege_type}`);
  });

  console.log('\n================================================================');
  console.log('              DATABASE AUDIT COMPLETE');
  console.log('================================================================');
}

auditDatabase().catch(err => {
  console.error('Database audit error:', err);
  process.exit(1);
});
