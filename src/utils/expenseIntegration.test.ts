/**
 * Voyaro Expense and Budget Persistence Integration Test Suite (Phase 7 — Step 9)
 *
 * Verifies:
 *  1. Unauthenticated behavior: cannot fetch or mutate expenses or budgets.
 *  2. Authenticated user can create trips and persistent budgets.
 *  3. CRUD operations for expenses (add, fetch, update, delete, refresh).
 *  4. Integer minor unit monetary precision (cents preserved end-to-end, zero float drift).
 *  5. Strict multi-currency isolation (never summing different currencies together).
 *  6. Budget state management: updates, zero budget, missing budget, and overspending indicators.
 *  7. Multi-user isolation & Row Level Security (RLS) enforcement:
 *     User B cannot read, add, update, or delete User A's expenses or budgets.
 *  8. Simulated app restart: reloading state after cache wipe matches Supabase exactly.
 *  9. Cascade deletion: deleting parent trip cleanly cascades to child expenses and budgets.
 */

import {
  fetchExpensesByTrip,
  fetchExpenseById,
  addExpense,
  updateExpense,
  deleteExpense,
  fetchTripBudget,
  setTripBudget,
  clearTripBudget,
  clearExpenseCache,
  getTripExpenseSummary,
  getExpensesByTrip,
  getTripBudget,
} from '../services/expenseStore';
import { createTrip, deleteTrip } from '../services/trip';
import { signup, login, logout, getAuthState } from '../services/auth';
import { supabase } from '../services/supabase';
import { sumExpensesByCurrency } from './currencyUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export async function runExpenseIntegrationTests(options?: {
  userAEmail?: string;
  userBEmail?: string;
  password?: string;
}) {
  console.log('\n======================================================');
  console.log('--- Running Voyaro Expense & Budget Persistence Test ---');
  console.log('======================================================\n');

  // -------------------------------------------------------------------------
  // 1. Unauthenticated state tests
  // -------------------------------------------------------------------------
  console.log('1. Testing unauthenticated expense & budget access...');
  await logout();
  clearExpenseCache();

  const fakeTripId = '00000000-0000-0000-0000-000000000000';

  const unauthedExpenses = await fetchExpensesByTrip(fakeTripId);
  assert(unauthedExpenses.length === 0, 'Unauthenticated fetchExpensesByTrip() returns empty array');

  let unauthedAddThrew = false;
  try {
    await addExpense({
      tripId: fakeTripId,
      title: 'Unauthenticated Coffee',
      amount: 450,
      currency: 'USD',
      category: 'food_drinks',
      date: '2027-05-01',
    });
  } catch (err: any) {
    unauthedAddThrew = true;
    assert(err.message.includes('logged in'), 'addExpense rejects unauthenticated callers');
  }
  assert(unauthedAddThrew, 'addExpense threw error when user is not logged in');

  let unauthedBudgetThrew = false;
  try {
    await setTripBudget(fakeTripId, 1000, 'USD');
  } catch (err: any) {
    unauthedBudgetThrew = true;
    assert(err.message.includes('logged in'), 'setTripBudget rejects unauthenticated callers');
  }
  assert(unauthedBudgetThrew, 'setTripBudget threw error when user is not logged in');

  // -------------------------------------------------------------------------
  // 2. Setup Authenticated Session for User A and Create Trip with Budget
  // -------------------------------------------------------------------------
  console.log('\n2. Setting up authenticated test session for User A...');
  const timestamp = Date.now();
  const userAEmail = options?.userAEmail || `exp_user_a_${timestamp}@voyaro.test`;
  const userBEmail = options?.userBEmail || `exp_user_b_${timestamp}@voyaro.test`;
  const testPassword = options?.password || 'VoyaroPassword123!';

  if (options?.userAEmail) {
    const loginRes = await login(userAEmail, testPassword);
    if (!loginRes.success) throw new Error(`User A login failed: ${loginRes.error}`);
  } else {
    await signup(userAEmail, testPassword, 'User A');
  }
  const userA = getAuthState().user;
  if (!userA) {
    throw new Error('User A authentication session could not be established.');
  }
  console.log(`✓ User A authenticated (${userA.id})`);

  // Create a trip with an initial budget of $4,000 USD
  const testTrip = await createTrip({
    title: 'Financial Integration Tour',
    destination: 'Tokyo, Japan',
    startDate: '2027-05-01',
    endDate: '2027-05-10',
    travelerCount: 2,
    budgetAmount: 4000,
    budgetCurrency: 'USD',
  });
  assert(Boolean(testTrip.id), 'Test trip created in Supabase');

  // Verify trip budget was persisted in Supabase
  const fetchedBudget = await fetchTripBudget(testTrip.id);
  assert(Boolean(fetchedBudget), 'Trip budget successfully retrieved from Supabase');
  assert(fetchedBudget?.amount === 400000, 'Budget amount stored in exact minor units (400000 cents = $4,000)');
  assert(fetchedBudget?.currency === 'USD', 'Budget currency is USD');

  // -------------------------------------------------------------------------
  // 3. Add Expenses & Validate Monetary Precision
  // -------------------------------------------------------------------------
  console.log('\n3. Testing Add Expense with exact integer minor precision...');

  // Expense 1: Shinkansen Bullet Train ($250.50 -> 25050 minor units)
  const exp1 = await addExpense({
    tripId: testTrip.id,
    title: 'Shinkansen Bullet Train',
    amount: 25050,
    currency: 'USD',
    category: 'transportation',
    date: '2027-05-02',
    notes: 'Tokyo to Kyoto Nozomi green car',
    paidBy: 'Alex',
  });
  assert(Boolean(exp1.id), 'Expense 1 persisted to Supabase with UUID');
  assert(exp1.amount === 25050, 'Expense 1 amount is exactly 25050 cents');
  assert(exp1.category === 'transportation', 'Category is "transportation"');

  // Expense 2: Tokyo Luxury Ryokan ($800.00 -> 80000 minor units)
  const exp2 = await addExpense({
    tripId: testTrip.id,
    title: 'Tokyo Luxury Ryokan',
    amount: 80000,
    currency: 'USD',
    category: 'accommodation',
    date: '2027-05-03',
  });
  assert(Boolean(exp2.id), 'Expense 2 persisted to Supabase');

  // Verify summary totals
  const summaryAfterAdd = getTripExpenseSummary(testTrip.id);
  assert(
    summaryAfterAdd.totalSpentMinorUnits === 105050,
    'Total spent is 105050 cents ($1,050.50 = $250.50 + $800.00)'
  );
  assert(
    summaryAfterAdd.remainingMinorUnits === 294950,
    'Remaining budget is 294950 cents ($2,949.50 = $4,000 - $1,050.50)'
  );
  assert(summaryAfterAdd.percentUsed === 26, 'Budget usage is 26%');
  assert(!summaryAfterAdd.isOverBudget, 'isOverBudget is false');

  // -------------------------------------------------------------------------
  // 4. Update Expense and Single-Item Retrieval
  // -------------------------------------------------------------------------
  console.log('\n4. Testing Update Expense and Single-Item Fetch...');

  // Update Expense 2 amount to $1,000.00 (100000 cents)
  const updatedExp2 = await updateExpense(exp2.id, {
    title: 'Tokyo Luxury Ryokan Suite (Upgraded)',
    amount: 100000,
  });
  assert(Boolean(updatedExp2), 'Expense 2 updated successfully in Supabase');
  assert(updatedExp2?.amount === 100000, 'Updated amount is 100000 cents ($1,000.00)');
  assert(updatedExp2?.title === 'Tokyo Luxury Ryokan Suite (Upgraded)', 'Title updated');

  // Fetch single expense by ID
  const retrievedExp1 = await fetchExpenseById(exp1.id);
  assert(Boolean(retrievedExp1), 'fetchExpenseById found expense 1');
  assert(retrievedExp1?.title === 'Shinkansen Bullet Train', 'Retrieved expense 1 title matches');
  assert(retrievedExp1?.amount === 25050, 'Retrieved expense 1 amount matches');

  // Verify updated summary
  const summaryAfterUpdate = getTripExpenseSummary(testTrip.id);
  assert(
    summaryAfterUpdate.totalSpentMinorUnits === 125050,
    'Total spent updated to 125050 cents ($1,250.50)'
  );
  assert(
    summaryAfterUpdate.remainingMinorUnits === 274950,
    'Remaining budget updated to 274950 cents ($2,749.50)'
  );

  // -------------------------------------------------------------------------
  // 5. Multi-Currency Isolation (Never summing differing currencies together)
  // -------------------------------------------------------------------------
  console.log('\n5. Testing strict multi-currency isolation...');

  // Add JPY expense: ¥1,500 (no decimals in JPY, 1500 minor units)
  const expJPY = await addExpense({
    tripId: testTrip.id,
    title: 'Ichiran Ramen',
    amount: 1500,
    currency: 'JPY',
    category: 'food_drinks',
    date: '2027-05-04',
  });
  assert(Boolean(expJPY.id), 'JPY expense added');

  // Add EUR expense: €45.00 (4500 minor units)
  const expEUR = await addExpense({
    tripId: testTrip.id,
    title: 'Euro Souvenir Gift',
    amount: 4500,
    currency: 'EUR',
    category: 'shopping',
    date: '2027-05-04',
  });
  assert(Boolean(expEUR.id), 'EUR expense added');

  // Verify Primary Summary:
  // Since the trip budget is in USD, primaryCurrency is USD.
  // CRITICAL REQUIREMENT: JPY and EUR expenses must NOT be added into USD totalSpent!
  const summaryMulti = getTripExpenseSummary(testTrip.id);
  assert(summaryMulti.currency === 'USD', 'Summary primary currency is USD');
  assert(
    summaryMulti.totalSpentMinorUnits === 125050,
    'USD total remains strictly $1,250.50; differing currencies were NOT summed together'
  );

  // Check currency breakdown
  const currentExpenses = getExpensesByTrip(testTrip.id);
  const byCurrency = sumExpensesByCurrency(currentExpenses);
  assert(byCurrency.USD.totalMinorUnits === 125050, 'USD total is isolated (125050 cents)');
  assert(byCurrency.JPY.totalMinorUnits === 1500, 'JPY total is isolated (1500 yen)');
  assert(byCurrency.EUR.totalMinorUnits === 4500, 'EUR total is isolated (4500 euro cents)');

  // -------------------------------------------------------------------------
  // 6. Budget Updates, Overspending & Zero Budgets
  // -------------------------------------------------------------------------
  console.log('\n6. Testing budget updates, overspending, and zero budget handling...');

  // Lower budget to $1,000.00 (spent is $1,250.50 -> OVER BUDGET!)
  const loweredBudget = await setTripBudget(testTrip.id, 1000, 'USD');
  assert(loweredBudget.amount === 100000, 'Budget lowered to 100000 cents ($1,000.00)');

  const overBudgetSummary = getTripExpenseSummary(testTrip.id);
  assert(Boolean(overBudgetSummary.isOverBudget), 'isOverBudget flagged as TRUE when spending exceeds budget');
  assert(
    overBudgetSummary.remainingMinorUnits === -25050,
    'Remaining is negative (-25050 cents = -$250.50 over budget)'
  );
  assert(overBudgetSummary.percentUsed! > 100, 'percentUsed is > 100% (125%)');

  // Test zero budget ($0)
  const zeroBudget = await setTripBudget(testTrip.id, 0, 'USD');
  assert(zeroBudget.amount === 0, 'Zero budget stored safely');
  const zeroSummary = getTripExpenseSummary(testTrip.id);
  assert(Boolean(zeroSummary.isOverBudget), 'Zero budget with expenses is over budget');
  assert(zeroSummary.percentUsed === undefined, 'Zero budget avoids division-by-zero');

  // Test clear budget
  const cleared = await clearTripBudget(testTrip.id);
  assert(cleared, 'Trip budget cleared');
  const clearedSummary = getTripExpenseSummary(testTrip.id);
  assert(clearedSummary.budgetMinorUnits === undefined, 'Cleared budget is undefined');
  assert(clearedSummary.isOverBudget === false, 'Missing budget is not marked as over budget');

  // Restore budget to $5,000
  await setTripBudget(testTrip.id, 5000, 'USD');

  // -------------------------------------------------------------------------
  // 7. Multi-User Isolation & RLS Enforcement (User B)
  // -------------------------------------------------------------------------
  console.log('\n7. Testing multi-user data isolation and Row Level Security...');

  // Switch session to User B
  await logout();
  clearExpenseCache();

  if (options?.userBEmail) {
    const loginBRes = await login(userBEmail, testPassword);
    if (!loginBRes.success) throw new Error(`User B login failed: ${loginBRes.error}`);
  } else {
    await signup(userBEmail, testPassword, 'User B');
  }
  const userB = getAuthState().user;
  if (!userB) throw new Error('User B authentication session failed.');
  console.log(`✓ Switched to User B session (${userB.id})`);

  // User B tries to view User A's trip expenses
  const userBExpenses = await fetchExpensesByTrip(testTrip.id);
  assert(
    userBExpenses.length === 0,
    'RLS prevents User B from viewing User A trip expenses (returns empty array)'
  );

  // User B tries to fetch single expense by ID
  const userBExp = await fetchExpenseById(exp1.id);
  assert(userBExp === null, 'RLS prevents User B from fetching User A expense by ID');

  // User B tries to fetch User A's budget
  const userBBudget = await fetchTripBudget(testTrip.id);
  assert(userBBudget === null, 'RLS prevents User B from fetching User A trip budget');

  // User B tries to insert an expense into User A's trip
  let userBInsertThrew = false;
  try {
    await addExpense({
      tripId: testTrip.id,
      title: 'Hacked Expense by User B',
      amount: 9999,
      currency: 'USD',
      category: 'other',
      date: '2027-05-05',
    });
  } catch (err: any) {
    userBInsertThrew = true;
    assert(
      err.message.includes('denied') || err.message.includes('not exist') || err.message.includes('Failed'),
      'RLS check prevented User B from inserting expense into User A trip'
    );
  }
  assert(userBInsertThrew, 'User B unauthorized expense insert was blocked');

  // User B tries to mutate User A's budget
  let userBBudgetThrew = false;
  try {
    await setTripBudget(testTrip.id, 99999, 'USD');
  } catch (err: any) {
    userBBudgetThrew = true;
    assert(
      err.message.includes('denied') || err.message.includes('not exist') || err.message.includes('Failed'),
      'RLS check prevented User B from changing User A trip budget'
    );
  }
  assert(userBBudgetThrew, 'User B unauthorized budget update was blocked');

  // User B tries to delete User A's expense
  let userBDeleteThrew = false;
  try {
    await deleteExpense(exp1.id);
  } catch (err: any) {
    userBDeleteThrew = true;
  }
  // Either throws or silently affects 0 rows due to RLS

  // -------------------------------------------------------------------------
  // 8. Simulated App Restart (Cache Clear & Re-fetch for User A)
  // -------------------------------------------------------------------------
  console.log('\n8. Testing simulated app restart & persistent cache reload for User A...');

  // Switch back to User A
  await logout();
  clearExpenseCache();

  const loginARes = await login(userAEmail, testPassword);
  if (!loginARes.success) throw new Error(`User A re-login failed: ${loginARes.error}`);

  // Cache is currently empty
  assert(getExpensesByTrip(testTrip.id).length === 0, 'In-memory cache is empty after restart');

  // Re-fetch from Supabase
  const reloadedExpenses = await fetchExpensesByTrip(testTrip.id);
  const reloadedBudget = await fetchTripBudget(testTrip.id);

  assert(
    reloadedExpenses.length === 4,
    'Reloaded all 4 expenses from Supabase (exp1, exp2, expJPY, expEUR)'
  );
  assert(
    reloadedBudget?.amount === 500000,
    'Reloaded trip budget matches Supabase persistent state ($5,000.00)'
  );

  // -------------------------------------------------------------------------
  // 9. Single Expense Deletion & Trip Cascade Deletion
  // -------------------------------------------------------------------------
  console.log('\n9. Testing expense deletion & parent trip cascade...');

  // Delete Expense 1 (Shinkansen)
  const deletedExp1 = await deleteExpense(exp1.id);
  assert(deletedExp1, 'Expense 1 deleted successfully');

  const afterDeleteList = await fetchExpensesByTrip(testTrip.id);
  assert(afterDeleteList.length === 3, 'Expense count decreased to 3 in Supabase');
  assert(!afterDeleteList.some((e) => e.id === exp1.id), 'Deleted expense is no longer present');

  // Delete parent trip: should cleanly cascade to all remaining child expenses and budgets
  await deleteTrip(testTrip.id);
  console.log('✓ Parent trip deleted');

  // Verify in Supabase that child records were cascaded
  const { data: leftoverExpenses } = await supabase
    .from('expenses')
    .select('id')
    .eq('trip_id', testTrip.id);
  assert(
    !leftoverExpenses || leftoverExpenses.length === 0,
    'All child expenses cascaded and removed when parent trip was deleted'
  );

  const { data: leftoverBudget } = await supabase
    .from('trip_budgets')
    .select('trip_id')
    .eq('trip_id', testTrip.id);
  assert(
    !leftoverBudget || leftoverBudget.length === 0,
    'Child trip budget cascaded and removed when parent trip was deleted'
  );

  console.log('\n======================================================');
  console.log('✓ ALL 32 EXPENSE & BUDGET PERSISTENCE CHECKS PASSED!');
  console.log('======================================================\n');
  return true;
}
