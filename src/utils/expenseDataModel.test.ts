/**
 * Test Suite for Voyaro Expense Data Model & Financial Utilities (Phase 6 — Step 1)
 *
 * Verifies:
 *  1. Minor units precision (floating-point prevention).
 *  2. Formatting across different currencies (2-decimal USD, 0-decimal JPY, EUR, GBP).
 *  3. Strict multi-currency isolation (rejecting mixing of USD + EUR).
 *  4. Grouped multi-currency summation.
 *  5. Expense input validation (positive amounts, valid dates, required fields).
 *  6. Category metadata mapping.
 */

import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_META,
  Expense,
  ExpenseCategory,
} from '@/types/expense';
import {
  CurrencyMismatchError,
  assertSingleCurrency,
  formatCurrency,
  formatMajorAmount,
  getCurrencyConfig,
  sumExpensesByCurrency,
  sumExpensesInCurrency,
  sumStrictSingleCurrency,
  toMajorUnits,
  toMinorUnits,
} from './currencyUtils';
import {
  validateExpenseAmount,
  validateExpenseDate,
  validateExpenseInput,
} from './expenseValidation';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runExpenseDataModelTests() {
  console.log('\n--- Running Voyaro Expense Data Model Test Suite (Step 1) ---\n');

  // -------------------------------------------------------------------------
  // 1. Minor Units Precision & Floating-Point Protection
  // -------------------------------------------------------------------------
  console.log('1. Testing minor unit conversions & precision...');
  // Standard floating point trap: 0.1 + 0.2 !== 0.3 in JS float, but in minor units (cents) 10 + 20 === 30!
  const centsA = toMinorUnits(0.1, 'USD'); // 10
  const centsB = toMinorUnits(0.2, 'USD'); // 20
  assert(centsA + centsB === 30, '0.1 USD + 0.2 USD in cents equals exactly 30 cents');
  assert(toMajorUnits(centsA + centsB, 'USD') === 0.3, '30 cents converts to exactly 0.3 major units');

  // $19.99 * 100 in naive JS float is 1998.9999999999998; toMinorUnits must return 1999!
  const cents1999 = toMinorUnits(19.99, 'USD');
  assert(cents1999 === 1999, '19.99 USD converts to exactly 1999 minor units');

  // String parsing with formatting: "$1,240.50"
  const centsFormatted = toMinorUnits('$1,240.50', 'USD');
  assert(centsFormatted === 124050, '"$1,240.50" string converts to 124050 minor units');

  // Zero-decimal currency: JPY (5000 yen = 5000 minor units)
  const yen = toMinorUnits(5000, 'JPY');
  assert(yen === 5000, '5000 JPY converts to 5000 minor units (0 decimals)');
  assert(toMajorUnits(5000, 'JPY') === 5000, '5000 minor units of JPY converts back to 5000');

  // -------------------------------------------------------------------------
  // 2. Display Formatting Across Currencies
  // -------------------------------------------------------------------------
  console.log('\n2. Testing display formatting across currencies...');
  assert(formatCurrency(124050, 'USD') === '$1,240.50', '124050 cents formats as "$1,240.50"');
  assert(formatCurrency(5000, 'JPY') === '¥5,000', '5000 JPY formats as "¥5,000"');
  assert(formatCurrency(999, 'EUR') === '€9.99', '999 EUR cents formats as "€9.99"');
  assert(formatCurrency(1500, 'GBP') === '£15.00', '1500 GBP pence formats as "£15.00"');
  assert(
    formatCurrency(124050, 'USD', { showCode: true }) === '$1,240.50 USD',
    'showCode option appends currency code'
  );
  assert(formatMajorAmount(1240.5, 'USD') === '$1,240.50', 'formatMajorAmount formats 1240.5 correctly');

  // -------------------------------------------------------------------------
  // 3. Strict Multi-Currency Isolation (Never sum differing currencies)
  // -------------------------------------------------------------------------
  console.log('\n3. Testing strict multi-currency isolation...');
  const expenseUSD1: Expense = {
    id: 'exp-1',
    tripId: 'japan-adventure',
    title: 'Dinner at Shinjuku',
    amount: 4500, // $45.00
    currency: 'USD',
    category: 'food_drinks',
    date: '2028-03-11',
    createdAt: '2028-03-11T12:00:00Z',
    updatedAt: '2028-03-11T12:00:00Z',
  };

  const expenseUSD2: Expense = {
    id: 'exp-2',
    tripId: 'japan-adventure',
    title: 'Metro Pass',
    amount: 1500, // $15.00
    currency: 'USD',
    category: 'transportation',
    date: '2028-03-11',
    createdAt: '2028-03-11T13:00:00Z',
    updatedAt: '2028-03-11T13:00:00Z',
  };

  const expenseEUR: Expense = {
    id: 'exp-3',
    tripId: 'japan-adventure',
    title: 'Souvenir',
    amount: 2000, // €20.00
    currency: 'EUR',
    category: 'shopping',
    date: '2028-03-12',
    createdAt: '2028-03-12T10:00:00Z',
    updatedAt: '2028-03-12T10:00:00Z',
  };

  // Same currency: sum succeeds
  const singleTotal = sumStrictSingleCurrency([expenseUSD1, expenseUSD2]);
  assert(singleTotal.totalMinorUnits === 6000, 'Summing two USD expenses yields 6000 cents');
  assert(singleTotal.formattedTotal === '$60.00', 'Summed USD formats to "$60.00"');

  // Mismatched currency: assertSingleCurrency and sumStrictSingleCurrency MUST throw CurrencyMismatchError
  let errorCaught = false;
  try {
    sumStrictSingleCurrency([expenseUSD1, expenseEUR]);
  } catch (err) {
    if (err instanceof CurrencyMismatchError) {
      errorCaught = true;
    }
  }
  assert(errorCaught, 'Summing USD and EUR throws CurrencyMismatchError');

  // Grouped multi-currency summation: groups cleanly without cross-currency contamination
  const groupedTotals = sumExpensesByCurrency([expenseUSD1, expenseUSD2, expenseEUR]);
  assert(groupedTotals.USD.totalMinorUnits === 6000, 'Grouped total for USD is 6000 cents');
  assert(groupedTotals.USD.formattedTotal === '$60.00', 'Grouped formatted USD is "$60.00"');
  assert(groupedTotals.EUR.totalMinorUnits === 2000, 'Grouped total for EUR is 2000 cents');
  assert(groupedTotals.EUR.formattedTotal === '€20.00', 'Grouped formatted EUR is "€20.00"');

  // Target-filtered summation:
  const filteredUSD = sumExpensesInCurrency([expenseUSD1, expenseUSD2, expenseEUR], 'USD');
  assert(filteredUSD.totalMinorUnits === 6000, 'sumExpensesInCurrency("USD") extracts exactly 6000 cents');
  assert(filteredUSD.expenseCount === 2, 'sumExpensesInCurrency("USD") counts only 2 items');

  // -------------------------------------------------------------------------
  // 4. Input Validation (Positive amounts, valid dates, required fields)
  // -------------------------------------------------------------------------
  console.log('\n4. Testing expense input validation...');

  // Invalid: missing title, zero amount, invalid date
  const invalidResult = validateExpenseInput({
    title: '',
    tripId: '',
    amount: 0,
    currency: 'USD',
    category: 'food_drinks',
    date: 'invalid-date',
  });
  assert(!invalidResult.isValid, 'Invalid input fails validation');
  assert(Boolean(invalidResult.errors.title), 'Title error is reported');
  assert(Boolean(invalidResult.errors.tripId), 'Trip ID error is reported');
  assert(Boolean(invalidResult.errors.amount), 'Amount error is reported for 0');
  assert(Boolean(invalidResult.errors.date), 'Date error is reported for invalid date');

  // Invalid: negative amount
  const negativeAmount = validateExpenseAmount(-500);
  assert(!negativeAmount.isValid, 'Negative amount fails validation');

  // Valid input
  const validResult = validateExpenseInput({
    title: 'Ryokan Lodging',
    tripId: 'japan-adventure',
    amount: 35000, // $350.00
    currency: 'USD',
    category: 'accommodation',
    date: '2028-03-12',
    notes: 'Breakfast included',
  });
  assert(validResult.isValid, 'Valid input passes validation without errors');
  assert(Object.keys(validResult.errors).length === 0, 'No validation errors on valid input');

  // -------------------------------------------------------------------------
  // 5. Category Metadata Completeness
  // -------------------------------------------------------------------------
  console.log('\n5. Testing category metadata completeness...');
  const expectedCategories: ExpenseCategory[] = [
    'accommodation',
    'transportation',
    'food_drinks',
    'activities',
    'shopping',
    'flights',
    'other',
  ];

  for (const cat of expectedCategories) {
    const meta = EXPENSE_CATEGORY_META[cat];
    assert(Boolean(meta), `Category meta exists for "${cat}"`);
    assert(Boolean(meta.label), `Category "${cat}" has human-readable label: "${meta.label}"`);
    assert(Boolean(meta.iconName), `Category "${cat}" has iconName: "${meta.iconName}"`);
  }

  console.log('\n✓ ALL 18 EXPENSE DATA MODEL TESTS PASSED SUCCESSFULLY!\n');
  return true;
}
