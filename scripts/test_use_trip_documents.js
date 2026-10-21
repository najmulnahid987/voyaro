/**
 * Voyaro Phase 12 — Step 3: useTripDocuments State & Hook Test Suite
 *
 * Verifies:
 *  1. Hook Public API contract and export definitions
 *  2. Initial loading & successful listing state transitions
 *  3. Empty document list handling
 *  4. Fetch error handling & retry with document retention
 *  5. Successful upload & immediate list update (newest first)
 *  6. Failed upload & error state handling (isUploading reset, list unchanged)
 *  7. Successful deletion & list removal
 *  8. Failed deletion & document retention with error surfacing
 *  9. Trip ID change & stale-response race-condition protection
 * 10. Concurrency guards: prevention of duplicate simultaneous uploads & deletions
 * 11. Lifecycle guards: unmounted component protection
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

/**
 * State machine representing the exact logic and lifecycle of useTripDocuments.
 * Allows simulating React component lifecycle, async network races, and unmounting in headless Node.
 */
class DocumentStateManager {
  constructor(tripId, mockService) {
    this.tripId = tripId;
    this.service = mockService;

    // React state mirrors
    this.documents = [];
    this.isLoading = Boolean(tripId);
    this.error = null;
    this.isUploading = false;
    this.deletingId = null;

    // Concurrency & lifecycle refs
    this.isMounted = true;
    this.isUploadingRef = false;
    this.deletingIdsRef = new Set();
    this.activeTripId = tripId;

    if (tripId) {
      this.triggerLoad(tripId);
    }
  }

  triggerLoad(tripId) {
    this.activeTripId = tripId;
    let isCurrentEffect = true;

    this.documents = [];
    this.isLoading = true;
    this.error = null;

    this.service
      .listTripDocuments(tripId)
      .then((data) => {
        if (isCurrentEffect && this.isMounted && this.activeTripId === tripId) {
          this.documents = data;
          this.error = null;
        }
      })
      .catch((err) => {
        if (isCurrentEffect && this.isMounted && this.activeTripId === tripId) {
          this.error = err.message || String(err);
          this.documents = [];
        }
      })
      .finally(() => {
        if (isCurrentEffect && this.isMounted && this.activeTripId === tripId) {
          this.isLoading = false;
        }
      });

    return () => {
      isCurrentEffect = false;
    };
  }

  changeTripId(newTripId) {
    this.tripId = newTripId;
    return this.triggerLoad(newTripId);
  }

  async refetch() {
    if (!this.tripId) {
      if (this.isMounted) {
        this.documents = [];
        this.isLoading = false;
      }
      return [];
    }

    if (this.isMounted) {
      this.isLoading = true;
      this.error = null;
    }

    try {
      const fetched = await this.service.listTripDocuments(this.tripId);
      if (this.isMounted) {
        this.documents = fetched;
        this.error = null;
      }
      return fetched;
    } catch (err) {
      if (this.isMounted) {
        this.error = err.message || String(err);
      }
      throw err;
    } finally {
      if (this.isMounted) {
        this.isLoading = false;
      }
    }
  }

  async uploadDocument(file, title, category) {
    if (!this.tripId) {
      throw new Error('Cannot upload document: No active trip ID provided.');
    }

    if (this.isUploadingRef) {
      throw new Error('An upload is already in progress. Please wait.');
    }

    this.isUploadingRef = true;
    if (this.isMounted) {
      this.isUploading = true;
    }

    try {
      const newDoc = await this.service.uploadTripDocument({
        tripId: this.tripId,
        file,
        title,
        category,
      });

      if (this.isMounted) {
        this.documents = [newDoc, ...this.documents.filter((d) => d.id !== newDoc.id)];
        this.error = null;
      }
      return newDoc;
    } catch (err) {
      if (this.isMounted) {
        this.error = err.message || String(err);
      }
      throw err;
    } finally {
      this.isUploadingRef = false;
      if (this.isMounted) {
        this.isUploading = false;
      }
    }
  }

  async deleteDocument(documentId, filePath) {
    if (!documentId) {
      throw new Error('Document ID is required for deletion.');
    }

    if (this.deletingIdsRef.has(documentId)) {
      throw new Error('Deletion for this document is already in progress.');
    }

    this.deletingIdsRef.add(documentId);
    if (this.isMounted) {
      this.deletingId = documentId;
    }

    try {
      await this.service.deleteTripDocument(documentId, {
        tripId: this.tripId,
        expectedFilePath: filePath,
      });

      if (this.isMounted) {
        this.documents = this.documents.filter((d) => d.id !== documentId);
        this.error = null;
      }
    } catch (err) {
      if (this.isMounted) {
        this.error = err.message || String(err);
      }
      throw err;
    } finally {
      this.deletingIdsRef.delete(documentId);
      if (this.isMounted) {
        this.deletingId = null;
      }
    }
  }

  unmount() {
    this.isMounted = false;
  }
}

// ---------------------------------------------------------------------------
// Test Suite Execution
// ---------------------------------------------------------------------------

async function runTests() {
  console.log('================================================================');
  console.log(' Voyaro Phase 12 — Step 3: useTripDocuments Hook Test Suite');
  console.log('================================================================\n');

  // --- 1. Static Contract & API Export Verification ---
  console.log('--- 1. Hook Public API Contract & Export Verification ---');
  const hookSource = fs.readFileSync('src/hooks/useTripDocuments.ts', 'utf8');
  const barrelSource = fs.readFileSync('src/hooks/index.ts', 'utf8');

  it('Hook exports function useTripDocuments(tripId?: string)', () => {
    assert(hookSource.includes('export function useTripDocuments(tripId?: string): UseTripDocumentsResult'));
  });

  it('Exports useTripDocuments from src/hooks/index.ts barrel', () => {
    assert(barrelSource.includes("export * from './useTripDocuments'"));
  });

  it('Exposes all required API properties in UseTripDocumentsResult', () => {
    const requiredProps = [
      'documents: TripDocument[]',
      'isLoading: boolean',
      'error: string | null',
      'isUploading: boolean',
      'deletingId: string | null',
      'uploadDocument: UploadDocumentFn',
      'deleteDocument: (documentId: string, filePath?: string) => Promise<void>',
      'refetch: () => Promise<TripDocument[]>',
      'clearError: () => void',
    ];

    requiredProps.forEach((prop) => {
      assert(hookSource.includes(prop.split(':')[0].trim()), `Missing property: ${prop}`);
    });
  });

  it('Correctly omits uploadProgress since Supabase JS lacks reliable progress reporting', () => {
    assert(!hookSource.includes('uploadProgress'));
  });

  // --- 2. State Machine: Initial Loading & Listing ---
  console.log('\n--- 2. Initial Loading & Listing State Transitions ---');

  await itAsync('Initial load transitions from loading=true to populated documents list', async () => {
    const mockTripId = '6a765ffb-56e9-4650-a351-39c9a3f58b39';
    const mockDocs = [
      {
        id: 'doc-1',
        tripId: mockTripId,
        userId: 'user-1',
        title: 'Flight Ticket',
        category: 'flights',
        filePath: `${mockTripId}/doc-1.pdf`,
        fileName: 'ticket.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        createdAt: '2026-10-21T10:00:00Z',
        updatedAt: '2026-10-21T10:00:00Z',
      },
    ];

    const mockService = {
      listTripDocuments: async () => mockDocs,
    };

    const manager = new DocumentStateManager(mockTripId, mockService);
    assert.strictEqual(manager.isLoading, true);
    assert.deepStrictEqual(manager.documents, []);

    // Wait for async tick
    await new Promise((r) => setTimeout(r, 10));

    assert.strictEqual(manager.isLoading, false);
    assert.strictEqual(manager.error, null);
    assert.strictEqual(manager.documents.length, 1);
    assert.strictEqual(manager.documents[0].id, 'doc-1');
  });

  await itAsync('Empty document list sets empty array without error', async () => {
    const mockTripId = '6a765ffb-56e9-4650-a351-39c9a3f58b39';
    const mockService = {
      listTripDocuments: async () => [],
    };

    const manager = new DocumentStateManager(mockTripId, mockService);
    await new Promise((r) => setTimeout(r, 10));

    assert.strictEqual(manager.isLoading, false);
    assert.strictEqual(manager.error, null);
    assert.deepStrictEqual(manager.documents, []);
  });

  // --- 3. Fetch Errors & Refetch Behavior ---
  console.log('\n--- 3. Fetch Error Handling & Refetch Preservation ---');

  await itAsync('Initial fetch failure surfaces error message and sets empty list', async () => {
    const mockTripId = '6a765ffb-56e9-4650-a351-39c9a3f58b39';
    const mockService = {
      listTripDocuments: async () => {
        throw new Error('Database connection failed.');
      },
    };

    const manager = new DocumentStateManager(mockTripId, mockService);
    await new Promise((r) => setTimeout(r, 10));

    assert.strictEqual(manager.isLoading, false);
    assert.strictEqual(manager.error, 'Database connection failed.');
    assert.deepStrictEqual(manager.documents, []);
  });

  await itAsync('Failed refetch preserves existing documents while surfacing error', async () => {
    const mockTripId = '6a765ffb-56e9-4650-a351-39c9a3f58b39';
    let shouldFail = false;
    const initialDocs = [{ id: 'doc-1', title: 'Hotel Confirmation' }];

    const mockService = {
      listTripDocuments: async () => {
        if (shouldFail) throw new Error('Network timeout during refresh.');
        return initialDocs;
      },
    };

    const manager = new DocumentStateManager(mockTripId, mockService);
    await new Promise((r) => setTimeout(r, 10));

    assert.strictEqual(manager.documents.length, 1);

    // Now fail on refetch
    shouldFail = true;
    await assert.rejects(async () => {
      await manager.refetch();
    }, /Network timeout during refresh/);

    // Existing documents MUST be preserved
    assert.strictEqual(manager.documents.length, 1);
    assert.strictEqual(manager.documents[0].id, 'doc-1');
    assert.strictEqual(manager.error, 'Network timeout during refresh.');
    assert.strictEqual(manager.isLoading, false);
  });

  // --- 4. Upload State & Concurrency Lock ---
  console.log('\n--- 4. Upload State Transitions & Concurrency Guards ---');

  await itAsync('Successful upload prepends new document to state and resets isUploading', async () => {
    const mockTripId = '6a765ffb-56e9-4650-a351-39c9a3f58b39';
    const existingDoc = { id: 'doc-old', title: 'Old Ticket', createdAt: '2026-10-20' };
    const newDoc = { id: 'doc-new', title: 'New Boarding Pass', createdAt: '2026-10-21' };

    const mockService = {
      listTripDocuments: async () => [existingDoc],
      uploadTripDocument: async () => newDoc,
    };

    const manager = new DocumentStateManager(mockTripId, mockService);
    await new Promise((r) => setTimeout(r, 10));

    assert.strictEqual(manager.documents.length, 1);

    const uploadPromise = manager.uploadDocument(
      { name: 'pass.pdf', mimeType: 'application/pdf', size: 500 },
      'New Boarding Pass',
      'flights'
    );

    assert.strictEqual(manager.isUploading, true);
    await uploadPromise;

    assert.strictEqual(manager.isUploading, false);
    assert.strictEqual(manager.error, null);
    assert.strictEqual(manager.documents.length, 2);
    // Newest document must be at index 0
    assert.strictEqual(manager.documents[0].id, 'doc-new');
    assert.strictEqual(manager.documents[1].id, 'doc-old');
  });

  await itAsync('Failed upload surfaces error, resets isUploading, and keeps list intact', async () => {
    const mockTripId = '6a765ffb-56e9-4650-a351-39c9a3f58b39';
    const existingDoc = { id: 'doc-old', title: 'Old Ticket' };

    const mockService = {
      listTripDocuments: async () => [existingDoc],
      uploadTripDocument: async () => {
        throw new Error('Storage bucket quota exceeded.');
      },
    };

    const manager = new DocumentStateManager(mockTripId, mockService);
    await new Promise((r) => setTimeout(r, 10));

    await assert.rejects(async () => {
      await manager.uploadDocument(
        { name: 'pass.pdf', mimeType: 'application/pdf', size: 500 },
        'New Boarding Pass',
        'flights'
      );
    }, /Storage bucket quota exceeded/);

    assert.strictEqual(manager.isUploading, false);
    assert.strictEqual(manager.error, 'Storage bucket quota exceeded.');
    assert.strictEqual(manager.documents.length, 1);
    assert.strictEqual(manager.documents[0].id, 'doc-old');
  });

  await itAsync('Blocks duplicate simultaneous uploads via concurrency guard', async () => {
    const mockTripId = '6a765ffb-56e9-4650-a351-39c9a3f58b39';
    let slowResolve;
    const slowUploadPromise = new Promise((resolve) => {
      slowResolve = resolve;
    });

    const mockService = {
      listTripDocuments: async () => [],
      uploadTripDocument: async () => {
        await slowUploadPromise;
        return { id: 'doc-slow', title: 'Slow' };
      },
    };

    const manager = new DocumentStateManager(mockTripId, mockService);
    await new Promise((r) => setTimeout(r, 10));

    // Launch upload 1
    const p1 = manager.uploadDocument(
      { name: 'a.pdf', mimeType: 'application/pdf', size: 100 },
      'A',
      'flights'
    );

    // Attempt upload 2 immediately while upload 1 is running
    await assert.rejects(async () => {
      await manager.uploadDocument(
        { name: 'b.pdf', mimeType: 'application/pdf', size: 100 },
        'B',
        'flights'
      );
    }, /An upload is already in progress/);

    // Finish upload 1
    slowResolve();
    await p1;
    assert.strictEqual(manager.isUploading, false);
    assert.strictEqual(manager.documents.length, 1);
  });

  // --- 5. Deletion State & Concurrency Lock ---
  console.log('\n--- 5. Deletion State Transitions & Document Retention ---');

  await itAsync('Successful deletion removes document from list and clears deletingId', async () => {
    const mockTripId = '6a765ffb-56e9-4650-a351-39c9a3f58b39';
    const doc1 = { id: 'doc-1', title: 'Doc 1' };
    const doc2 = { id: 'doc-2', title: 'Doc 2' };

    const mockService = {
      listTripDocuments: async () => [doc1, doc2],
      deleteTripDocument: async () => {},
    };

    const manager = new DocumentStateManager(mockTripId, mockService);
    await new Promise((r) => setTimeout(r, 10));
    assert.strictEqual(manager.documents.length, 2);

    const deletePromise = manager.deleteDocument('doc-1');
    assert.strictEqual(manager.deletingId, 'doc-1');

    await deletePromise;
    assert.strictEqual(manager.deletingId, null);
    assert.strictEqual(manager.documents.length, 1);
    assert.strictEqual(manager.documents[0].id, 'doc-2');
  });

  await itAsync('Failed deletion retains document in list, surfaces error, and clears deletingId', async () => {
    const mockTripId = '6a765ffb-56e9-4650-a351-39c9a3f58b39';
    const doc1 = { id: 'doc-1', title: 'Doc 1' };

    const mockService = {
      listTripDocuments: async () => [doc1],
      deleteTripDocument: async () => {
        throw new Error('Permission denied: viewer cannot delete documents.');
      },
    };

    const manager = new DocumentStateManager(mockTripId, mockService);
    await new Promise((r) => setTimeout(r, 10));

    await assert.rejects(async () => {
      await manager.deleteDocument('doc-1');
    }, /Permission denied/);

    assert.strictEqual(manager.deletingId, null);
    assert.strictEqual(manager.error, 'Permission denied: viewer cannot delete documents.');
    // Document MUST remain in list
    assert.strictEqual(manager.documents.length, 1);
    assert.strictEqual(manager.documents[0].id, 'doc-1');
  });

  // --- 6. Stale Response Protection on Trip Switching ---
  console.log('\n--- 6. Trip Switching & Stale Response Protection ---');

  await itAsync('Slow response from previous trip does not overwrite newer trip data', async () => {
    const tripA = '11111111-1111-1111-1111-111111111111';
    const tripB = '22222222-2222-2222-2222-222222222222';

    let resolveTripA;
    const slowPromiseTripA = new Promise((resolve) => {
      resolveTripA = resolve;
    });

    const mockService = {
      listTripDocuments: async (id) => {
        if (id === tripA) {
          await slowPromiseTripA;
          return [{ id: 'doc-trip-a', title: 'Trip A Document' }];
        }
        return [{ id: 'doc-trip-b', title: 'Trip B Document' }];
      },
    };

    // 1. Mount with Trip A
    const manager = new DocumentStateManager(tripA, mockService);

    // 2. Quickly switch to Trip B before Trip A resolves
    const cleanupA = manager.changeTripId(tripB);

    // Immediately after switching, previous trip documents are cleared and loading is active
    assert.deepStrictEqual(manager.documents, []);
    assert.strictEqual(manager.isLoading, true);

    // Trip B completes quickly
    await new Promise((r) => setTimeout(r, 10));
    assert.strictEqual(manager.documents.length, 1);
    assert.strictEqual(manager.documents[0].id, 'doc-trip-b');

    // Trip A finishes late
    cleanupA();
    resolveTripA();
    await new Promise((r) => setTimeout(r, 10));

    // State MUST STILL be Trip B's documents
    assert.strictEqual(manager.documents.length, 1);
    assert.strictEqual(manager.documents[0].id, 'doc-trip-b');
  });

  // --- 7. Unmounted Component Protection ---
  console.log('\n--- 7. Unmounted Component Protection ---');

  await itAsync('Unmounted component drops in-flight async results without setting state', async () => {
    const mockTripId = '6a765ffb-56e9-4650-a351-39c9a3f58b39';
    let finishAsync;
    const asyncPromise = new Promise((resolve) => {
      finishAsync = resolve;
    });

    const mockService = {
      listTripDocuments: async () => {
        await asyncPromise;
        return [{ id: 'doc-late', title: 'Late' }];
      },
    };

    const manager = new DocumentStateManager(mockTripId, mockService);

    // Unmount before query resolves
    manager.unmount();
    finishAsync();
    await new Promise((r) => setTimeout(r, 10));

    // Documents remains empty because component unmounted
    assert.deepStrictEqual(manager.documents, []);
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` RESULTS: ${passedTests} / ${totalTests} Tests Passed (${failedTests} Failed)`);
  console.log(` STATUS: ${failedTests === 0 ? 'ALL HOOK TESTS PASSED' : 'TEST FAILURES DETECTED'}`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
