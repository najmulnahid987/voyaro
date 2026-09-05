/**
 * Voyaro Local Mock Data Layer (Phase 4)
 *
 * Lightweight, typed local mock dataset for Home, Trips, Create Trip, and Trip Overview.
 * Designed to be centralized and reusable across the app without duplication.
 */

// ---------------------------------------------------------------------------
// 1. User & Traveler Types
// ---------------------------------------------------------------------------
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Traveler {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role?: 'owner' | 'editor' | 'viewer';
  isCurrentUser?: boolean;
}

// ---------------------------------------------------------------------------
// 2. Itinerary Item Types
// ---------------------------------------------------------------------------
export type ItineraryItemType =
  | 'flight'
  | 'hotel'
  | 'activity'
  | 'transportation'
  | 'transport'
  | 'dining';

export interface ItineraryItem {
  id: string;
  tripId: string;
  type: ItineraryItemType;
  title: string;
  subtitle: string;
  timeLabel: string;
  time: string;
  isToday?: boolean;
  airline?: string;
  flightNumber?: string;
  route?: string;
  terminal?: string;
  gate?: string;
  seat?: string;
  location?: string;
  confirmationCode?: string;
  notes?: string;
}

// Backward compatibility alias for earlier Phase 4 screens
export type ItineraryEvent = ItineraryItem;

// ---------------------------------------------------------------------------
// 3. Trip Spending Types
// ---------------------------------------------------------------------------
export interface TripSpending {
  spent: number;
  budget: number;
  currency: string;
  percentUsed?: number;
  spentFormatted: string;
  budgetFormatted: string;
  remainingFormatted?: string;
  isOverBudget?: boolean;
}

// ---------------------------------------------------------------------------
// 4. Trip Type
// ---------------------------------------------------------------------------
export interface Trip {
  id: string;
  title: string;
  destination: string;
  cities: string[];
  dates: string;
  startDate: string;
  endDate: string;
  durationDays?: number;
  status: 'ongoing' | 'upcoming' | 'past' | 'current';
  statusBadgeLabel?: string;
  travelerCount: number;
  travelers?: Traveler[];
  itineraryCount: number;
  coverImage?: string;
  category?: 'flight' | 'landscape' | 'beach' | 'city';
  nextEvent?: {
    type: 'flight' | 'hotel' | 'activity';
    title: string;
    route: string;
    time: string;
    label: string;
    airline?: string;
    flightNumber?: string;
    gate?: string;
    terminal?: string;
    seat?: string;
  };
  spending?: TripSpending;
  itinerary?: ItineraryItem[];
  events?: ItineraryItem[];
}

export interface HomeDashboardData {
  user: {
    name: string;
    avatarUrl?: string;
  };
  currentTrip: Trip;
  comingUpEvents: ItineraryItem[];
  pastTrips: Trip[];
}

// ---------------------------------------------------------------------------
// 5. Mock Users & Travelers
// ---------------------------------------------------------------------------
export const MOCK_USER: User = {
  id: 'usr-alex',
  name: 'Alex',
  email: 'alex.traveler@voyaro.app',
};

export const MOCK_TRAVELERS: Traveler[] = [
  {
    id: 'trv-alex',
    name: 'Alex',
    email: 'alex.traveler@voyaro.app',
    role: 'owner',
    isCurrentUser: true,
  },
  {
    id: 'trv-sarah',
    name: 'Sarah',
    email: 'sarah@voyaro.app',
    role: 'editor',
  },
  {
    id: 'trv-john',
    name: 'John',
    email: 'john@voyaro.app',
    role: 'viewer',
  },
  {
    id: 'trv-mike',
    name: 'Mike',
    email: 'mike@voyaro.app',
    role: 'viewer',
  },
];

// ---------------------------------------------------------------------------
// 6. Mock Itinerary Items (Flight, Hotel, Activities, Transportation, Dining)
// ---------------------------------------------------------------------------
export const MOCK_ITINERARY_ITEMS: ItineraryItem[] = [
  {
    id: 'event-flight-tokyo',
    tripId: 'japan-adventure',
    type: 'flight',
    title: 'Flight to Tokyo (NRT)',
    subtitle: 'DAC to NRT · Emirates EK585',
    timeLabel: 'TODAY, 8:30 PM',
    time: '20:30',
    isToday: true,
    airline: 'Emirates',
    flightNumber: 'EK585',
    route: 'DAC to NRT',
    gate: '12',
    terminal: '1',
    seat: '14A',
    confirmationCode: 'EK-982134',
    location: 'Hazrat Shahjalal Int. (DAC) → Narita Int. (NRT)',
  },
  {
    id: 'event-hotel-ritz',
    tripId: 'japan-adventure',
    type: 'hotel',
    title: 'The Ritz-Carlton, Kyoto',
    subtitle: 'Check-in · 3:00 PM',
    timeLabel: 'TOMORROW, 3:00 PM',
    time: '15:00',
    location: 'Kyoto, Japan',
    confirmationCode: 'RC-KYOTO-4891',
    notes: 'River view suite requested with traditional garden breakfast.',
  },
  {
    id: 'event-breakfast',
    tripId: 'japan-adventure',
    type: 'dining',
    title: 'Breakfast at Hotel',
    subtitle: 'Kyoto Dining · 8:00 AM',
    timeLabel: 'MAR 11, 8:00 AM',
    time: '08:00',
    location: 'The Ritz-Carlton Dining Hall',
  },
  {
    id: 'event-shibuya',
    tripId: 'japan-adventure',
    type: 'activity',
    title: 'Shibuya Crossing & Hachiko',
    subtitle: 'Sightseeing · 10:30 AM',
    timeLabel: 'MAR 11, 10:30 AM',
    time: '10:30',
    location: 'Shibuya, Tokyo, Japan',
    notes: 'Meet local guide at the famous Hachiko statue.',
  },
  {
    id: 'event-shinkansen',
    tripId: 'japan-adventure',
    type: 'transportation',
    title: 'Shinkansen Bullet Train (Nozomi)',
    subtitle: 'Tokyo to Kyoto · 1:15 PM',
    timeLabel: 'MAR 12, 1:15 PM',
    time: '13:15',
    location: 'Tokyo Station Platform 14',
    seat: 'Car 5, Seat 12E (Mt. Fuji view side)',
  },
];

// ---------------------------------------------------------------------------
// 7. Mock Trips Dataset
// ---------------------------------------------------------------------------
export const MOCK_TRIPS: Trip[] = [
  {
    id: 'japan-adventure',
    title: 'Japan Adventure',
    destination: 'Tokyo · Kyoto · Osaka',
    cities: ['Tokyo', 'Kyoto', 'Osaka'],
    dates: 'Mar 10 - 20',
    startDate: '2028-03-10',
    endDate: '2028-03-20',
    durationDays: 12,
    status: 'ongoing',
    statusBadgeLabel: 'ONGOING',
    travelerCount: 4,
    travelers: MOCK_TRAVELERS,
    itineraryCount: 15,
    category: 'flight',
    nextEvent: {
      type: 'flight',
      title: 'Flight',
      airline: 'Emirates',
      flightNumber: 'EK585',
      route: 'DAC to NRT',
      time: '20:30',
      label: 'NEXT EVENT',
      gate: '12',
      terminal: '1',
      seat: '14A',
    },
    spending: {
      spent: 1240.5,
      budget: 3000,
      currency: '$',
      percentUsed: 41,
      spentFormatted: '1,240.50',
      budgetFormatted: '3,000',
      remainingFormatted: '1,759.50',
      isOverBudget: false,
    },
    itinerary: MOCK_ITINERARY_ITEMS,
    events: MOCK_ITINERARY_ITEMS,
  },
  {
    id: 'paris-getaway',
    title: 'Paris Getaway',
    destination: 'Paris, France',
    cities: ['Paris'],
    dates: 'Oct 12 - 18, 2027',
    startDate: '2027-10-12',
    endDate: '2027-10-18',
    durationDays: 7,
    status: 'upcoming',
    travelerCount: 2,
    travelers: [MOCK_TRAVELERS[0], MOCK_TRAVELERS[1]],
    itineraryCount: 8,
    category: 'flight',
    spending: {
      spent: 0,
      budget: 3500,
      currency: '$',
      percentUsed: 0,
      spentFormatted: '0',
      budgetFormatted: '3,500',
      remainingFormatted: '3,500',
      isOverBudget: false,
    },
  },
  {
    id: 'swiss-alps',
    title: 'Swiss Alps',
    destination: 'Zermatt & Interlaken, Switzerland',
    cities: ['Zermatt', 'Interlaken'],
    dates: 'Jan 15 - 22, 2026',
    startDate: '2026-01-15',
    endDate: '2026-01-22',
    durationDays: 8,
    status: 'past',
    statusBadgeLabel: 'COMPLETED',
    travelerCount: 4,
    travelers: MOCK_TRAVELERS,
    itineraryCount: 12,
    category: 'landscape',
    spending: {
      spent: 2100,
      budget: 2000,
      currency: '$',
      percentUsed: 105,
      spentFormatted: '2,100',
      budgetFormatted: '2,000',
      remainingFormatted: '-100',
      isOverBudget: true,
    },
  },
  {
    id: 'thailand-escape',
    title: 'Thailand Escape',
    destination: 'Bangkok & Phuket, Thailand',
    cities: ['Bangkok', 'Phuket'],
    dates: 'NOV 2025',
    startDate: '2025-11-05',
    endDate: '2025-11-18',
    durationDays: 14,
    status: 'past',
    statusBadgeLabel: 'COMPLETED',
    travelerCount: 2,
    travelers: [MOCK_TRAVELERS[0], MOCK_TRAVELERS[1]],
    itineraryCount: 10,
    category: 'beach',
  },
  {
    id: 'singapore-weekend',
    title: 'Singapore Weekend',
    destination: 'Singapore',
    cities: ['Singapore'],
    dates: 'JUL 2025',
    startDate: '2025-07-18',
    endDate: '2025-07-22',
    durationDays: 5,
    status: 'past',
    statusBadgeLabel: 'COMPLETED',
    travelerCount: 1,
    travelers: [MOCK_TRAVELERS[0]],
    itineraryCount: 6,
    category: 'city',
  },
];

export const MOCK_CURRENT_TRIP = MOCK_TRIPS[0];
export const MOCK_COMING_UP_EVENTS = MOCK_ITINERARY_ITEMS.slice(0, 2);
export const MOCK_PAST_TRIPS = MOCK_TRIPS.filter((t) => t.status === 'past');

// ---------------------------------------------------------------------------
// 8. Reusable Query & Mutation Accessors
// ---------------------------------------------------------------------------

/**
 * Get current mock user
 */
export function getCurrentMockUser(): User {
  return MOCK_USER;
}

/**
 * Get aggregated data for the Home screen
 */
export function getHomeDashboardData(): HomeDashboardData {
  return {
    user: {
      name: MOCK_USER.name,
    },
    currentTrip: MOCK_CURRENT_TRIP,
    comingUpEvents: MOCK_COMING_UP_EVENTS,
    pastTrips: MOCK_PAST_TRIPS,
  };
}

/**
 * Get all trips
 */
export function getAllTrips(): Trip[] {
  return MOCK_TRIPS;
}

/**
 * Find trip by id
 */
export function getTripById(id: string): Trip | undefined {
  if (id === 'demo-trip' || id === 'japan-adventure') {
    return MOCK_CURRENT_TRIP;
  }
  return MOCK_TRIPS.find((t) => t.id === id) || MOCK_CURRENT_TRIP;
}

/**
 * Get travelers for a given trip
 */
export function getTripTravelers(tripId?: string): Traveler[] {
  const trip = tripId ? getTripById(tripId) : MOCK_CURRENT_TRIP;
  return trip?.travelers || MOCK_TRAVELERS;
}

/**
 * Get itinerary items for a given trip
 */
export function getTripItinerary(tripId?: string): ItineraryItem[] {
  const trip = tripId ? getTripById(tripId) : MOCK_CURRENT_TRIP;
  return trip?.itinerary || MOCK_ITINERARY_ITEMS;
}

/**
 * Find itinerary item by id
 */
export function getItineraryItemById(itemId: string): ItineraryItem | undefined {
  return (
    MOCK_ITINERARY_ITEMS.find((item) => item.id === itemId) ||
    MOCK_ITINERARY_ITEMS[0]
  );
}

/**
 * Create a new mock trip
 */
export function createMockTrip(tripData: Partial<Trip>): Trip {
  const id = `trip-${Date.now()}`;
  const newTrip: Trip = {
    id,
    title: tripData.title || 'Untitled Trip',
    destination: tripData.destination || 'Destination',
    cities: tripData.cities || [tripData.destination || 'Destination'],
    dates: tripData.dates || 'Upcoming',
    startDate: tripData.startDate || new Date().toISOString().split('T')[0],
    endDate: tripData.endDate || new Date().toISOString().split('T')[0],
    durationDays: tripData.durationDays || 7,
    status: tripData.status || 'upcoming',
    travelerCount: tripData.travelerCount ?? 2,
    travelers: tripData.travelers || [MOCK_TRAVELERS[0], MOCK_TRAVELERS[1]],
    itineraryCount: tripData.itineraryCount ?? 0,
    spending: tripData.spending || {
      spent: 0,
      budget: 2000,
      currency: '$',
      percentUsed: 0,
      spentFormatted: '0',
      budgetFormatted: '2,000',
      remainingFormatted: '2,000',
      isOverBudget: false,
    },
    itinerary: [],
    events: [],
    ...tripData,
  };

  MOCK_TRIPS.unshift(newTrip);
  return newTrip;
}
