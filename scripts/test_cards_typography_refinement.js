/**
 * Automated Verification Suite for Card & Typography Refinements:
 * 1. Date Card & Date Picker Normalization (DateTimePickerField & Itinerary Check-in/out Date Cards)
 * 2. Expense Details Screen (Hero card, financial breakdown, top bar buttons, padding)
 * 3. Other Cards (BudgetOverviewCard, CategoryBreakdownCard, Itinerary Item Detail, Trip Overview & Trips List)
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
console.log(' Voyaro UI Refinement: Date & Expense Details Cards Audit');
console.log('================================================================\n');

const projectRoot = path.resolve(__dirname, '..');
const datePickerPath = path.join(projectRoot, 'src', 'components', 'ui', 'DateTimePickerField.tsx');
const expenseDetailPath = path.join(projectRoot, 'src', 'app', 'expense', '[expenseId].tsx');
const itineraryItemDetailPath = path.join(projectRoot, 'src', 'app', 'itinerary', '[itemId].tsx');
const budgetOverviewCardPath = path.join(projectRoot, 'src', 'components', 'expenses', 'BudgetOverviewCard.tsx');
const categoryBreakdownCardPath = path.join(projectRoot, 'src', 'components', 'expenses', 'CategoryBreakdownCard.tsx');
const tripOverviewPath = path.join(projectRoot, 'src', 'app', '(tabs)', 'trips', '[tripId]', 'index.tsx');
const tripsListPath = path.join(projectRoot, 'src', 'app', '(tabs)', 'trips', 'index.tsx');

// --- 1. Date Cards & DateTimePickerField ---
console.log('--- 1. Date Cards & DateTimePickerField ---');

runTest('DateTimePickerField height normalized to 40px and font to 13.5px', () => {
  const content = fs.readFileSync(datePickerPath, 'utf8');
  assert(content.includes('height: 40'), 'Field row height must be normalized to 40 (was 48)');
  assert(content.includes('fontSize: 13.5'), 'Display text font size must be normalized to 13.5 (was 15)');
  assert(content.includes('paddingHorizontal: 10'), 'Field row padding must be 10 (was 12)');
});

runTest('Itinerary Check-In and Check-Out Date Cards are proportioned and normalized', () => {
  const content = fs.readFileSync(itineraryItemDetailPath, 'utf8');
  assert(content.includes('halfCard: {'), 'Must have halfCard style');
  assert(content.includes('checkDateValue: {'), 'Must have checkDateValue style');
  assert(content.includes('checkDateLabel: {'), 'Must have checkDateLabel style');
  assert(content.includes('fontSize: 15'), 'checkDateValue font size must be 15 (was 18)');
  assert(content.includes('fontSize: 12.5'), 'checkTimeValue font size must be 12.5 (was 14)');
  assert(content.includes('fontSize: 11'), 'checkSubDate font size must be 11 (was 12)');
  assert(content.includes('padding: 10'), 'halfCard padding must be 10 (was 12)');
});

// --- 2. Expense Details Screen & Add Expense Card ---
console.log('\n--- 2. Expense Details Screen & Add Expense Card ---');

runTest('Expense Details screen heroCard, topBar, and breakdown cards are normalized', () => {
  const content = fs.readFileSync(expenseDetailPath, 'utf8');
  assert(content.includes('heroCard: {'), 'Must have heroCard style');
  assert(content.includes('padding: 12'), 'heroCard padding must be 12 (was 16)');
  assert(content.includes('borderRadius: 12'), 'heroCard borderRadius must be 12 (was 14)');
  assert(content.includes('width: 32'), 'Top bar circle button must be 32 (was 40)');
  assert(content.includes('height: 32'), 'Top bar circle button must be 32 (was 40)');
  assert(content.includes('fontSize: 22'), 'heroAmount stat size must be 22');
  assert(content.includes('fontSize: 15'), 'heroTitle font size must be 15 (was 20)');
  assert(content.includes('padding: 10'), 'detailCard padding must be 10 (was 12)');
  assert(content.includes('paddingHorizontal: spacing.md'), 'scrollContent padding must be spacing.md');
});

runTest('Add Expense screen Expense Details card, inputs, and amount row are normalized', () => {
  const addExpensePath = path.join(projectRoot, 'src', 'app', 'add', 'expense.tsx');
  const content = fs.readFileSync(addExpensePath, 'utf8');
  assert(content.includes('borderRadius: 12'), 'cardContainer borderRadius must be 12 (was radius.card / 14)');
  assert(content.includes('padding: 12'), 'cardContainer padding must be 12');
  assert(content.includes('fontSize: 11.5'), 'inputLabel fontSize must be 11.5 (was 13)');
  assert(content.includes('height: 42'), 'inputWrapper, currencyTrigger, amountInputWrapper must have height: 42 (was 46-48)');
  assert(content.includes('fontSize: 13.5'), 'textInput fontSize must be 13.5 (was 15)');
  assert(content.includes('fontSize: 14'), 'amountInput fontSize must be 14 (was 18)');
  assert(content.includes('height: 44'), 'primarySubmitButton must have height: 44');
});

// --- 3. Other Cards Across App ---
console.log('\n--- 3. Other Cards Across App ---');

runTest('BudgetOverviewCard metrics and container are normalized', () => {
  const content = fs.readFileSync(budgetOverviewCardPath, 'utf8');
  assert(content.includes('borderRadius: 12'), 'cardContainer borderRadius must be 12');
  assert(content.includes('fontSize: 20'), 'metricSpentValue font size must be 20 (was 22)');
  assert(content.includes('fontSize: 16'), 'metricRemainingValue font size must be 16 (was 18)');
});

runTest('CategoryBreakdownCard padding and banner are normalized', () => {
  const content = fs.readFileSync(categoryBreakdownCardPath, 'utf8');
  assert(content.includes('borderRadius: 12'), 'cardContainer borderRadius must be 12');
  assert(content.includes('padding: spacing.md'), 'cardContainer padding must be spacing.md (12)');
  assert(content.includes('fontSize: 15'), 'headerTitle font size must be 15 (was 16)');
  assert(content.includes('borderRadius: 10'), 'topCategoryBanner borderRadius must be 10');
});

runTest('Itinerary Item Detail hero card, tiles, and airport codes are normalized', () => {
  const content = fs.readFileSync(itineraryItemDetailPath, 'utf8');
  assert(content.includes('padding: 12'), 'heroCard padding must be 12 (was 16)');
  assert(content.includes('fontSize: 16'), 'heroTitle font size must be 16 (was 20)');
  assert(content.includes('fontSize: 22'), 'airportCode font size must be 22 (was 26)');
  assert(content.includes('padding: 8'), 'gridTile padding must be 8 (was 12)');
  assert(content.includes('borderRadius: 10'), 'gridTile borderRadius must be 10');
});

runTest('Trip Overview hero flight and spending cards are normalized', () => {
  const content = fs.readFileSync(tripOverviewPath, 'utf8');
  assert(content.includes('borderRadius: 12'), 'flightHeroCard borderRadius must be 12 (was 14)');
  assert(content.includes('fontSize: 22'), 'airportCode font size must be 22 (was 28)');
  assert(content.includes('fontSize: 16'), 'flightNumber font size must be 16 (was 20)');
  assert(content.includes('fontSize: 18'), 'spendingTotal font size must be 18 (was 22)');
  assert(content.includes('fontSize: 14'), 'spendingRemaining font size must be 14 (was 16)');
});

runTest('Trips List card banner and footer are normalized', () => {
  const content = fs.readFileSync(tripsListPath, 'utf8');
  assert(content.includes('fontSize: 20'), 'headerTitle font size must be 20 (was 24)');
  assert(content.includes('minHeight: 76'), 'cardBanner minHeight must be 76 (was 84)');
  assert(content.includes('paddingVertical: 10'), 'cardFooter paddingVertical must be 10 (was 16)');
  assert(content.includes('paddingHorizontal: 12'), 'cardFooter paddingHorizontal must be 12 (was 16)');
});

console.log('\n================================================================');
console.log(` RESULTS: ${passedTests} / ${totalTests} Tests Passed (${totalTests - passedTests} Failed)`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
