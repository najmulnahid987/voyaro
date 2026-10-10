/**
 * Voyaro Core Domain — Expense Types (Phase 6)
 *
 * Defines the complete, strongly typed data model for expense and budget
 * management across trips.
 *
 * Designed with integer minor units for monetary amounts to guarantee
 * precision and prevent floating-point rounding errors.
 */

// ---------------------------------------------------------------------------
// 1. Supported Expense Categories
// ---------------------------------------------------------------------------

/**
 * Supported expense categories across the Voyaro travel planner.
 */
export const EXPENSE_CATEGORIES = [
  'accommodation',
  'transportation',
  'food_drinks',
  'activities',
  'shopping',
  'flights',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/**
 * Display metadata and UI descriptors for each category.
 */
export interface ExpenseCategoryMeta {
  key: ExpenseCategory;
  label: string;
  iconName: string;
  description: string;
}

export const EXPENSE_CATEGORY_META: Record<ExpenseCategory, ExpenseCategoryMeta> = {
  accommodation: {
    key: 'accommodation',
    label: 'Accommodation',
    iconName: 'hotel',
    description: 'Hotels, resorts, villas, and lodging bookings',
  },
  transportation: {
    key: 'transportation',
    label: 'Transportation',
    iconName: 'transportation',
    description: 'Trains, car rentals, taxis, buses, and ferries',
  },
  food_drinks: {
    key: 'food_drinks',
    label: 'Food & Drinks',
    iconName: 'dining',
    description: 'Restaurants, cafes, street food, and groceries',
  },
  activities: {
    key: 'activities',
    label: 'Activities',
    iconName: 'activity',
    description: 'Tours, museums, excursions, and entertainment',
  },
  shopping: {
    key: 'shopping',
    label: 'Shopping',
    iconName: 'shopping',
    description: 'Souvenirs, clothing, duty-free, and gifts',
  },
  flights: {
    key: 'flights',
    label: 'Flights',
    iconName: 'flight',
    description: 'Airfare, baggage fees, and seat upgrades',
  },
  other: {
    key: 'other',
    label: 'Other',
    iconName: 'receipt',
    description: 'Insurance, tips, visas, and miscellaneous expenses',
  },
};

// ---------------------------------------------------------------------------
// 2. Supported Currencies
// ---------------------------------------------------------------------------

export const SUPPORTED_CURRENCY_CODES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'SGD',
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number];

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  name: string;
  decimals: number; // 2 for USD/EUR, 0 for JPY
  symbolPosition: 'prefix' | 'suffix';
}

// ---------------------------------------------------------------------------
// 3. Core Expense Model
// ---------------------------------------------------------------------------

/**
 * Core Expense entity.
 *
 * Monetary amount is stored strictly as an integer in MINOR units (e.g. cents).
 * Examples:
 *   - $24.50 USD is stored as 2450
 *   - €100.00 EUR is stored as 10000
 *   - ¥5,000 JPY is stored as 5000 (0-decimal currency)
 */
export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number; // Integer minor units (e.g. cents)
  currency: CurrencyCode;
  category: ExpenseCategory;
  date: string; // ISO 8601 date string ('YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ss.sssZ')
  paidBy?: string; // Optional Traveler ID or current user ID
  notes?: string;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

// ---------------------------------------------------------------------------
// 4. Creation and Mutation Payloads
// ---------------------------------------------------------------------------

export interface CreateExpenseInput {
  tripId: string;
  title: string;
  amount: number; // Integer minor units
  currency: CurrencyCode;
  category: ExpenseCategory;
  date: string; // ISO 8601 string
  paidBy?: string;
  notes?: string;
}

export interface UpdateExpenseInput {
  title?: string;
  amount?: number; // Integer minor units
  currency?: CurrencyCode;
  category?: ExpenseCategory;
  date?: string;
  paidBy?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// 5. Category Breakdown & Currency Aggregation Models
// ---------------------------------------------------------------------------

export interface CategorySpending {
  category: ExpenseCategory;
  amount: number; // Integer minor units
  currency: CurrencyCode;
  formattedAmount: string;
  percentageOfTotal: number; // 0 to 100
  expenseCount: number;
}

export interface CurrencyTotal {
  currency: CurrencyCode;
  totalMinorUnits: number;
  totalMajorUnits: number;
  formattedTotal: string;
  expenseCount: number;
}

export interface TripExpenseSummary {
  tripId: string;
  currency: CurrencyCode;
  totalSpentMinorUnits: number;
  totalSpentMajorUnits: number;
  totalSpentFormatted: string;
  budgetMinorUnits?: number;
  budgetFormatted?: string;
  remainingMinorUnits?: number;
  remainingFormatted?: string;
  percentUsed?: number;
  isOverBudget?: boolean;
  expenseCount: number;
  categories: Record<ExpenseCategory, CategorySpending>;
}

// ---------------------------------------------------------------------------
// 6. Trip Budget Model (Separate from expense records)
// ---------------------------------------------------------------------------

export interface TripBudget {
  tripId: string;
  amount: number; // Stored in integer minor units (e.g. 300000 for $3,000.00)
  currency: CurrencyCode;
  updatedAt: string; // ISO 8601 timestamp
}

// ---------------------------------------------------------------------------
// 7. Validation Error Types
// ---------------------------------------------------------------------------

export interface ExpenseValidationErrors {
  title?: string;
  tripId?: string;
  amount?: string;
  currency?: string;
  category?: string;
  date?: string;
  notes?: string;
}

export interface ExpenseValidationResult {
  isValid: boolean;
  errors: ExpenseValidationErrors;
}
