/**
 * Voyaro Design System & Core Domain — Itinerary Types (Phase 5)
 *
 * Defines the complete, extensible TypeScript data model for itinerary and
 * reservation management across Flights, Hotels, Activities, and Transportation.
 *
 * Built with discriminated unions and generics for type-safe metadata access.
 */

// ---------------------------------------------------------------------------
// 1. Core Itinerary Item Types
// ---------------------------------------------------------------------------

/**
 * The 4 core supported reservation and itinerary categories in Phase 5.
 */
export type ItineraryItemType = 'flight' | 'hotel' | 'activity' | 'transportation';

/**
 * Supported sub-modes for ground/water/rail transportation.
 */
export type TransportationType =
  | 'train'
  | 'rental_car'
  | 'flight_transfer'
  | 'ferry'
  | 'bus'
  | 'subway'
  | 'taxi'
  | 'private_transfer'
  | 'other';

// ---------------------------------------------------------------------------
// 2. Type-Specific Metadata Models
// ---------------------------------------------------------------------------

/**
 * Flight-specific metadata model.
 * Captures route codes, flight numbers, airline names, and seating/gate details.
 */
export interface FlightMetadata {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  terminal?: string;
  gate?: string;
  seat?: string;
  departureCity?: string;
  arrivalCity?: string;
  boardingTime?: string;
  aircraft?: string;
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
  baggageAllowance?: string;
}

/**
 * Hotel-specific metadata model.
 * Captures lodging properties, check-in / check-out times, and room details.
 */
export interface HotelMetadata {
  hotelName: string;
  address: string;
  checkIn: string;
  checkOut: string;
  room?: string;
  guestName?: string;
  roomType?: string;
  phone?: string;
  amenities?: string[];
  nightsCount?: number;
}

/**
 * Activity-specific metadata model.
 * Captures sightseeing, tours, dining, tickets, and scheduled entertainment.
 */
export interface ActivityMetadata {
  category?: string;
  website?: string;
  ticketInformation?: string;
  duration?: string;
  meetingPoint?: string;
  guideName?: string;
  attire?: string;
  cost?: string;
}

/**
 * Transportation-specific metadata model.
 * Captures rail, rental cars, ferries, buses, and transfers.
 */
export interface TransportationMetadata {
  transportationType: TransportationType;
  from: string;
  to: string;
  bookingNumber?: string;
  seat?: string;
  provider?: string;
  platform?: string;
  carModel?: string;
  pickupTime?: string;
  dropoffTime?: string;
}

/**
 * Union of all type-specific metadata interfaces.
 */
export type AnyItineraryMetadata =
  | FlightMetadata
  | HotelMetadata
  | ActivityMetadata
  | TransportationMetadata;

// ---------------------------------------------------------------------------
// 3. Generic Base Itinerary Item
// ---------------------------------------------------------------------------

/**
 * Generic ItineraryItem data structure.
 *
 * Every item in the itinerary adheres to this shape, with type-safe metadata
 * parameterized by T.
 */
export interface ItineraryItem<T = AnyItineraryMetadata> {
  id: string;
  tripId: string;
  type: ItineraryItemType;
  title: string;
  startDateTime: string; // ISO 8601 string (e.g. '2028-03-10T20:30:00.000Z')
  endDateTime?: string;   // ISO 8601 string
  location?: string;
  notes?: string;
  confirmationNumber?: string;
  metadata: T;
}

// ---------------------------------------------------------------------------
// 4. Strongly-Typed Specialized Items (Discriminated Unions)
// ---------------------------------------------------------------------------

export interface FlightItineraryItem extends ItineraryItem<FlightMetadata> {
  type: 'flight';
}

export interface HotelItineraryItem extends ItineraryItem<HotelMetadata> {
  type: 'hotel';
}

export interface ActivityItineraryItem extends ItineraryItem<ActivityMetadata> {
  type: 'activity';
}

export interface TransportationItineraryItem extends ItineraryItem<TransportationMetadata> {
  type: 'transportation';
}

/**
 * Complete discriminated union of all concrete itinerary items.
 */
export type ConcreteItineraryItem =
  | FlightItineraryItem
  | HotelItineraryItem
  | ActivityItineraryItem
  | TransportationItineraryItem;

// ---------------------------------------------------------------------------
// 5. Type Guards
// ---------------------------------------------------------------------------

export function isFlightItem(item: ItineraryItem<any>): item is FlightItineraryItem {
  return item.type === 'flight';
}

export function isHotelItem(item: ItineraryItem<any>): item is HotelItineraryItem {
  return item.type === 'hotel';
}

export function isActivityItem(item: ItineraryItem<any>): item is ActivityItineraryItem {
  return item.type === 'activity';
}

export function isTransportationItem(item: ItineraryItem<any>): item is TransportationItineraryItem {
  return item.type === 'transportation';
}

// ---------------------------------------------------------------------------
// 6. Day Grouping & Filter Types (Easy to Extend in Later Stages)
// ---------------------------------------------------------------------------

/**
 * Represents a chronological group of itinerary items for a specific date.
 */
export interface ItineraryDayGroup {
  date: string;         // 'YYYY-MM-DD'
  dayNumber: number;    // 1-indexed relative to trip start (Day 1, Day 2, etc.)
  dayLabel: string;     // e.g. 'Day 1 · March 10'
  shortDate: string;    // e.g. 'Mar 10'
  dayOfWeek: string;    // e.g. 'Mon'
  items: ConcreteItineraryItem[];
}

/**
 * Filter options for the timeline view.
 */
export type ItineraryFilter = 'all' | ItineraryItemType;

/**
 * Input payload when creating a new itinerary item (id generated by store).
 */
export type CreateItineraryItemInput<T = AnyItineraryMetadata> = Omit<
  ItineraryItem<T>,
  'id'
>;

/**
 * Input payload when updating an existing itinerary item.
 */
export type UpdateItineraryItemInput<T = AnyItineraryMetadata> = Partial<
  Omit<ItineraryItem<T>, 'id' | 'tripId' | 'type'>
> & {
  metadata?: Partial<T>;
};
