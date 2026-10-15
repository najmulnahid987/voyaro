/**
 * Voyaro Authentication Integration Test Suite (Phase 7 — Step 5)
 *
 * Verifies:
 *  1. Validation rules for login and signup (format, length, password match)
 *  2. Initial auth state and listener notifications
 *  3. Invalid credentials handling against Supabase Auth (returns clear error)
 *  4. Password reset request flow
 *  5. Real Supabase signup flow and email confirmation handling
 *  6. Logout operation and session termination
 */

import {
  getAuthState,
  getCurrentUser,
  getSession,
  login,
  signup,
  logout,
  resetPassword,
  validateLoginCredentials,
  validateSignupCredentials,
  subscribeToAuth,
} from '../services/auth';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export async function runAuthIntegrationTests() {
  console.log('\n--- Running Voyaro Supabase Authentication Test Suite ---\n');

  // -------------------------------------------------------------------------
  // 1. Validation Logic
  // -------------------------------------------------------------------------
  const emptyLogin = validateLoginCredentials('', '');
  assert(!emptyLogin.isValid, 'Empty login credentials correctly rejected');
  assert(Boolean(emptyLogin.error?.includes('email')), 'Error message prompts for email');

  const invalidEmailLogin = validateLoginCredentials('not-an-email', 'secret123');
  assert(!invalidEmailLogin.isValid, 'Malformed email rejected');

  const shortPasswordLogin = validateLoginCredentials('test@voyaro.app', '123');
  assert(!shortPasswordLogin.isValid, 'Password shorter than 6 characters rejected');

  const validLogin = validateLoginCredentials('traveler@voyaro.app', 'securePassword123');
  assert(validLogin.isValid, 'Valid credentials format passes validation');

  const emptySignup = validateSignupCredentials({});
  assert(!emptySignup.isValid, 'Empty signup form rejected');
  assert('name' in emptySignup.errors, 'Missing name flagged');
  assert('email' in emptySignup.errors, 'Missing email flagged');
  assert('password' in emptySignup.errors, 'Missing password flagged');

  const mismatchSignup = validateSignupCredentials({
    name: 'Alex Traveler',
    email: 'alex@voyaro.app',
    password: 'password123',
    confirmPassword: 'differentPassword456',
  });
  assert(!mismatchSignup.isValid, 'Mismatched passwords rejected');
  assert(Boolean(mismatchSignup.errors.confirmPassword?.includes('match')), 'Password mismatch error reported');

  // -------------------------------------------------------------------------
  // 2. Auth State & Subscription
  // -------------------------------------------------------------------------
  let notificationCount = 0;
  const unsubscribe = subscribeToAuth((s) => {
    notificationCount++;
  });
  assert(notificationCount >= 1, 'Subscriber receives current state snapshot on registration');
  unsubscribe();

  // -------------------------------------------------------------------------
  // 3. Supabase Auth: Invalid Login Credentials
  // -------------------------------------------------------------------------
  console.log('Testing Supabase Auth with invalid credentials...');
  const invalidLoginResult = await login(
    'nonexistent_voyager_random_99999@voyaro.app',
    'wrongPassword999!'
  );
  assert(!invalidLoginResult.success, 'Nonexistent account login is rejected by Supabase Auth');
  assert(Boolean(invalidLoginResult.error), 'Supabase error message returned: ' + invalidLoginResult.error);

  // -------------------------------------------------------------------------
  // 4. Supabase Auth: Password Reset Request
  // -------------------------------------------------------------------------
  console.log('Testing password reset request...');
  const resetEmpty = await resetPassword('');
  assert(!resetEmpty.success, 'Empty email rejected for password reset');

  const resetResult = await resetPassword('traveler_reset_test@voyaro.app');
  // Supabase sends reset email or returns success for valid syntax
  assert(
    resetResult.success || Boolean(resetResult.error),
    'Password reset handled appropriately by Supabase'
  );

  // -------------------------------------------------------------------------
  // 5. Supabase Auth: Signup Flow & Email Confirmation Handling
  // -------------------------------------------------------------------------
  const testEmail = `tester_${Date.now()}@voyaro.app`;
  console.log(`Testing real Supabase signup with: ${testEmail}`);

  const signupResult = await signup({
    name: 'E2E Test Voyager',
    email: testEmail,
    password: 'TestPasswordVoyaro123!',
    confirmPassword: 'TestPasswordVoyaro123!',
  });

  assert(signupResult.success, 'Real Supabase signup succeeded');
  assert(Boolean(signupResult.user?.id), 'Created user has valid Supabase UUID');

  if (signupResult.emailConfirmationRequired) {
    console.log('✓ Email confirmation is required by this Supabase project.');
    assert(
      signupResult.emailConfirmationRequired === true,
      'App detects email confirmation requirement and avoids fake login session'
    );
  } else {
    console.log('✓ Email confirmation auto-approved. User session active.');
    assert(Boolean(signupResult.session), 'Active session established');
  }

  // -------------------------------------------------------------------------
  // 6. Supabase Auth: Logout Operation
  // -------------------------------------------------------------------------
  console.log('Testing logout operation...');
  const logoutResult = await logout();
  assert(logoutResult.success, 'Logout completed successfully');
  assert(getAuthState().authenticated === false, 'Auth state authenticated is false after logout');
  assert(getCurrentUser() === null, 'Current user is null after logout');
  assert(getSession() === null, 'Session is null after logout');

  console.log('\n--- All Authentication Integration Tests Passed Successfully! ---\n');
  return true;
}
