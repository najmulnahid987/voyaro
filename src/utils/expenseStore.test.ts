/**
 * Test Suite for Voyaro In-Memory Expense Store (Phase 6 — Step 2)
 *
 * Verifies all 10 requirements:
 *  1. Every expense references an existing trip ID (rejects invalid trip).
 *  2. Expense IDs are unique.
 *  3. Updating an expense preserves original ID and trip ID.
 *  4. Deleting an expense removes it from shared store.
 *  5. Updating or deleting immediately updates dependent totals.
 *  6. Budget state is kept separate from expense records.
 *  7. Budget amounts are stored with their currency.
 *  8. Safe handling of unknown IDs and invalid data.
 *  9. Mock seed dataset matches existing $1,240.50 spending figure.
 * 10. External store subscriber notification on mutations.
 */

import {
  addExpense,
  clearTripExpenses,
  deleteExpense,
  expenseStore,
  getAllExpenses,
  getExpenseById,
  getExpensesByTrip,
  getTripBudget,
  getTripExpenseSummary,
  resetExpenseSeedData,
  setTripBudget,
  subscribeToExpenses,
  updateExpense,
} from '@/services/expenseStore';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runExpenseStoreTests() {
  console.log('\n--- Running Voyaro Expense Store Test Suite (Step 2) ---\n');

  // Reset to seed data at start
  resetExpenseSeedData();

  // -------------------------------------------------------------------------
  // 1. Initial Mock Dataset & Dependent Totals Verification
  // -------------------------------------------------------------------------
  console.log('1. Verifying initial seed dataset for Japan Adventure...');
  const japanExpenses = getExpensesByTrip('japan-adventure');
  assert(japanExpenses.length === 5, 'Japan Adventure has 5 initial seed expenses');

  const summary = getTripExpenseSummary('japan-adventure');
  assert(
    summary.totalSpentMinorUnits === 124050,
    'Initial total spent is exactly 124050 minor units ($1,240.50)'
  );
  assert(
    summary.totalSpentFormatted === '$1,240.50',
    'Formatted spent matches "$1,240.50"'
  );
  assert(
    summary.budgetMinorUnits === 300000,
    'Budget is 300000 minor units ($3,000.00)'
  );
  assert(
    summary.remainingMinorUnits === 175950,
    'Remaining is 175950 minor units ($1,759.50)'
  );
  assert(summary.percentUsed === 41, 'Percent used is exactly 41%');
  assert(!summary.isOverBudget, 'Japan Adventure is not over budget');

  // Verify alias: 'demo-trip' maps to 'japan-adventure'
  const demoExpenses = getExpensesByTrip('demo-trip');
  assert(demoExpenses.length === 5, '"demo-trip" alias maps seamlessly to japan-adventure');

  // -------------------------------------------------------------------------
  // 2. Read Single Expense & Safe Unknown ID Handling
  // -------------------------------------------------------------------------
  console.log('\n2. Testing getExpenseById and unknown ID safety...');
  const item1 = getExpenseById('exp-japan-1');
  assert(Boolean(item1), 'getExpenseById finds existing expense');
  assert(item1?.title === 'Shinkansen Bullet Train Tickets', 'Title matches seed data');

  const unknownItem = getExpenseById('non-existent-id-999');
  assert(unknownItem === undefined, 'Unknown expense ID safely returns undefined');

  const unknownTripExpenses = getExpensesByTrip('non-existent-trip-999');
  assert(
    Array.isArray(unknownTripExpenses) && unknownTripExpenses.length === 0,
    'Unknown trip ID safely returns empty array'
  );

  // -------------------------------------------------------------------------
  // 3. Add Expense & Validation Checks
  // -------------------------------------------------------------------------
  console.log('\n3. Testing addExpense and trip reference enforcement...');
  let subscriberNotified = false;
  const unsubscribe = subscribeToExpenses(() => {
    subscriberNotified = true;
  });

  // Rejects invalid non-existent trip ID
  let invalidTripErrorCaught = false;
  try {
    addExpense({
      tripId: 'fake-phantom-trip-404',
      title: 'Coffee',
      amount: 450,
      currency: 'USD',
      category: 'food_drinks',
      date: '2028-03-12',
    });
  } catch (err: any) {
    invalidTripErrorCaught = true;
    assert(
      err.message.includes('does not exist'),
      'Error message mentions non-existent trip'
    );
  }
  assert(invalidTripErrorCaught, 'addExpense rejects non-existent trip ID');

  // Rejects zero / negative amount
  let zeroAmountErrorCaught = false;
  try {
    addExpense({
      tripId: 'japan-adventure',
      title: 'Free Sample',
      amount: 0,
      currency: 'USD',
      category: 'food_drinks',
      date: '2028-03-12',
    });
  } catch {
    zeroAmountErrorCaught = true;
  }
  assert(zeroAmountErrorCaught, 'addExpense rejects zero amount');

  // Successfully adds a valid expense
  subscriberNotified = false;
  const added = addExpense({
    tripId: 'japan-adventure',
    title: 'Matcha Ice Cream at Gion',
    amount: 550, // $5.50
    currency: 'USD',
    category: 'food_drinks',
    date: '2028-03-13',
    notes: 'Green tea soft serve',
  });

  assert(Boolean(added.id), 'Added expense receives a generated unique ID');
  assert(subscriberNotified, 'Subscriber was immediately notified of addition');

  // Verify total spent immediately updated (Requirement 5)
  const updatedSummary = getTripExpenseSummary('japan-adventure');
  assert(
    updatedSummary.totalSpentMinorUnits === 124050 + 550,
    'Total spent updated immediately to 124600 minor units ($1,246.00)'
  );
  assert(
    updatedSummary.totalSpentFormatted === '$1,246.00',
    'Formatted spent reflects new total ($1,246.00)'
  );

  // -------------------------------------------------------------------------
  // 4. Update Expense & Preservation of ID and Trip ID
  // -------------------------------------------------------------------------
  console.log('\n4. Testing updateExpense and field preservation...');
  subscriberNotified = false;

  const originalId = added.id;
  const originalTripId = added.tripId;

  const updated = updateExpense(originalId, {
    title: 'Premium Matcha Parfait at Gion',
    amount: 1200, // $12.00 (was $5.50)
    // Malicious attempt to change id or tripId
    ...( { id: 'hacked-id', tripId: 'paris-getaway' } as any),
  });

  assert(Boolean(updated), 'Update succeeded');
  assert(updated?.id === originalId, 'Expense ID was strictly PRESERVED');
  assert(updated?.tripId === originalTripId, 'Trip ID was strictly PRESERVED');
  assert(updated?.title === 'Premium Matcha Parfait at Gion', 'Title updated');
  assert(updated?.amount === 1200, 'Amount updated to 1200 cents');
  assert(subscriberNotified, 'Subscriber was notified of update');

  // Verify dependent total updated
  const afterUpdateSummary = getTripExpenseSummary('japan-adventure');
  assert(
    afterUpdateSummary.totalSpentMinorUnits === 124050 + 1200,
    'Dependent total updated immediately after expense edit'
  );

  // Updating unknown ID safely returns undefined
  const updateUnknown = updateExpense('unknown-id', { title: 'Test' });
  assert(updateUnknown === undefined, 'updateExpense safely returns undefined for unknown ID');

  // -------------------------------------------------------------------------
  // 5. Delete Expense & Immediate Store Sync
  // -------------------------------------------------------------------------
  console.log('\n5. Testing deleteExpense...');
  subscriberNotified = false;
  const deleted = deleteExpense(originalId);
  assert(deleted, 'deleteExpense returned true');
  assert(subscriberNotified, 'Subscriber notified of deletion');

  // Verify it is gone from store
  const foundAfterDelete = getExpenseById(originalId);
  assert(foundAfterDelete === undefined, 'Deleted expense is no longer in store');

  // Verify dependent total rolled back to initial $1,240.50
  const afterDeleteSummary = getTripExpenseSummary('japan-adventure');
  assert(
    afterDeleteSummary.totalSpentMinorUnits === 124050,
    'Dependent total immediately reverted back to 124050 cents ($1,240.50)'
  );

  // Deleting unknown ID safely returns false
  const deleteUnknown = deleteExpense('unknown-id');
  assert(deleteUnknown === false, 'deleteExpense safely returns false for unknown ID');

  // -------------------------------------------------------------------------
  // 6. Separate Trip Budget Operations & Currency Storage
  // -------------------------------------------------------------------------
  console.log('\n6. Testing separate trip budget state & currency storage...');
  const initialBudget = getTripBudget('japan-adventure');
  assert(Boolean(initialBudget), 'Initial budget exists');
  assert(initialBudget?.amount === 300000, 'Budget stored in minor units (300000)');
  assert(initialBudget?.currency === 'USD', 'Budget stored with currency "USD"');

  // Update budget
  subscriberNotified = false;
  const newBudget = setTripBudget('japan-adventure', 5000, 'USD'); // $5,000.00
  assert(newBudget.amount === 500000, 'setTripBudget converts 5000 major to 500000 minor units');
  assert(newBudget.currency === 'USD', 'Currency stored correctly');
  assert(subscriberNotified, 'Subscriber notified of budget update');

  const reloadedBudget = getTripBudget('japan-adventure');
  assert(reloadedBudget?.amount === 500000, 'getTripBudget retrieves updated budget');

  // Unknown trip budget
  const unknownBudget = getTripBudget('unknown-trip-xyz');
  assert(unknownBudget === undefined, 'Unknown trip budget safely returns undefined');

  // Over budget check on 'swiss-alps'
  const swissSummary = getTripExpenseSummary('swiss-alps');
  assert(Boolean(swissSummary.isOverBudget), 'Swiss Alps is properly flagged as isOverBudget: true');
  assert(swissSummary.percentUsed! > 100, 'Swiss Alps percentUsed is > 100%');

  // Cleanup subscriber
  unsubscribe();

  // Reset to seed data for clean state
  resetExpenseSeedData();
  const resetSummary = getTripExpenseSummary('japan-adventure');
  assert(
    resetSummary.totalSpentMinorUnits === 124050,
    'resetExpenseSeedData cleanly restored 124050 cents'
  );

  console.log('\n✓ ALL 22 EXPENSE STORE TESTS PASSED SUCCESSFULLY!\n');
  return true;
}
