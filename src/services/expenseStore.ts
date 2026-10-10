/**
 * Voyaro Centralized In-Memory Expense State Layer (Phase 6)
 *
 * Requirements:
 *  - In-memory only (app session lifecycle).
 *  - No persistence, no AsyncStorage, no SQLite, no backend, no Supabase.
 *  - Fully reactive across React Native screens using native useSyncExternalStore.
 *  - Mirrors the exact architecture established by itineraryStore.ts in Phase 5.
 *  - Budget state is kept separate from expense records.
 *  - Strictly isolates amounts by currency; never sums mismatched currencies.
 *
 * Core Operations:
 *  - getExpensesByTrip(tripId)
 *  - getExpenseById(expenseId)
 *  - addExpense(expense)
 *  - updateExpense(expenseId, updates)
 *  - deleteExpense(expenseId)
 *  - setTripBudget(tripId, amount, currency)
 *  - getTripBudget(tripId)
 */

import {
  CategorySpending,
  CreateExpenseInput,
  CurrencyCode,
  EXPENSE_CATEGORIES,
  Expense,
  ExpenseCategory,
  TripBudget,
  TripExpenseSummary,
  UpdateExpenseInput,
} from '@/types/expense';
import {
  formatCurrency,
  getCurrencyConfig,
  toMajorUnits,
  toMinorUnits,
} from '@/utils/currencyUtils';
import {
  validateExpenseAmount,
  validateExpenseDate,
  validateExpenseInput,
} from '@/utils/expenseValidation';
import { useSyncExternalStore } from 'react';
import { getAllTrips, getTripById } from './mockData';

// ---------------------------------------------------------------------------
// 1. Initial Seed Data (Matches Existing Phase 4 & 5 Mock Dashboard Figures)
// ---------------------------------------------------------------------------

/**
 * Seed expenses for 'japan-adventure'.
 * Sums to EXACTLY $1,240.50 (124050 cents) to match the existing Home & Overview mock data.
 */
const INITIAL_SEED_EXPENSES: Expense[] = [
  {
    id: 'exp-japan-1',
    tripId: 'japan-adventure',
    title: 'Shinkansen Bullet Train Tickets',
    amount: 22000, // $220.00
    currency: 'USD',
    category: 'transportation',
    date: '2028-03-10',
    paidBy: 'trv-alex',
    notes: 'Reserved seats Tokyo to Kyoto on Nozomi #225',
    createdAt: '2028-03-10T09:00:00.000Z',
    updatedAt: '2028-03-10T09:00:00.000Z',
  },
  {
    id: 'exp-japan-2',
    tripId: 'japan-adventure',
    title: 'Sukiyabashi Jiro Omakase Dinner',
    amount: 38050, // $380.50
    currency: 'USD',
    category: 'food_drinks',
    date: '2028-03-11',
    paidBy: 'trv-alex',
    notes: 'Chef special tasting menu for two',
    createdAt: '2028-03-11T19:30:00.000Z',
    updatedAt: '2028-03-11T19:30:00.000Z',
  },
  {
    id: 'exp-japan-3',
    tripId: 'japan-adventure',
    title: 'Akihabara Tech & Anime Souvenirs',
    amount: 16000, // $160.00
    currency: 'USD',
    category: 'shopping',
    date: '2028-03-11',
    paidBy: 'trv-sarah',
    notes: 'Gifts and collectible figures',
    createdAt: '2028-03-11T14:15:00.000Z',
    updatedAt: '2028-03-11T14:15:00.000Z',
  },
  {
    id: 'exp-japan-4',
    tripId: 'japan-adventure',
    title: 'TeamLab Planets Digital Art Entry',
    amount: 8000, // $80.00
    currency: 'USD',
    category: 'activities',
    date: '2028-03-12',
    paidBy: 'trv-alex',
    notes: 'Morning priority exhibition slot',
    createdAt: '2028-03-12T10:00:00.000Z',
    updatedAt: '2028-03-12T10:00:00.000Z',
  },
  {
    id: 'exp-japan-5',
    tripId: 'japan-adventure',
    title: 'Kyoto Ryokan Traditional Lodging',
    amount: 40000, // $400.00
    currency: 'USD',
    category: 'accommodation',
    date: '2028-03-12',
    paidBy: 'trv-alex',
    notes: 'First night deposit with garden view',
    createdAt: '2028-03-12T15:00:00.000Z',
    updatedAt: '2028-03-12T15:00:00.000Z',
  },
  // Seed expense for 'swiss-alps' ($2,100.00 / budget $2,000.00 -> OVER BUDGET demo)
  {
    id: 'exp-swiss-1',
    tripId: 'swiss-alps',
    title: 'Zermatt Ski Pass & Gear Rental',
    amount: 210000, // $2,100.00
    currency: 'USD',
    category: 'activities',
    date: '2026-01-16',
    paidBy: 'trv-alex',
    notes: 'Full week lift pass and equipment',
    createdAt: '2026-01-16T08:30:00.000Z',
    updatedAt: '2026-01-16T08:30:00.000Z',
  },
];

/**
 * Seed budgets (separate from expenses).
 */
const INITIAL_SEED_BUDGETS: [string, TripBudget][] = [
  [
    'japan-adventure',
    {
      tripId: 'japan-adventure',
      amount: 300000, // $3,000.00
      currency: 'USD',
      updatedAt: '2028-03-01T00:00:00.000Z',
    },
  ],
  [
    'paris-getaway',
    {
      tripId: 'paris-getaway',
      amount: 350000, // $3,500.00
      currency: 'USD',
      updatedAt: '2027-10-01T00:00:00.000Z',
    },
  ],
  [
    'swiss-alps',
    {
      tripId: 'swiss-alps',
      amount: 200000, // $2,000.00
      currency: 'USD',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
];

// ---------------------------------------------------------------------------
// 2. In-Memory Store & Subscription Mechanism
// ---------------------------------------------------------------------------

let expensesStore: Expense[] = [...INITIAL_SEED_EXPENSES];
let budgetsStore: Map<string, TripBudget> = new Map(INITIAL_SEED_BUDGETS);
let storeRevision = 0;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  storeRevision++;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('Expense store listener error:', e);
    }
  });
}

/**
 * Normalize trip ID so 'demo-trip' maps to 'japan-adventure' seamlessly.
 */
export function normalizeTripId(tripId?: string): string {
  if (!tripId || tripId === 'demo-trip') {
    return 'japan-adventure';
  }
  return tripId;
}

/**
 * Verify that a trip ID actually exists in the app.
 */
export function tripExists(tripId: string): boolean {
  const normalized = normalizeTripId(tripId);
  return getAllTrips().some((t) => t.id === normalized);
}

// ---------------------------------------------------------------------------
// 3. Core Expense Operations (Read, Add, Update, Delete)
// ---------------------------------------------------------------------------

/**
 * Retrieve all expenses for a specific trip, sorted by date descending (newest first).
 * Safe for unknown trip IDs (returns []).
 */
export function getExpensesByTrip(tripId?: string): Expense[] {
  const normalized = normalizeTripId(tripId);
  return expensesStore
    .filter((e) => e.tripId === normalized)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Retrieve all expenses across all trips (useful for global tab).
 */
export function getAllExpenses(): Expense[] {
  return [...expensesStore].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Retrieve a single expense by its ID.
 * Safe for unknown IDs (returns undefined).
 */
export function getExpenseById(expenseId: string): Expense | undefined {
  if (!expenseId) return undefined;
  return expensesStore.find((e) => e.id === expenseId);
}

/**
 * Add a new expense to the in-memory store.
 *
 * Requirements enforced:
 *  - Every expense must reference an existing trip ID.
 *  - Expense IDs must be unique.
 *  - Amount must be positive integer minor units.
 *  - Immediately notifies reactive subscribers.
 */
export function addExpense(
  input: CreateExpenseInput | Expense
): Expense {
  const normTripId = normalizeTripId(input.tripId);

  // 1. Verify trip exists
  if (!tripExists(normTripId)) {
    throw new Error(`Cannot add expense: Trip with ID "${input.tripId}" does not exist.`);
  }

  // 2. Validate input fields
  const validation = validateExpenseInput({
    ...input,
    tripId: normTripId,
  });
  if (!validation.isValid) {
    const firstErrorMessage = Object.values(validation.errors)[0];
    throw new Error(`Invalid expense data: ${firstErrorMessage}`);
  }

  // 3. Ensure unique ID
  let finalId = (input as Expense).id;
  if (!finalId || expensesStore.some((e) => e.id === finalId)) {
    finalId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  const nowIso = new Date().toISOString();

  const newExpense: Expense = {
    id: finalId,
    tripId: normTripId,
    title: input.title.trim(),
    amount: Math.round(input.amount),
    currency: input.currency,
    category: input.category,
    date: input.date.trim(),
    paidBy: input.paidBy?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: (input as Expense).createdAt || nowIso,
    updatedAt: nowIso,
  };

  expensesStore = [newExpense, ...expensesStore];
  syncMockTripSpending(normTripId);
  notify();
  return newExpense;
}

/**
 * Update an existing expense by ID.
 *
 * Requirements enforced:
 *  - Preserves original ID and tripId.
 *  - Handles unknown IDs safely (returns undefined).
 *  - Updates timestamp.
 *  - Immediately notifies reactive subscribers.
 */
export function updateExpense(
  expenseId: string,
  updates: UpdateExpenseInput
): Expense | undefined {
  if (!expenseId) return undefined;

  const index = expensesStore.findIndex((e) => e.id === expenseId);
  if (index === -1) {
    return undefined; // Unknown ID handled safely
  }

  const existing = expensesStore[index];

  // Validate title if updated
  let finalTitle = existing.title;
  if (updates.title !== undefined) {
    if (!updates.title.trim()) {
      throw new Error('Expense title cannot be empty.');
    }
    finalTitle = updates.title.trim();
  }

  // Validate category if updated
  let finalCategory = existing.category;
  if (updates.category !== undefined) {
    if (!EXPENSE_CATEGORIES.includes(updates.category)) {
      throw new Error(`Invalid expense category: ${updates.category}`);
    }
    finalCategory = updates.category;
  }

  // Validate amount if updated
  let finalAmount = existing.amount;
  if (updates.amount !== undefined) {
    const amountVal = validateExpenseAmount(updates.amount, updates.currency || existing.currency);
    if (!amountVal.isValid) {
      throw new Error(`Invalid update amount: ${amountVal.error}`);
    }
    finalAmount = amountVal.minorUnits!;
  }

  // Validate date if updated
  let finalDate = existing.date;
  if (updates.date !== undefined) {
    const dateVal = validateExpenseDate(updates.date);
    if (!dateVal.isValid) {
      throw new Error(`Invalid update date: ${dateVal.error}`);
    }
    finalDate = updates.date.trim();
  }

  let finalPaidBy = existing.paidBy;
  if (updates.paidBy !== undefined) {
    finalPaidBy = updates.paidBy.trim() ? updates.paidBy.trim() : undefined;
  }

  let finalNotes = existing.notes;
  if (updates.notes !== undefined) {
    finalNotes = updates.notes.trim() ? updates.notes.trim() : undefined;
  }

  const updatedExpense: Expense = {
    ...existing,
    id: existing.id,        // PRESERVED
    tripId: existing.tripId, // PRESERVED
    title: finalTitle,
    amount: finalAmount,
    currency: updates.currency || existing.currency,
    category: finalCategory,
    date: finalDate,
    paidBy: finalPaidBy,
    notes: finalNotes,
    updatedAt: new Date().toISOString(),
  };

  expensesStore = [
    ...expensesStore.slice(0, index),
    updatedExpense,
    ...expensesStore.slice(index + 1),
  ];

  syncMockTripSpending(existing.tripId);
  notify();
  return updatedExpense;
}

/**
 * Delete an expense by ID.
 *
 * Requirements enforced:
 *  - Removes from shared store across all screens.
 *  - Handles unknown IDs safely (returns false).
 *  - Immediately notifies reactive subscribers.
 */
export function deleteExpense(expenseId: string): boolean {
  if (!expenseId) return false;

  const target = expensesStore.find((e) => e.id === expenseId);
  if (!target) return false;

  const prevLen = expensesStore.length;
  expensesStore = expensesStore.filter((e) => e.id !== expenseId);
  const deleted = expensesStore.length < prevLen;

  if (deleted) {
    syncMockTripSpending(target.tripId);
    notify();
  }

  return deleted;
}

/**
 * Clear all expenses for a specific trip.
 */
export function clearTripExpenses(tripId?: string): void {
  const normalized = normalizeTripId(tripId);
  expensesStore = expensesStore.filter((e) => e.tripId !== normalized);
  syncMockTripSpending(normalized);
  notify();
}

// ---------------------------------------------------------------------------
// 4. Trip Budget Operations (Separate from expense records)
// ---------------------------------------------------------------------------

/**
 * Set the budget for a specific trip.
 * Stores budget amounts with their currency in minor units.
 */
export function setTripBudget(
  tripId: string,
  amount: number | string,
  currency: CurrencyCode = 'USD'
): TripBudget {
  const normalized = normalizeTripId(tripId);

  if (!tripExists(normalized)) {
    throw new Error(`Cannot set budget: Trip with ID "${tripId}" does not exist.`);
  }

  // Convert amount safely into integer minor units
  const minorUnits =
    typeof amount === 'number' && Number.isInteger(amount) && amount >= 0
      ? amount
      : toMinorUnits(amount, currency);

  if (minorUnits < 0 || isNaN(minorUnits)) {
    throw new Error('Trip budget amount must be a non-negative number.');
  }

  const budget: TripBudget = {
    tripId: normalized,
    amount: minorUnits,
    currency,
    updatedAt: new Date().toISOString(),
  };

  budgetsStore.set(normalized, budget);
  syncMockTripSpending(normalized);
  notify();
  return budget;
}

/**
 * Clear or unset the budget for a specific trip.
 * Safe for trips with or without a budget.
 */
export function clearTripBudget(tripId: string): boolean {
  const normalized = normalizeTripId(tripId);
  const existed = budgetsStore.delete(normalized);
  if (existed) {
    syncMockTripSpending(normalized);
    notify();
  }
  return existed;
}

/**
 * Retrieve the budget for a specific trip.
 * Safe for unknown IDs (returns undefined).
 */
export function getTripBudget(tripId?: string): TripBudget | undefined {
  if (!tripId) return undefined;
  const normalized = normalizeTripId(tripId);
  return budgetsStore.get(normalized);
}

// ---------------------------------------------------------------------------
// 5. Dependent Totals & Summary Aggregations
// ---------------------------------------------------------------------------

/**
 * Compute the live expense & budget summary for a given trip.
 * Automatically recalculates when expenses or budgets are updated.
 */
export function getTripExpenseSummary(tripId?: string): TripExpenseSummary {
  const normalized = normalizeTripId(tripId);
  const expenses = getExpensesByTrip(normalized);
  const budget = getTripBudget(normalized);

  const primaryCurrency: CurrencyCode =
    budget?.currency || (expenses.length > 0 ? expenses[0].currency : 'USD');

  // 1. Calculate total spent in matching currency
  const matchingExpenses = expenses.filter((e) => e.currency === primaryCurrency);
  const totalSpentMinor = matchingExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSpentMajor = toMajorUnits(totalSpentMinor, primaryCurrency);

  // 2. Budget metrics
  const budgetMinor = budget?.amount;
  const remainingMinor = budgetMinor !== undefined ? budgetMinor - totalSpentMinor : undefined;
  const isOverBudget = remainingMinor !== undefined ? remainingMinor < 0 : false;
  const percentUsed =
    budgetMinor !== undefined && budgetMinor > 0
      ? Math.min(999, Math.round((totalSpentMinor / budgetMinor) * 100))
      : undefined;

  // 3. Category breakdown
  const categoryMap = {} as Record<ExpenseCategory, CategorySpending>;
  for (const cat of EXPENSE_CATEGORIES) {
    categoryMap[cat] = {
      category: cat,
      amount: 0,
      currency: primaryCurrency,
      formattedAmount: formatCurrency(0, primaryCurrency),
      percentageOfTotal: 0,
      expenseCount: 0,
    };
  }

  for (const exp of matchingExpenses) {
    categoryMap[exp.category].amount += exp.amount;
    categoryMap[exp.category].expenseCount += 1;
  }

  for (const cat of EXPENSE_CATEGORIES) {
    categoryMap[cat].formattedAmount = formatCurrency(categoryMap[cat].amount, primaryCurrency);
    categoryMap[cat].percentageOfTotal =
      totalSpentMinor > 0
        ? Math.round((categoryMap[cat].amount / totalSpentMinor) * 100)
        : 0;
  }

  return {
    tripId: normalized,
    currency: primaryCurrency,
    totalSpentMinorUnits: totalSpentMinor,
    totalSpentMajorUnits: totalSpentMajor,
    totalSpentFormatted: formatCurrency(totalSpentMinor, primaryCurrency),
    budgetMinorUnits: budgetMinor,
    budgetFormatted: budgetMinor !== undefined ? formatCurrency(budgetMinor, primaryCurrency) : undefined,
    remainingMinorUnits: remainingMinor,
    remainingFormatted: remainingMinor !== undefined ? formatCurrency(remainingMinor, primaryCurrency) : undefined,
    percentUsed,
    isOverBudget,
    expenseCount: matchingExpenses.length,
    categories: categoryMap,
  };
}

/**
 * Synchronize derived totals into MOCK_TRIPS to keep legacy Phase 4 cards (Home, Trips list) in sync.
 */
function syncMockTripSpending(tripId: string): void {
  const trip = getTripById(tripId);
  if (!trip) return;

  const summary = getTripExpenseSummary(tripId);
  trip.spending = {
    spent: summary.totalSpentMajorUnits,
    budget: summary.budgetMinorUnits ? toMajorUnits(summary.budgetMinorUnits, summary.currency) : (trip.spending?.budget || 0),
    currency: getCurrencyConfig(summary.currency).symbol,
    percentUsed: summary.percentUsed,
    spentFormatted: summary.totalSpentFormatted.replace(/[^0-9.,-]+/g, ''),
    budgetFormatted: summary.budgetFormatted ? summary.budgetFormatted.replace(/[^0-9.,-]+/g, '') : '',
    remainingFormatted: summary.remainingFormatted ? summary.remainingFormatted.replace(/[^0-9.,-]+/g, '') : '',
    isOverBudget: summary.isOverBudget,
  };
}

/**
 * Reset store to initial seed dataset (useful for testing and debug).
 */
export function resetExpenseSeedData(): void {
  expensesStore = [...INITIAL_SEED_EXPENSES];
  budgetsStore = new Map(INITIAL_SEED_BUDGETS);
  syncMockTripSpending('japan-adventure');
  notify();
}

// ---------------------------------------------------------------------------
// 6. Subscription & React External Store Hooks
// ---------------------------------------------------------------------------

export function subscribeToExpenses(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getExpensesSnapshot(): Expense[] {
  return expensesStore;
}

export function getStoreRevision(): number {
  return storeRevision;
}

/**
 * Reactive React hook that subscribes to all expenses for a specific trip.
 * Automatically re-renders screens whenever an expense is added, updated, deleted,
 * or when the trip budget changes.
 */
export function useTripExpenses(tripId?: string) {
  // Subscribes to the shared store via useSyncExternalStore
  useSyncExternalStore(subscribeToExpenses, getStoreRevision, getStoreRevision);

  const normalized = normalizeTripId(tripId);
  const expenses = getExpensesByTrip(normalized);
  const budget = getTripBudget(normalized);
  const summary = getTripExpenseSummary(normalized);

  return {
    tripId: normalized,
    expenses,
    budget,
    summary,
    expenseCount: expenses.length,
    isEmpty: expenses.length === 0,
    addExpense,
    updateExpense,
    deleteExpense,
    setTripBudget: (amount: number | string, currency?: CurrencyCode) =>
      setTripBudget(normalized, amount, currency),
    clearTripBudget: () => clearTripBudget(normalized),
    clearExpenses: () => clearTripExpenses(normalized),
  };
}

/**
 * Reactive React hook that subscribes to a single expense item by ID.
 * Re-renders automatically when that specific expense changes or is deleted.
 */
export function useExpense(expenseId?: string) {
  useSyncExternalStore(subscribeToExpenses, getStoreRevision, getStoreRevision);

  const expense = expenseId ? getExpenseById(expenseId) : undefined;

  return {
    expense,
    exists: Boolean(expense),
    update: (changes: UpdateExpenseInput) =>
      expenseId ? updateExpense(expenseId, changes) : undefined,
    remove: () => (expenseId ? deleteExpense(expenseId) : false),
  };
}

/**
 * Reactive React hook that subscribes to the entire global expense list.
 * Useful for the main (tabs)/expenses screen.
 */
export function useAllExpenses() {
  useSyncExternalStore(subscribeToExpenses, getStoreRevision, getStoreRevision);

  const allExpenses = getAllExpenses();

  return {
    expenses: allExpenses,
    totalCount: allExpenses.length,
    isEmpty: allExpenses.length === 0,
    addExpense,
    deleteExpense,
  };
}

// ---------------------------------------------------------------------------
// 7. Default Service Object Export
// ---------------------------------------------------------------------------

export const expenseStore = {
  getExpensesByTrip,
  getExpenseById,
  getAllExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  setTripBudget,
  clearTripBudget,
  getTripBudget,
  getTripExpenseSummary,
  clearTripExpenses,
  resetExpenseSeedData,
  subscribe: subscribeToExpenses,
  useTripExpenses,
  useExpense,
  useAllExpenses,
};

export default expenseStore;
