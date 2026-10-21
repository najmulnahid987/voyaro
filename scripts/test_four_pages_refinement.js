/**
 * Automated Verification Suite for Voyaro:
 * 1. Dedicated Four Pages (Flights, Activities, Accommodation, Ground Transport)
 * 2. Visual Scale & Proportions (Typography & Component Normalization)
 * 3. Removal of Redundant Trip Selector from Pages (Preserved only in Quick Add)
 * 4. Preservation of Data Model & Trip Context Associations
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

console.log('================================================================');
console.log(' Voyaro UI Refinement: 4 Dedicated Pages & Trip Selector Audit');
console.log('================================================================\n');

const projectRoot = path.resolve(__dirname, '..');
const flightPath = path.join(projectRoot, 'src', 'app', 'add', 'flight.tsx');
const activityPath = path.join(projectRoot, 'src', 'app', 'add', 'activity.tsx');
const hotelPath = path.join(projectRoot, 'src', 'app', 'add', 'hotel.tsx');
const transportationPath = path.join(projectRoot, 'src', 'app', 'add', 'transportation.tsx');
const expensePath = path.join(projectRoot, 'src', 'app', 'add', 'expense.tsx');
const quickAddPath = path.join(projectRoot, 'src', 'app', 'add', 'index.tsx');

// --- 1. Redundant Trip Selector Removal ---
console.log('--- 1. Redundant Trip Selector Removal ---');

runTest('Flights page does NOT render a redundant Trip selector', () => {
  const content = fs.readFileSync(flightPath, 'utf8');
  assert(!content.includes('accessibilityLabel="Select trip"'), 'Trip selector accessibility label must be removed');
  assert(!content.includes("styles.inputLabel}>Trip</Text>"), 'Trip input label must be removed');
  assert(!content.includes('setShowTripDropdown'), 'setShowTripDropdown must be removed');
  assert(content.includes('selectedTripId'), 'selectedTripId state must be preserved for data association');
});

runTest('Activities page does NOT render a redundant Trip selector', () => {
  const content = fs.readFileSync(activityPath, 'utf8');
  assert(!content.includes('accessibilityLabel="Select trip"'), 'Trip selector accessibility label must be removed');
  assert(!content.includes("styles.inputLabel}>Trip</Text>"), 'Trip input label must be removed');
  assert(!content.includes('setShowTripDropdown'), 'setShowTripDropdown must be removed');
  assert(content.includes('selectedTripId'), 'selectedTripId state must be preserved for data association');
});

runTest('Accommodation page does NOT render a redundant Trip selector', () => {
  const content = fs.readFileSync(hotelPath, 'utf8');
  assert(!content.includes('accessibilityLabel="Select trip"'), 'Trip selector accessibility label must be removed');
  assert(!content.includes("styles.inputLabel}>Trip</Text>"), 'Trip input label must be removed');
  assert(!content.includes('setShowTripDropdown'), 'setShowTripDropdown must be removed');
  assert(content.includes('selectedTripId'), 'selectedTripId state must be preserved for data association');
});

runTest('Ground Transport page does NOT render a redundant Trip selector', () => {
  const content = fs.readFileSync(transportationPath, 'utf8');
  assert(!content.includes('accessibilityLabel="Select trip"'), 'Trip selector accessibility label must be removed');
  assert(!content.includes("styles.sectionLabel}>TRIP</Text>"), 'Trip section label must be removed');
  assert(!content.includes('setShowTripDropdown'), 'setShowTripDropdown must be removed');
  assert(content.includes('selectedTripId'), 'selectedTripId state must be preserved for data association');
});

runTest('Add Expense page does NOT render a redundant Trip selector', () => {
  const content = fs.readFileSync(expensePath, 'utf8');
  assert(!content.includes('accessibilityLabel="Select trip"'), 'Trip selector accessibility label must be removed');
  assert(!content.includes("styles.sectionTitle}>Trip</Text>"), 'Trip section title must be removed');
  assert(!content.includes('setShowTripDropdown'), 'setShowTripDropdown must be removed');
  assert(content.includes('selectedTripId'), 'selectedTripId state must be preserved for data association');
});

runTest('Quick Add page PRESERVES trip selector functionality', () => {
  const content = fs.readFileSync(quickAddPath, 'utf8');
  assert(content.includes('showTripPicker'), 'Quick Add must maintain trip picker modal state');
  assert(content.includes('selectedTripId'), 'Quick Add must maintain selectedTripId');
  assert(content.includes('handleOptionPress'), 'Quick Add must forward selectedTripId to destination routes');
});

// --- 2. Typography & Component Visual Scale Normalization ---
console.log('\n--- 2. Typography & Visual Scale Normalization ---');

runTest('Flights page typography and component scale are normalized', () => {
  const content = fs.readFileSync(flightPath, 'utf8');
  assert(content.includes("'Add Flight'"), 'Title should use proper Title Case "Add Flight"');
  assert(content.includes("'Edit Flight'"), 'Title should use proper Title Case "Edit Flight"');
  assert(content.includes('fontSize: 20'), 'Screen title font size normalized to 20 (was 28)');
  assert(content.includes('fontSize: 12'), 'Subtitle font size normalized to 12 (was 14/15)');
  assert(content.includes('height: 42'), 'Input wrapper height normalized to 42 (was 50)');
  assert(content.includes('height: 44'), 'Submit button height normalized to 44 (was 52)');
  assert(content.includes('paddingHorizontal: spacing.md'), 'Container horizontal padding normalized to spacing.md');
});

runTest('Activities page typography and component scale are normalized', () => {
  const content = fs.readFileSync(activityPath, 'utf8');
  assert(content.includes("'Add Activity'"), 'Title should use proper Title Case "Add Activity"');
  assert(content.includes("'Edit Activity'"), 'Title should use proper Title Case "Edit Activity"');
  assert(content.includes('fontSize: 20'), 'Screen title font size normalized to 20 (was 28)');
  assert(content.includes('fontSize: 12'), 'Subtitle font size normalized to 12 (was 15)');
  assert(content.includes('height: 42'), 'Input wrapper height normalized to 42 (was 48)');
  assert(content.includes('height: 44'), 'Submit button height normalized to 44 (was 52)');
  assert(content.includes('paddingHorizontal: spacing.md'), 'Container horizontal padding normalized to spacing.md');
});

runTest('Accommodation page typography and component scale are normalized', () => {
  const content = fs.readFileSync(hotelPath, 'utf8');
  assert(content.includes("'Add Accommodation'"), 'Title should use dedicated name "Add Accommodation"');
  assert(content.includes("'Edit Accommodation'"), 'Title should use dedicated name "Edit Accommodation"');
  assert(content.includes('fontSize: 20'), 'Screen title font size normalized to 20 (was 28)');
  assert(content.includes('fontSize: 12'), 'Subtitle font size normalized to 12 (was 15)');
  assert(content.includes('height: 42'), 'Input wrapper height normalized to 42 (was 48)');
  assert(content.includes('height: 44'), 'Submit button height normalized to 44 (was 52)');
  assert(content.includes('paddingHorizontal: spacing.md'), 'Container horizontal padding normalized to spacing.md');
});

runTest('Ground Transport page typography and component scale are normalized', () => {
  const content = fs.readFileSync(transportationPath, 'utf8');
  assert(content.includes("'Add Ground Transport'"), 'Title should use dedicated name "Add Ground Transport"');
  assert(content.includes("'Edit Ground Transport'"), 'Title should use dedicated name "Edit Ground Transport"');
  assert(content.includes('fontSize: 20'), 'Screen title font size normalized to 20 (was 28)');
  assert(content.includes('fontSize: 12'), 'Subtitle font size normalized to 12 (was 15)');
  assert(content.includes('height: 40'), 'Input field height normalized to 40 (was 44)');
  assert(content.includes('paddingVertical: 8'), 'Mode button padding normalized to 8 (was 12)');
  assert(content.includes('height: 44'), 'Submit button height normalized to 44 (was 52)');
  assert(content.includes('paddingHorizontal: spacing.md'), 'Container horizontal padding normalized to spacing.md');
});

runTest('Add Expense page typography and scale are normalized', () => {
  const content = fs.readFileSync(expensePath, 'utf8');
  assert(content.includes('fontSize: 20'), 'Screen title font size normalized to 20 (was 24)');
  assert(content.includes('fontSize: 12'), 'Subtitle font size normalized to 12 (was 14)');
  assert(content.includes('width: 32'), 'Close button normalized to 32 (was 38)');
});

// --- 3. Data Association & Navigation Preservation ---
console.log('\n--- 3. Data Association & Navigation Preservation ---');

runTest('Flights page persists item with selectedTripId and navigates correctly', () => {
  const content = fs.readFileSync(flightPath, 'utf8');
  assert(content.includes('tripId: selectedTripId'), 'Payload must include tripId: selectedTripId');
  assert(content.includes('router.push(`/(tabs)/trips/${selectedTripId}/itinerary`'), 'Must return to trip itinerary');
});

runTest('Activities page persists item with selectedTripId and navigates correctly', () => {
  const content = fs.readFileSync(activityPath, 'utf8');
  assert(content.includes('tripId: selectedTripId'), 'Payload must include tripId: selectedTripId');
  assert(content.includes('router.push(`/(tabs)/trips/${selectedTripId}/itinerary`'), 'Must return to trip itinerary');
});

runTest('Accommodation page persists item with selectedTripId and navigates correctly', () => {
  const content = fs.readFileSync(hotelPath, 'utf8');
  assert(content.includes('tripId: selectedTripId'), 'Payload must include tripId: selectedTripId');
  assert(content.includes('router.push(`/(tabs)/trips/${selectedTripId}/itinerary`'), 'Must return to trip itinerary');
});

runTest('Ground Transport page persists item with selectedTripId and navigates correctly', () => {
  const content = fs.readFileSync(transportationPath, 'utf8');
  assert(content.includes('tripId: selectedTripId'), 'Payload must include tripId: selectedTripId');
  assert(content.includes('router.push(`/(tabs)/trips/${selectedTripId}/itinerary`'), 'Must return to trip itinerary');
});

console.log('\n================================================================');
console.log(` RESULTS: ${passedTests} / ${totalTests} Tests Passed (${totalTests - passedTests} Failed)`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
