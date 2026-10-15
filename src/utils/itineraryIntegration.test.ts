/**
 * Voyaro Itinerary Persistence Integration Test Suite (Phase 7 — Step 8)
 *
 * Verifies:
 *  1. Unauthenticated behavior: listItineraryItems returns empty array, mutations reject
 *  2. CRUD across all 4 types: Flight, Hotel, Activity, Transportation
 *  3. Metadata preservation: Zero loss of type-specific metadata fields in JSON column
 *  4. Date/Time semantics & Chronological ordering: Timestamp changes reflect in order
 *  5. Single-item retrieval by ID
 *  6. Multi-user isolation & RLS enforcement: User B cannot access/mutate User A's items
 *  7. Deletion & Persistence across cache clears (simulated restart)
 *  8. Cascade deletion when parent trip is removed
 */

import {
  listItineraryItems,
  fetchItineraryItemById,
  addItem,
  updateItem,
  deleteItem,
  clearItineraryCache,
  getItems,
} from '../services/itineraryStore';
import { createTrip, deleteTrip } from '../services/trip';
import { signup, login, logout, getAuthState } from '../services/auth';
import { supabase } from '../services/supabase';
import {
  FlightMetadata,
  HotelMetadata,
  ActivityMetadata,
  TransportationMetadata,
} from '../types/itinerary';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export async function runItineraryIntegrationTests(options?: {
  userAEmail?: string;
  userBEmail?: string;
  password?: string;
}) {
  console.log('\n======================================================');
  console.log('--- Running Voyaro Itinerary Persistence Integration Test ---');
  console.log('======================================================\n');

  // -------------------------------------------------------------------------
  // 1. Unauthenticated state tests
  // -------------------------------------------------------------------------
  console.log('1. Testing unauthenticated itinerary access...');
  await logout();
  clearItineraryCache();

  const unauthedItems = await listItineraryItems('00000000-0000-0000-0000-000000000000');
  assert(unauthedItems.length === 0, 'Unauthenticated listItineraryItems() returns empty array');

  let unauthedAddThrew = false;
  try {
    await addItem({
      tripId: '00000000-0000-0000-0000-000000000000',
      type: 'activity',
      title: 'Unauthenticated Activity',
      startDateTime: '2026-11-01T10:00:00.000Z',
      endDateTime: '2026-11-01T12:00:00.000Z',
      metadata: { category: 'Other' },
    });
  } catch (err: any) {
    unauthedAddThrew = true;
    assert(err.message.includes('logged in'), 'addItem rejects unauthenticated callers');
  }
  assert(unauthedAddThrew, 'addItem threw error when user is not logged in');

  // -------------------------------------------------------------------------
  // 2. Setup Authenticated Session for User A and Create Trip
  // -------------------------------------------------------------------------
  console.log('\n2. Setting up authenticated test session for User A...');
  const timestamp = Date.now();
  const userAEmail = options?.userAEmail || `itin_tester_a_${timestamp}@voyaro.test`;
  const userBEmail = options?.userBEmail || `itin_tester_b_${timestamp}@voyaro.test`;
  const testPassword = options?.password || 'VoyaroPassword123!';

  if (options?.userAEmail) {
    const loginRes = await login(userAEmail, testPassword);
    if (!loginRes.success) throw new Error(`User A login failed: ${loginRes.error}`);
  } else {
    await signup(userAEmail, testPassword, 'User A');
  }
  const userA = getAuthState().user;

  if (!userA) {
    console.warn('[Itinerary Test] User A session unavailable; skipping live database assertions.');
    return;
  }
  console.log(`✓ User A authenticated (${userA.id})`);

  const testTrip = await createTrip({
    title: 'Tokyo & Kyoto Grand Tour',
    destination: 'Japan',
    startDate: '2027-04-10',
    endDate: '2027-04-20',
    travelerCount: 2,
    budgetAmount: 5000,
    budgetCurrency: 'USD',
  });
  assert(Boolean(testTrip.id), `Parent trip created with ID: ${testTrip.id}`);

  // -------------------------------------------------------------------------
  // 3. Add all four item types to Supabase
  // -------------------------------------------------------------------------
  console.log('\n3. Adding all four itinerary item types to Supabase...');

  // 3.1 Flight
  const flight = await addItem({
    tripId: testTrip.id,
    type: 'flight',
    title: 'Flight to Tokyo Narita (JL001)',
    startDateTime: '2027-04-10T11:00:00.000Z',
    endDateTime: '2027-04-10T20:30:00.000Z',
    location: 'SFO → NRT',
    confirmationNumber: 'JL-990182',
    notes: 'Window seat booked. Priority baggage.',
    metadata: {
      airline: 'Japan Airlines',
      flightNumber: 'JL001',
      departureAirport: 'SFO',
      arrivalAirport: 'NRT',
      terminal: 'Intl-A',
      gate: 'A12',
      seat: '14A',
      departureCity: 'San Francisco',
      arrivalCity: 'Tokyo',
      cabinClass: 'business',
    },
  });
  assert(Boolean(flight.id), `Flight persisted with UUID: ${flight.id}`);

  // 3.2 Hotel
  const hotel = await addItem({
    tripId: testTrip.id,
    type: 'hotel',
    title: 'Aman Tokyo',
    startDateTime: '2027-04-10T15:00:00.000Z',
    endDateTime: '2027-04-14T11:00:00.000Z',
    location: 'The Otemachi Tower, 1-5-6 Otemachi, Chiyoda-ku, Tokyo',
    confirmationNumber: 'AMAN-TYO-7712',
    notes: 'High floor corner room with Imperial Palace gardens view.',
    metadata: {
      hotelName: 'Aman Tokyo',
      address: 'The Otemachi Tower, 1-5-6 Otemachi, Chiyoda-ku, Tokyo',
      checkIn: '3:00 PM',
      checkOut: '11:00 AM',
      room: 'Suite 3401',
      guestName: 'Alex Johnson & Sarah Connor',
      roomType: 'Deluxe Palace Suite',
      nightsCount: 4,
    },
  });
  assert(Boolean(hotel.id), `Hotel persisted with UUID: ${hotel.id}`);

  // 3.3 Activity
  const activity = await addItem({
    tripId: testTrip.id,
    type: 'activity',
    title: 'Tsukiji Outer Market Culinary Walk',
    startDateTime: '2027-04-11T09:00:00.000Z',
    endDateTime: '2027-04-11T12:00:00.000Z',
    location: 'Tsukiji, Chuo Ward, Tokyo',
    confirmationNumber: 'TSUKIJI-EXP-44',
    notes: 'Tasting raw oysters, wagyu skewers, tamagoyaki.',
    metadata: {
      category: 'Food',
      meetingPoint: 'Tsukiji Hongwanji Temple Main Gate',
      guideName: 'Kenji Sato',
      ticketInformation: 'Mobile Voucher QR #4491',
      duration: '3 hours',
    },
  });
  assert(Boolean(activity.id), `Activity persisted with UUID: ${activity.id}`);

  // 3.4 Transportation
  const transport = await addItem({
    tripId: testTrip.id,
    type: 'transportation',
    title: 'Shinkansen Nozomi (Tokyo → Kyoto)',
    startDateTime: '2027-04-14T12:30:00.000Z',
    endDateTime: '2027-04-14T14:45:00.000Z',
    location: 'Tokyo Station → Kyoto Station',
    confirmationNumber: 'JR-NOZOMI-204',
    notes: 'Fuji-view side reserved seats with oversized baggage area.',
    metadata: {
      transportationType: 'train',
      from: 'Tokyo Station',
      to: 'Kyoto Station',
      provider: 'JR Central',
      platform: 'Platform 15',
      seat: 'Car 7, Seats 12E & 12D',
      bookingNumber: 'JR-NOZOMI-204',
    },
  });
  assert(Boolean(transport.id), `Transportation persisted with UUID: ${transport.id}`);

  // -------------------------------------------------------------------------
  // 4. List Itinerary Items & Verify Metadata Preservation
  // -------------------------------------------------------------------------
  console.log('\n4. Listing items from Supabase and validating metadata preservation...');
  const listedItems = await listItineraryItems(testTrip.id);
  assert(listedItems.length === 4, `Found 4 persisted items (got ${listedItems.length})`);

  // Verify chronological ordering: Flight (Apr 10 11:00) -> Hotel (Apr 10 15:00) -> Activity (Apr 11 09:00) -> Transport (Apr 14 12:30)
  assert(listedItems[0].id === flight.id, '1st item is Flight');
  assert(listedItems[1].id === hotel.id, '2nd item is Hotel');
  assert(listedItems[2].id === activity.id, '3rd item is Activity');
  assert(listedItems[3].id === transport.id, '4th item is Transportation');

  // Verify Flight metadata preservation
  const listedFlightMeta = listedItems[0].metadata as FlightMetadata;
  assert(listedFlightMeta.airline === 'Japan Airlines', 'Flight airline preserved');
  assert(listedFlightMeta.flightNumber === 'JL001', 'Flight number preserved');
  assert(listedFlightMeta.departureAirport === 'SFO', 'Departure airport preserved');
  assert(listedFlightMeta.arrivalAirport === 'NRT', 'Arrival airport preserved');
  assert(listedFlightMeta.gate === 'A12', 'Flight gate preserved');
  assert(listedFlightMeta.seat === '14A', 'Flight seat preserved');
  assert(listedFlightMeta.cabinClass === 'business', 'Cabin class preserved');

  // Verify Hotel metadata preservation
  const listedHotelMeta = listedItems[1].metadata as HotelMetadata;
  assert(listedHotelMeta.hotelName === 'Aman Tokyo', 'Hotel name preserved');
  assert(listedHotelMeta.room === 'Suite 3401', 'Hotel room preserved');
  assert(listedHotelMeta.guestName === 'Alex Johnson & Sarah Connor', 'Guest name preserved');
  assert(listedHotelMeta.nightsCount === 4, 'Nights count preserved');

  // Verify Activity metadata preservation
  const listedActivityMeta = listedItems[2].metadata as ActivityMetadata;
  assert(listedActivityMeta.category === 'Food', 'Activity category preserved');
  assert(listedActivityMeta.meetingPoint === 'Tsukiji Hongwanji Temple Main Gate', 'Meeting point preserved');
  assert(listedActivityMeta.duration === '3 hours', 'Activity duration preserved');

  // Verify Transportation metadata preservation
  const listedTransportMeta = listedItems[3].metadata as TransportationMetadata;
  assert(listedTransportMeta.transportationType === 'train', 'Transport type preserved');
  assert(listedTransportMeta.from === 'Tokyo Station', 'Transport departure preserved');
  assert(listedTransportMeta.to === 'Kyoto Station', 'Transport destination preserved');
  assert(listedTransportMeta.seat === 'Car 7, Seats 12E & 12D', 'Transport seat preserved');

  // -------------------------------------------------------------------------
  // 5. Fetch Individual Item by ID
  // -------------------------------------------------------------------------
  console.log('\n5. Fetching individual items by ID...');
  const fetchedFlight = await fetchItineraryItemById(flight.id);
  assert(fetchedFlight !== null, 'fetchItineraryItemById returns flight');
  assert(fetchedFlight?.title === flight.title, 'Fetched flight title matches');
  assert((fetchedFlight?.metadata as FlightMetadata).flightNumber === 'JL001', 'Fetched flight number matches');

  const fetchedHotel = await fetchItineraryItemById(hotel.id);
  assert(fetchedHotel !== null, 'fetchItineraryItemById returns hotel');
  assert((fetchedHotel?.metadata as HotelMetadata).room === 'Suite 3401', 'Fetched hotel room matches');

  // -------------------------------------------------------------------------
  // 6. Update Itinerary Item & Chronological Reordering
  // -------------------------------------------------------------------------
  console.log('\n6. Updating itinerary items in Supabase...');

  // 6.1 Update Flight metadata & notes
  const updatedFlight = await updateItem(flight.id, {
    notes: 'Upgraded to First Class suite. Escort service.',
    metadata: {
      seat: '1A',
      gate: 'A1',
      cabinClass: 'first',
    },
  });
  assert(updatedFlight.notes === 'Upgraded to First Class suite. Escort service.', 'Flight notes updated');
  assert((updatedFlight.metadata as FlightMetadata).seat === '1A', 'Flight seat updated');
  assert((updatedFlight.metadata as FlightMetadata).airline === 'Japan Airlines', 'Unmodified airline preserved');

  // 6.2 Move Transportation to earlier time (Apr 9 - before the flight)
  const earlierTransportTime = '2027-04-09T08:00:00.000Z';
  await updateItem(transport.id, {
    startDateTime: earlierTransportTime,
    endDateTime: '2027-04-09T10:15:00.000Z',
  });

  // Re-list and verify chronological order changed in Supabase
  const reorderedItems = await listItineraryItems(testTrip.id);
  assert(reorderedItems[0].id === transport.id, 'Transportation is now FIRST after timestamp update');
  assert(reorderedItems[1].id === flight.id, 'Flight is now SECOND');
  console.log('  ✓ Chronological reordering in Supabase verified');

  // -------------------------------------------------------------------------
  // 7. Multi-User Isolation & RLS Enforcement
  // -------------------------------------------------------------------------
  console.log('\n7. Verifying multi-user isolation and Row Level Security...');
  if (options?.userBEmail) {
    const loginBRes = await login(userBEmail, testPassword);
    if (!loginBRes.success) throw new Error(`User B login failed: ${loginBRes.error}`);
  } else {
    await signup(userBEmail, testPassword, 'User B');
  }
  const userB = getAuthState().user;
  assert(Boolean(userB && userB.id !== userA.id), 'User B authenticated with distinct identity');

  // User B attempts to list items of User A's trip -> must return 0 items
  const userBItems = await listItineraryItems(testTrip.id);
  assert(userBItems.length === 0, 'User B receives 0 items when querying User A trip (RLS protected)');

  // User B attempts to fetch User A's flight by ID -> must return null
  const userBSecretFlight = await fetchItineraryItemById(flight.id);
  assert(userBSecretFlight === null, 'User B cannot fetch User A flight by ID (RLS protected)');

  // User B attempts to update User A's flight -> must fail
  let userBUpdateThrew = false;
  try {
    await updateItem(flight.id, { title: 'Hacked Flight by User B' });
  } catch (err: any) {
    userBUpdateThrew = true;
  }
  assert(userBUpdateThrew, 'User B update on User A flight rejected by RLS');

  // User B attempts to delete User A's flight -> must fail / return false
  const userBDeleteResult = await deleteItem(flight.id).catch(() => false);
  assert(userBDeleteResult === false, 'User B delete on User A flight rejected by RLS');

  // -------------------------------------------------------------------------
  // 8. Delete an Itinerary Item (as User A)
  // -------------------------------------------------------------------------
  console.log('\n8. Switching back to User A and deleting an itinerary item...');
  if (options?.userAEmail) {
    await login(userAEmail, testPassword);
  } else {
    await signup(userAEmail, testPassword, 'User A'); // re-authenticates User A
  }

  const deletedActivity = await deleteItem(activity.id);
  assert(deletedActivity === true, 'deleteItem returns true upon success');

  const postDeleteActivity = await fetchItineraryItemById(activity.id);
  assert(postDeleteActivity === null, 'fetchItineraryItemById returns null after deletion');

  const itemsAfterDelete = await listItineraryItems(testTrip.id);
  assert(itemsAfterDelete.length === 3, 'Items count decremented to 3');
  assert(!itemsAfterDelete.some((i) => i.id === activity.id), 'Deleted activity absent from trip list');

  // -------------------------------------------------------------------------
  // 9. Persistence Across Cache Clears (Simulated App Restart)
  // -------------------------------------------------------------------------
  console.log('\n9. Testing persistence across app restart (clearing memory cache)...');
  clearItineraryCache();
  assert(getItems(testTrip.id).length === 0, 'Cache is completely clean before load');

  const reloadedItems = await listItineraryItems(testTrip.id);
  assert(reloadedItems.length === 3, 'Reloaded 3 items directly from Supabase');
  const reloadedFlight = reloadedItems.find((i) => i.id === flight.id);
  assert(reloadedFlight !== undefined, 'Flight persists after cache wipe');
  assert((reloadedFlight?.metadata as FlightMetadata).seat === '1A', 'Updated seat 1A persisted after restart');

  // -------------------------------------------------------------------------
  // 10. Cascade Deletion on Parent Trip Removal
  // -------------------------------------------------------------------------
  console.log('\n10. Testing cascade deletion when parent trip is deleted...');
  await deleteTrip(testTrip.id);

  // Directly check itinerary_items table to confirm Postgres foreign key ON DELETE CASCADE
  const { data: orphanedItems } = await supabase
    .from('itinerary_items')
    .select('id')
    .eq('trip_id', testTrip.id);

  assert(!orphanedItems || orphanedItems.length === 0, 'All itinerary items cascade deleted with parent trip');

  // -------------------------------------------------------------------------
  // 11. Cleanup Session
  // -------------------------------------------------------------------------
  console.log('\n11. Cleaning up session and cache...');
  await logout();
  clearItineraryCache();

  console.log('\n======================================================');
  console.log('✓ ALL ITINERARY PERSISTENCE TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
  return true;
}
