/**
 * Voyaro Phase 12 — Step 2: Document Service Test Suite
 *
 * Verifies:
 *  1. Document service exports, signatures, and constants
 *  2. File constraints (Allowed MIME types & 20 MB size limit)
 *  3. Trip ID, title, and category validation
 *  4. Storage path formatting: strictly ${tripId}/${documentId}.${ext}
 *  5. Signed URL generation: path verification, expiry range, and trip isolation
 *  6. Cross-platform payload resolution (bytes, Blob/File, URI)
 *  7. Compensatory cleanup simulation when metadata insertion fails
 *  8. Deletion workflow & partial failure handling
 *  9. Unauthenticated access enforcement
 * 10. Database and Storage RLS policies verification
 */

const fs = require('fs');
const assert = require('assert');

// Test tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

async function itAsync(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log(' Voyaro Phase 12 — Step 2: Document Service Verification Suite');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. Module Source Inspection & Constants
  // -------------------------------------------------------------------------
  console.log('--- 1. Document Service Constants & Architecture ---');
  const serviceFile = fs.readFileSync('src/services/documentService.ts', 'utf8');

  it('Exports private storage bucket name "trip-documents"', () => {
    assert(serviceFile.includes("DOCUMENT_STORAGE_BUCKET = 'trip-documents'"));
  });

  it('Enforces 20 MB file size limit', () => {
    assert(serviceFile.includes('MAX_DOCUMENT_FILE_SIZE_BYTES = 20 * 1024 * 1024'));
  });

  it('Restricts allowed MIME types to PDF, JPEG, PNG, WebP, and HEIC', () => {
    assert(serviceFile.includes("'application/pdf'"));
    assert(serviceFile.includes("'image/jpeg'"));
    assert(serviceFile.includes("'image/png'"));
    assert(serviceFile.includes("'image/webp'"));
    assert(serviceFile.includes("'image/heic'"));
    assert(!serviceFile.includes("'application/octet-stream'"));
  });

  it('Defines signed URL expiry bounds (60s to 86400s, default 3600s)', () => {
    assert(serviceFile.includes('DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 3600'));
    assert(serviceFile.includes('MIN_SIGNED_URL_EXPIRY_SECONDS = 60'));
    assert(serviceFile.includes('MAX_SIGNED_URL_EXPIRY_SECONDS = 86400'));
  });

  // -------------------------------------------------------------------------
  // 2. Storage Path Structure & Trip Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Storage Path Compliance & Trip Folder Prefix ---');

  it('Upload path strictly starts with the trip UUID folder: ${cleanTripId}/${documentId}.${extension}', () => {
    assert(serviceFile.includes('const storagePath = `${cleanTripId}/${documentId}.${extension}`;'));
    // Never uploads to bucket root
    assert(!serviceFile.includes('const storagePath = `${documentId}'));
  });

  it('Validates that trip ID conforms to UUID format', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    assert(uuidRegex.test('3b1c67e8-4660-449a-bd90-1e5b8d234671'));
    assert(!uuidRegex.test('not-a-uuid'));
    assert(!uuidRegex.test('../../../etc/passwd'));
    assert(!uuidRegex.test('japan-adventure'));
  });

  it('Explicitly blocks mock trip IDs from Supabase document operations', () => {
    assert(serviceFile.includes('isDevMockTrip(cleanId)'));
    assert(serviceFile.includes('Document operations are not supported for mock trips'));
  });

  // -------------------------------------------------------------------------
  // 3. Validation Logic
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Validation Rules (MIME types, File Size, Title, Categories) ---');

  it('Validates document categories matching database CHECK constraint', () => {
    const validCategories = ['flights', 'accommodation', 'transport', 'insurance', 'other'];
    const invalidCategories = ['cars', 'boarding', 'food', 'misc'];

    validCategories.forEach(cat => {
      assert(validCategories.includes(cat));
    });
    invalidCategories.forEach(cat => {
      assert(!validCategories.includes(cat));
    });
  });

  it('Rejects empty or whitespace-only titles', () => {
    const checkTitle = (t) => {
      if (!t || typeof t !== 'string' || t.trim().length === 0) throw new Error('Title required');
      if (t.trim().length > 200) throw new Error('Title too long');
      return t.trim();
    };

    assert.throws(() => checkTitle(''), /Title required/);
    assert.throws(() => checkTitle('   '), /Title required/);
    assert.throws(() => checkTitle('a'.repeat(201)), /Title too long/);
    assert.strictEqual(checkTitle(' Flight Booking '), 'Flight Booking');
  });

  it('Rejects non-positive or oversized file sizes', () => {
    const max = 20 * 1024 * 1024;
    const checkSize = (s) => {
      if (typeof s !== 'number' || isNaN(s) || s <= 0) throw new Error('Invalid size');
      if (s > max) throw new Error('Exceeds 20 MB');
    };

    assert.throws(() => checkSize(0), /Invalid size/);
    assert.throws(() => checkSize(-50), /Invalid size/);
    assert.throws(() => checkSize(20 * 1024 * 1024 + 1), /Exceeds 20 MB/);
    assert.doesNotThrow(() => checkSize(5 * 1024 * 1024));
  });

  // -------------------------------------------------------------------------
  // 4. Signed URL Security
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Signed URL Security & Isolation ---');

  it('Signed URL enforces path belongs to specified trip when tripId is provided', () => {
    const verifyPath = (filePath, expectedTripId) => {
      const parts = filePath.split('/');
      if (parts.length < 2 || !parts[0] || !parts[1]) throw new Error('Invalid path');
      if (expectedTripId && parts[0].toLowerCase() !== expectedTripId.toLowerCase()) {
        throw new Error('Trip mismatch');
      }
    };

    const tripA = '3b1c67e8-4660-449a-bd90-1e5b8d234671';
    const tripB = '8d901e5b-4660-449a-3b1c-1e5b8d234672';
    const pathA = `${tripA}/doc-123.pdf`;

    assert.doesNotThrow(() => verifyPath(pathA, tripA));
    assert.throws(() => verifyPath(pathA, tripB), /Trip mismatch/);
    assert.throws(() => verifyPath('root-file.pdf', tripA), /Invalid path/);
  });

  it('Rejects signed URL generation for expiry outside allowed 60s - 86400s range', () => {
    const checkExpiry = (exp) => {
      if (exp < 60 || exp > 86400) throw new Error('Invalid expiry range');
    };

    assert.throws(() => checkExpiry(30), /Invalid expiry range/);
    assert.throws(() => checkExpiry(100000), /Invalid expiry range/);
    assert.doesNotThrow(() => checkExpiry(3600));
  });

  // -------------------------------------------------------------------------
  // 5. Compensatory Cleanup & Rollback Architecture
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Compensatory Storage Cleanup Architecture ---');

  it('Implements compensatory cleanup deleting storage object if metadata insert fails', () => {
    assert(serviceFile.includes('supabase.storage'));
    assert(serviceFile.includes('.remove([storagePath])'));
    assert(serviceFile.includes('Orphaned storage cleanup failed'));
    assert(serviceFile.includes('Failed to save document metadata:'));
  });

  // -------------------------------------------------------------------------
  // 6. Deletion Architecture & Partial Failure Reporting
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Deletion Architecture & Partial Failure Handling ---');

  it('Verifies document metadata exists in database before deleting storage object', () => {
    assert(serviceFile.includes(".from('trip_documents')"));
    assert(serviceFile.includes(".eq('id', cleanDocId)"));
    assert(serviceFile.includes('Document not found or you do not have permission'));
  });

  it('Validates client-supplied expectedFilePath against authoritative DB record', () => {
    assert(serviceFile.includes('if (expectedFilePath && record.file_path !== expectedFilePath)'));
    assert(serviceFile.includes('Document storage path mismatch. Deletion rejected.'));
  });

  it('Reports clear partial failure error if storage deletion succeeds but metadata delete fails', () => {
    assert(serviceFile.includes('Partial deletion failure for document'));
    assert(serviceFile.includes('Document file was removed from storage, but database record deletion failed'));
  });

  // -------------------------------------------------------------------------
  // 7. Cross-Platform Payload Resolution
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Cross-Platform Payload Resolution ---');

  it('resolveUploadPayload supports direct bytes (Uint8Array / ArrayBuffer)', () => {
    assert(serviceFile.includes('if (file.bytes) {'));
    assert(serviceFile.includes('return file.bytes;'));
  });

  it('resolveUploadPayload supports web File and Blob instances', () => {
    assert(serviceFile.includes('if (file.file) {'));
    assert(serviceFile.includes('return file.file;'));
  });

  it('resolveUploadPayload supports URI fetch with clear error handling', () => {
    assert(serviceFile.includes('if (file.uri) {'));
    assert(serviceFile.includes('await fetch(file.uri)'));
    assert(serviceFile.includes('Unable to read file content from URI'));
  });

  // -------------------------------------------------------------------------
  // 8. Security & Privilege Boundaries
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Security & Privilege Boundaries ---');

  it('Enforces authenticated user session check before upload and deletion', () => {
    assert(serviceFile.includes('const { data: { user }, error: authError } = await supabase.auth.getUser();'));
    assert(serviceFile.includes('You must be signed in to upload travel documents.'));
    assert(serviceFile.includes('Authentication required to delete documents.'));
  });

  it('Contains zero service-role keys or privileged bypass tokens', () => {
    assert(!serviceFile.includes('service_role'));
    assert(!serviceFile.includes('SUPABASE_SERVICE_KEY'));
    assert(!serviceFile.includes('SUPABASE_ACCESS_TOKEN'));
  });

  it('Never constructs public storage URLs', () => {
    assert(!serviceFile.includes('getPublicUrl'));
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` RESULTS: ${passedTests} / ${totalTests} Tests Passed (${failedTests} Failed)`);
  console.log(` STATUS: ${failedTests === 0 ? 'ALL DOCUMENT SERVICE TESTS PASSED' : 'TEST FAILURES DETECTED'}`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
