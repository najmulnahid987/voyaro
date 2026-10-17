/**
 * Voyaro Itinerary Persistence & State Layer (Phase 7 — Step 8)
 *
 * Connects the itinerary feature to Supabase while preserving reactive subscriptions
 * for all React Native screens.
 *
 * Guarantees:
 *  - Supabase-backed persistent storage for Flights, Hotels, Activities, and Transportation.
 *  - Strict type-safe metadata normalization so no fields are dropped.
 *  - Timezone-safe start and end datetime ordering checks.
 *  - RLS enforcement: only the trip owner can read or write itinerary items.
 *  - Detail screens and timeline reactively re-render upon mutations.
 *  - Safe cache cleanup on logout.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import {
  ConcreteItineraryItem,
  CreateItineraryItemInput,
  ItineraryItem,
  UpdateItineraryItemInput,
} from '@/types/itinerary';
import { sortItineraryItems } from '../utils/itineraryDateUtils';
import {
  mapItineraryItemRowToDomain,
  mapItineraryItemToInsert,
  mapItineraryItemToUpdate,
  validateAndNormalizeMetadata,
} from './mappers';
import { ItineraryItemRow } from '@/types/database.types';

// ---------------------------------------------------------------------------
// 1. Initial Seed Items (Development / Demo Routes Only)
// ---------------------------------------------------------------------------

const INITIAL_SEED_ITEMS: ConcreteItineraryItem[] = [
  // 1 Flight (March 10)
  {
    id: 'itin-flight-1',
    tripId: 'japan-adventure',
    type: 'flight',
    title: 'Flight to Tokyo (NRT)',
    startDateTime: '2028-03-10T20:30:00.000Z',
    endDateTime: '2028-03-11T11:15:00.000Z',
    location: 'Hazrat Shahjalal Int. (DAC) → Narita Int. (NRT)',
    notes: 'Window seats requested. Checked baggage allowance included (23kg).',
    confirmationNumber: 'EK-982134',
    latitude: 23.8433,
    longitude: 90.3978,
    endLatitude: 35.7720,
    endLongitude: 140.3929,
    metadata: {
      airline: 'Emirates',
      flightNumber: 'EK585',
      departureAirport: 'DAC',
      arrivalAirport: 'NRT',
      terminal: '1',
      gate: '12',
      seat: '14A',
      departureCity: 'Dhaka',
      arrivalCity: 'Tokyo',
      cabinClass: 'economy',
    },
  },
  // 1 Hotel (March 11 - 14)
  {
    id: 'itin-hotel-1',
    tripId: 'japan-adventure',
    type: 'hotel',
    title: 'The Ritz-Carlton, Kyoto',
    startDateTime: '2028-03-11T15:00:00.000Z',
    endDateTime: '2028-03-14T11:00:00.000Z',
    location: 'Kamogawa Nijo-Ohashi Hotori, Nakagyo Ward, Kyoto',
    notes: 'River view suite requested with traditional Japanese garden breakfast.',
    confirmationNumber: 'RC-KYOTO-4891',
    latitude: 35.0116,
    longitude: 135.7681,
    metadata: {
      hotelName: 'The Ritz-Carlton, Kyoto',
      address: 'Kamogawa Nijo-Ohashi Hotori, Nakagyo Ward, Kyoto, 604-0902',
      checkIn: '3:00 PM',
      checkOut: '11:00 AM',
      room: 'Suite 408',
      guestName: 'Alex & Sarah',
      roomType: 'Deluxe Kamogawa Suite',
      nightsCount: 3,
    },
  },
  // Activity 1 (March 11)
  {
    id: 'itin-act-1',
    tripId: 'japan-adventure',
    type: 'activity',
    title: 'Shibuya Crossing & Hachiko Walking Tour',
    startDateTime: '2028-03-11T10:30:00.000Z',
    endDateTime: '2028-03-11T12:30:00.000Z',
    location: 'Shibuya, Tokyo',
    notes: 'Meet local guide near Hachiko Statue exit. Wear walking shoes.',
    confirmationNumber: 'TK-ACT-7712',
    latitude: 35.6595,
    longitude: 139.7004,
    metadata: {
      category: 'Sightseeing & Walking Tour',
      website: 'https://tokyowalkingtours.jp',
      ticketInformation: 'Mobile QR Voucher (2 Adults)',
      duration: '2 hours',
      meetingPoint: 'Hachiko Statue (Shibuya Station Exit 8)',
      guideName: 'Kenji Sato',
    },
  },
  // Transportation 1 (March 12)
  {
    id: 'itin-trans-1',
    tripId: 'japan-adventure',
    type: 'transportation',
    title: 'Shinkansen Bullet Train (Nozomi #225)',
    startDateTime: '2028-03-12T13:15:00.000Z',
    endDateTime: '2028-03-12T15:30:00.000Z',
    location: 'Tokyo Station → Kyoto Station',
    notes: 'Reserved seats on the right side for Mount Fuji scenic view.',
    confirmationNumber: 'JR-NOZOMI-5542',
    latitude: 35.6812,
    longitude: 139.7671,
    endLatitude: 34.9858,
    endLongitude: 135.7588,
    metadata: {
      transportationType: 'train',
      from: 'Tokyo Station (Platform 14)',
      to: 'Kyoto Station',
      bookingNumber: 'JR-NOZOMI-5542',
      seat: 'Car 5, Seat 12E & 12D',
      provider: 'JR Central (Tokaido Shinkansen)',
      platform: 'Platform 14',
    },
  },
  // Activity 2 (March 12)
  {
    id: 'itin-act-2',
    tripId: 'japan-adventure',
    type: 'activity',
    title: 'Fushimi Inari Sunset Shrine Hike',
    startDateTime: '2028-03-12T16:30:00.000Z',
    endDateTime: '2028-03-12T19:00:00.000Z',
    location: 'Fushimi Ward, Kyoto',
    notes: 'Sunset trek through the thousands of vermilion torii gates.',
    confirmationNumber: 'KY-ACT-3021',
    latitude: 34.9671,
    longitude: 135.7727,
    metadata: {
      category: 'Hiking & Cultural Experience',
      ticketInformation: 'Free admission / Self-guided',
      duration: '2.5 hours',
      meetingPoint: 'Fushimi Inari Main Torii Gate',
    },
  },
];

// ---------------------------------------------------------------------------
// 2. In-Memory Cache & Subscription Mechanism
// ---------------------------------------------------------------------------

let itemsStore: ConcreteItineraryItem[] = __DEV__ ? [...INITIAL_SEED_ITEMS] : [];

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('[Voyaro Itinerary] Store listener error:', e);
    }
  });
}

function isDevMockTrip(tripId?: string): boolean {
  return Boolean(__DEV__ && (tripId === 'japan-adventure' || tripId === 'demo-trip'));
}

function normalizeTripId(tripId?: string): string {
  if (!tripId) return '';
  if (tripId === 'demo-trip') return 'japan-adventure';
  return tripId;
}

export function subscribeToItinerary(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStoreSnapshot(): ConcreteItineraryItem[] {
  return itemsStore;
}

export function clearItineraryCache(): void {
  itemsStore = __DEV__ ? [...INITIAL_SEED_ITEMS] : [];
  notify();
}

// ---------------------------------------------------------------------------
// 3. Core Supabase Operations
// ---------------------------------------------------------------------------

/**
 * Lists all itinerary items for a trip from Supabase, ordered chronologically.
 */
export async function listItineraryItems(tripId?: string): Promise<ConcreteItineraryItem[]> {
  const normalized = normalizeTripId(tripId);
  if (!normalized) return [];

  // If this is a development mock trip and we are in dev mode, return local seed data
  if (isDevMockTrip(tripId)) {
    return sortItineraryItems(itemsStore.filter((i) => i.tripId === normalized));
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data: rows, error } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', normalized)
    .order('start_datetime', { ascending: true });

  if (error) {
    console.error(`[Voyaro Itinerary] listItineraryItems error for trip ${tripId}:`, error.message);
    throw new Error(`Failed to load itinerary: ${error.message}`);
  }

  const domainItems = (rows || []).map((r) => mapItineraryItemRowToDomain(r as ItineraryItemRow));

  // Merge into in-memory store for this trip
  itemsStore = [
    ...itemsStore.filter((item) => item.tripId !== normalized),
    ...domainItems,
  ];
  notify();

  return domainItems;
}

/**
 * Fetches a single itinerary item by its UUID from Supabase.
 */
export async function fetchItineraryItemById(itemId: string): Promise<ConcreteItineraryItem | null> {
  // Check dev seed items if in dev mode
  if (__DEV__ && itemId.startsWith('itin-')) {
    const seed = INITIAL_SEED_ITEMS.find((i) => i.id === itemId);
    if (seed) return seed;
  }

  const { data: row, error } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  if (error) {
    console.error(`[Voyaro Itinerary] fetchItineraryItemById error for ${itemId}:`, error.message);
    throw new Error(`Failed to load itinerary item: ${error.message}`);
  }

  if (!row) {
    return null;
  }

  const domainItem = mapItineraryItemRowToDomain(row as ItineraryItemRow);

  // Update in-memory store
  const index = itemsStore.findIndex((i) => i.id === itemId);
  if (index >= 0) {
    itemsStore[index] = domainItem;
  } else {
    itemsStore.push(domainItem);
  }
  notify();

  return domainItem;
}

/**
 * Creates and persists a new itinerary item in Supabase.
 */
export async function addItem(
  item: CreateItineraryItemInput | ConcreteItineraryItem
): Promise<ConcreteItineraryItem> {
  // 1. Validation
  if (!item.title?.trim()) {
    throw new Error('Title is required for an itinerary item.');
  }
  if (!item.tripId) {
    throw new Error('Trip ID is required.');
  }
  if (!item.type) {
    throw new Error('Item type is required.');
  }
  if (!item.startDateTime) {
    throw new Error('Start date and time is required.');
  }

  // 2. Validate datetime ordering
  if (item.endDateTime) {
    const start = new Date(item.startDateTime).getTime();
    const end = new Date(item.endDateTime).getTime();
    if (!isNaN(start) && !isNaN(end) && end < start) {
      throw new Error('End date and time cannot be earlier than departure/start date.');
    }
  }

  const normalizedTripId = normalizeTripId(item.tripId);
  if (!normalizedTripId) {
    throw new Error('Cannot add itinerary item: Trip ID is required.');
  }

  // If this is a dev route, insert into local seed items
  if (isDevMockTrip(normalizedTripId)) {
    const newItem: ConcreteItineraryItem = {
      id: (item as ConcreteItineraryItem).id || `itin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tripId: normalizedTripId,
      type: item.type,
      title: item.title.trim(),
      startDateTime: item.startDateTime,
      endDateTime: item.endDateTime || undefined,
      location: item.location?.trim() || undefined,
      notes: item.notes?.trim() || undefined,
      confirmationNumber: item.confirmationNumber?.trim() || undefined,
      latitude: typeof item.latitude === 'number' ? item.latitude : undefined,
      longitude: typeof item.longitude === 'number' ? item.longitude : undefined,
      endLatitude: typeof item.endLatitude === 'number' ? item.endLatitude : undefined,
      endLongitude: typeof item.endLongitude === 'number' ? item.endLongitude : undefined,
      metadata: validateAndNormalizeMetadata(item.type, item.metadata),
    } as ConcreteItineraryItem;

    itemsStore = [...itemsStore, newItem];
    notify();
    return newItem;
  }

  // 3. Supabase insert
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('You must be logged in to add an itinerary item.');
  }

  const insertPayload = mapItineraryItemToInsert({
    ...item,
    tripId: normalizedTripId,
    title: item.title.trim(),
  } as any);

  const { data: row, error } = await supabase
    .from('itinerary_items')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('[Voyaro Itinerary] addItem error:', error.message);
    throw new Error(`Failed to save itinerary item: ${error.message}`);
  }

  const domainItem = mapItineraryItemRowToDomain(row as ItineraryItemRow);

  // 4. Update local cache and notify subscribers
  itemsStore = [...itemsStore.filter((i) => i.id !== domainItem.id), domainItem];
  notify();

  return domainItem;
}

/**
 * Updates an existing itinerary item in Supabase.
 */
export async function updateItem(
  itemId: string,
  changes: UpdateItineraryItemInput
): Promise<ConcreteItineraryItem> {
  const existing = getItem(itemId);

  // 1. Validate date ordering if updating dates
  const newStart = changes.startDateTime || existing?.startDateTime;
  const newEnd = changes.endDateTime !== undefined ? changes.endDateTime : existing?.endDateTime;
  if (newStart && newEnd) {
    const start = new Date(newStart).getTime();
    const end = new Date(newEnd).getTime();
    if (!isNaN(start) && !isNaN(end) && end < start) {
      throw new Error('End date and time cannot be earlier than start date.');
    }
  }

  // If this is a dev mock item, update in local cache
  if (__DEV__ && itemId.startsWith('itin-')) {
    if (!existing) throw new Error('Item not found.');
    const updated: ConcreteItineraryItem = {
      ...existing,
      ...changes,
      id: existing.id,
      tripId: existing.tripId,
      type: existing.type,
      latitude: changes.latitude === null ? undefined : (changes.latitude !== undefined ? changes.latitude : existing.latitude),
      longitude: changes.longitude === null ? undefined : (changes.longitude !== undefined ? changes.longitude : existing.longitude),
      endLatitude: changes.endLatitude === null ? undefined : (changes.endLatitude !== undefined ? changes.endLatitude : existing.endLatitude),
      endLongitude: changes.endLongitude === null ? undefined : (changes.endLongitude !== undefined ? changes.endLongitude : existing.endLongitude),
      metadata: validateAndNormalizeMetadata(existing.type, {
        ...(existing.metadata as any),
        ...(changes.metadata as any),
      }),
    } as ConcreteItineraryItem;

    itemsStore = itemsStore.map((i) => (i.id === itemId ? updated : i));
    notify();
    return updated;
  }

  // 2. Prepare payload with merged metadata
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('You must be logged in to update an itinerary item.');
  }

  const itemType = (changes as any).type || existing?.type || 'activity';
  const mergedMetadata = validateAndNormalizeMetadata(itemType, {
    ...(existing?.metadata || {}),
    ...(changes.metadata || {}),
  });

  const updatePayload = mapItineraryItemToUpdate({
    ...changes,
    type: itemType,
    metadata: mergedMetadata as any,
  });

  const { data: row, error } = await supabase
    .from('itinerary_items')
    .update(updatePayload)
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error(`[Voyaro Itinerary] updateItem error for ${itemId}:`, error.message);
    throw new Error(`Failed to update itinerary item: ${error.message}`);
  }

  const domainItem = mapItineraryItemRowToDomain(row as ItineraryItemRow);

  // 3. Update local cache and notify subscribers
  itemsStore = itemsStore.map((i) => (i.id === itemId ? domainItem : i));
  notify();

  return domainItem;
}

/**
 * Deletes an itinerary item by ID from Supabase.
 */
export async function deleteItem(itemId: string): Promise<boolean> {
  // If dev mock item
  if (__DEV__ && itemId.startsWith('itin-')) {
    const prevLen = itemsStore.length;
    itemsStore = itemsStore.filter((i) => i.id !== itemId);
    const deleted = itemsStore.length < prevLen;
    if (deleted) notify();
    return deleted;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('You must be logged in to delete an itinerary item.');
  }

  const { data, error } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('id', itemId)
    .select('id');

  if (error) {
    console.error(`[Voyaro Itinerary] deleteItem error for ${itemId}:`, error.message);
    throw new Error(`Failed to delete itinerary item: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return false;
  }

  itemsStore = itemsStore.filter((i) => i.id !== itemId);
  notify();

  return true;
}

/**
 * Clear all itinerary items for a specific trip.
 */
export async function clearItems(tripId?: string): Promise<void> {
  const normalized = normalizeTripId(tripId);

  if (!isDevMockTrip(tripId)) {
    const { error } = await supabase
      .from('itinerary_items')
      .delete()
      .eq('trip_id', normalized);

    if (error) {
      console.error(`[Voyaro Itinerary] clearItems error for ${tripId}:`, error.message);
      throw new Error(`Failed to clear items: ${error.message}`);
    }
  }

  itemsStore = itemsStore.filter((item) => item.tripId !== normalized);
  notify();
}

/**
 * Synchronously retrieves cached itinerary items for a specific trip, sorted chronologically.
 */
export function getItems(tripId?: string): ConcreteItineraryItem[] {
  const normalized = normalizeTripId(tripId);
  if (!normalized) return [];
  return sortItineraryItems(itemsStore.filter((item) => item.tripId === normalized));
}

/**
 * Synchronously retrieves a single itinerary item by ID from cache.
 */
export function getItem(itemId: string): ConcreteItineraryItem | undefined {
  return itemsStore.find((item) => item.id === itemId);
}

/**
 * Reset store to the initial seed items (useful for testing and debug).
 */
export function resetSeedItems(): void {
  itemsStore = [...INITIAL_SEED_ITEMS];
  notify();
}

// ---------------------------------------------------------------------------
// 4. React Hooks for Reactive State Management
// ---------------------------------------------------------------------------

/**
 * Reactive React hook that queries and subscribes to the itinerary of a given trip.
 */
export function useItinerary(tripId?: string) {
  const allItems = useSyncExternalStore(
    subscribeToItinerary,
    getStoreSnapshot,
    getStoreSnapshot
  );

  const normalized = normalizeTripId(tripId);
  const [loading, setLoading] = useState<boolean>(Boolean(tripId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      return;
    }
    let isMounted = true;
    listItineraryItems(tripId)
      .then(() => {
        if (isMounted) {
          setError(null);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || 'Failed to load itinerary items.');
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
      await listItineraryItems(tripId);
    } catch (err: any) {
      setError(err.message || 'Failed to load itinerary items.');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  const items = sortItineraryItems(
    allItems.filter((item) => item.tripId === normalized)
  );

  return {
    items,
    itemCount: items.length,
    isEmpty: items.length === 0,
    loading,
    error,
    refresh,
    getItems: () => getItems(tripId),
    getItem,
    addItem,
    updateItem,
    deleteItem,
    clearItems: () => clearItems(tripId),
  };
}

/**
 * Reactive React hook that retrieves and subscribes to a specific itinerary item by ID.
 */
export function useItineraryItem(itemId?: string) {
  const allItems = useSyncExternalStore(
    subscribeToItinerary,
    getStoreSnapshot,
    getStoreSnapshot
  );

  const item = itemId ? allItems.find((i) => i.id === itemId) : undefined;
  const [loading, setLoading] = useState<boolean>(!item && Boolean(itemId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId || item) {
      return;
    }
    let isMounted = true;
    fetchItineraryItemById(itemId)
      .then(() => {
        if (isMounted) {
          setError(null);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || 'Failed to load itinerary item.');
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
  }, [itemId, item]);

  const refresh = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    try {
      await fetchItineraryItemById(itemId);
    } catch (err: any) {
      setError(err.message || 'Failed to load itinerary item.');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  return {
    item,
    exists: Boolean(item),
    loading,
    error,
    refresh,
    update: (changes: UpdateItineraryItemInput) =>
      itemId ? updateItem(itemId, changes) : Promise.reject(new Error('No itemId')),
    remove: () => (itemId ? deleteItem(itemId) : Promise.reject(new Error('No itemId'))),
  };
}

// ---------------------------------------------------------------------------
// 5. Default Service Object Export
// ---------------------------------------------------------------------------

export const itineraryStore = {
  listItineraryItems,
  fetchItineraryItemById,
  getItems,
  getItem,
  addItem,
  updateItem,
  deleteItem,
  clearItems,
  clearItineraryCache,
  resetSeedItems,
  subscribe: subscribeToItinerary,
  useItinerary,
  useItineraryItem,
};

export default itineraryStore;
