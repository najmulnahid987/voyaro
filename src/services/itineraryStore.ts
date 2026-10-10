/**
 * Voyaro Centralized In-Memory Itinerary State Layer (Phase 5)
 *
 * Requirements:
 *  - In-memory only (app session lifecycle).
 *  - No persistence, no AsyncStorage, no backend, no Supabase.
 *  - Fully reactive across React Native screens using standard React subscriptions.
 *  - Clean API interface ready to be substituted with Supabase in future phases.
 *
 * Core Operations:
 *  - getItems(tripId)
 *  - getItem(itemId)
 *  - addItem(item)
 *  - updateItem(itemId, changes)
 *  - deleteItem(itemId)
 *  - clearItems(tripId)
 */

import { useSyncExternalStore } from 'react';
import {
  ConcreteItineraryItem,
  CreateItineraryItemInput,
  ItineraryItem,
  UpdateItineraryItemInput,
} from '@/types/itinerary';
import { sortItineraryItems } from '../utils/itineraryDateUtils';

// ---------------------------------------------------------------------------
// 1. Initial Multi-Date Realistic Seed Data for Demo Trip
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
    metadata: {
      category: 'Hiking & Cultural Experience',
      ticketInformation: 'Free admission / Self-guided',
      duration: '2.5 hours',
      meetingPoint: 'Fushimi Inari Main Torii Gate',
    },
  },
];

// ---------------------------------------------------------------------------
// 2. In-Memory Store & Subscription Mechanism
// ---------------------------------------------------------------------------

let itemsStore: ConcreteItineraryItem[] = [...INITIAL_SEED_ITEMS];

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('Itinerary store listener error:', e);
    }
  });
}

/**
 * Normalize trip ID so 'demo-trip' maps to 'japan-adventure' seamlessly
 */
function normalizeTripId(tripId?: string): string {
  if (!tripId || tripId === 'demo-trip') {
    return 'japan-adventure';
  }
  return tripId;
}

// ---------------------------------------------------------------------------
// 3. Required Core Operations
// ---------------------------------------------------------------------------

/**
 * Retrieve all itinerary items for a specific trip, sorted chronologically.
 */
export function getItems(tripId?: string): ConcreteItineraryItem[] {
  const normalized = normalizeTripId(tripId);
  return sortItineraryItems(itemsStore.filter((item) => item.tripId === normalized));
}

/**
 * Retrieve a single itinerary item by its ID.
 */
export function getItem(itemId: string): ConcreteItineraryItem | undefined {
  return itemsStore.find((item) => item.id === itemId);
}

/**
 * Add a new itinerary item to the in-memory store.
 * Immediately notifies all reactive subscribers.
 */
export function addItem(
  item: CreateItineraryItemInput | ConcreteItineraryItem
): ConcreteItineraryItem {
  const newItem: ConcreteItineraryItem = {
    id: (item as ConcreteItineraryItem).id || `itin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    tripId: normalizeTripId(item.tripId),
    type: item.type,
    title: item.title,
    startDateTime: item.startDateTime,
    endDateTime: item.endDateTime,
    location: item.location,
    notes: item.notes,
    confirmationNumber: item.confirmationNumber,
    metadata: { ...(item.metadata as any) },
  } as ConcreteItineraryItem;

  itemsStore = [...itemsStore, newItem];
  notify();
  return newItem;
}

/**
 * Update an existing itinerary item by ID.
 * Merges top-level fields and nested metadata.
 * Immediately notifies all reactive subscribers.
 */
export function updateItem(
  itemId: string,
  changes: UpdateItineraryItemInput
): ConcreteItineraryItem | undefined {
  const index = itemsStore.findIndex((item) => item.id === itemId);
  if (index === -1) {
    return undefined;
  }

  const existing = itemsStore[index];
  const updated: ConcreteItineraryItem = {
    ...existing,
    ...changes,
    id: existing.id,
    tripId: existing.tripId,
    type: existing.type,
    metadata: {
      ...(existing.metadata as any),
      ...(changes.metadata as any),
    },
  } as ConcreteItineraryItem;

  itemsStore = [
    ...itemsStore.slice(0, index),
    updated,
    ...itemsStore.slice(index + 1),
  ];

  notify();
  return updated;
}

/**
 * Delete an itinerary item by ID.
 * Immediately notifies all reactive subscribers.
 */
export function deleteItem(itemId: string): boolean {
  const previousLength = itemsStore.length;
  itemsStore = itemsStore.filter((item) => item.id !== itemId);
  const deleted = itemsStore.length < previousLength;

  if (deleted) {
    notify();
  }
  return deleted;
}

/**
 * Clear all itinerary items for a specific trip.
 * Immediately notifies all reactive subscribers.
 */
export function clearItems(tripId?: string): void {
  const normalized = normalizeTripId(tripId);
  itemsStore = itemsStore.filter((item) => item.tripId !== normalized);
  notify();
}

/**
 * Reset store to the initial seed items (useful for testing and debug).
 */
export function resetSeedItems(): void {
  itemsStore = [...INITIAL_SEED_ITEMS];
  notify();
}

/**
 * Subscribe to store mutations.
 */
export function subscribeToItinerary(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get snapshot of full store
 */
export function getStoreSnapshot(): ConcreteItineraryItem[] {
  return itemsStore;
}

// ---------------------------------------------------------------------------
// 4. React Hooks for Effortless Component Reactivity
// ---------------------------------------------------------------------------

/**
 * Reactive React hook that subscribes to the itinerary state of a given trip.
 * Re-renders automatically whenever items are added, updated, or deleted.
 */
export function useItinerary(tripId?: string) {
  const allItems = useSyncExternalStore(
    subscribeToItinerary,
    getStoreSnapshot,
    getStoreSnapshot
  );

  const normalized = normalizeTripId(tripId);
  const items = sortItineraryItems(
    allItems.filter((item) => item.tripId === normalized)
  );

  return {
    items,
    itemCount: items.length,
    isEmpty: items.length === 0,
    getItems: () => getItems(tripId),
    getItem,
    addItem,
    updateItem,
    deleteItem,
    clearItems: () => clearItems(tripId),
  };
}

/**
 * Reactive React hook that subscribes to a specific itinerary item by ID.
 * Re-renders automatically when that item is modified or deleted.
 */
export function useItineraryItem(itemId?: string) {
  const allItems = useSyncExternalStore(
    subscribeToItinerary,
    getStoreSnapshot,
    getStoreSnapshot
  );

  const item = itemId ? allItems.find((i) => i.id === itemId) : undefined;

  return {
    item,
    exists: Boolean(item),
    update: (changes: UpdateItineraryItemInput) =>
      itemId ? updateItem(itemId, changes) : undefined,
    remove: () => (itemId ? deleteItem(itemId) : false),
  };
}

// ---------------------------------------------------------------------------
// 5. Default Service Object Export
// ---------------------------------------------------------------------------

export const itineraryStore = {
  getItems,
  getItem,
  addItem,
  updateItem,
  deleteItem,
  clearItems,
  resetSeedItems,
  subscribe: subscribeToItinerary,
  useItinerary,
  useItineraryItem,
};

export default itineraryStore;
