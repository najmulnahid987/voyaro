/**
 * Voyaro Expense Validation Utilities (Phase 6)
 *
 * Provides pure validation functions for:
 *  - Positive monetary amounts
 *  - Valid calendar dates
 *  - Required expense fields (title, tripId, currency, category)
 */

import {
  CreateExpenseInput,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  ExpenseValidationErrors,
  ExpenseValidationResult,
  SUPPORTED_CURRENCY_CODES,
} from '@/types/expense';
import { parseDate } from './itineraryDateUtils';
import { isSupportedCurrency, toMinorUnits } from './currencyUtils';

// ---------------------------------------------------------------------------
// 1. Amount Validation
// ---------------------------------------------------------------------------

export interface AmountValidationResult {
  isValid: boolean;
  error?: string;
  minorUnits?: number;
}

/**
 * Validates that an amount is strictly positive, finite, and can be converted
 * into valid integer minor units.
 */
export function validateExpenseAmount(
  amount: unknown,
  currency: string = 'USD'
): AmountValidationResult {
  if (amount === null || amount === undefined || amount === '') {
    return { isValid: false, error: 'Amount is required.' };
  }

  let minorUnits: number;

  try {
    if (typeof amount === 'number') {
      if (isNaN(amount) || !isFinite(amount)) {
        return { isValid: false, error: 'Amount must be a valid number.' };
      }
      if (amount <= 0) {
        return { isValid: false, error: 'Amount must be greater than zero.' };
      }
      // If it's already an integer (minor units), keep it; if it has decimals, convert
      minorUnits = Number.isInteger(amount) ? amount : toMinorUnits(amount, currency as any);
    } else if (typeof amount === 'string') {
      const trimmed = amount.trim();
      if (!trimmed) {
        return { isValid: false, error: 'Amount is required.' };
      }
      minorUnits = toMinorUnits(trimmed, currency as any);
    } else {
      return { isValid: false, error: 'Invalid amount format.' };
    }
  } catch {
    return { isValid: false, error: 'Amount could not be parsed.' };
  }

  if (minorUnits <= 0) {
    return { isValid: false, error: 'Amount must be greater than zero.' };
  }

  return { isValid: true, minorUnits };
}

// ---------------------------------------------------------------------------
// 2. Date Validation
// ---------------------------------------------------------------------------

export interface DateValidationResult {
  isValid: boolean;
  error?: string;
  parsedDate?: Date;
}

/**
 * Validates that an expense date is a non-empty, parseable ISO date string.
 */
export function validateExpenseDate(dateStr: unknown): DateValidationResult {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
    return { isValid: false, error: 'Date is required.' };
  }

  const parsed = parseDate(dateStr.trim());
  if (!parsed || isNaN(parsed.getTime())) {
    return { isValid: false, error: 'Date must be a valid calendar date.' };
  }

  return { isValid: true, parsedDate: parsed };
}

// ---------------------------------------------------------------------------
// 3. Category & Currency Guards
// ---------------------------------------------------------------------------

export function isValidExpenseCategory(category: unknown): category is ExpenseCategory {
  return (
    typeof category === 'string' &&
    EXPENSE_CATEGORIES.includes(category as ExpenseCategory)
  );
}

// ---------------------------------------------------------------------------
// 4. Comprehensive Form / Input Validation
// ---------------------------------------------------------------------------

/**
 * Validates a complete CreateExpenseInput payload.
 * Returns isValid flag and field-specific error messages.
 */
export function validateExpenseInput(
  input: Partial<CreateExpenseInput>
): ExpenseValidationResult {
  const errors: ExpenseValidationErrors = {};

  // Title validation
  if (!input.title || typeof input.title !== 'string' || !input.title.trim()) {
    errors.title = 'Title or merchant name is required.';
  } else if (input.title.trim().length > 120) {
    errors.title = 'Title must not exceed 120 characters.';
  }

  // Trip ID validation
  if (!input.tripId || typeof input.tripId !== 'string' || !input.tripId.trim()) {
    errors.tripId = 'Trip ID is required.';
  }

  // Currency validation
  if (!input.currency || !isSupportedCurrency(input.currency)) {
    errors.currency = `Currency must be one of: ${SUPPORTED_CURRENCY_CODES.join(', ')}.`;
  }

  // Amount validation
  const amountValidation = validateExpenseAmount(input.amount, input.currency || 'USD');
  if (!amountValidation.isValid) {
    errors.amount = amountValidation.error;
  }

  // Category validation
  if (!input.category || !isValidExpenseCategory(input.category)) {
    errors.category = `Category is required and must be one of: ${EXPENSE_CATEGORIES.join(', ')}.`;
  }

  // Date validation
  const dateValidation = validateExpenseDate(input.date);
  if (!dateValidation.isValid) {
    errors.date = dateValidation.error;
  }

  // Notes validation (optional)
  if (input.notes && typeof input.notes === 'string' && input.notes.length > 500) {
    errors.notes = 'Notes cannot exceed 500 characters.';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
  };
}
