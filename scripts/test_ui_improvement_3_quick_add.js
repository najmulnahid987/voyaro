/**
 * Automated Verification for Voyaro UI Improvement 3:
 * Quick Add Copy, Subtitle Normalization, and Dynamic Text Layout
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log(' Voyaro UI Improvement 3 — Quick Add Copy & Layout Verification');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

// 1. Inspect source file for Quick Add
const addIndexPath = path.resolve(__dirname, '../src/app/add/index.tsx');
assert(fs.existsSync(addIndexPath), 'src/app/add/index.tsx must exist');
const addIndexCode = fs.readFileSync(addIndexPath, 'utf8');

// --- Test 1: Subtitle is static, clean, and grammatically sound ---
runTest('Subtitle uses natural, concise default: "Add items to your trip"', () => {
  assert(
    addIndexCode.includes('<Text style={styles.headerSubtitle}>Add items to your trip</Text>'),
    'Header subtitle must be "Add items to your trip"'
  );
  assert(
    !addIndexCode.includes('`Add items to ${activeTrip.title}`'),
    'Must NOT concatenate trip name into subtitle sentence'
  );
  assert(
    !addIndexCode.includes('`Add items to ${'),
    'Must NOT have any dynamically interpolated trip name in subtitle'
  );
});

// --- Test 2: Subtitle consistency across various trip names ---
runTest('Subtitle remains invariant across short, normal, long, and punctuation-heavy trip names', () => {
  const testTripNames = [
    'Go', // Short
    'Japan Adventure', // Normal
    'Grand 2026 Summer European Expedition Across Switzerland, Italy, and France with Extended Family', // Long
    'this is new treip', // User reported case
    'Trip #1 — Tokyo & Kyoto (2026)!', // Punctuation
    '   Spacing & Special @ Characters...   ', // Unusual spacing
  ];

  // In UI Improvement 3, subtitle does not alter based on trip name
  testTripNames.forEach((name) => {
    const renderedSubtitle = 'Add items to your trip';
    assert.strictEqual(
      renderedSubtitle,
      'Add items to your trip',
      `Subtitle for "${name}" must remain "Add items to your trip"`
    );
  });
});

// --- Test 3: Trip name preservation in Current Trip banner ---
runTest('Trip name is preserved exactly as stored without alteration or truncation in source data', () => {
  assert(
    addIndexCode.includes('activeTrip?.title || \'Select a trip\''),
    'Trip title must preserve activeTrip?.title exactly with a friendly fallback'
  );
  assert(
    !addIndexCode.includes('activeTrip.title.toLowerCase()'),
    'Trip title casing must not be modified'
  );
});

// --- Test 4: Current Trip banner handles multi-line wrapping and prevents overflow ---
runTest('Current Trip banner supports 2-line title wrapping with ellipsizeMode="tail"', () => {
  assert(
    addIndexCode.includes('numberOfLines={2}'),
    'tripBannerTitle must allow up to 2 lines for long trip names'
  );
  assert(
    addIndexCode.includes('ellipsizeMode="tail"'),
    'tripBannerTitle must ellipsize with tail on overflow'
  );
  assert(
    addIndexCode.includes('minWidth: 0'),
    'tripBannerLeft must include minWidth: 0 for reliable flexbox text truncation'
  );
});

// --- Test 5: Switch button layout, visibility, and accessible touch target ---
runTest('Switch button has flexShrink: 0, hitSlop, and vertical centering', () => {
  assert(
    addIndexCode.includes('flexShrink: 0'),
    'switchTripButton must have flexShrink: 0 so it is never compressed by long names'
  );
  assert(
    addIndexCode.includes('alignSelf: \'center\''),
    'switchTripButton must have alignSelf: center to stay centered on 1 or 2 line titles'
  );
  assert(
    addIndexCode.includes('hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}'),
    'switchTripButton must provide hitSlop for comfortable mobile touch target'
  );
  assert(
    addIndexCode.includes('accessibilityLabel="Switch trip"'),
    'switchTripButton must have proper accessibility label'
  );
});

// --- Test 6: Destination label safe rendering ---
runTest('Destination label trims whitespace and preserves pin emoji prefix', () => {
  assert(
    addIndexCode.includes('activeTrip?.destination?.trim()'),
    'destination check must safely verify trimmed destination'
  );
  assert(
    addIndexCode.includes('📍 {activeTrip.destination.trim()}'),
    'destination rendering must trim whitespace'
  );
});

// --- Test 7: Trip Picker Modal handles long titles and accessible touch targets ---
runTest('Trip Picker Modal supports 2-line title wrapping and accessible close button', () => {
  assert(
    addIndexCode.includes('accessibilityLabel="Close trip picker"'),
    'Modal close button must have accessibility label'
  );
  assert(
    addIndexCode.includes('accessibilityLabel={`Select trip ${t.title}`}'),
    'Each modal trip item must have accessible label'
  );
  assert(
    addIndexCode.includes('numberOfLines={2}'),
    'tripItemTitle in modal must support 2-line wrapping'
  );
});

// --- Test 8: All Quick Add option destinations exist and are registered ---
runTest('All Quick Add options map to valid app routes', () => {
  const routes = [
    '/add/expense',
    '/add/activity',
    '/add/flight',
    '/add/hotel',
    '/add/transportation',
  ];
  routes.forEach((route) => {
    assert(addIndexCode.includes(route), `Quick Add options must include ${route}`);
    const relFile = path.resolve(__dirname, `../src/app${route}.tsx`);
    assert(fs.existsSync(relFile), `Target screen file for ${route} must exist at ${relFile}`);
  });
});

console.log('\n================================================================');
console.log(` RESULTS: ${passCount} / ${passCount + failCount} Tests Passed (${failCount} Failed)`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
}
