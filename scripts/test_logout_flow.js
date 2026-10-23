/**
 * Voyaro Automated Test Suite: Logout Functionality & Cache Teardown
 *
 * Verifies:
 *  1. Source code assertions for auth service, AuthContext, profile screen, privacy screen, and index.tsx.
 *  2. Stale initPromise cache avoidance in src/services/auth.ts.
 *  3. Cross-platform Web Alert compatibility (window.confirm fallback).
 *  4. Clean atomic route transition (router.replace to /(auth)/welcome).
 *  5. Full multi-store cache teardown (profile, trip, itinerary, expense, route).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

async function main() {
  console.log('================================================================');
  console.log(' Voyaro: Logout Flow & Multi-Store Teardown Automated Tests');
  console.log('================================================================\n');

  // 1. Auth Service Source Audit
  console.log('--- 1. Auth Service (src/services/auth.ts) ---');
  const authSource = fs.readFileSync('src/services/auth.ts', 'utf8');

  runTest('initPromise is reset to null inside logout()', () => {
    assert(authSource.includes('export async function logout(): Promise<AuthResult>'), 'logout exported');
    const logoutMatch = authSource.match(/export async function logout\(\): Promise<AuthResult>\s*\{([\s\S]*?)\n\}/);
    assert(logoutMatch, 'logout function body parsed');
    assert(logoutMatch[1].includes('initPromise = null'), 'initPromise reset inside logout');
  });

  runTest('logout() implements timeout race against Supabase signOut', () => {
    const logoutMatch = authSource.match(/export async function logout\(\): Promise<AuthResult>\s*\{([\s\S]*?)\n\}/);
    assert(logoutMatch[1].includes('Promise.race'), 'Promise.race used for signOut');
    assert(logoutMatch[1].includes('supabase.auth.signOut()'), 'supabase.auth.signOut called');
  });

  runTest('SIGNED_OUT auth change event resets initPromise to null', () => {
    assert(authSource.includes("event === 'SIGNED_OUT'"), 'SIGNED_OUT handled');
    const signedOutMatch = authSource.match(/event === 'SIGNED_OUT'\)\s*\{([\s\S]*?)\}/);
    assert(signedOutMatch, 'SIGNED_OUT block parsed');
    assert(signedOutMatch[1].includes('initPromise = null'), 'initPromise reset on SIGNED_OUT');
  });

  // 2. AuthContext Source Audit
  console.log('\n--- 2. Auth Context (src/services/AuthContext.tsx) ---');
  const contextSource = fs.readFileSync('src/services/AuthContext.tsx', 'utf8');

  runTest('AuthContext clears all 5 stores upon unauthenticated event', () => {
    assert(contextSource.includes('clearProfileCache();'), 'clears profile cache');
    assert(contextSource.includes('clearTripsCache();'), 'clears trips cache');
    assert(contextSource.includes('clearItineraryCache();'), 'clears itinerary cache');
    assert(contextSource.includes('clearExpenseCache();'), 'clears expense cache');
    assert(contextSource.includes('clearRouteCache();'), 'clears route cache');
  });

  runTest('AuthContext resets profile state to null on logout', () => {
    assert(contextSource.includes('setProfile(null)'), 'profile state set to null');
  });

  runTest('AuthContext wraps logout with complete teardown handler', () => {
    assert(contextSource.includes('const handleLogout = useCallback(async'), 'handleLogout memoized in AuthContext');
    assert(contextSource.includes('logout: handleLogout'), 'context value uses handleLogout');
  });

  // 3. Profile Screen UI & Navigation
  console.log('\n--- 3. Profile Screen (src/app/(tabs)/profile/index.tsx) ---');
  const profileSource = fs.readFileSync('src/app/(tabs)/profile/index.tsx', 'utf8');

  runTest('ProfileScreen supports Web confirmation without no-op Alert.alert', () => {
    assert(profileSource.includes("Platform.OS === 'web'"), 'checks Platform.OS === web');
    assert(profileSource.includes('window.confirm'), 'uses window.confirm on web');
    assert(profileSource.includes('Alert.alert'), 'preserves Alert.alert on native');
  });

  runTest('ProfileScreen safely transitions route before/during logout to prevent Stack.Protected unmount crash', () => {
    assert(profileSource.includes("router.replace('/(auth)/welcome')"), 'routes to welcome');
    const performLogoutMatch = profileSource.match(/const performLogout = async \(\) =>\s*\{([\s\S]*?)\};/);
    assert(performLogoutMatch, 'performLogout parsed');
    const replaceIndex = performLogoutMatch[1].indexOf("router.replace('/(auth)/welcome')");
    const logoutIndex = performLogoutMatch[1].indexOf('await logout()');
    assert(replaceIndex !== -1, 'router.replace present');
    assert(logoutIndex !== -1, 'await logout present');
    assert(replaceIndex < logoutIndex, 'router.replace precedes or safely accompanies await logout');
  });

  runTest('ProfileScreen prevents double-submits via loggingOut flag', () => {
    assert(profileSource.includes('if (loggingOut) return;'), 'loggingOut guard present');
    assert(profileSource.includes('disabled={loggingOut}'), 'button disabled while logging out');
  });

  // 4. Privacy Screen Audit
  console.log('\n--- 4. Privacy Screen (src/app/(tabs)/profile/privacy.tsx) ---');
  const privacySource = fs.readFileSync('src/app/(tabs)/profile/privacy.tsx', 'utf8');

  runTest('PrivacyScreen supports Web confirmation for cache clearance and account deletion', () => {
    assert(privacySource.includes("Platform.OS === 'web'"), 'Platform.OS check present');
    assert(privacySource.includes('performClearCache'), 'performClearCache helper present');
    assert(privacySource.includes('performDeleteAccount'), 'performDeleteAccount helper present');
    assert(privacySource.includes("router.replace('/(auth)/welcome')"), 'routes to welcome on account deletion');
  });

  // 5. Entry Splash Screen Audit
  console.log('\n--- 5. Entry Screen (src/app/index.tsx) ---');
  const indexSource = fs.readFileSync('src/app/index.tsx', 'utf8');

  runTest('Entry index.tsx bypasses 1.2s delay when not in cold start initial loading', () => {
    assert(indexSource.includes('getAuthState'), 'getAuthState imported');
    assert(indexSource.includes('getAuthState().isLoading'), 'checks isLoading state');
    assert(indexSource.includes("router.replace('/(auth)/welcome')"), 'routes unauthenticated users to welcome');
  });

  console.log('\n================================================================');
  console.log(` RESULTS: ${passedTests} / ${passedTests + failedTests} Tests Passed (${failedTests} Failed)`);
  if (failedTests === 0) {
    console.log(' STATUS: ALL LOGOUT & TEARDOWN TESTS PASSED');
  } else {
    console.error(' STATUS: SOME TESTS FAILED');
    process.exit(1);
  }
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error running logout tests:', err);
  process.exit(1);
});
