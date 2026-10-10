/**
 * Focused Item Detail Workflow Verification Test Suite (Phase 5)
 *
 * Verifies that all 4 itinerary item types can be:
 *  1. Retrieved by itemId
 *  2. Rendered with all type-specific required fields
 *  3. Edited via updateItem with immediate reactive synchronization
 *  4. Deleted via deleteItem
 */

import {
  addItem,
  deleteItem,
  getItem,
  getItems,
  resetSeedItems,
  updateItem,
} from '../services/itineraryStore';
import {
  ActivityMetadata,
  ConcreteItineraryItem,
  FlightMetadata,
  HotelMetadata,
  TransportationMetadata,
} from '../types/itinerary';
import { groupItemsByDay } from './itineraryDateUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runItemDetailWorkflowTests() {
  console.log('\n========================================');
  console.log('--- Running Item Details Workflow Tests ---');
  console.log('========================================\n');

  resetSeedItems();
  const tripId = 'japan-adventure';
  const allSeedItems = getItems(tripId);
  const initialCount = allSeedItems.length;

  // -------------------------------------------------------------------------
  // 1. FLIGHT Detail Retrieval & Verification
  // -------------------------------------------------------------------------
  const flight = allSeedItems.find((i) => i.type === 'flight');
  assert(Boolean(flight), 'Flight item found in store');
  const flightDetail = getItem(flight!.id);
  assert(Boolean(flightDetail), 'Flight retrieved by itemId');
  const flightMeta = flightDetail!.metadata as FlightMetadata;
  assert(Boolean(flightMeta.airline), 'Flight includes airline: ' + flightMeta.airline);
  assert(Boolean(flightMeta.flightNumber), 'Flight includes flight number: ' + flightMeta.flightNumber);
  assert(Boolean(flightMeta.departureAirport), 'Flight includes departure airport: ' + flightMeta.departureAirport);
  assert(Boolean(flightMeta.arrivalAirport), 'Flight includes arrival airport: ' + flightMeta.arrivalAirport);
  assert(Boolean(flightMeta.terminal), 'Flight includes terminal: ' + flightMeta.terminal);
  assert(Boolean(flightMeta.gate), 'Flight includes gate: ' + flightMeta.gate);
  assert(Boolean(flightMeta.seat), 'Flight includes seat: ' + flightMeta.seat);
  assert(Boolean(flightDetail!.confirmationNumber), 'Flight includes confirmation: ' + flightDetail!.confirmationNumber);
  assert(Boolean(flightDetail!.notes), 'Flight includes notes');

  // -------------------------------------------------------------------------
  // 2. HOTEL Detail Retrieval & Verification
  // -------------------------------------------------------------------------
  const hotel = allSeedItems.find((i) => i.type === 'hotel');
  assert(Boolean(hotel), 'Hotel item found in store');
  const hotelDetail = getItem(hotel!.id);
  assert(Boolean(hotelDetail), 'Hotel retrieved by itemId');
  const hotelMeta = hotelDetail!.metadata as HotelMetadata;
  assert(Boolean(hotelMeta.hotelName), 'Hotel includes hotel name: ' + hotelMeta.hotelName);
  assert(Boolean(hotelMeta.address), 'Hotel includes address: ' + hotelMeta.address);
  assert(Boolean(hotelMeta.checkIn), 'Hotel includes check-in time: ' + hotelMeta.checkIn);
  assert(Boolean(hotelMeta.checkOut), 'Hotel includes check-out time: ' + hotelMeta.checkOut);
  assert(Boolean(hotelMeta.room), 'Hotel includes room: ' + hotelMeta.room);
  assert(Boolean(hotelMeta.guestName), 'Hotel includes guest name: ' + hotelMeta.guestName);
  assert(Boolean(hotelDetail!.confirmationNumber), 'Hotel includes confirmation: ' + hotelDetail!.confirmationNumber);
  assert(Boolean(hotelDetail!.notes), 'Hotel includes notes');

  // -------------------------------------------------------------------------
  // 3. ACTIVITY Detail Retrieval & Verification
  // -------------------------------------------------------------------------
  const activity = allSeedItems.find((i) => i.type === 'activity');
  assert(Boolean(activity), 'Activity item found in store');
  const activityDetail = getItem(activity!.id);
  assert(Boolean(activityDetail), 'Activity retrieved by itemId');
  const actMeta = activityDetail!.metadata as ActivityMetadata;
  assert(Boolean(activityDetail!.title), 'Activity includes activity title: ' + activityDetail!.title);
  assert(Boolean(activityDetail!.location), 'Activity includes location: ' + activityDetail!.location);
  assert(Boolean(activityDetail!.startDateTime), 'Activity includes date & time: ' + activityDetail!.startDateTime);
  assert(Boolean(actMeta.category), 'Activity includes category: ' + actMeta.category);
  assert(Boolean(actMeta.duration), 'Activity includes duration: ' + actMeta.duration);
  assert(Boolean(actMeta.website), 'Activity includes website: ' + actMeta.website);
  assert(Boolean(actMeta.ticketInformation), 'Activity includes ticket info: ' + actMeta.ticketInformation);
  assert(Boolean(activityDetail!.notes), 'Activity includes notes');

  // -------------------------------------------------------------------------
  // 4. TRANSPORTATION Detail Retrieval & Verification
  // -------------------------------------------------------------------------
  const transport = allSeedItems.find((i) => i.type === 'transportation');
  assert(Boolean(transport), 'Transportation item found in store');
  const transDetail = getItem(transport!.id);
  assert(Boolean(transDetail), 'Transportation retrieved by itemId');
  const transMeta = transDetail!.metadata as TransportationMetadata;
  assert(Boolean(transMeta.transportationType), 'Transportation includes type: ' + transMeta.transportationType);
  assert(Boolean(transMeta.from), 'Transportation includes from: ' + transMeta.from);
  assert(Boolean(transMeta.to), 'Transportation includes to: ' + transMeta.to);
  assert(Boolean(transDetail!.startDateTime), 'Transportation includes departure time');
  assert(Boolean(transDetail!.endDateTime), 'Transportation includes arrival time');
  assert(Boolean(transMeta.bookingNumber || transDetail!.confirmationNumber), 'Transportation includes booking number: ' + (transMeta.bookingNumber || transDetail!.confirmationNumber));
  assert(Boolean(transMeta.seat), 'Transportation includes seat: ' + transMeta.seat);
  assert(Boolean(transDetail!.notes), 'Transportation includes notes');

  // -------------------------------------------------------------------------
  // 5. STEP 14 EDIT ACTIONS VERIFICATION (All 4 Types)
  // -------------------------------------------------------------------------

  // 5.1 Edit FLIGHT
  const updatedFlight = updateItem(flight!.id, {
    notes: 'Upgraded to business class. Window seat 2K.',
    metadata: {
      flightNumber: 'EK589',
      seat: '2K',
      gate: '15B',
      terminal: '2',
      cabinClass: 'business',
    },
  });
  assert(updatedFlight?.id === flight!.id, 'Flight ID preserved after edit');
  assert(updatedFlight?.tripId === flight!.tripId, 'Flight tripId preserved after edit');
  assert((updatedFlight?.metadata as FlightMetadata).flightNumber === 'EK589', 'Flight number updated in store');
  assert((updatedFlight?.metadata as FlightMetadata).seat === '2K', 'Flight seat updated in store');
  assert(getItems(tripId).length === initialCount, 'No duplicate flight created on edit (count unchanged)');

  // 5.2 Edit HOTEL
  const updatedHotel = updateItem(hotel!.id, {
    notes: 'Late check-in requested at 6 PM. VIP arrival gift requested.',
    metadata: {
      room: 'Presidential Suite 901',
      guestName: 'Alex & Sarah Johnson',
      checkIn: '4:00 PM',
    },
  });
  assert(updatedHotel?.id === hotel!.id, 'Hotel ID preserved after edit');
  assert(updatedHotel?.tripId === hotel!.tripId, 'Hotel tripId preserved after edit');
  assert(updatedHotel?.notes === 'Late check-in requested at 6 PM. VIP arrival gift requested.', 'Hotel notes updated successfully');
  assert((updatedHotel?.metadata as HotelMetadata).room === 'Presidential Suite 901', 'Hotel room updated in store');
  assert((updatedHotel?.metadata as HotelMetadata).checkIn === '4:00 PM', 'Hotel checkIn updated in store');
  assert(getItems(tripId).length === initialCount, 'No duplicate hotel created on edit (count unchanged)');

  // 5.3 Edit ACTIVITY
  const updatedActivity = updateItem(activity!.id, {
    title: 'VIP Shibuya Crossing & Hidden Rooftops Tour',
    notes: 'Meet at Shibuya Sky tower entrance instead of statue.',
    metadata: {
      category: 'Adventure',
      guideName: 'Kenji & Takashi',
      ticketInformation: 'VIP Fast-track QR Voucher (2 Adults)',
    },
  });
  assert(updatedActivity?.id === activity!.id, 'Activity ID preserved after edit');
  assert(updatedActivity?.tripId === activity!.tripId, 'Activity tripId preserved after edit');
  assert(updatedActivity?.title === 'VIP Shibuya Crossing & Hidden Rooftops Tour', 'Activity title updated in store');
  assert((updatedActivity?.metadata as ActivityMetadata).category === 'Adventure', 'Activity category updated in store');
  assert(getItems(tripId).length === initialCount, 'No duplicate activity created on edit (count unchanged)');

  // 5.4 Edit TRANSPORTATION
  const updatedTransport = updateItem(transport!.id, {
    title: 'Shinkansen Bullet Train (Hikari #501)',
    location: 'Tokyo Station (Platform 16) → Kyoto Station',
    notes: 'Mount Fuji view side seats confirmed. Large luggage space booked.',
    metadata: {
      provider: 'JR Tokaido Hikari',
      platform: 'Platform 16',
      seat: 'Car 1, Seat 1A & 1B',
    },
  });
  assert(updatedTransport?.id === transport!.id, 'Transportation ID preserved after edit');
  assert(updatedTransport?.tripId === transport!.tripId, 'Transportation tripId preserved after edit');
  assert((updatedTransport?.metadata as TransportationMetadata).platform === 'Platform 16', 'Platform updated in store');
  assert((updatedTransport?.metadata as TransportationMetadata).seat === 'Car 1, Seat 1A & 1B', 'Seat updated in store');
  assert(getItems(tripId).length === initialCount, 'No duplicate transportation created on edit (count unchanged)');

  // 5.5 CHRONOLOGICAL TIMELINE REORDERING VERIFICATION
  // Move transport from March 12 to early morning March 10 (before flight)
  const earlierTime = '2028-03-10T06:00:00.000Z';
  updateItem(transport!.id, {
    startDateTime: earlierTime,
  });
  const reorderedItems = getItems(tripId);
  assert(reorderedItems[0].id === transport!.id, 'Transportation is now 1st item after date/time edit');
  assert(reorderedItems.length === initialCount, 'Item count unchanged after reordering');

  // Verify groupItemsByDay places it in the first day group
  const dayGroups = groupItemsByDay(reorderedItems, '2028-03-10');
  assert(dayGroups.length > 0, 'Day groups constructed');
  assert(dayGroups[0].items.some((i) => i.id === transport!.id), 'Edited transport correctly placed in Day 1 group');

  // 5.6 INVALID / MISSING ITEM ID HANDLING
  const invalidResult = updateItem('non-existent-id-xyz', { title: 'Ghost Item' });
  assert(invalidResult === undefined, 'updateItem with non-existent id returns undefined gracefully');
  assert(getItems(tripId).length === initialCount, 'Store remains unaffected by invalid update attempt');

  // -------------------------------------------------------------------------
  // 6. DELETE Action Verification
  // -------------------------------------------------------------------------
  const deleteSuccess = deleteItem(activity!.id);
  assert(deleteSuccess === true, 'deleteItem returns true upon success');
  assert(getItem(activity!.id) === undefined, 'Deleted activity item is no longer found in store');
  assert(
    getItems(tripId).length === initialCount - 1,
    'Store item count decremented by 1 after deletion'
  );
  const remainingGroups = groupItemsByDay(getItems(tripId), '2028-03-10');
  const allRemainingItemIds = remainingGroups.flatMap((g) => g.items.map((i) => i.id));
  assert(!allRemainingItemIds.includes(activity!.id), 'Deleted item confirmed absent from timeline day groups');

  console.log('\n========================================');
  console.log('--- All Item Detail Workflow Tests Passed! ---');
  console.log('========================================\n');
  return true;
}
