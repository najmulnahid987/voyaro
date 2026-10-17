/**
 * Voyaro Trip Persistence Service (Phase 7 — Step 7)
 *
 * Replaces the in-memory mock data with Supabase-backed trip operations.
 *
 * Guarantees:
 *  - Trip owner is always derived from the authenticated Supabase session (`auth.uid()`)
 *  - Never trusts client-supplied owner IDs
 *  - All operations respect Row Level Security (RLS) policies
 *  - Prevents accessing another user's trip by guessing its ID
 *  - Cascade deletion respects foreign keys on child records (itinerary, expenses, budgets)
 *  - Reactive listeners for live UI updates across Home and Trips tabs
 */

import { supabase } from './supabase';
import { Trip, TripSpending, Traveler } from './mockData';
import { TripRow, TripBudgetRow } from '@/types/database.types';
import { mapTripRowToDomain, mapTripToInsert, mapTripToUpdate } from './mappers';
import { CurrencyCode } from '@/types/expense';
import { toMajorUnits, toMinorUnits, getCurrencyConfig } from '@/utils/currencyUtils';
import {
  listTripMembers,
  fetchUserTripRole,
  subscribeToTripCollaboration,
  getTripShareUrl,
} from './collaboration';

export { getTripShareUrl };

// ---------------------------------------------------------------------------
// 1. Types & Interfaces
// ---------------------------------------------------------------------------

export interface CreateTripInput {
  title: string;
  destination: string;
  cities?: string[];
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  travelerCount?: number;
  status?: Trip['status'];
  category?: Trip['category'];
  coverImage?: string;
  budgetAmount?: number;
  budgetCurrency?: CurrencyCode;
}

export interface UpdateTripInput {
  title?: string;
  destination?: string;
  cities?: string[];
  startDate?: string;
  endDate?: string;
  travelerCount?: number;
  status?: Trip['status'];
  category?: Trip['category'];
  coverImage?: string;
  budgetAmount?: number;
  budgetCurrency?: CurrencyCode;
}

// ---------------------------------------------------------------------------
// 2. In-Memory Cache & Reactive Listeners
// ---------------------------------------------------------------------------

let cachedTrips: Trip[] | null = null;
let currentActiveTripId: string | null = null;

type TripsListener = (trips: Trip[]) => void;
type ActiveTripListener = (tripId: string | null) => void;

const listeners = new Set<TripsListener>();
const activeTripListeners = new Set<ActiveTripListener>();
const inFlightTripPromises = new Map<string, Promise<Trip | null>>();

function notifyListeners() {
  const current = cachedTrips ? [...cachedTrips] : [];
  listeners.forEach((listener) => {
    try {
      listener(current);
    } catch (err) {
      console.warn('[Voyaro Trips] Listener notification error:', err);
    }
  });
}

function notifyActiveTripListeners() {
  activeTripListeners.forEach((listener) => {
    try {
      listener(currentActiveTripId);
    } catch (err) {
      console.warn('[Voyaro Trips] Active trip listener error:', err);
    }
  });
}

export function subscribeToTrips(listener: TripsListener): () => void {
  listeners.add(listener);
  if (cachedTrips) {
    try {
      listener([...cachedTrips]);
    } catch (e) {
      console.warn('[Voyaro Trips] Initial listener dispatch error:', e);
    }
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getCachedTrips(): Trip[] | null {
  return cachedTrips ? [...cachedTrips] : null;
}

export function setActiveTripId(tripId: string | null): void {
  if (currentActiveTripId !== tripId) {
    currentActiveTripId = tripId;
    notifyActiveTripListeners();
  }
}

export function getActiveTripId(): string | null {
  return currentActiveTripId;
}

export function subscribeToActiveTrip(listener: ActiveTripListener): () => void {
  activeTripListeners.add(listener);
  try {
    listener(currentActiveTripId);
  } catch (err) {
    console.warn('[Voyaro Trips] Initial active trip listener error:', err);
  }
  return () => {
    activeTripListeners.delete(listener);
  };
}

export function clearTripsCache(): void {
  cachedTrips = null;
  currentActiveTripId = null;
  inFlightTripPromises.clear();
  notifyListeners();
  notifyActiveTripListeners();
}

// ---------------------------------------------------------------------------
// 3. Helper: Map Row + Joined Budget to Domain Trip
// ---------------------------------------------------------------------------

// Auto-subscribe to collaboration changes so trip cache stays fresh
subscribeToTripCollaboration(() => {
  listTrips().catch((err) => {
    console.warn('[Voyaro Trips] Collaboration auto-refresh error:', err);
  });
});

function buildDomainTrip(
  row: TripRow,
  budgets?: TripBudgetRow[] | TripBudgetRow | null,
  options?: {
    travelers?: Traveler[];
    userRole?: 'owner' | 'editor' | 'viewer';
    currentUserId?: string;
  }
): Trip {
  let budgetRow: TripBudgetRow | null = null;
  if (Array.isArray(budgets) && budgets.length > 0) {
    budgetRow = budgets[0];
  } else if (budgets && !Array.isArray(budgets)) {
    budgetRow = budgets;
  }

  let spending: TripSpending | undefined = undefined;
  if (budgetRow) {
    const amountNum = Number(budgetRow.amount);
    const curr = (budgetRow.currency || 'USD') as CurrencyCode;
    const major = toMajorUnits(amountNum, curr);
    const symbol = getCurrencyConfig(curr).symbol;

    spending = {
      spent: 0,
      budget: major,
      currency: symbol,
      percentUsed: 0,
      spentFormatted: '0',
      budgetFormatted: major.toLocaleString(),
      remainingFormatted: major.toLocaleString(),
      isOverBudget: false,
    };
  }

  const isOwner = options?.currentUserId
    ? row.user_id === options.currentUserId
    : options?.userRole === 'owner';
  const role = options?.userRole || (isOwner ? 'owner' : 'viewer');

  return mapTripRowToDomain(row, {
    spending,
    travelers: options?.travelers,
    userRole: role,
    isOwner,
  });
}

// ---------------------------------------------------------------------------
// 4. Core Supabase Operations
// ---------------------------------------------------------------------------

/**
 * Lists all trips owned by or shared with the currently authenticated user.
 * Returns an empty array if the user has no trips or is unauthenticated.
 */
export async function listTrips(): Promise<Trip[]> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    cachedTrips = null;
    notifyListeners();
    return [];
  }

  const { data: rows, error } = await supabase
    .from('trips')
    .select('*, trip_budgets(*)')
    .order('start_date', { ascending: true });

  if (error) {
    console.error('[Voyaro Trips] Failed to list trips:', error.message);
    throw new Error(`Failed to load trips: ${error.message}`);
  }

  // Fetch current user's role on all visible trips
  const { data: memberRoles } = await supabase
    .from('trip_members')
    .select('trip_id, role')
    .eq('user_id', user.id);

  const roleMap = new Map<string, 'owner' | 'editor' | 'viewer'>();
  (memberRoles || []).forEach((m: any) => roleMap.set(m.trip_id, m.role));

  const trips = (rows || []).map((r: any) =>
    buildDomainTrip(r, r.trip_budgets, {
      userRole: roleMap.get(r.id) || (r.user_id === user.id ? 'owner' : 'viewer'),
      currentUserId: user.id,
    })
  );

  cachedTrips = trips;
  notifyListeners();
  return trips;
}

/**
 * Fetches a single trip by its UUID, including member travelers and current user role.
 * Respects RLS: returns null if the trip doesn't exist or user lacks membership.
 * Deduplicates in-flight concurrent requests so sibling and parent screens sharing a route
 * do not trigger redundant simultaneous Supabase queries.
 */
export async function fetchTripById(tripId: string): Promise<Trip | null> {
  if (!tripId || typeof tripId !== 'string' || !tripId.trim()) {
    return null;
  }

  const cleanTripId = tripId.trim();
  const existingInFlight = inFlightTripPromises.get(cleanTripId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const fetchPromise = (async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        return null;
      }

      const { data: row, error } = await supabase
        .from('trips')
        .select('*, trip_budgets(*)')
        .eq('id', cleanTripId)
        .maybeSingle();

      if (error) {
        // 22P02 is postgres error code for invalid input syntax (e.g. invalid UUID format)
        if ((error as any).code === '22P02') {
          return null;
        }
        console.warn(`[Voyaro Trips] Error fetching trip ${cleanTripId}:`, error.message);
        throw new Error(`Unable to fetch trip: ${error.message}`);
      }

      if (!row) {
        return null;
      }

      // Fetch active travelers and current user's role
      let travelers: Traveler[] = [];
      let userRole: 'owner' | 'editor' | 'viewer' | null = null;
      try {
        const [fetchedTravelers, fetchedRole] = await Promise.all([
          listTripMembers(cleanTripId),
          fetchUserTripRole(cleanTripId),
        ]);
        travelers = fetchedTravelers;
        userRole = fetchedRole;
      } catch (collabErr) {
        console.warn('[Voyaro Trips] Collaboration metadata notice:', collabErr);
      }

      return buildDomainTrip(row as TripRow, (row as any).trip_budgets, {
        travelers,
        userRole: userRole || (row.user_id === user.id ? 'owner' : 'viewer'),
        currentUserId: user.id,
      });
    } finally {
      inFlightTripPromises.delete(cleanTripId);
    }
  })();

  inFlightTripPromises.set(cleanTripId, fetchPromise);
  return fetchPromise;
}

/**
 * Creates a new trip owned by the authenticated user.
 * Guarantees ownership: always uses auth.uid() from Supabase session.
 */
export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be logged in to create a trip.');
  }

  // 1. Prepare and insert trip row
  const insertPayload = mapTripToInsert(
    {
      title: input.title.trim(),
      destination: input.destination.trim(),
      cities: input.cities && input.cities.length > 0 ? input.cities : [input.destination.trim()],
      startDate: input.startDate,
      endDate: input.endDate,
      travelerCount: input.travelerCount ?? 1,
      status: input.status ?? 'upcoming',
      category: input.category,
      coverImage: input.coverImage,
    },
    user.id
  );

  const { data: createdRow, error: insertError } = await supabase
    .from('trips')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    console.error('[Voyaro Trips] Create trip failed:', insertError.message);
    throw new Error(`Failed to create trip: ${insertError.message}`);
  }

  // 2. Insert budget record if specified
  let createdBudget: TripBudgetRow | null = null;
  if (input.budgetAmount !== undefined && input.budgetAmount > 0) {
    const budgetCurrency = input.budgetCurrency || 'USD';
    const { data: bRow, error: budgetError } = await supabase
      .from('trip_budgets')
      .insert({
        trip_id: createdRow.id,
        amount: toMinorUnits(input.budgetAmount, budgetCurrency),
        currency: budgetCurrency,
      })
      .select()
      .maybeSingle();

    if (budgetError) {
      console.warn('[Voyaro Trips] Optional budget insert notice:', budgetError.message);
    } else {
      createdBudget = bRow;
    }
  }

  const domainTrip = buildDomainTrip(createdRow as TripRow, createdBudget);

  // 3. Update cache & notify listeners
  if (cachedTrips) {
    cachedTrips = [domainTrip, ...cachedTrips];
  } else {
    cachedTrips = [domainTrip];
  }
  notifyListeners();

  return domainTrip;
}

/**
 * Updates an existing trip owned by the authenticated user.
 * RLS ensures users can only update their own trips.
 */
export async function updateTrip(tripId: string, updates: UpdateTripInput): Promise<Trip> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be logged in to update a trip.');
  }

  const updatePayload = mapTripToUpdate({
    title: updates.title?.trim(),
    destination: updates.destination?.trim(),
    cities: updates.cities,
    startDate: updates.startDate,
    endDate: updates.endDate,
    travelerCount: updates.travelerCount,
    status: updates.status,
    category: updates.category,
    coverImage: updates.coverImage,
  });

  const { data: updatedRow, error: updateError } = await supabase
    .from('trips')
    .update(updatePayload)
    .eq('id', tripId)
    .select()
    .single();

  if (updateError) {
    console.error(`[Voyaro Trips] Update trip ${tripId} failed:`, updateError.message);
    throw new Error(`Failed to update trip: ${updateError.message}`);
  }

  // Handle budget update if provided
  let updatedBudget: TripBudgetRow | null = null;
  if (updates.budgetAmount !== undefined) {
    const currency = updates.budgetCurrency || 'USD';
    const { data: bRow, error: bError } = await supabase
      .from('trip_budgets')
      .upsert({
        trip_id: tripId,
        amount: toMinorUnits(updates.budgetAmount, currency),
        currency,
      })
      .select()
      .maybeSingle();

    if (!bError) {
      updatedBudget = bRow;
    }
  } else {
    // Fetch existing budget if not modified
    const { data: existingB } = await supabase
      .from('trip_budgets')
      .select('*')
      .eq('trip_id', tripId)
      .maybeSingle();
    updatedBudget = existingB;
  }

  const domainTrip = buildDomainTrip(updatedRow as TripRow, updatedBudget);

  // Update cache & notify listeners
  if (cachedTrips) {
    cachedTrips = cachedTrips.map((t) => (t.id === tripId ? domainTrip : t));
    notifyListeners();
  }

  return domainTrip;
}

/**
 * Deletes a trip owned by the authenticated user.
 * Cascade deletion automatically cleans up child itinerary items, expenses, and budgets.
 */
export async function deleteTrip(tripId: string): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be logged in to delete a trip.');
  }

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId);

  if (error) {
    console.error(`[Voyaro Trips] Delete trip ${tripId} failed:`, error.message);
    throw new Error(`Failed to delete trip: ${error.message}`);
  }

  // Remove from cache & notify listeners
  if (cachedTrips) {
    cachedTrips = cachedTrips.filter((t) => t.id !== tripId);
    notifyListeners();
  }
}
