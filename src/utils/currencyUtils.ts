/**
 * Voyaro Currency & Financial Utilities (Phase 6)
 *
 * Provides pure, non-mutating helpers for:
 *  1. Minor-unit to major-unit conversions (guaranteeing integer precision).
 *  2. Robust currency display formatting (with symbol, thousand separators, and decimal rules).
 *  3. Strict multi-currency isolation (never summing different currencies together).
 */

import {
  CurrencyCode,
  CurrencyConfig,
  CurrencyTotal,
  Expense,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_META,
  ExpenseCategory,
  SUPPORTED_CURRENCY_CODES,
} from '@/types/expense';
import { formatItineraryDate } from './itineraryDateUtils';

// ---------------------------------------------------------------------------
// 1. Supported Currency Configurations
// ---------------------------------------------------------------------------

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    label: 'USD $',
    name: 'US Dollar',
    decimals: 2,
    symbolPosition: 'prefix',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    label: 'EUR €',
    name: 'Euro',
    decimals: 2,
    symbolPosition: 'prefix',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    label: 'GBP £',
    name: 'British Pound',
    decimals: 2,
    symbolPosition: 'prefix',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    label: 'JPY ¥',
    name: 'Japanese Yen',
    decimals: 0,
    symbolPosition: 'prefix',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    label: 'AUD A$',
    name: 'Australian Dollar',
    decimals: 2,
    symbolPosition: 'prefix',
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    label: 'CAD C$',
    name: 'Canadian Dollar',
    decimals: 2,
    symbolPosition: 'prefix',
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    label: 'CHF CHF',
    name: 'Swiss Franc',
    decimals: 2,
    symbolPosition: 'prefix',
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    label: 'SGD S$',
    name: 'Singapore Dollar',
    decimals: 2,
    symbolPosition: 'prefix',
  },
};

/**
 * Array of all supported currency configs (for dropdowns and select pickers).
 */
export const SUPPORTED_CURRENCIES: CurrencyConfig[] = SUPPORTED_CURRENCY_CODES.map(
  (code) => CURRENCY_CONFIGS[code]
);

/**
 * Get currency configuration with fallback to USD.
 */
export function getCurrencyConfig(currency: string = 'USD'): CurrencyConfig {
  const normalized = currency.toUpperCase() as CurrencyCode;
  return CURRENCY_CONFIGS[normalized] || CURRENCY_CONFIGS.USD;
}

/**
 * Check if a currency code is currently supported.
 */
export function isSupportedCurrency(code: string): code is CurrencyCode {
  return SUPPORTED_CURRENCY_CODES.includes(code.toUpperCase() as CurrencyCode);
}

// ---------------------------------------------------------------------------
// 2. Minor-Unit Precision Conversions
// ---------------------------------------------------------------------------

/**
 * Convert a major-unit amount (e.g. 12.50 or "12.50") into integer minor units (e.g. 1250 cents).
 * Safely handles floating-point precision issues and currency decimal counts.
 *
 * Examples:
 *  - toMinorUnits(24.50, 'USD') -> 2450
 *  - toMinorUnits("1,240.50", 'USD') -> 124050
 *  - toMinorUnits(5000, 'JPY') -> 5000
 */
export function toMinorUnits(
  majorAmount: number | string,
  currency: CurrencyCode = 'USD'
): number {
  const config = getCurrencyConfig(currency);
  const factor = Math.pow(10, config.decimals);

  let numValue: number;
  if (typeof majorAmount === 'string') {
    // Strip currency symbols, commas, and whitespace
    const cleanStr = majorAmount.replace(/[^0-9.-]+/g, '');
    numValue = parseFloat(cleanStr);
  } else {
    numValue = majorAmount;
  }

  if (isNaN(numValue) || !isFinite(numValue)) {
    throw new Error(`Invalid monetary amount: "${majorAmount}"`);
  }

  return Math.round(numValue * factor);
}

/**
 * Convert integer minor units (e.g. 1250 cents) into major units (e.g. 12.5).
 *
 * Examples:
 *  - toMajorUnits(2450, 'USD') -> 24.5
 *  - toMajorUnits(5000, 'JPY') -> 5000
 */
export function toMajorUnits(
  minorUnits: number,
  currency: CurrencyCode = 'USD'
): number {
  if (isNaN(minorUnits) || !isFinite(minorUnits)) {
    return 0;
  }
  const config = getCurrencyConfig(currency);
  const factor = Math.pow(10, config.decimals);
  return minorUnits / factor;
}

// ---------------------------------------------------------------------------
// 3. Display Formatting
// ---------------------------------------------------------------------------

export interface FormatCurrencyOptions {
  /**
   * If true, append the currency code after the amount (e.g. "$1,240.50 USD").
   */
  showCode?: boolean;
  /**
   * If true, include positive sign "+" for positive numbers. Default: false.
   */
  showPositiveSign?: boolean;
  /**
   * Whether the provided number is in minor units (default: true).
   */
  isMinorUnits?: boolean;
}

/**
 * Format an integer minor-unit amount into a localized currency string.
 *
 * Examples:
 *  - formatCurrency(124050, 'USD') -> "$1,240.50"
 *  - formatCurrency(5000, 'JPY') -> "¥5,000"
 *  - formatCurrency(124050, 'USD', { showCode: true }) -> "$1,240.50 USD"
 *  - formatCurrency(-1500, 'USD') -> "-$15.00"
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'USD',
  options: FormatCurrencyOptions = {}
): string {
  const {
    showCode = false,
    showPositiveSign = false,
    isMinorUnits = true,
  } = options;

  const config = getCurrencyConfig(currency);
  const minorAmount = isMinorUnits ? Math.round(amount) : toMinorUnits(amount, currency);

  const isNegative = minorAmount < 0;
  const absMinor = Math.abs(minorAmount);

  let formattedNumber: string;

  if (config.decimals === 0) {
    formattedNumber = absMinor.toLocaleString('en-US');
  } else {
    const factor = Math.pow(10, config.decimals);
    const wholePart = Math.floor(absMinor / factor);
    const fractionalPart = absMinor % factor;
    const formattedWhole = wholePart.toLocaleString('en-US');
    const formattedFraction = fractionalPart.toString().padStart(config.decimals, '0');
    formattedNumber = `${formattedWhole}.${formattedFraction}`;
  }

  const sign = isNegative ? '-' : showPositiveSign && minorAmount > 0 ? '+' : '';
  const prefix = config.symbolPosition === 'prefix' ? `${config.symbol}` : '';
  const suffix = config.symbolPosition === 'suffix' ? ` ${config.symbol}` : '';
  const codeSuffix = showCode ? ` ${config.code}` : '';

  return `${sign}${prefix}${formattedNumber}${suffix}${codeSuffix}`;
}

/**
 * Convenient alias for formatting an amount that is already in major units (e.g. 1240.50).
 */
export function formatMajorAmount(
  majorAmount: number,
  currency: CurrencyCode = 'USD',
  options: Omit<FormatCurrencyOptions, 'isMinorUnits'> = {}
): string {
  return formatCurrency(majorAmount, currency, { ...options, isMinorUnits: false });
}

// ---------------------------------------------------------------------------
// 4. Strict Multi-Currency Safety (Rule: Never combine differing currencies)
// ---------------------------------------------------------------------------

/**
 * Thrown whenever an operation attempts to aggregate amounts of mismatched currencies
 * without explicit grouping.
 */
export class CurrencyMismatchError extends Error {
  public readonly currencies: CurrencyCode[];

  constructor(currencies: CurrencyCode[]) {
    super(
      `Currency Mismatch: Cannot sum amounts across different currencies [${currencies.join(', ')}]. voyaro requires separate totals per currency.`
    );
    this.name = 'CurrencyMismatchError';
    this.currencies = currencies;
  }
}

/**
 * Assert that all items share the exact same currency.
 * Throws CurrencyMismatchError if more than one distinct currency is present.
 */
export function assertSingleCurrency(
  items: { currency: CurrencyCode }[]
): CurrencyCode | null {
  if (!items || items.length === 0) return null;

  const distinct = Array.from(new Set(items.map((i) => i.currency)));
  if (distinct.length > 1) {
    throw new CurrencyMismatchError(distinct);
  }

  return distinct[0];
}

/**
 * Sum an array of items with strict currency equality assertion.
 * If multiple currencies are found, throws CurrencyMismatchError.
 */
export function sumStrictSingleCurrency(
  items: { amount: number; currency: CurrencyCode }[]
): CurrencyTotal {
  if (!items || items.length === 0) {
    return {
      currency: 'USD',
      totalMinorUnits: 0,
      totalMajorUnits: 0,
      formattedTotal: formatCurrency(0, 'USD'),
      expenseCount: 0,
    };
  }

  const currency = assertSingleCurrency(items)!;
  const totalMinorUnits = items.reduce((sum, item) => sum + item.amount, 0);
  const totalMajorUnits = toMajorUnits(totalMinorUnits, currency);

  return {
    currency,
    totalMinorUnits,
    totalMajorUnits,
    formattedTotal: formatCurrency(totalMinorUnits, currency),
    expenseCount: items.length,
  };
}

/**
 * Group and sum expenses strictly by currency.
 * Guarantees zero cross-currency mixing.
 */
export function sumExpensesByCurrency(
  items: { amount: number; currency: CurrencyCode }[]
): Record<CurrencyCode, CurrencyTotal> {
  const result = {} as Record<CurrencyCode, CurrencyTotal>;

  for (const item of items) {
    const curr = item.currency;
    if (!result[curr]) {
      result[curr] = {
        currency: curr,
        totalMinorUnits: 0,
        totalMajorUnits: 0,
        formattedTotal: '',
        expenseCount: 0,
      };
    }

    result[curr].totalMinorUnits += item.amount;
    result[curr].expenseCount += 1;
  }

  // Finalize major units and formatted strings
  for (const curr of Object.keys(result) as CurrencyCode[]) {
    result[curr].totalMajorUnits = toMajorUnits(result[curr].totalMinorUnits, curr);
    result[curr].formattedTotal = formatCurrency(result[curr].totalMinorUnits, curr);
  }

  return result;
}

/**
 * Sum only the items that match a specific target currency.
 * Items in other currencies are safely filtered out and counted separately.
 */
export function sumExpensesInCurrency(
  items: { amount: number; currency: CurrencyCode }[],
  targetCurrency: CurrencyCode
): CurrencyTotal {
  const matching = items.filter((item) => item.currency === targetCurrency);
  const totalMinorUnits = matching.reduce((sum, item) => sum + item.amount, 0);
  const totalMajorUnits = toMajorUnits(totalMinorUnits, targetCurrency);
  return {
    currency: targetCurrency,
    totalMinorUnits,
    totalMajorUnits,
    formattedTotal: formatCurrency(totalMinorUnits, targetCurrency),
    expenseCount: matching.length,
  };
}

// ---------------------------------------------------------------------------
// 5. Date Grouping for Expense Lists
// ---------------------------------------------------------------------------

export interface ExpenseDayGroup {
  date: string; // 'YYYY-MM-DD'
  dateLabel: string; // e.g. 'March 12, 2028'
  dayTotalMinor: number;
  formattedTotal: string;
  items: Expense[];
}

/**
 * Group expenses by calendar date in chronological descending order (newest date first).
 */
export function groupExpensesByDate(
  expenses: Expense[],
  currency: CurrencyCode = 'USD'
): ExpenseDayGroup[] {
  if (!expenses || expenses.length === 0) return [];

  const groupMap = new Map<string, Expense[]>();

  for (const exp of expenses) {
    const dateKey = exp.date.split('T')[0];
    const existing = groupMap.get(dateKey) || [];
    existing.push(exp);
    groupMap.set(dateKey, existing);
  }

  // Sort dates descending (newest first)
  const sortedDateKeys = Array.from(groupMap.keys()).sort((a, b) => b.localeCompare(a));

  return sortedDateKeys.map((dateKey) => {
    const items = groupMap.get(dateKey)!;
    // Calculate day total for items matching primary currency
    const dayTotalMinor = items
      .filter((i) => i.currency === currency)
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      date: dateKey,
      dateLabel: formatItineraryDate(dateKey, 'medium'),
      dayTotalMinor,
      formattedTotal: formatCurrency(dayTotalMinor, currency),
      items,
    };
  });
}

// ---------------------------------------------------------------------------
// 6. Category-Based Spending Aggregations (Phase 6 — Step 7)
// ---------------------------------------------------------------------------

export interface CategoryBreakdownItem {
  category: ExpenseCategory;
  label: string;
  amount: number; // Integer minor units
  formattedAmount: string;
  percentage: number; // 0 to 100 integer percentage
  expenseCount: number;
  isHighest: boolean;
}

export interface CurrencyCategoryBreakdown {
  currency: CurrencyCode;
  totalSpentMinor: number;
  formattedTotal: string;
  expenseCount: number;
  categories: CategoryBreakdownItem[]; // All 7 categories
  activeCategories: CategoryBreakdownItem[]; // Categories with spending > 0, sorted descending
  highestCategory?: CategoryBreakdownItem;
}

/**
 * Compute the category breakdown for a specific currency.
 * Guarantees that amounts from other currencies are never combined.
 * Prevents division-by-zero when total spending is 0.
 */
export function calculateCategoryBreakdown(
  expenses: Expense[],
  currency: CurrencyCode
): CurrencyCategoryBreakdown {
  const matching = (expenses || []).filter((e) => e.currency === currency);
  const totalSpentMinor = matching.reduce((sum, e) => sum + e.amount, 0);

  // Accumulate by category
  const amountMap: Record<ExpenseCategory, number> = {
    accommodation: 0,
    transportation: 0,
    food_drinks: 0,
    activities: 0,
    shopping: 0,
    flights: 0,
    other: 0,
  };
  const countMap: Record<ExpenseCategory, number> = {
    accommodation: 0,
    transportation: 0,
    food_drinks: 0,
    activities: 0,
    shopping: 0,
    flights: 0,
    other: 0,
  };

  for (const exp of matching) {
    if (amountMap[exp.category] !== undefined) {
      amountMap[exp.category] += exp.amount;
      countMap[exp.category] += 1;
    }
  }

  // Find the highest-spending category (amount must be > 0)
  let maxAmount = 0;
  let topCategoryKey: ExpenseCategory | undefined = undefined;

  for (const cat of EXPENSE_CATEGORIES) {
    if (amountMap[cat] > maxAmount) {
      maxAmount = amountMap[cat];
      topCategoryKey = cat;
    }
  }

  // Build items for all categories
  const allItems: CategoryBreakdownItem[] = EXPENSE_CATEGORIES.map((cat) => {
    const amount = amountMap[cat];
    const percentage =
      totalSpentMinor > 0 ? Math.round((amount / totalSpentMinor) * 100) : 0;

    return {
      category: cat,
      label: EXPENSE_CATEGORY_META[cat].label,
      amount,
      formattedAmount: formatCurrency(amount, currency),
      percentage,
      expenseCount: countMap[cat],
      isHighest: topCategoryKey === cat && amount > 0,
    };
  });

  // Active categories with spending > 0, sorted descending
  const activeCategories = allItems
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const highestCategory = activeCategories.length > 0 ? activeCategories[0] : undefined;

  return {
    currency,
    totalSpentMinor,
    formattedTotal: formatCurrency(totalSpentMinor, currency),
    expenseCount: matching.length,
    categories: allItems,
    activeCategories,
    highestCategory,
  };
}

/**
 * Compute category breakdowns grouped strictly by currency.
 * Returns an array of CurrencyCategoryBreakdown (one per distinct currency in expenses,
 * plus primaryCurrency if expenses is empty).
 */
export function getTripCategoryBreakdowns(
  expenses: Expense[],
  primaryCurrency: CurrencyCode = 'USD'
): CurrencyCategoryBreakdown[] {
  const distinctCurrencies = Array.from(
    new Set((expenses || []).map((e) => e.currency))
  );

  // If no expenses, return a single empty breakdown for primaryCurrency
  if (distinctCurrencies.length === 0) {
    return [calculateCategoryBreakdown([], primaryCurrency)];
  }

  // Ensure primaryCurrency is first if present
  if (distinctCurrencies.includes(primaryCurrency)) {
    distinctCurrencies.sort((a, b) => {
      if (a === primaryCurrency) return -1;
      if (b === primaryCurrency) return 1;
      return a.localeCompare(b);
    });
  }

  return distinctCurrencies.map((curr) => calculateCategoryBreakdown(expenses, curr));
}
