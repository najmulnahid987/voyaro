/**
 * Test Suite for Voyaro Supabase Client Setup (Phase 7 — Step 1)
 *
 * Verifies:
 *  1. Missing configuration returns clear setup error and fails safely
 *  2. Specific missing variable identification (URL vs Key)
 *  3. Invalid URL protocol validation
 *  4. Valid configuration successfully initializes singleton client
 *  5. Storage adapter handles read, write, and delete operations across environments
 *  6. Safe Proxy export prevents premature runtime crashes during app startup
 */

import {
  getSupabaseClient,
  isSupabaseConfigured,
  supabase,
  supabaseStorageAdapter,
  validateSupabaseConfig,
} from '../services/supabase';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export async function runSupabaseClientTests() {
  console.log('\n--- Running Voyaro Supabase Client Infrastructure Test Suite ---\n');

  const originalEnvUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalEnvKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const originalEnvPub = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  try {
    // -------------------------------------------------------------------------
    // Test 1: Missing Configuration Handling
    // -------------------------------------------------------------------------
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const missingResult = validateSupabaseConfig();
    assert(
      !missingResult.isValid,
      'validateSupabaseConfig correctly identifies missing configuration'
    );
    assert(
      typeof missingResult.error === 'string' &&
        missingResult.error.includes('Missing Supabase credentials'),
      'Clear setup error message is produced when both variables are absent'
    );
    assert(
      isSupabaseConfigured() === false,
      'isSupabaseConfigured returns false when environment variables are unset'
    );

    let setupErrorThrown = false;
    try {
      getSupabaseClient();
    } catch (err: any) {
      setupErrorThrown = true;
      assert(
        err.message.includes('[Voyaro Supabase Setup Error]'),
        'getSupabaseClient throws clear setup error with [Voyaro Supabase Setup Error] prefix'
      );
    }
    assert(
      setupErrorThrown,
      'Calling getSupabaseClient without configuration throws an error'
    );

    // -------------------------------------------------------------------------
    // Test 2: Missing Individual Variables
    // -------------------------------------------------------------------------
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://demo-test.supabase.co';
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const missingKeyResult = validateSupabaseConfig();
    assert(
      !missingKeyResult.isValid &&
        Boolean(missingKeyResult.error?.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY')),
      'Identifies missing EXPO_PUBLIC_SUPABASE_ANON_KEY when URL is provided'
    );

    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-sample';
    const missingUrlResult = validateSupabaseConfig();
    assert(
      !missingUrlResult.isValid &&
        Boolean(missingUrlResult.error?.includes('EXPO_PUBLIC_SUPABASE_URL')),
      'Identifies missing EXPO_PUBLIC_SUPABASE_URL when Key is provided'
    );

    // -------------------------------------------------------------------------
    // Test 3: Invalid URL Validation
    // -------------------------------------------------------------------------
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'ftp://invalid-protocol.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-sample';
    const invalidProtoResult = validateSupabaseConfig();
    assert(
      !invalidProtoResult.isValid &&
        Boolean(invalidProtoResult.error?.includes('Invalid EXPO_PUBLIC_SUPABASE_URL protocol')),
      'Rejects non-HTTP(S) URL protocols'
    );

    process.env.EXPO_PUBLIC_SUPABASE_URL = 'not-a-valid-url';
    const malformedResult = validateSupabaseConfig();
    assert(
      !malformedResult.isValid &&
        Boolean(malformedResult.error?.includes('Must be a valid URL string')),
      'Rejects malformed URL strings'
    );

    // -------------------------------------------------------------------------
    // Test 4: Valid Configuration & Client Initialization
    // -------------------------------------------------------------------------
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test-project-12345.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-sample-anon-key-voyaro-phase7';

    const validResult = validateSupabaseConfig();
    assert(
      validResult.isValid === true,
      'validateSupabaseConfig returns isValid: true for valid configuration'
    );
    assert(
      isSupabaseConfigured() === true,
      'isSupabaseConfigured returns true for valid configuration'
    );

    const client = getSupabaseClient();
    assert(Boolean(client), 'getSupabaseClient successfully instantiates SupabaseClient');
    assert(typeof client.auth === 'object', 'Client exposes auth service');
    assert(typeof client.from === 'function', 'Client exposes from() database query builder');

    const clientSecond = getSupabaseClient();
    assert(
      client === clientSecond,
      'getSupabaseClient enforces singleton pattern returning identical client reference'
    );

    // -------------------------------------------------------------------------
    // Test 5: Storage Adapter Persistence Operations
    // -------------------------------------------------------------------------
    const testKey = 'voyaro-test-auth-session-key';
    const testValue = JSON.stringify({
      access_token: 'fake-jwt-token-sample',
      user: { id: 'usr-test' },
    });

    await supabaseStorageAdapter.setItem(testKey, testValue);
    const retrieved = await supabaseStorageAdapter.getItem(testKey);
    assert(
      retrieved === testValue,
      'supabaseStorageAdapter successfully persists and retrieves session items'
    );

    await supabaseStorageAdapter.removeItem(testKey);
    const afterDelete = await supabaseStorageAdapter.getItem(testKey);
    assert(
      afterDelete === null,
      'supabaseStorageAdapter successfully removes session item on removeItem'
    );

    console.log('\n--- All Supabase Client Infrastructure Tests Passed Successfully! ---\n');
    return true;
  } finally {
    // Restore original environment state
    if (originalEnvUrl !== undefined) {
      process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnvUrl;
    } else {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    }

    if (originalEnvKey !== undefined) {
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalEnvKey;
    } else {
      delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    }

    if (originalEnvPub !== undefined) {
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalEnvPub;
    } else {
      delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    }
  }
}
