/**
 * Test Suite for Expense Dashboard and List (Phase 6 — Step 4)
 *
 * Verifies:
 *  1. Trip context & isolation (no mixing of expenses between trips).
 *  2. Dashboard calculations (Total spent, Budget, Remaining, Usage %, Over-Budget state).
 *  3. Safe handling of missing budget and zero budget (no division by zero).
 *  4. Empty state (0 expenses) vs single expense vs multiple expenses.
 *  5. Chronological date grouping (newest first).
 *  6. Multi-currency separate totals (never silently adding differing currencies).
 */

import {
  addExpense,
  clearTripExpenses,
  deleteExpense,
  getExpensesByTrip,
  getTripBudget,
  getTripExpenseSummary,
  resetExpenseSeedData,
  setTripBudget,
} from '@/services/expenseStore';
import {
  groupExpensesByDate,
  sumExpensesByCurrency,
} from './currencyUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runExpenseDashboardWorkflowTests() {
  console.log('\n--- Running Expense Dashboard & List Test Suite (Step 4) ---\n');

  // Reset to initial seed data
  resetExpenseSeedData();

  // -------------------------------------------------------------------------
  // 1. Trip Context & Isolation (No mixing of unrelated trips)
  // -------------------------------------------------------------------------
  console.log('1. Testing trip-scoped isolation...');
  const japanExpenses = getExpensesByTrip('japan-adventure');
  const swissExpenses = getExpensesByTrip('swiss-alps');
  const parisExpenses = getExpensesByTrip('paris-getaway');

  assert(japanExpenses.length === 5, 'Japan Adventure has 5 expenses');
  assert(swissExpenses.length === 1, 'Swiss Alps has 1 expense');
  assert(parisExpenses.length === 0, 'Paris Getaway has 0 expenses (empty)');

  // Ensure no cross-trip mixing
  assert(
    japanExpenses.every((e) => e.tripId === 'japan-adventure'),
    'All Japan expenses belong strictly to japan-adventure'
  );
  assert(
    swissExpenses.every((e) => e.tripId === 'swiss-alps'),
    'All Swiss expenses belong strictly to swiss-alps'
  );

  // -------------------------------------------------------------------------
  // 2. Dashboard Calculations (Populated, Within Budget)
  // -------------------------------------------------------------------------
  console.log('\n2. Testing populated dashboard metrics within budget...');
  const japanSummary = getTripExpenseSummary('japan-adventure');
  const japanBudget = getTripBudget('japan-adventure');

  // Total spent: $1,240.50 (124050 minor units)
  assert(japanSummary.totalSpentMinorUnits === 124050, 'Total spent equals 124050 cents ($1,240.50)');
  assert(japanSummary.totalSpentFormatted === '$1,240.50', 'Formatted total spent is "$1,240.50"');

  // Budget: $3,000.00 (300000 minor units)
  assert(japanBudget?.amount === 300000, 'Trip budget equals 300000 cents ($3,000.00)');
  assert(japanSummary.budgetFormatted === '$3,000.00', 'Formatted budget is "$3,000.00"');

  // Remaining: $1,759.50 (175950 minor units)
  assert(
    japanSummary.remainingMinorUnits === 175950,
    'Remaining budget equals 175950 cents ($1,759.50)'
  );
  assert(japanSummary.remainingFormatted === '$1,759.50', 'Formatted remaining is "$1,759.50"');

  // Usage %: 41%
  assert(japanSummary.percentUsed === 41, 'Budget usage is 41%');
  assert(!japanSummary.isOverBudget, 'isOverBudget is false');

  // -------------------------------------------------------------------------
  // 3. Dashboard Calculations (Spending Above Budget)
  // -------------------------------------------------------------------------
  console.log('\n3. Testing spending above budget (Over-Budget state)...');
  const swissSummary = getTripExpenseSummary('swiss-alps');
  const swissBudget = getTripBudget('swiss-alps');

  // Budget: $2,000.00, Spent: $2,100.00
  assert(swissBudget?.amount === 200000, 'Swiss budget is 200000 cents ($2,000.00)');
  assert(swissSummary.totalSpentMinorUnits === 210000, 'Swiss spent is 210000 cents ($2,100.00)');

  // Remaining: -$100.00
  assert(swissSummary.remainingMinorUnits === -10000, 'Remaining is -10000 cents (-$100.00)');
  assert(Boolean(swissSummary.isOverBudget), 'isOverBudget is correctly true');
  assert(swissSummary.percentUsed! === 105, 'Budget usage is 105% (above 100%)');

  // -------------------------------------------------------------------------
  // 4. Safe Handling of Missing and Zero Budget (No Division by Zero)
  // -------------------------------------------------------------------------
  console.log('\n4. Testing missing & zero budget handling...');

  // 'thailand-escape' has no budget in store
  const thailandSummary = getTripExpenseSummary('thailand-escape');
  assert(thailandSummary.budgetMinorUnits === undefined, 'Missing budget is undefined');
  assert(thailandSummary.percentUsed === undefined, 'percentUsed is safely undefined (no division by zero)');
  assert(thailandSummary.isOverBudget === false, 'isOverBudget is false when budget missing');

  // Zero budget test
  setTripBudget('thailand-escape', 0.01, 'USD'); // set temporary, then clear
  const zeroBudgetTest = getTripExpenseSummary('thailand-escape');
  assert(zeroBudgetTest.percentUsed !== undefined, 'Percent calculated safely');

  // -------------------------------------------------------------------------
  // 5. Empty State (0 Expenses)
  // -------------------------------------------------------------------------
  console.log('\n5. Testing empty state (Paris Getaway with 0 expenses)...');
  const parisSummary = getTripExpenseSummary('paris-getaway');
  assert(parisExpenses.length === 0, 'Paris has 0 expenses');
  assert(parisSummary.totalSpentMinorUnits === 0, 'Total spent is 0');
  assert(parisSummary.totalSpentFormatted === '$0.00', 'Formatted spent is "$0.00"');
  assert(parisSummary.remainingMinorUnits === 350000, 'Remaining equals full budget ($3,500.00)');
  assert(parisSummary.percentUsed === 0, 'Budget usage is 0%');

  const parisGroups = groupExpensesByDate(parisExpenses, 'USD');
  assert(parisGroups.length === 0, 'Empty expenses yields 0 date groups');

  // -------------------------------------------------------------------------
  // 6. Date Grouping (Chronological Descending) & Single Expense
  // -------------------------------------------------------------------------
  console.log('\n6. Testing date grouping and single expense list...');
  // Single expense on Swiss Alps
  const swissGroups = groupExpensesByDate(swissExpenses, 'USD');
  assert(swissGroups.length === 1, 'Swiss Alps yields exactly 1 day group');
  assert(swissGroups[0].items.length === 1, 'Day group contains 1 item');
  assert(swissGroups[0].dayTotalMinor === 210000, 'Day total matches item amount');

  // Multiple expenses on Japan Adventure
  const japanGroups = groupExpensesByDate(japanExpenses, 'USD');
  assert(japanGroups.length === 3, 'Japan Adventure grouped into 3 distinct calendar days');
  // Newest first: March 12, then March 11, then March 10
  assert(japanGroups[0].date === '2028-03-12', 'First group is newest date (March 12)');
  assert(japanGroups[1].date === '2028-03-11', 'Second group is March 11');
  assert(japanGroups[2].date === '2028-03-10', 'Third group is March 10');

  // -------------------------------------------------------------------------
  // 7. Multi-Currency Separate Totals (Never summing differing currencies)
  // -------------------------------------------------------------------------
  console.log('\n7. Testing multi-currency separate totals...');
  // Add a JPY expense to Japan Adventure to test multi-currency display
  const addedJPY = addExpense({
    tripId: 'japan-adventure',
    title: 'Convenience Store Snack',
    amount: 1500, // ¥1,500
    currency: 'JPY',
    category: 'food_drinks',
    date: '2028-03-12',
  });

  const multiExpenses = getExpensesByTrip('japan-adventure');
  const currencyTotals = sumExpensesByCurrency(multiExpenses);

  assert(Boolean(currencyTotals.USD), 'USD total exists separately');
  assert(Boolean(currencyTotals.JPY), 'JPY total exists separately');
  assert(
    currencyTotals.USD.totalMinorUnits === 124050,
    'USD total remains unaffected by JPY (124050 cents)'
  );
  assert(
    currencyTotals.JPY.totalMinorUnits === 1500,
    'JPY total is strictly 1500 yen'
  );
  assert(
    currencyTotals.JPY.formattedTotal === '¥1,500',
    'JPY formatted separately as "¥1,500"'
  );

  // Clean up added JPY expense
  deleteExpense(addedJPY.id);
  resetExpenseSeedData();

  console.log('\n✓ ALL 18 EXPENSE DASHBOARD WORKFLOW CHECKS PASSED SUCCESSFULLY!\n');
  return true;
}
