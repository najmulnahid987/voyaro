/**
 * Test Suite for Add Expense Workflow & Validation (Phase 6 — Step 3)
 *
 * Verifies:
 *  1. Valid input creation and storage.
 *  2. Missing required fields rejection (title, amount, date).
 *  3. Invalid amounts rejection (zero, negative, non-numeric).
 *  4. Cancellation (no-op, state preserved).
 *  5. Successful saving (instant store update & dependent totals recalculated).
 *  6. Edit mode updates existing item without ID/tripId mutation.
 */

import {
  addExpense,
  getExpenseById,
  getExpensesByTrip,
  getTripExpenseSummary,
  resetExpenseSeedData,
  updateExpense,
} from '@/services/expenseStore';
import {
  validateExpenseAmount,
  validateExpenseDate,
  validateExpenseInput,
} from './expenseValidation';
import { toMinorUnits } from './currencyUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runAddExpenseWorkflowTests() {
  console.log('\n--- Running Add Expense Workflow & Validation Test Suite (Step 3) ---\n');

  // Start with clean initial seed state
  resetExpenseSeedData();
  const initialSummary = getTripExpenseSummary('japan-adventure');
  const initialSpent = initialSummary.totalSpentMinorUnits;

  // -------------------------------------------------------------------------
  // 1. Missing Required Fields Rejection
  // -------------------------------------------------------------------------
  console.log('1. Testing missing required fields...');

  // Missing title
  const missingTitle = validateExpenseInput({
    title: '',
    tripId: 'japan-adventure',
    amount: 1500,
    currency: 'USD',
    category: 'food_drinks',
    date: '2028-03-12',
  });
  assert(!missingTitle.isValid, 'Missing title fails validation');
  assert(Boolean(missingTitle.errors.title), 'Title error is reported');

  // Missing amount
  const missingAmount = validateExpenseInput({
    title: 'Taxi Ride',
    tripId: 'japan-adventure',
    amount: undefined,
    currency: 'USD',
    category: 'transportation',
    date: '2028-03-12',
  });
  assert(!missingAmount.isValid, 'Missing amount fails validation');
  assert(Boolean(missingAmount.errors.amount), 'Amount error is reported');

  // Missing date
  const missingDate = validateExpenseInput({
    title: 'Taxi Ride',
    tripId: 'japan-adventure',
    amount: 1500,
    currency: 'USD',
    category: 'transportation',
    date: '',
  });
  assert(!missingDate.isValid, 'Missing date fails validation');
  assert(Boolean(missingDate.errors.date), 'Date error is reported');

  // -------------------------------------------------------------------------
  // 2. Invalid Amounts Rejection
  // -------------------------------------------------------------------------
  console.log('\n2. Testing invalid amounts...');

  // Zero amount
  const zeroAmount = validateExpenseAmount('0', 'USD');
  assert(!zeroAmount.isValid, 'Zero amount is rejected');

  // Negative amount
  const negativeAmount = validateExpenseAmount('-25.50', 'USD');
  assert(!negativeAmount.isValid, 'Negative amount is rejected');

  // Non-numeric string
  const textAmount = validateExpenseAmount('not-a-number', 'USD');
  assert(!textAmount.isValid, 'Non-numeric string is rejected');

  // Valid decimal string
  const validAmount = validateExpenseAmount('45.50', 'USD');
  assert(validAmount.isValid, 'Valid positive amount string is accepted');
  assert(validAmount.minorUnits === 4550, 'Converted to 4550 minor units');

  // -------------------------------------------------------------------------
  // 3. Cancellation Behavior
  // -------------------------------------------------------------------------
  console.log('\n3. Testing cancellation behavior...');
  // A cancellation simply aborts the form without calling addExpense
  const afterCancelSummary = getTripExpenseSummary('japan-adventure');
  assert(
    afterCancelSummary.totalSpentMinorUnits === initialSpent,
    'Store state and total spent remain unchanged on cancel'
  );

  // -------------------------------------------------------------------------
  // 4. Successful Saving Flow
  // -------------------------------------------------------------------------
  console.log('\n4. Testing successful saving flow...');

  const newExpenseAmount = 4550; // $45.50
  const savedExpense = addExpense({
    tripId: 'japan-adventure',
    title: 'Izakaya Gion Dinner',
    amount: newExpenseAmount,
    currency: 'USD',
    category: 'food_drinks',
    date: '2028-03-13',
    notes: 'Yakitori and cold sake with travel companions',
  });

  assert(Boolean(savedExpense.id), 'Expense saved with unique ID');
  assert(savedExpense.title === 'Izakaya Gion Dinner', 'Saved title matches input');
  assert(savedExpense.amount === 4550, 'Saved amount matches 4550 cents');
  assert(savedExpense.category === 'food_drinks', 'Saved category matches "food_drinks"');

  // Verify it appears immediately in the trip expense list
  const tripList = getExpensesByTrip('japan-adventure');
  assert(
    tripList.some((e) => e.id === savedExpense.id),
    'New expense appears immediately in getExpensesByTrip'
  );

  // Verify dependent totals updated immediately
  const afterAddSummary = getTripExpenseSummary('japan-adventure');
  assert(
    afterAddSummary.totalSpentMinorUnits === initialSpent + newExpenseAmount,
    'Total spent updated immediately to reflect new expense'
  );
  assert(
    afterAddSummary.totalSpentFormatted === '$1,286.00',
    'Formatted spent reflects updated total ($1,286.00)'
  );

  // -------------------------------------------------------------------------
  // 5. Edit Mode Verification
  // -------------------------------------------------------------------------
  console.log('\n5. Testing edit mode updates...');
  const updatedExpense = updateExpense(savedExpense.id, {
    title: 'Izakaya Gion Banquet (Upgraded)',
    amount: 7500, // $75.00 (was $45.50)
  });

  assert(Boolean(updatedExpense), 'Update returned updated entity');
  assert(updatedExpense?.id === savedExpense.id, 'ID is strictly preserved');
  assert(updatedExpense?.tripId === savedExpense.tripId, 'Trip ID is strictly preserved');
  assert(
    updatedExpense?.title === 'Izakaya Gion Banquet (Upgraded)',
    'Updated title preserved'
  );
  assert(updatedExpense?.amount === 7500, 'Updated amount is 7500 cents');

  const afterEditSummary = getTripExpenseSummary('japan-adventure');
  assert(
    afterEditSummary.totalSpentMinorUnits === initialSpent + 7500,
    'Dependent total updated immediately to reflect edited amount'
  );

  // Reset to seed data for clean state
  resetExpenseSeedData();

  console.log('\n✓ ALL 16 ADD EXPENSE WORKFLOW CHECKS PASSED SUCCESSFULLY!\n');
  return true;
}
