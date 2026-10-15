/**
 * Voyaro Database <-> Domain Mapping Layer (Phase 7 — Step 4)
 *
 * Provides bidirectional, type-safe conversions between Supabase database rows
 * (PostgreSQL snake_case schemas) and application UI/domain models (camelCase).
 *
 * Preserves strict boundaries between:
 *  - Database Row types (read from Supabase)
 *  - Database Insert / Update types (sent to Supabase)
 *  - Existing Domain & UI models (consumed by React Native components & stores)
 */

import {
  ProfileRow,
  ProfileUpdate,
  TripRow,
  TripInsert,
  TripUpdate,
  ItineraryItemRow,
  ItineraryItemInsert,
  ItineraryItemUpdate,
  ExpenseRow,
  ExpenseInsert,
  ExpenseUpdate,
  TripBudgetRow,
  TripBudgetInsert,
  TripBudgetUpdate,
  TripMemberRow,
  TripInvitationRow,
  TripInvitationInsert,
  Json,
} from '@/types/database.types';
import {
  ItineraryItem as DomainItineraryItem,
  ItineraryItemType,
  AnyItineraryMetadata,
  ConcreteItineraryItem,
  TransportationType,
  FlightMetadata,
  HotelMetadata,
  ActivityMetadata,
  TransportationMetadata,
} from '@/types/itinerary';
import {
  Expense,
  ExpenseCategory,
  CurrencyCode,
  CreateExpenseInput,
  TripBudget,
} from '@/types/expense';
import { Trip, TripSpending, Traveler, ItineraryItem as MockItineraryItem } from './mockData';
import { User } from './auth';


// ---------------------------------------------------------------------------
// 1. Profile Mappers
// ---------------------------------------------------------------------------

export interface DomainProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  travelStyle?: string;
  interests: string[];
  travelPace?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapProfileRowToDomain(row: ProfileRow): DomainProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    travelStyle: row.travel_style ?? undefined,
    interests: row.interests ?? [],
    travelPace: row.travel_pace ?? undefined,
    onboardingCompleted: row.onboarding_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProfileRowToUser(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
  };
}

export function mapUserToProfileUpdate(user: Partial<User>): ProfileUpdate {
  const update: ProfileUpdate = {};
  if (user.name !== undefined) update.display_name = user.name;
  if (user.avatarUrl !== undefined) update.avatar_url = user.avatarUrl ?? null;
  return update;
}

// ---------------------------------------------------------------------------
// 2. Trip Mappers
// ---------------------------------------------------------------------------

function formatTripDateRange(startDateStr: string, endDateStr: string): string {
  try {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return `${startDateStr} - ${endDateStr}`;
    }
    const startMonth = monthNames[start.getUTCMonth()];
    const endMonth = monthNames[end.getUTCMonth()];
    if (startMonth === endMonth && start.getUTCFullYear() === end.getUTCFullYear()) {
      return `${startMonth} ${start.getUTCDate()} - ${end.getUTCDate()}, ${start.getUTCFullYear()}`;
    }
    return `${startMonth} ${start.getUTCDate()} - ${endMonth} ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  } catch {
    return `${startDateStr} - ${endDateStr}`;
  }
}

export function mapTripRowToDomain(
  row: TripRow,
  options?: {
    spending?: TripSpending;
    itinerary?: MockItineraryItem[];
    travelers?: Traveler[];
    userRole?: 'owner' | 'editor' | 'viewer';
    isOwner?: boolean;
  }
): Trip {
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    cities: row.cities ?? [],
    dates: formatTripDateRange(row.start_date, row.end_date),
    startDate: row.start_date,
    endDate: row.end_date,
    status: (row.status as Trip['status']) || 'upcoming',
    travelerCount: options?.travelers && options.travelers.length > 0 ? options.travelers.length : row.traveler_count,
    category: (row.category as Trip['category']) ?? undefined,
    coverImage: row.cover_image ?? undefined,
    itineraryCount: options?.itinerary?.length ?? 0,
    spending: options?.spending,
    itinerary: options?.itinerary,
    travelers: options?.travelers,
    userRole: options?.userRole,
    isOwner: options?.isOwner,
  };
}

export function mapTripToInsert(
  trip: {
    title: string;
    destination: string;
    cities?: string[];
    startDate: string;
    endDate: string;
    travelerCount?: number;
    status?: Trip['status'];
    category?: Trip['category'];
    coverImage?: string;
  },
  userId: string
): TripInsert {
  return {
    user_id: userId,
    title: trip.title,
    destination: trip.destination,
    cities: trip.cities && trip.cities.length > 0 ? trip.cities : [trip.destination],
    start_date: trip.startDate,
    end_date: trip.endDate,
    traveler_count: trip.travelerCount ?? 1,
    status: trip.status ?? 'upcoming',
    category: trip.category ?? null,
    cover_image: trip.coverImage ?? null,
  };
}

export function mapTripToUpdate(trip: Partial<Trip>): TripUpdate {
  const update: TripUpdate = {};
  if (trip.title !== undefined) update.title = trip.title;
  if (trip.destination !== undefined) update.destination = trip.destination;
  if (trip.cities !== undefined) update.cities = trip.cities;
  if (trip.startDate !== undefined) update.start_date = trip.startDate;
  if (trip.endDate !== undefined) update.end_date = trip.endDate;
  if (trip.travelerCount !== undefined) update.traveler_count = trip.travelerCount;
  if (trip.status !== undefined) update.status = trip.status;
  if (trip.category !== undefined) update.category = trip.category ?? null;
  if (trip.coverImage !== undefined) update.cover_image = trip.coverImage ?? null;
  return update;
}

// ---------------------------------------------------------------------------
// 3. Itinerary Item Mappers
// ---------------------------------------------------------------------------

/**
 * Validates, extracts, and normalizes JSON metadata for each specific item type,
 * guaranteeing no type-specific fields are silently dropped.
 */
export function validateAndNormalizeMetadata(
  type: ItineraryItemType,
  rawMeta: any
): AnyItineraryMetadata {
  const meta = typeof rawMeta === 'object' && rawMeta !== null ? rawMeta : {};

  switch (type) {
    case 'flight':
      return {
        airline: String(meta.airline || ''),
        flightNumber: String(meta.flightNumber || ''),
        departureAirport: String(meta.departureAirport || ''),
        arrivalAirport: String(meta.arrivalAirport || ''),
        terminal: meta.terminal ? String(meta.terminal) : undefined,
        gate: meta.gate ? String(meta.gate) : undefined,
        seat: meta.seat ? String(meta.seat) : undefined,
        departureCity: meta.departureCity ? String(meta.departureCity) : undefined,
        arrivalCity: meta.arrivalCity ? String(meta.arrivalCity) : undefined,
        boardingTime: meta.boardingTime ? String(meta.boardingTime) : undefined,
        aircraft: meta.aircraft ? String(meta.aircraft) : undefined,
        cabinClass: meta.cabinClass || 'economy',
        baggageAllowance: meta.baggageAllowance ? String(meta.baggageAllowance) : undefined,
      } as FlightMetadata;

    case 'hotel':
      return {
        hotelName: String(meta.hotelName || ''),
        address: String(meta.address || ''),
        checkIn: String(meta.checkIn || ''),
        checkOut: String(meta.checkOut || ''),
        room: meta.room ? String(meta.room) : undefined,
        guestName: meta.guestName ? String(meta.guestName) : undefined,
        roomType: meta.roomType ? String(meta.roomType) : undefined,
        phone: meta.phone ? String(meta.phone) : undefined,
        amenities: Array.isArray(meta.amenities) ? meta.amenities : undefined,
        nightsCount: typeof meta.nightsCount === 'number' ? meta.nightsCount : undefined,
      } as HotelMetadata;

    case 'activity':
      return {
        category: meta.category ? String(meta.category) : undefined,
        website: meta.website ? String(meta.website) : undefined,
        ticketInformation: meta.ticketInformation ? String(meta.ticketInformation) : undefined,
        duration: meta.duration ? String(meta.duration) : undefined,
        meetingPoint: meta.meetingPoint ? String(meta.meetingPoint) : undefined,
        guideName: meta.guideName ? String(meta.guideName) : undefined,
        attire: meta.attire ? String(meta.attire) : undefined,
        cost: meta.cost ? String(meta.cost) : undefined,
      } as ActivityMetadata;

    case 'transportation':
      return {
        transportationType: (meta.transportationType as TransportationType) || 'train',
        from: String(meta.from || ''),
        to: String(meta.to || ''),
        bookingNumber: meta.bookingNumber ? String(meta.bookingNumber) : undefined,
        seat: meta.seat ? String(meta.seat) : undefined,
        provider: meta.provider ? String(meta.provider) : undefined,
        platform: meta.platform ? String(meta.platform) : undefined,
        carModel: meta.carModel ? String(meta.carModel) : undefined,
        pickupTime: meta.pickupTime ? String(meta.pickupTime) : undefined,
        dropoffTime: meta.dropoffTime ? String(meta.dropoffTime) : undefined,
      } as TransportationMetadata;

    default:
      return meta as AnyItineraryMetadata;
  }
}

export function mapItineraryItemRowToDomain(row: ItineraryItemRow): ConcreteItineraryItem {
  const itemType = row.type as ItineraryItemType;
  return {
    id: row.id,
    tripId: row.trip_id,
    type: itemType,
    title: row.title,
    startDateTime: row.start_datetime,
    endDateTime: row.end_datetime ?? undefined,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    confirmationNumber: row.confirmation_number ?? undefined,
    latitude: typeof row.latitude === 'number' ? row.latitude : undefined,
    longitude: typeof row.longitude === 'number' ? row.longitude : undefined,
    endLatitude: typeof row.end_latitude === 'number' ? row.end_latitude : undefined,
    endLongitude: typeof row.end_longitude === 'number' ? row.end_longitude : undefined,
    metadata: validateAndNormalizeMetadata(itemType, row.metadata),
  } as ConcreteItineraryItem;
}

export function mapItineraryItemToInsert(
  item: Omit<DomainItineraryItem, 'id'> & { id?: string }
): ItineraryItemInsert {
  const normalizedMeta = validateAndNormalizeMetadata(item.type, item.metadata);
  const isValidUuid =
    item.id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id);

  return {
    ...(isValidUuid ? { id: item.id } : {}),
    trip_id: item.tripId,
    type: item.type,
    title: item.title.trim(),
    start_datetime: item.startDateTime,
    end_datetime: item.endDateTime ? item.endDateTime : null,
    location: item.location?.trim() || null,
    notes: item.notes?.trim() || null,
    confirmation_number: item.confirmationNumber?.trim() || null,
    latitude: typeof item.latitude === 'number' ? item.latitude : null,
    longitude: typeof item.longitude === 'number' ? item.longitude : null,
    end_latitude: typeof item.endLatitude === 'number' ? item.endLatitude : null,
    end_longitude: typeof item.endLongitude === 'number' ? item.endLongitude : null,
    metadata: normalizedMeta as unknown as Json,
  };
}

export function mapItineraryItemToUpdate(
  item: Partial<DomainItineraryItem>
): ItineraryItemUpdate {
  const update: ItineraryItemUpdate = {};
  if (item.title !== undefined) update.title = item.title.trim();
  if (item.type !== undefined) update.type = item.type;
  if (item.startDateTime !== undefined) update.start_datetime = item.startDateTime;
  if (item.endDateTime !== undefined) update.end_datetime = item.endDateTime ? item.endDateTime : null;
  if (item.location !== undefined) update.location = item.location?.trim() || null;
  if (item.notes !== undefined) update.notes = item.notes?.trim() || null;
  if (item.confirmationNumber !== undefined) update.confirmation_number = item.confirmationNumber?.trim() || null;
  if (item.latitude !== undefined) update.latitude = typeof item.latitude === 'number' ? item.latitude : null;
  if (item.longitude !== undefined) update.longitude = typeof item.longitude === 'number' ? item.longitude : null;
  if (item.endLatitude !== undefined) update.end_latitude = typeof item.endLatitude === 'number' ? item.endLatitude : null;
  if (item.endLongitude !== undefined) update.end_longitude = typeof item.endLongitude === 'number' ? item.endLongitude : null;
  if (item.metadata !== undefined && item.type) {
    update.metadata = validateAndNormalizeMetadata(item.type, item.metadata) as unknown as Json;
  } else if (item.metadata !== undefined) {
    update.metadata = item.metadata as unknown as Json;
  }
  return update;
}

// ---------------------------------------------------------------------------
// 4. Expense Mappers
// ---------------------------------------------------------------------------

export function mapExpenseRowToDomain(row: ExpenseRow): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    amount: Number(row.amount),
    currency: row.currency as CurrencyCode,
    category: row.category as ExpenseCategory,
    date: row.expense_date,
    paidBy: row.paid_by ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapExpenseInputToInsert(input: CreateExpenseInput): ExpenseInsert {
  return {
    trip_id: input.tripId,
    title: input.title,
    amount: Math.round(input.amount),
    currency: input.currency,
    category: input.category,
    expense_date: input.date.includes('T') ? input.date.split('T')[0] : input.date,
    paid_by: input.paidBy ?? null,
    notes: input.notes ?? null,
  };
}

export function mapExpenseToUpdate(
  input: Partial<CreateExpenseInput>
): ExpenseUpdate {
  const update: ExpenseUpdate = {};
  if (input.title !== undefined) update.title = input.title;
  if (input.amount !== undefined) update.amount = Math.round(input.amount);
  if (input.currency !== undefined) update.currency = input.currency;
  if (input.category !== undefined) update.category = input.category;
  if (input.date !== undefined) {
    update.expense_date = input.date.includes('T') ? input.date.split('T')[0] : input.date;
  }
  if (input.paidBy !== undefined) update.paid_by = input.paidBy ?? null;
  if (input.notes !== undefined) update.notes = input.notes ?? null;
  return update;
}

// ---------------------------------------------------------------------------
// 5. Trip Budget Mappers
// ---------------------------------------------------------------------------

export function mapTripBudgetRowToDomain(row: TripBudgetRow): TripBudget {
  return {
    tripId: row.trip_id,
    amount: Number(row.amount),
    currency: row.currency as CurrencyCode,
    updatedAt: row.updated_at,
  };
}

export function mapTripBudgetToInsert(
  tripId: string,
  amount: number,
  currency: CurrencyCode
): TripBudgetInsert {
  return {
    trip_id: tripId,
    amount: Math.round(amount),
    currency,
  };
}

export function mapTripBudgetToUpdate(
  amount?: number,
  currency?: CurrencyCode
): TripBudgetUpdate {
  const update: TripBudgetUpdate = {};
  if (amount !== undefined) update.amount = Math.round(amount);
  if (currency !== undefined) update.currency = currency;
  return update;
}

// ---------------------------------------------------------------------------
// 6. Collaboration Mappers (Trip Members & Invitations)
// ---------------------------------------------------------------------------

export interface DomainTripMember {
  id: string;
  tripId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface DomainTripInvitation {
  id: string;
  tripId: string;
  inviterId: string;
  inviteeEmail: string;
  role: 'editor' | 'viewer';
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'canceled' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptedBy?: string;
}

export function mapTripMemberToTraveler(
  member: TripMemberRow,
  profile?: ProfileRow | null,
  currentUserId?: string
): Traveler {
  const isCurrent = currentUserId ? member.user_id === currentUserId : false;
  const name = profile?.display_name || (isCurrent ? 'You' : 'Traveler');
  return {
    id: member.user_id,
    name,
    email: profile?.email ?? undefined,
    avatarUrl: profile?.avatar_url ?? undefined,
    role: member.role,
    isCurrentUser: isCurrent,
  };
}

export function mapTripInvitationRowToDomain(
  row: TripInvitationRow
): DomainTripInvitation {
  return {
    id: row.id,
    tripId: row.trip_id,
    inviterId: row.inviter_id,
    inviteeEmail: row.invitee_email,
    role: row.role,
    token: row.token,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at ?? undefined,
    acceptedBy: row.accepted_by ?? undefined,
  };
}

export function mapTripInvitationToInsert(
  tripId: string,
  inviterId: string,
  inviteeEmail: string,
  role: 'editor' | 'viewer' = 'editor'
): TripInvitationInsert {
  return {
    trip_id: tripId,
    inviter_id: inviterId,
    invitee_email: inviteeEmail.trim().toLowerCase(),
    role,
    status: 'pending',
  };
}

