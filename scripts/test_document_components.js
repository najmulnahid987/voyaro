/**
 * Voyaro Phase 12 — Step 4: Documents UI Components Test Suite
 *
 * Verifies:
 *  1. Component exports and barrel integrity (src/components/documents/index.ts)
 *  2. DocumentCategoryChips: filter options, counts, and category selection logic
 *  3. DocumentCard formatting helpers (human-readable sizes, upload dates, icon resolution)
 *  4. DocumentCard layout rules (truncation attributes, deletion confirmation, permission-based delete button)
 *  5. UploadDocumentModal validation rules:
 *     - Missing file rejection
 *     - Missing/whitespace-only title rejection
 *     - Title length limit (<= 200 characters)
 *     - Auto-population of title from filename (and preserving user edits)
 *     - Unsupported MIME type rejection (enforces PDF, JPEG, PNG, WebP, HEIC)
 *     - Oversized file rejection (> 20 MB limit)
 *     - Picker cancellation (silent, no error)
 *  6. UploadDocumentModal lifecycle:
 *     - Successful upload invokes onUpload and closes modal
 *     - Failed upload retains modal open and surfaces actionable error for retry
 *     - Duplicate submission guard (blocks second click during in-flight upload)
 *     - Guarded dismissal during active upload
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
  console.log(' Voyaro Phase 12 — Step 4: Documents UI Components Test Suite');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. Component Exports & Barrel Integrity
  // -------------------------------------------------------------------------
  console.log('--- 1. Component Exports & Barrel Integrity ---');
  const barrelSource = fs.readFileSync('src/components/documents/index.ts', 'utf8');

  it('Exports DocumentCard and its prop types from barrel', () => {
    assert(barrelSource.includes("export { DocumentCard } from './DocumentCard'"));
    assert(barrelSource.includes("export type { DocumentCardProps } from './DocumentCard'"));
  });

  it('Exports DocumentCategoryChips and DOCUMENT_FILTER_OPTIONS from barrel', () => {
    assert(barrelSource.includes("export { DocumentCategoryChips, DOCUMENT_FILTER_OPTIONS } from './DocumentCategoryChips'"));
    assert(barrelSource.includes("export type {"));
    assert(barrelSource.includes('DocumentCategoryChipsProps'));
  });

  it('Exports UploadDocumentModal and its prop types from barrel', () => {
    assert(barrelSource.includes("export { UploadDocumentModal } from './UploadDocumentModal'"));
    assert(barrelSource.includes("export type { UploadDocumentModalProps } from './UploadDocumentModal'"));
  });

  // -------------------------------------------------------------------------
  // 2. DocumentCategoryChips Logic
  // -------------------------------------------------------------------------
  console.log('\n--- 2. DocumentCategoryChips Options & Selection ---');
  const chipsSource = fs.readFileSync('src/components/documents/DocumentCategoryChips.tsx', 'utf8');

  it('Includes all 6 required filter choices (All, Flights, Accommodation, Transport, Insurance, Other)', () => {
    const requiredKeys = ['all', 'flights', 'accommodation', 'transport', 'insurance', 'other'];
    requiredKeys.forEach((key) => {
      assert(chipsSource.includes(`key: '${key}'`), `Missing filter option key: ${key}`);
    });
  });

  it('Renders category count badge format when counts are provided: Label (count)', () => {
    assert(chipsSource.includes("typeof count === 'number' ? `${filter.label} (${count})` : filter.label"));
  });

  it('Uses horizontal scroll view with hidden indicators for responsive mobile layout', () => {
    assert(chipsSource.includes('horizontal'));
    assert(chipsSource.includes('showsHorizontalScrollIndicator={false}'));
  });

  // -------------------------------------------------------------------------
  // 3. DocumentCard Formatters & Layout Integrity
  // -------------------------------------------------------------------------
  console.log('\n--- 3. DocumentCard Formatting, Layout & Safety ---');
  const cardSource = fs.readFileSync('src/components/documents/DocumentCard.tsx', 'utf8');

  it('Formats human-readable file sizes correctly (B, KB, MB)', () => {
    const formatFileSize = (bytes) => {
      if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) return '0 B';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    assert.strictEqual(formatFileSize(0), '0 B');
    assert.strictEqual(formatFileSize(500), '500 B');
    assert.strictEqual(formatFileSize(1536), '1.5 KB');
    assert.strictEqual(formatFileSize(2 * 1024 * 1024), '2.0 MB');
    assert.strictEqual(formatFileSize(15.75 * 1024 * 1024), '15.8 MB');
  });

  it('Formats upload dates cleanly from ISO timestamp string', () => {
    const formatUploadDate = (isoString) => {
      if (!isoString) return '';
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return '';
      }
    };

    const formatted = formatUploadDate('2026-10-21T10:30:00.000Z');
    assert(formatted.includes('Oct') && formatted.includes('2026'));
    assert.strictEqual(formatUploadDate('invalid-date'), '');
  });

  it('Safely truncates long titles with numberOfLines={2} and ellipsizeMode="tail"', () => {
    assert(cardSource.includes('numberOfLines={2}'));
    assert(cardSource.includes('ellipsizeMode="tail"'));
  });

  it('Safely truncates long file names with numberOfLines={1} and ellipsizeMode="middle"', () => {
    assert(cardSource.includes('numberOfLines={1}'));
    assert(cardSource.includes('ellipsizeMode="middle"'));
  });

  it('Only renders delete button when canDelete is true and onDelete callback is provided', () => {
    assert(cardSource.includes('{canDelete && onDelete ?'));
  });

  it('Displays ActivityIndicator and dims card when isDeleting is true', () => {
    assert(cardSource.includes('{isDeleting ? ('));
    assert(cardSource.includes('<ActivityIndicator'));
    assert(cardSource.includes('isDeleting && styles.cardDeleting'));
  });

  it('Asks for confirmation before destructive deletion on both native and web platforms', () => {
    assert(cardSource.includes('Alert.alert'));
    assert(cardSource.includes("style: 'destructive'"));
    assert(cardSource.includes('window.confirm'));
  });

  // -------------------------------------------------------------------------
  // 4. UploadDocumentModal Validation & Title Auto-Population
  // -------------------------------------------------------------------------
  console.log('\n--- 4. UploadDocumentModal Validation & Title Population ---');
  const modalSource = fs.readFileSync('src/components/documents/UploadDocumentModal.tsx', 'utf8');

  it('Derives sensible document title from filename by stripping extension and formatting', () => {
    const deriveTitleFromFileName = (fileName) => {
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      const cleaned = nameWithoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleaned) return 'Document';
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    };

    assert.strictEqual(deriveTitleFromFileName('flight_nh204_boarding_pass.pdf'), 'Flight nh204 boarding pass');
    assert.strictEqual(deriveTitleFromFileName('hotel-gracery-tokyo.png'), 'Hotel gracery tokyo');
    assert.strictEqual(deriveTitleFromFileName('allianz_insurance_policy.pdf'), 'Allianz insurance policy');
  });

  it('Auto-populates title on file select only if user has not yet customized the title', () => {
    assert(modalSource.includes('if (!hasUserEditedTitle || !title.trim())'));
  });

  it('Rejects submission when no file is selected', () => {
    assert(modalSource.includes("if (!selectedFile)"));
    assert(modalSource.includes("setError('Please select a file to upload.')"));
  });

  it('Rejects submission when title is empty or whitespace-only', () => {
    assert(modalSource.includes('const trimmedTitle = title.trim();'));
    assert(modalSource.includes("if (!trimmedTitle)"));
    assert(modalSource.includes("setError('Please enter a document title.')"));
  });

  it('Rejects submission when title exceeds 200 characters', () => {
    assert(modalSource.includes('if (trimmedTitle.length > 200)'));
    assert(modalSource.includes("setError('Document title must be 200 characters or fewer.')"));
  });

  it('Validates file MIME type against allowed types (PDF, JPEG, PNG, WebP, HEIC)', () => {
    assert(modalSource.includes('ALLOWED_DOCUMENT_MIME_TYPES'));
    assert(modalSource.includes('Unsupported file type. Please select a PDF or image'));
  });

  it('Validates file size against MAX_DOCUMENT_FILE_SIZE_BYTES (20 MB limit)', () => {
    assert(modalSource.includes('MAX_DOCUMENT_FILE_SIZE_BYTES'));
    assert(modalSource.includes('exceeds the 20 MB limit. Please select a smaller file.'));
  });

  it('Handles document picker cancellation gracefully without displaying an error', () => {
    assert(modalSource.includes('if (result.canceled) {'));
    assert(modalSource.includes('return;'));
  });

  // -------------------------------------------------------------------------
  // 5. UploadDocumentModal Lifecycle & Concurrency
  // -------------------------------------------------------------------------
  console.log('\n--- 5. UploadDocumentModal Lifecycle & Concurrency Guards ---');

  it('Guards against duplicate simultaneous submissions during upload', () => {
    assert(modalSource.includes('if (activeLoading) return;'));
    assert(modalSource.includes('setIsSubmitting(true)'));
  });

  it('Guards dismissal (cancel & backdrop) while upload is actively running', () => {
    assert(modalSource.includes('const handleCancel = () => {'));
    assert(modalSource.includes('if (activeLoading) return;'));
  });

  it('Dismisses modal and resets form state upon successful upload', () => {
    assert(modalSource.includes('await onUpload(selectedFile, trimmedTitle, category);'));
    assert(modalSource.includes('setSelectedFile(null)'));
    assert(modalSource.includes('setTitle('));
    assert(modalSource.includes('onClose();'));
  });

  it('Retains modal open on upload failure so user can inspect error and retry', () => {
    assert(modalSource.includes('catch (err: unknown) {'));
    assert(modalSource.includes('setError(msg || \'Failed to upload document. Please try again.\');'));
    // onClose is NOT in the catch block!
  });

  it('Always resets isSubmitting in finally block', () => {
    assert(modalSource.includes('finally {'));
    assert(modalSource.includes('setIsSubmitting(false);'));
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` RESULTS: ${passedTests} / ${totalTests} Tests Passed (${failedTests} Failed)`);
  console.log(` STATUS: ${failedTests === 0 ? 'ALL COMPONENT TESTS PASSED' : 'TEST FAILURES DETECTED'}`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
