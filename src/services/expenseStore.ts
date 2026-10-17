/**
 * Voyaro Centralized Expense & Budget Persistence State Layer (Phase 7 — Step 9)
 *
 * Connects the Phase 6 expense and budget experience to Supabase while preserving
 * fast in-memory caching and reactive useSyncExternalStore subscriptions.
 *
 * Guarantees:
 *  - Supabase-backed persistent storage for expenses and trip budgets.
 *  - Strict Row Level Security (RLS) enforcement: operations scoped to trips owned by auth.uid().
 *  - Monetary precision: exact integer minor units (cents) preserved end-to-end.
 *  - Multi-currency isolation: never sums differing currencies together; maintains currency totals.
 *  - Live totals, remaining budgets, percent used, and overspending indicators update reactively.
 *  - Safe handling of missing budgets, zero budgets, and empty expense lists.
 *  - Cache cleanup on account logout.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { supabase } from './supabase';
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
import {
  mapExpenseInputToInsert,
  mapExpenseRowToDomain,
  mapExpenseToUpdate,
  mapTripBudgetRowToDomain,
} from './mappers';
import { ExpenseRow, TripBudgetRow } from '@/types/database.types';
import { getAllTrips, getTripById } from './mockData';
import { getCachedTrips } from './trip';

// ---------------------------------------------------------------------------
// 1. Initial Seed Data (Development / Demo Routes Only)
// ---------------------------------------------------------------------------

export const INITIAL_SEED_EXPENSES: Expense[] = [
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

export const INITIAL_SEED_BUDGETS: [string, TripBudget][] = [
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

const DEV_MOCK_TRIP_IDS = [
  'japan-adventure',
  'paris-getaway',
  'swiss-alps',
  'demo-trip',
  'thailand-escape',
];

export function isDevMockTrip(tripId?: string): boolean {
  if (!tripId) return false;
  return DEV_MOCK_TRIP_IDS.includes(tripId);
}

export function isDevMockExpense(expenseId?: string): boolean {
  if (!expenseId) return false;
  return (
    expenseId.startsWith('exp-japan-') ||
    expenseId.startsWith('exp-swiss-') ||
    expenseId.startsWith('exp-paris-')
  );
}

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
      console.warn('[Voyaro Expenses] Store listener error:', e);
    }
  });
}

export function normalizeTripId(tripId?: string): string {
  if (!tripId) {
    return '';
  }
  if (tripId === 'demo-trip') {
    return 'japan-adventure';
  }
  return tripId;
}

export function tripExists(tripId: string): boolean {
  const normalized = normalizeTripId(tripId);
  if (isDevMockTrip(normalized)) return true;
  const inMock = getAllTrips().some((t) => t.id === normalized);
  if (inMock) return true;
  const inCached = getCachedTrips()?.some((t) => t.id === normalized);
  if (inCached) return true;
  return false;
}

export function clearExpenseCache(): void {
  expensesStore = typeof __DEV__ !== 'undefined' && __DEV__ ? [...INITIAL_SEED_EXPENSES] : [];
  budgetsStore = typeof __DEV__ !== 'undefined' && __DEV__ ? new Map(INITIAL_SEED_BUDGETS) : new Map();
  notify();
}

// ---------------------------------------------------------------------------
// 3. Core Expense Operations (Fetch, Add, Update, Delete)
// ---------------------------------------------------------------------------

/**
 * Fetches expenses for a trip from Supabase, updates in-memory cache, and returns sorted expenses.
 */
export async function fetchExpensesByTrip(tripId?: string): Promise<Expense[]> {
  const normalized = normalizeTripId(tripId);
  if (!normalized) {
    return [];
  }

  // If this is a development mock trip, return local cached dataset
  if (isDevMockTrip(tripId)) {
    return getExpensesByTrip(normalized);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return getExpensesByTrip(normalized);
  }

  const { data: rows, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('trip_id', normalized)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[Voyaro Expenses] fetchExpensesByTrip error for ${tripId}:`, error.message);
    throw new Error(`Failed to load expenses: ${error.message}`);
  }

  const domainExpenses = (rows as ExpenseRow[]).map(mapExpenseRowToDomain);

  // Update in-memory store for this trip
  expensesStore = [
    ...expensesStore.filter((e) => e.tripId !== normalized),
    ...domainExpenses,
  ];
  notify();

  return getExpensesByTrip(normalized);
}

/**
 * Synchronously retrieves cached expenses for a specific trip, sorted by date descending.
 */
export function getExpensesByTrip(tripId?: string): Expense[] {
  const normalized = normalizeTripId(tripId);
  if (!normalized) return [];
  return expensesStore
    .filter((e) => e.tripId === normalized)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Synchronously retrieves all cached expenses across all trips.
 */
export function getAllExpenses(): Expense[] {
  return [...expensesStore].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Fetches a single expense by ID from Supabase and syncs cache.
 */
export async function fetchExpenseById(expenseId: string): Promise<Expense | null> {
  if (!expenseId) return null;

  if (isDevMockExpense(expenseId)) {
    return getExpenseById(expenseId) || null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return getExpenseById(expenseId) || null;
  }

  const { data: row, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .maybeSingle();

  if (error) {
    console.error(`[Voyaro Expenses] fetchExpenseById error for ${expenseId}:`, error.message);
    throw new Error(`Failed to load expense: ${error.message}`);
  }

  if (!row) {
    return null;
  }

  const domainExpense = mapExpenseRowToDomain(row as ExpenseRow);

  const index = expensesStore.findIndex((e) => e.id === expenseId);
  if (index >= 0) {
    expensesStore[index] = domainExpense;
  } else {
    expensesStore.push(domainExpense);
  }
  notify();

  return domainExpense;
}

/**
 * Synchronously retrieves a single expense from the cache by ID.
 */
export function getExpenseById(expenseId: string): Expense | undefined {
  if (!expenseId) return undefined;
  return expensesStore.find((e) => e.id === expenseId);
}

/**
 * Persists a new expense to Supabase (or local store for mock trips).
 * Validates trip ownership & inputs, preserving integer minor units.
 */
export async function addExpense(
  input: CreateExpenseInput | Expense
): Promise<Expense> {
  const normTripId = normalizeTripId(input.tripId);
  if (!normTripId) {
    throw new Error('Cannot add expense: Trip ID is required.');
  }

  // 1. Verify trip existence for non-UUID strings
  const isLikelyUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normTripId);
  if (!isLikelyUuid && !tripExists(normTripId)) {
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

  // 2. If dev mock trip, save locally
  if (isDevMockTrip(normTripId)) {
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

  // 3. Supabase insert
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('You must be logged in to record an expense.');
  }

  // Security check: verify trip access via RLS
  const { data: tripRow, error: tripCheckError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', normTripId)
    .maybeSingle();

  if (tripCheckError || !tripRow) {
    throw new Error('Cannot add expense: Trip does not exist or access is denied.');
  }

  const insertPayload = mapExpenseInputToInsert({
    ...input,
    tripId: normTripId,
    title: input.title.trim(),
    notes: input.notes?.trim() || undefined,
    paidBy: input.paidBy?.trim() || undefined,
  });

  const { data: row, error } = await supabase
    .from('expenses')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('[Voyaro Expenses] addExpense error:', error.message);
    throw new Error(`Failed to save expense: ${error.message}`);
  }

  const domainExpense = mapExpenseRowToDomain(row as ExpenseRow);

  expensesStore = [domainExpense, ...expensesStore.filter((e) => e.id !== domainExpense.id)];
  notify();

  return domainExpense;
}

/**
 * Updates an existing expense in Supabase (or local store for mock items).
 */
export async function updateExpense(
  expenseId: string,
  updates: UpdateExpenseInput
): Promise<Expense | undefined> {
  if (!expenseId) return undefined;

  const existing = getExpenseById(expenseId);
  const isLikelyUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(expenseId);
  if (!isLikelyUuid && !existing) {
    return undefined;
  }

  // Validate title if updated
  let finalTitle = existing?.title;
  if (updates.title !== undefined) {
    if (!updates.title.trim()) {
      throw new Error('Expense title cannot be empty.');
    }
    finalTitle = updates.title.trim();
  }

  // Validate category if updated
  let finalCategory = existing?.category;
  if (updates.category !== undefined) {
    if (!EXPENSE_CATEGORIES.includes(updates.category)) {
      throw new Error(`Invalid expense category: ${updates.category}`);
    }
    finalCategory = updates.category;
  }

  // Validate amount if updated
  let finalAmount = existing?.amount;
  if (updates.amount !== undefined) {
    const amountVal = validateExpenseAmount(
      updates.amount,
      updates.currency || existing?.currency || 'USD'
    );
    if (!amountVal.isValid) {
      throw new Error(`Invalid update amount: ${amountVal.error}`);
    }
    finalAmount = amountVal.minorUnits!;
  }

  // Validate date if updated
  let finalDate = existing?.date;
  if (updates.date !== undefined) {
    const dateVal = validateExpenseDate(updates.date);
    if (!dateVal.isValid) {
      throw new Error(`Invalid update date: ${dateVal.error}`);
    }
    finalDate = updates.date.trim();
  }

  // If dev mock expense or dev trip, update locally
  if (isDevMockExpense(expenseId) || isDevMockTrip(existing?.tripId)) {
    if (!existing) return undefined;

    const updatedExpense: Expense = {
      ...existing,
      id: existing.id,
      tripId: existing.tripId,
      title: finalTitle ?? existing.title,
      amount: finalAmount ?? existing.amount,
      currency: updates.currency || existing.currency,
      category: finalCategory ?? existing.category,
      date: finalDate ?? existing.date,
      paidBy: updates.paidBy !== undefined ? updates.paidBy.trim() || undefined : existing.paidBy,
      notes: updates.notes !== undefined ? updates.notes.trim() || undefined : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    const index = expensesStore.findIndex((e) => e.id === expenseId);
    if (index >= 0) {
      expensesStore = [
        ...expensesStore.slice(0, index),
        updatedExpense,
        ...expensesStore.slice(index + 1),
      ];
      syncMockTripSpending(existing.tripId);
      notify();
    }
    return updatedExpense;
  }

  // Supabase update
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('You must be logged in to update an expense.');
  }

  const updatePayload = mapExpenseToUpdate({
    title: finalTitle,
    amount: finalAmount,
    currency: updates.currency,
    category: finalCategory,
    date: finalDate,
    paidBy: updates.paidBy !== undefined ? updates.paidBy.trim() || undefined : undefined,
    notes: updates.notes !== undefined ? updates.notes.trim() || undefined : undefined,
  });

  const { data: row, error } = await supabase
    .from('expenses')
    .update(updatePayload)
    .eq('id', expenseId)
    .select()
    .maybeSingle();

  if (error) {
    console.error(`[Voyaro Expenses] updateExpense error for ${expenseId}:`, error.message);
    throw new Error(`Failed to update expense: ${error.message}`);
  }

  if (!row) {
    return undefined;
  }

  const domainExpense = mapExpenseRowToDomain(row as ExpenseRow);

  expensesStore = expensesStore.map((e) => (e.id === expenseId ? domainExpense : e));
  notify();

  return domainExpense;
}

/**
 * Deletes an expense by ID from Supabase (or local store for mock items).
 */
export async function deleteExpense(expenseId: string): Promise<boolean> {
  if (!expenseId) return false;

  const target = getExpenseById(expenseId);
  const isLikelyUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(expenseId);
  if (!isLikelyUuid && !target) {
    return false;
  }

  // If dev mock expense or dev trip
  if (isDevMockExpense(expenseId) || isDevMockTrip(target?.tripId)) {
    const prevLen = expensesStore.length;
    expensesStore = expensesStore.filter((e) => e.id !== expenseId);
    const deleted = expensesStore.length < prevLen;
    if (deleted && target) {
      syncMockTripSpending(target.tripId);
      notify();
    }
    return deleted;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('You must be logged in to delete an expense.');
  }

  const { data, error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .select('id');

  if (error) {
    console.error(`[Voyaro Expenses] deleteExpense error for ${expenseId}:`, error.message);
    throw new Error(`Failed to delete expense: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return false;
  }

  expensesStore = expensesStore.filter((e) => e.id !== expenseId);
  notify();

  return true;
}

/**
 * Clear all expenses for a specific trip.
 */
export async function clearTripExpenses(tripId?: string): Promise<void> {
  const normalized = normalizeTripId(tripId);

  if (isDevMockTrip(normalized)) {
    expensesStore = expensesStore.filter((e) => e.tripId !== normalized);
    syncMockTripSpending(normalized);
    notify();
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to clear expenses.');
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('trip_id', normalized);

  if (error) {
    console.error(`[Voyaro Expenses] clearTripExpenses error for ${tripId}:`, error.message);
    throw new Error(`Failed to clear expenses: ${error.message}`);
  }

  expensesStore = expensesStore.filter((e) => e.tripId !== normalized);
  notify();
}

// ---------------------------------------------------------------------------
// 4. Trip Budget Operations (Persisted to trip_budgets table)
// ---------------------------------------------------------------------------

/**
 * Fetches a trip's budget from Supabase, updates in-memory cache, and returns it.
 */
export async function fetchTripBudget(tripId: string): Promise<TripBudget | null> {
  const normalized = normalizeTripId(tripId);

  if (isDevMockTrip(normalized)) {
    return getTripBudget(normalized) || null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return getTripBudget(normalized) || null;
  }

  const { data: row, error } = await supabase
    .from('trip_budgets')
    .select('*')
    .eq('trip_id', normalized)
    .maybeSingle();

  if (error) {
    console.error(`[Voyaro Expenses] fetchTripBudget error for ${tripId}:`, error.message);
    throw new Error(`Failed to load budget: ${error.message}`);
  }

  if (!row) {
    budgetsStore.delete(normalized);
    notify();
    return null;
  }

  const domainBudget = mapTripBudgetRowToDomain(row as TripBudgetRow);
  budgetsStore.set(normalized, domainBudget);
  notify();

  return domainBudget;
}

/**
 * Synchronously retrieves the cached budget for a specific trip.
 */
export function getTripBudget(tripId?: string): TripBudget | undefined {
  if (!tripId) return undefined;
  const normalized = normalizeTripId(tripId);
  return budgetsStore.get(normalized);
}

/**
 * Sets or updates a trip's budget in Supabase.
 * Strictly converts input major units into integer minor units (cents).
 */
export async function setTripBudget(
  tripId: string,
  amount: number | string,
  currency: CurrencyCode = 'USD'
): Promise<TripBudget> {
  const normalized = normalizeTripId(tripId);

  const minorUnits = toMinorUnits(amount, currency);

  if (minorUnits < 0 || isNaN(minorUnits)) {
    throw new Error('Trip budget amount must be a non-negative number.');
  }

  const isLikelyUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized);
  if (!isLikelyUuid && !tripExists(normalized)) {
    throw new Error(`Cannot set budget: Trip with ID "${tripId}" does not exist.`);
  }

  // If dev mock trip, save locally
  if (isDevMockTrip(normalized)) {
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

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('You must be logged in to set a trip budget.');
  }

  // Verify trip ownership / access via RLS
  const { data: tripRow, error: tripCheckError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', normalized)
    .maybeSingle();

  if (tripCheckError || !tripRow) {
    throw new Error('Cannot set budget: Trip does not exist or access is denied.');
  }

  const { data: row, error } = await supabase
    .from('trip_budgets')
    .upsert({
      trip_id: normalized,
      amount: minorUnits,
      currency,
    })
    .select()
    .single();

  if (error) {
    console.error(`[Voyaro Expenses] setTripBudget error for ${tripId}:`, error.message);
    throw new Error(`Failed to save trip budget: ${error.message}`);
  }

  const domainBudget = mapTripBudgetRowToDomain(row as TripBudgetRow);
  budgetsStore.set(normalized, domainBudget);
  notify();

  return domainBudget;
}

/**
 * Clears or deletes a trip's budget from Supabase.
 */
export async function clearTripBudget(tripId: string): Promise<boolean> {
  const normalized = normalizeTripId(tripId);

  if (isDevMockTrip(normalized)) {
    const existed = budgetsStore.delete(normalized);
    if (existed) {
      syncMockTripSpending(normalized);
      notify();
    }
    return existed;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('You must be logged in to clear a trip budget.');
  }

  const { error } = await supabase
    .from('trip_budgets')
    .delete()
    .eq('trip_id', normalized);

  if (error) {
    console.error(`[Voyaro Expenses] clearTripBudget error for ${tripId}:`, error.message);
    throw new Error(`Failed to clear trip budget: ${error.message}`);
  }

  budgetsStore.delete(normalized);
  notify();

  return true;
}

// ---------------------------------------------------------------------------
// 5. Dependent Totals & Summary Aggregations
// ---------------------------------------------------------------------------

/**
 * Computes live expense & budget summary for a given trip from cache.
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
 * Synchronize derived totals into MOCK_TRIPS to keep legacy cards in sync.
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
 * Reactive React hook that subscribes to all expenses and budget for a specific trip.
 * Automatically fetches from Supabase and re-renders screens upon mutations.
 */
export function useTripExpenses(tripId?: string) {
  useSyncExternalStore(subscribeToExpenses, getStoreRevision, getStoreRevision);

  const normalized = normalizeTripId(tripId);
  const [loading, setLoading] = useState<boolean>(!isDevMockTrip(tripId) && Boolean(tripId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      return;
    }
    let isMounted = true;
    Promise.all([
      fetchExpensesByTrip(tripId),
      fetchTripBudget(tripId),
    ])
      .then(() => {
        if (isMounted) {
          setError(null);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || 'Failed to load expenses.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [tripId]);

  const refresh = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchExpensesByTrip(tripId),
        fetchTripBudget(tripId),
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

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
    loading,
    error,
    refresh,
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
 */
export function useExpense(expenseId?: string) {
  useSyncExternalStore(subscribeToExpenses, getStoreRevision, getStoreRevision);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expenseId || getExpenseById(expenseId) || isDevMockExpense(expenseId)) {
      return;
    }
    let isMounted = true;
    fetchExpenseById(expenseId)
      .then(() => {
        if (isMounted) {
          setError(null);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || 'Failed to load expense details.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [expenseId]);

  const refresh = useCallback(async () => {
    if (!expenseId || isDevMockExpense(expenseId)) return;
    setLoading(true);
    setError(null);
    try {
      await fetchExpenseById(expenseId);
    } catch (err: any) {
      setError(err.message || 'Failed to load expense details.');
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  const expense = expenseId ? getExpenseById(expenseId) : undefined;

  return {
    expense,
    exists: Boolean(expense),
    loading,
    error,
    refresh,
    update: (changes: UpdateExpenseInput) =>
      expenseId ? updateExpense(expenseId, changes) : undefined,
    remove: () => (expenseId ? deleteExpense(expenseId) : false),
  };
}

/**
 * Reactive React hook that subscribes to the entire global expense list.
 */
export function useAllExpenses() {
  useSyncExternalStore(subscribeToExpenses, getStoreRevision, getStoreRevision);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const allExpenses = getAllExpenses();

  return {
    expenses: allExpenses,
    totalCount: allExpenses.length,
    isEmpty: allExpenses.length === 0,
    loading,
    error,
    addExpense,
    deleteExpense,
  };
}

// ---------------------------------------------------------------------------
// 7. Default Service Object Export
// ---------------------------------------------------------------------------

export const expenseStore = {
  fetchExpensesByTrip,
  getExpensesByTrip,
  fetchExpenseById,
  getExpenseById,
  getAllExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  fetchTripBudget,
  setTripBudget,
  clearTripBudget,
  getTripBudget,
  getTripExpenseSummary,
  clearTripExpenses,
  resetExpenseSeedData,
  clearExpenseCache,
  subscribe: subscribeToExpenses,
  useTripExpenses,
  useExpense,
  useAllExpenses,
};

export default expenseStore;
