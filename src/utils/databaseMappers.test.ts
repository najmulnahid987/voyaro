/**
 * Voyaro Database Types & Mappers Test Suite (Phase 7 — Step 4)
 *
 * Verifies:
 *  1. Database row models map correctly to application domain models
 *  2. Application domain inputs map correctly to database insert payloads
 *  3. Integer minor units for amounts are preserved
 *  4. Nullable database columns map cleanly to optional domain properties
 */

import {
  mapProfileRowToDomain,
  mapProfileRowToUser,
  mapTripRowToDomain,
  mapTripToInsert,
  mapItineraryItemRowToDomain,
  mapItineraryItemToInsert,
  mapExpenseRowToDomain,
  mapExpenseInputToInsert,
  mapTripBudgetRowToDomain,
  mapTripBudgetToInsert,
  mapTripMemberToTraveler,
  mapTripInvitationRowToDomain,
  mapTripInvitationToInsert,
} from '../services/mappers';
import {
  ProfileRow,
  TripRow,
  ItineraryItemRow,
  ExpenseRow,
  TripBudgetRow,
  TripMemberRow,
  TripInvitationRow,
} from '../types/database.types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runDatabaseMapperTests() {
  console.log('\n--- Running Voyaro Database Mapper Test Suite ---\n');

  // 1. Profile Mapping
  const mockProfileRow: ProfileRow = {
    id: '11111111-1111-1111-1111-111111111111',
    display_name: 'Elena Rostova',
    email: 'elena@voyaro.app',
    avatar_url: 'https://images.unsplash.com/photo-sample',
    travel_style: 'solo',
    interests: ['culture', 'food', 'nature'],
    travel_pace: 'balanced',
    onboarding_completed: true,
    created_at: '2028-01-01T00:00:00Z',
    updated_at: '2028-01-01T00:00:00Z',
  };

  const domainProfile = mapProfileRowToDomain(mockProfileRow);
  assert(domainProfile.id === mockProfileRow.id, 'Profile ID maps identically');
  assert(domainProfile.displayName === 'Elena Rostova', 'display_name maps to displayName');
  assert(domainProfile.interests.length === 3, 'interests array is preserved');
  assert(domainProfile.onboardingCompleted === true, 'onboarding_completed maps to boolean');

  const domainUser = mapProfileRowToUser(mockProfileRow);
  assert(domainUser.name === 'Elena Rostova', 'ProfileRow maps to User domain model');

  // 2. Trip Mapping
  const mockTripRow: TripRow = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    user_id: '11111111-1111-1111-1111-111111111111',
    title: 'Japanese Alps Odyssey',
    destination: 'Japan',
    cities: ['Tokyo', 'Kyoto', 'Takayama'],
    start_date: '2028-03-10',
    end_date: '2028-03-24',
    traveler_count: 2,
    status: 'upcoming',
    category: 'landscape',
    cover_image: 'https://example.com/tokyo.jpg',
    created_at: '2028-01-01T00:00:00Z',
    updated_at: '2028-01-01T00:00:00Z',
  };

  const domainTrip = mapTripRowToDomain(mockTripRow);
  assert(domainTrip.id === mockTripRow.id, 'Trip ID maps identically');
  assert(domainTrip.startDate === '2028-03-10', 'start_date maps to startDate');
  assert(domainTrip.travelerCount === 2, 'traveler_count maps to travelerCount');
  assert(domainTrip.cities.length === 3, 'cities array is preserved');

  const tripInsert = mapTripToInsert(
    {
      title: 'French Riviera Tour',
      destination: 'Nice',
      startDate: '2028-06-01',
      endDate: '2028-06-10',
      travelerCount: 2,
    },
    '11111111-1111-1111-1111-111111111111'
  );
  assert(tripInsert.user_id === '11111111-1111-1111-1111-111111111111', 'Insert includes owner user_id');
  assert(tripInsert.start_date === '2028-06-01', 'startDate maps to start_date');
  assert(Array.isArray(tripInsert.cities), 'cities default fallback works');

  // 3. Itinerary Item Mapping
  const mockItineraryRow: ItineraryItemRow = {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    trip_id: mockTripRow.id,
    type: 'flight',
    title: 'Flight NH801 Tokyo to Kyoto',
    start_datetime: '2028-03-10T14:30:00Z',
    end_datetime: '2028-03-10T16:00:00Z',
    location: 'Haneda Airport (HND)',
    notes: 'Terminal 2, Gate 64',
    confirmation_number: 'NH-99482',
    metadata: { airline: 'ANA', flightNumber: 'NH801' },
    created_at: '2028-01-01T00:00:00Z',
    updated_at: '2028-01-01T00:00:00Z',
    latitude: null,
    longitude: null,
    end_latitude: null,
    end_longitude: null,
  };

  const domainItem = mapItineraryItemRowToDomain(mockItineraryRow);
  assert(domainItem.tripId === mockTripRow.id, 'trip_id maps to tripId');
  assert(domainItem.startDateTime === '2028-03-10T14:30:00Z', 'start_datetime maps to startDateTime');
  assert((domainItem.metadata as any).airline === 'ANA', 'metadata JSON payload preserved');
  assert(domainItem.latitude === undefined, 'null latitude maps to undefined in domain model');
  assert(domainItem.longitude === undefined, 'null longitude maps to undefined in domain model');

  // Test with coordinates present
  const mockCoordRow: ItineraryItemRow = {
    ...mockItineraryRow,
    latitude: 35.6762,
    longitude: 139.6503,
    end_latitude: 35.0116,
    end_longitude: 135.7681,
  };
  const domainCoordItem = mapItineraryItemRowToDomain(mockCoordRow);
  assert(domainCoordItem.latitude === 35.6762, 'latitude maps to domain');
  assert(domainCoordItem.longitude === 139.6503, 'longitude maps to domain');
  assert(domainCoordItem.endLatitude === 35.0116, 'end_latitude maps to endLatitude');
  assert(domainCoordItem.endLongitude === 135.7681, 'end_longitude maps to endLongitude');

  const itemInsert = mapItineraryItemToInsert({
    tripId: mockTripRow.id,
    type: 'hotel',
    title: 'Park Hyatt Tokyo',
    startDateTime: '2028-03-10T15:00:00Z',
    metadata: { hotelName: 'Park Hyatt' } as any,
  });
  assert(itemInsert.trip_id === mockTripRow.id, 'tripId maps to trip_id in insert');
  assert(itemInsert.end_datetime === null, 'undefined endDateTime converts to null for Postgres');

  // 4. Expense Mapping
  const mockExpenseRow: ExpenseRow = {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    trip_id: mockTripRow.id,
    title: 'Sukiyabashi Jiro Omakase',
    amount: 45000,
    currency: 'USD',
    category: 'food_drinks',
    expense_date: '2028-03-12',
    paid_by: 'Alex',
    notes: 'Paid via Visa card',
    created_at: '2028-01-01T00:00:00Z',
    updated_at: '2028-01-01T00:00:00Z',
  };

  const domainExpense = mapExpenseRowToDomain(mockExpenseRow);
  assert(domainExpense.amount === 45000, 'Minor units integer amount preserved');
  assert(domainExpense.date === '2028-03-12', 'expense_date maps to date');
  assert(domainExpense.paidBy === 'Alex', 'paid_by maps to paidBy');

  const expenseInsert = mapExpenseInputToInsert({
    tripId: mockTripRow.id,
    title: 'Shinkansen Bullet Train',
    amount: 14200,
    currency: 'USD',
    category: 'transportation',
    date: '2028-03-15T09:00:00Z',
  });
  assert(expenseInsert.amount === 14200, 'amount minor units preserved');
  assert(expenseInsert.expense_date === '2028-03-15', 'ISO datetime normalized to YYYY-MM-DD');

  // 5. Trip Budget Mapping
  const mockBudgetRow: TripBudgetRow = {
    trip_id: mockTripRow.id,
    amount: 500000,
    currency: 'USD',
    updated_at: '2028-01-01T00:00:00Z',
  };

  const domainBudget = mapTripBudgetRowToDomain(mockBudgetRow);
  assert(domainBudget.tripId === mockTripRow.id, 'trip_id maps to tripId');
  assert(domainBudget.amount === 500000, 'budget amount preserved');

  const budgetInsert = mapTripBudgetToInsert(mockTripRow.id, 650000, 'USD');
  assert(budgetInsert.trip_id === mockTripRow.id, 'tripId maps to trip_id');
  assert(budgetInsert.amount === 650000, 'budget amount preserved in insert');

  // 6. Collaboration Mappers (Trip Members & Invitations)
  const mockMemberRow: TripMemberRow = {
    id: 'f87a8e7e-3401-4f9e-bc21-02685957bca1',
    trip_id: mockTripRow.id,
    user_id: 'user-editor-123',
    role: 'editor',
    created_at: '2028-01-01T00:00:00Z',
    updated_at: '2028-01-01T00:00:00Z',
  };

  const mockEditorProfile: ProfileRow = {
    id: 'user-editor-123',
    email: 'editor@voyaro.app',
    display_name: 'Sarah Connor',
    avatar_url: 'https://images.unsplash.com/photo-sarah',
    interests: ['culture', 'food'],
    travel_pace: 'moderate',
    travel_style: 'adventure',
    onboarding_completed: true,
    created_at: '2028-01-01T00:00:00Z',
    updated_at: '2028-01-01T00:00:00Z',
  };

  const domainTraveler = mapTripMemberToTraveler(mockMemberRow, mockEditorProfile, 'user-owner-999');
  assert(domainTraveler.id === 'user-editor-123', 'member user_id maps to traveler id');
  assert(domainTraveler.name === 'Sarah Connor', 'profile display_name maps to traveler name');
  assert(domainTraveler.email === 'editor@voyaro.app', 'profile email maps to traveler email');
  assert(domainTraveler.role === 'editor', 'role maps correctly to domain traveler');
  assert(domainTraveler.isCurrentUser === false, 'isCurrentUser correctly resolved to false');

  const selfTraveler = mapTripMemberToTraveler(mockMemberRow, mockEditorProfile, 'user-editor-123');
  assert(selfTraveler.isCurrentUser === true, 'isCurrentUser correctly resolved to true');

  const mockInviteRow: TripInvitationRow = {
    id: 'inv-123-uuid',
    trip_id: mockTripRow.id,
    inviter_id: 'user-owner-999',
    invitee_email: 'guest@example.com',
    role: 'viewer',
    token: 'token-abc-123-unique',
    status: 'pending',
    created_at: '2028-01-01T00:00:00Z',
    expires_at: '2028-01-08T00:00:00Z',
    accepted_at: null,
    accepted_by: null,
  };

  const domainInvite = mapTripInvitationRowToDomain(mockInviteRow);
  assert(domainInvite.id === 'inv-123-uuid', 'invitation id preserved');
  assert(domainInvite.inviteeEmail === 'guest@example.com', 'invitee_email mapped');
  assert(domainInvite.role === 'viewer', 'role mapped to viewer');
  assert(domainInvite.token === 'token-abc-123-unique', 'invitation token mapped');
  assert(domainInvite.status === 'pending', 'status mapped to pending');

  const inviteInsert = mapTripInvitationToInsert(
    mockTripRow.id,
    'user-owner-999',
    '  NEWUSER@EXAMPLE.COM  ',
    'editor'
  );
  assert(inviteInsert.trip_id === mockTripRow.id, 'trip_id mapped');
  assert(inviteInsert.inviter_id === 'user-owner-999', 'inviter_id mapped');
  assert(inviteInsert.invitee_email === 'newuser@example.com', 'email normalized and lowercased');
  assert(inviteInsert.role === 'editor', 'role mapped to editor');
  assert(inviteInsert.status === 'pending', 'status set to pending by default');

  console.log('\n--- All Database Mapper Tests Passed Successfully! ---\n');
  return true;
}
