/**
 * Voyaro Mock Data Service (Phase 4)
 *
 * Local mock data layer for Home and Trips screens.
 * Designed to be easily replaced by real APIs / Supabase in future phases.
 */

export interface ItineraryEvent {
  id: string;
  tripId: string;
  type: 'flight' | 'hotel' | 'activity' | 'transport' | 'dining';
  title: string;
  subtitle: string;
  timeLabel: string;
  time: string;
  isToday?: boolean;
  airline?: string;
  flightNumber?: string;
  terminal?: string;
  location?: string;
}

export interface TripSpending {
  spent: number;
  budget: number;
  currency: string;
  percentUsed: number;
  spentFormatted: string;
  budgetFormatted: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  cities: string[];
  dates: string;
  startDate: string;
  endDate: string;
  status: 'current' | 'upcoming' | 'past';
  category: 'flight' | 'landscape' | 'beach' | 'city';
  nextEvent?: {
    type: 'flight' | 'hotel' | 'activity';
    title: string;
    route: string;
    time: string;
    label: string;
  };
  spending?: TripSpending;
  events?: ItineraryEvent[];
}

export interface HomeDashboardData {
  user: {
    name: string;
    avatarUrl?: string;
  };
  currentTrip: Trip;
  comingUpEvents: ItineraryEvent[];
  pastTrips: Trip[];
}

export const MOCK_CURRENT_TRIP: Trip = {
  id: 'japan-adventure',
  title: 'Japan Adventure',
  destination: 'Japan',
  cities: ['Tokyo', 'Kyoto', 'Osaka'],
  dates: 'Oct 12 - 26, 2028',
  startDate: '2028-10-12',
  endDate: '2028-10-26',
  status: 'current',
  category: 'flight',
  nextEvent: {
    type: 'flight',
    title: 'Flight',
    route: 'JFK to NRT',
    time: '14:30',
    label: 'NEXT EVENT',
  },
  spending: {
    spent: 1240.5,
    budget: 3000,
    currency: '$',
    percentUsed: 41,
    spentFormatted: '1,240.50',
    budgetFormatted: '3,000',
  },
};

export const MOCK_COMING_UP_EVENTS: ItineraryEvent[] = [
  {
    id: 'event-flight-tokyo',
    tripId: 'japan-adventure',
    type: 'flight',
    timeLabel: 'TODAY, 2:30 PM',
    title: 'Flight to Tokyo (NRT)',
    subtitle: 'Japan Airlines JL5 · Terminal 1',
    time: '14:30',
    isToday: true,
    airline: 'Japan Airlines',
    flightNumber: 'JL5',
    terminal: 'Terminal 1',
  },
  {
    id: 'event-hotel-ritz',
    tripId: 'japan-adventure',
    type: 'hotel',
    timeLabel: 'TOMORROW, 3:00 PM',
    title: 'Check-in: The Ritz-Carlton',
    subtitle: 'Kyoto, Japan',
    time: '15:00',
    location: 'Kyoto, Japan',
  },
];

export const MOCK_PAST_TRIPS: Trip[] = [
  {
    id: 'paris-getaway',
    title: 'Paris Getaway',
    destination: 'Paris, France',
    cities: ['Paris'],
    dates: 'OCT 2027',
    startDate: '2027-10-04',
    endDate: '2027-10-14',
    status: 'past',
    category: 'flight',
  },
  {
    id: 'swiss-alps',
    title: 'Swiss Alps',
    destination: 'Zermatt & Interlaken, Switzerland',
    cities: ['Zermatt', 'Interlaken'],
    dates: 'JAN 2026',
    startDate: '2026-01-10',
    endDate: '2026-01-20',
    status: 'past',
    category: 'landscape',
  },
  {
    id: 'thailand-escape',
    title: 'Thailand Escape',
    destination: 'Bangkok & Phuket, Thailand',
    cities: ['Bangkok', 'Phuket'],
    dates: 'NOV 2025',
    startDate: '2025-11-05',
    endDate: '2025-11-18',
    status: 'past',
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
    status: 'past',
    category: 'city',
  },
];

/**
 * Get aggregated data for the Home screen
 */
export function getHomeDashboardData(): HomeDashboardData {
  return {
    user: {
      name: 'Alex',
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
  return [MOCK_CURRENT_TRIP, ...MOCK_PAST_TRIPS];
}

/**
 * Find trip by id
 */
export function getTripById(id: string): Trip | undefined {
  if (id === 'demo-trip' || id === 'japan-adventure') {
    return MOCK_CURRENT_TRIP;
  }
  return MOCK_PAST_TRIPS.find((t) => t.id === id);
}
