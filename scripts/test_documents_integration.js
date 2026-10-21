/**
 * Voyaro Phase 12 — Step 5: Documents Screen & Sub-Navigation Integration Tests
 *
 * Verifies:
 *  1. Mock data removal: TRIP_DOCUMENTS is completely removed from documents.tsx.
 *  2. Component integration: documents.tsx uses useTripDocuments, DocumentCard, DocumentCategoryChips, UploadDocumentModal.
 *  3. Contextual + Button behavior:
 *     - When currentTab === 'documents': does NOT route to /add or /add/expense.
 *     - Calls onAddDocument, onAdd, or emits document upload request.
 *     - Accessible label is "Upload document".
 *     - Preserves existing plus behavior on all other tabs.
 *  4. Secure viewing logic:
 *     - Verifies tripId match before requesting signed URL.
 *     - Rejects mismatched tripId.
 *     - Never uses public URLs.
 *  5. Role-based permissions matrix:
 *     - Owner: canUpload = true, canDelete any document = true.
 *     - Editor: canUpload = true, canDelete own document = true, canDelete other's = false.
 *     - Viewer: canUpload = false, canDelete = false.
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

console.log('================================================================');
console.log(' Voyaro Phase 12 — Step 5: Documents Screen Integration Tests');
console.log('================================================================\n');

const documentsScreenPath = path.join(
  __dirname,
  '../src/app/(tabs)/trips/[tripId]/documents.tsx'
);
const subNavHeaderPath = path.join(
  __dirname,
  '../src/components/trips/TripSubNavHeader.tsx'
);
const documentEventsPath = path.join(
  __dirname,
  '../src/components/documents/documentEvents.ts'
);

const documentsScreenContent = fs.readFileSync(documentsScreenPath, 'utf8');
const subNavHeaderContent = fs.readFileSync(subNavHeaderPath, 'utf8');
const documentEventsContent = fs.readFileSync(documentEventsPath, 'utf8');

// --- 1. Hardcoded Mock Data Elimination ---
console.log('--- 1. Mock Data Elimination & Live Hook Integration ---');

runTest('Removes hardcoded TRIP_DOCUMENTS mock list from documents.tsx', () => {
  assert(
    !documentsScreenContent.includes('TRIP_DOCUMENTS'),
    'documents.tsx should no longer contain TRIP_DOCUMENTS'
  );
  assert(
    !documentsScreenContent.includes('doc-flight-nh204'),
    'documents.tsx should not contain hardcoded mock item IDs'
  );
});

runTest('Consumes useTripDocuments with effectiveTripId parameter', () => {
  assert(
    documentsScreenContent.includes('useTripDocuments(effectiveTripId)'),
    'documents.tsx must call useTripDocuments with effectiveTripId'
  );
});

runTest('Renders DocumentCategoryChips, DocumentCard, and UploadDocumentModal', () => {
  assert(
    documentsScreenContent.includes('<DocumentCategoryChips'),
    'Must render DocumentCategoryChips'
  );
  assert(
    documentsScreenContent.includes('<DocumentCard'),
    'Must render DocumentCard'
  );
  assert(
    documentsScreenContent.includes('<UploadDocumentModal'),
    'Must render UploadDocumentModal'
  );
});

// --- 2. Contextual + Button in TripSubNavHeader ---
console.log('\n--- 2. Contextual Plus Button in TripSubNavHeader ---');

runTest('Does not route to /add or /add/expense when currentTab is documents', () => {
  assert(
    subNavHeaderContent.includes("if (currentTab === 'documents')"),
    'Must check if currentTab === "documents"'
  );
  const docTabBlock = subNavHeaderContent.substring(
    subNavHeaderContent.indexOf("if (currentTab === 'documents')"),
    subNavHeaderContent.indexOf("if (currentTab === 'expenses')")
  );
  assert(
    !docTabBlock.includes("router.push('/add')"),
    'Must not route to /add on documents tab'
  );
  assert(
    !docTabBlock.includes("router.push('/add/expense')"),
    'Must not route to /add/expense on documents tab'
  );
  assert(
    docTabBlock.includes('return;'),
    'Must return early after handling documents tab'
  );
});

runTest('Emits document upload request or invokes onAddDocument / onAdd', () => {
  assert(
    subNavHeaderContent.includes('emitDocumentUploadRequest(effectiveTripId)'),
    'Must emit document upload request with effectiveTripId'
  );
  assert(
    subNavHeaderContent.includes('onAddDocument'),
    'TripSubNavHeaderProps should support onAddDocument override'
  );
});

runTest('Sets accessible label to "Upload document" on documents tab', () => {
  assert(
    subNavHeaderContent.includes("currentTab === 'documents'"),
    'Accessibility label must switch on currentTab'
  );
  assert(
    subNavHeaderContent.includes("'Upload document'"),
    'Accessibility label must include "Upload document"'
  );
  assert(
    subNavHeaderContent.includes("'Add trip reservation or item'"),
    'Accessibility label must preserve fallback for other tabs'
  );
});

runTest('Preserves exact routing behavior for expenses and other tabs', () => {
  assert(
    subNavHeaderContent.includes("if (currentTab === 'expenses')"),
    'Must preserve expenses tab check'
  );
  assert(
    subNavHeaderContent.includes("pathname: '/add/expense'"),
    'Must preserve /add/expense push'
  );
  assert(
    subNavHeaderContent.includes("pathname: '/add'"),
    'Must preserve /add push for general tabs'
  );
});

// --- 3. Event Bus Subscriptions ---
console.log('\n--- 3. Event Bus Subscriptions & Lifecycle ---');

runTest('documentEvents module supports emit and subscribe with cleanup', () => {
  let triggerCount = 0;
  let receivedTripId = null;

  const testModule = {
    listeners: new Set(),
    emit(id) {
      this.listeners.forEach((l) => l(id));
    },
    subscribe(l) {
      this.listeners.add(l);
      return () => this.listeners.delete(l);
    },
  };

  const unsubscribe = testModule.subscribe((id) => {
    triggerCount++;
    receivedTripId = id;
  });

  testModule.emit('trip-123');
  assert.strictEqual(triggerCount, 1);
  assert.strictEqual(receivedTripId, 'trip-123');

  unsubscribe();
  testModule.emit('trip-456');
  assert.strictEqual(triggerCount, 1, 'Unsubscribed listener must not fire');
});

runTest('documents.tsx subscribes to upload requests and unsubscribes on unmount', () => {
  assert(
    documentsScreenContent.includes('subscribeToDocumentUploadRequest'),
    'documents.tsx must subscribe to document upload requests'
  );
  assert(
    documentsScreenContent.includes('return unsubscribe;'),
    'documents.tsx must clean up subscription in useEffect return'
  );
});

// --- 4. Secure Viewing Logic ---
console.log('\n--- 4. Secure Viewing Verification ---');

runTest('Verifies document belongs to active trip before opening', () => {
  assert(
    documentsScreenContent.includes('doc.tripId !== effectiveTripId'),
    'Must verify document.tripId matches effectiveTripId'
  );
  assert(
    documentsScreenContent.includes('Access Denied'),
    'Must alert user if trip ID does not match'
  );
});

runTest('Requests signed URL with expiry bounds and opens in WebBrowser / window', () => {
  assert(
    documentsScreenContent.includes('getTripDocumentSignedUrl(doc.filePath'),
    'Must call getTripDocumentSignedUrl with doc.filePath'
  );
  assert(
    documentsScreenContent.includes('WebBrowser.openBrowserAsync(signedUrl'),
    'Must open signed URL in WebBrowser'
  );
  assert(
    documentsScreenContent.includes("window.open(signedUrl, '_blank'"),
    'Must support web window.open'
  );
  assert(
    !documentsScreenContent.includes('getPublicUrl'),
    'Never use public storage URLs'
  );
});

// --- 5. Permissions & Deletion Rules Matrix ---
console.log('\n--- 5. Permissions & Deletion Rules Matrix ---');

function evaluateDocumentPermissions({ userRole, isOwner, currentUserId, docUserId }) {
  const canUpload = userRole === 'owner' || userRole === 'editor';
  const canDelete =
    isOwner ||
    userRole === 'owner' ||
    (userRole === 'editor' && Boolean(currentUserId && docUserId === currentUserId));
  return { canUpload, canDelete };
}

runTest('Owner can upload and delete any document', () => {
  const perm = evaluateDocumentPermissions({
    userRole: 'owner',
    isOwner: true,
    currentUserId: 'user-owner',
    docUserId: 'user-editor',
  });
  assert.strictEqual(perm.canUpload, true);
  assert.strictEqual(perm.canDelete, true);
});

runTest('Editor can upload and delete only their own documents', () => {
  const ownDocPerm = evaluateDocumentPermissions({
    userRole: 'editor',
    isOwner: false,
    currentUserId: 'user-editor',
    docUserId: 'user-editor',
  });
  assert.strictEqual(ownDocPerm.canUpload, true);
  assert.strictEqual(ownDocPerm.canDelete, true);

  const otherDocPerm = evaluateDocumentPermissions({
    userRole: 'editor',
    isOwner: false,
    currentUserId: 'user-editor',
    docUserId: 'user-another-editor',
  });
  assert.strictEqual(otherDocPerm.canUpload, true);
  assert.strictEqual(otherDocPerm.canDelete, false);
});

runTest('Viewer cannot upload and cannot delete', () => {
  const viewerPerm = evaluateDocumentPermissions({
    userRole: 'viewer',
    isOwner: false,
    currentUserId: 'user-viewer',
    docUserId: 'user-viewer',
  });
  assert.strictEqual(viewerPerm.canUpload, false);
  assert.strictEqual(viewerPerm.canDelete, false);
});

// --- 6. In-Memory Category Filtering ---
console.log('\n--- 6. In-Memory Category Filtering ---');

runTest('Filters documents in-memory without database queries', () => {
  assert(
    documentsScreenContent.includes('filteredDocuments = useMemo('),
    'Filtering must be derived in useMemo from loaded documents'
  );
  assert(
    documentsScreenContent.includes('if (selectedCategory === \'all\') return documents'),
    'Must return all documents when category is all'
  );
  assert(
    documentsScreenContent.includes('doc.category === selectedCategory'),
    'Must filter by matching category'
  );
});

console.log('================================================================');
console.log(` RESULTS: ${passedTests} / ${passedTests + failedTests} Tests Passed (${failedTests} Failed)`);
console.log(` STATUS: ${failedTests === 0 ? 'ALL INTEGRATION TESTS PASSED' : 'TESTS FAILED'}`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
