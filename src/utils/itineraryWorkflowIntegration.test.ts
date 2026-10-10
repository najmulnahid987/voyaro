/**
 * Voyaro Phase 5 — Complete End-to-End Itinerary Workflow Integration Test
 *
 * Verifies the full itinerary loop across all 4 item types:
 *   1. Itinerary Timeline state initialization
 *   2. Add Flight, Hotel, Activity, Transportation
 *   3. In-memory state synchronization & chronological timeline grouping
 *   4. Item Details retrieval
 *   5. Edit & Update for all 4 types (in-place modification, zero duplicates)
 *   6. Chronological timeline re-ordering on timestamp changes
 *   7. Delete & Confirmation for all 4 types (hard delete, absent from timeline)
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
import { groupItemsByDay, sortItineraryItems } from './itineraryDateUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runItineraryWorkflowIntegrationTests() {
  console.log('\n======================================================');
  console.log('--- Running Complete Phase 5 Itinerary Workflow Test ---');
  console.log('======================================================\n');

  resetSeedItems();
  const tripId = 'japan-adventure';

  // -------------------------------------------------------------------------
  // 1. Initial Timeline State
  // -------------------------------------------------------------------------
  const baselineItems = getItems(tripId);
  const baselineCount = baselineItems.length;
  assert(baselineCount === 5, `Initial timeline has 5 seed items (found ${baselineCount})`);

  // -------------------------------------------------------------------------
  // 2. CREATE WORKFLOW: Add all 4 item types
  // -------------------------------------------------------------------------

  // 2.1 Add Flight
  const newFlight = addItem({
    tripId,
    type: 'flight',
    title: 'Flight to Osaka (ITM) (JL107)',
    startDateTime: '2028-03-13T08:30:00.000Z',
    endDateTime: '2028-03-13T09:45:00.000Z',
    location: 'Haneda (HND) → Itami (ITM)',
    confirmationNumber: 'JL-449102',
    notes: 'Domestic flight transfer. Priority boarding.',
    metadata: {
      airline: 'Japan Airlines',
      flightNumber: 'JL107',
      departureAirport: 'HND',
      arrivalAirport: 'ITM',
      terminal: '1',
      gate: '5A',
      seat: '7D',
      cabinClass: 'economy',
    },
  });
  assert(Boolean(newFlight.id), `Flight created with ID: ${newFlight.id}`);

  // 2.2 Add Hotel
  const newHotel = addItem({
    tripId,
    type: 'hotel',
    title: 'Conrad Osaka',
    startDateTime: '2028-03-14T15:00:00.000Z',
    endDateTime: '2028-03-16T11:00:00.000Z',
    location: '3-2-4 Nakanoshima, Kita Ward, Osaka',
    confirmationNumber: 'CONRAD-OSA-9921',
    notes: 'Corner suite requested. High floor view.',
    metadata: {
      hotelName: 'Conrad Osaka',
      address: '3-2-4 Nakanoshima, Kita Ward, Osaka',
      checkIn: '3:00 PM',
      checkOut: '11:00 AM',
      room: 'Suite 3802',
      guestName: 'Alex & Sarah Johnson',
      roomType: 'King Executive Corner Suite',
      nightsCount: 2,
    },
  });
  assert(Boolean(newHotel.id), `Hotel created with ID: ${newHotel.id}`);

  // 2.3 Add Activity
  const newActivity = addItem({
    tripId,
    type: 'activity',
    title: 'Dotonbori Street Food & River Cruise',
    startDateTime: '2028-03-14T18:00:00.000Z',
    endDateTime: '2028-03-14T20:30:00.000Z',
    location: 'Dotonbori, Chuo Ward, Osaka',
    notes: 'Sample local takoyaki and okonomiyaki.',
    metadata: {
      category: 'Food',
      meetingPoint: 'Glico Man sign footbridge',
      ticketInformation: 'Osaka Amazing Pass QR Voucher',
      duration: '2.5 hours',
    },
  });
  assert(Boolean(newActivity.id), `Activity created with ID: ${newActivity.id}`);

  // 2.4 Add Transportation
  const newTransport = addItem({
    tripId,
    type: 'transportation',
    title: 'Kintetsu Limited Express (Aoniyoshi)',
    startDateTime: '2028-03-15T11:00:00.000Z',
    endDateTime: '2028-03-15T11:45:00.000Z',
    location: 'Osaka-Namba → Kyoto Station',
    confirmationNumber: 'KT-AONI-8812',
    notes: 'Sightseeing lounge train with panoramic salon.',
    metadata: {
      transportationType: 'train',
      from: 'Osaka-Namba',
      to: 'Kyoto Station',
      bookingNumber: 'KT-AONI-8812',
      seat: 'Car 2, Salon Seat 3',
      provider: 'Kintetsu Railway',
    },
  });
  assert(Boolean(newTransport.id), `Transportation created with ID: ${newTransport.id}`);

  // -------------------------------------------------------------------------
  // 3. In-Memory State & Timeline Verification
  // -------------------------------------------------------------------------
  const afterAddItems = getItems(tripId);
  assert(
    afterAddItems.length === baselineCount + 4,
    `Store count incremented to ${baselineCount + 4} (all 4 items present)`
  );

  // Verify chronological ordering
  for (let i = 0; i < afterAddItems.length - 1; i++) {
    const timeCurrent = new Date(afterAddItems[i].startDateTime).getTime();
    const timeNext = new Date(afterAddItems[i + 1].startDateTime).getTime();
    assert(timeCurrent <= timeNext, `Chronological order preserved between item ${i} and ${i + 1}`);
  }

  // Verify day grouping
  const dayGroupsAfterAdd = groupItemsByDay(afterAddItems, '2028-03-10');
  assert(dayGroupsAfterAdd.length >= 4, `Timeline structured across ${dayGroupsAfterAdd.length} days`);

  // -------------------------------------------------------------------------
  // 4. Item Details Retrieval (All 4 Types)
  // -------------------------------------------------------------------------
  const fetchedFlight = getItem(newFlight.id);
  assert(Boolean(fetchedFlight), 'Flight details retrievable by ID');
  assert((fetchedFlight?.metadata as FlightMetadata).flightNumber === 'JL107', 'Flight metadata matches');

  const fetchedHotel = getItem(newHotel.id);
  assert(Boolean(fetchedHotel), 'Hotel details retrievable by ID');
  assert((fetchedHotel?.metadata as HotelMetadata).room === 'Suite 3802', 'Hotel metadata matches');

  const fetchedAct = getItem(newActivity.id);
  assert(Boolean(fetchedAct), 'Activity details retrievable by ID');
  assert((fetchedAct?.metadata as ActivityMetadata).category === 'Food', 'Activity metadata matches');

  const fetchedTrans = getItem(newTransport.id);
  assert(Boolean(fetchedTrans), 'Transportation details retrievable by ID');
  assert((fetchedTrans?.metadata as TransportationMetadata).bookingNumber === 'KT-AONI-8812', 'Transport metadata matches');

  // -------------------------------------------------------------------------
  // 5. EDIT WORKFLOW (All 4 Types)
  // -------------------------------------------------------------------------

  // 5.1 Edit Flight
  const editedFlight = updateItem(newFlight.id, {
    metadata: { seat: '1A', terminal: '2', gate: '12B', cabinClass: 'business' },
    notes: 'Upgraded to business class. Front row.',
  });
  assert(editedFlight?.id === newFlight.id, 'Flight ID preserved after edit');
  assert((editedFlight?.metadata as FlightMetadata).seat === '1A', 'Flight seat updated');
  assert(getItems(tripId).length === baselineCount + 4, 'No duplicate created on flight edit');

  // 5.2 Edit Hotel
  const editedHotel = updateItem(newHotel.id, {
    notes: 'Anniversary stay. Champagne requested.',
    metadata: { guestName: 'Alex Johnson & Guest' },
  });
  assert(editedHotel?.id === newHotel.id, 'Hotel ID preserved after edit');
  assert(editedHotel?.notes === 'Anniversary stay. Champagne requested.', 'Hotel notes updated');
  assert(getItems(tripId).length === baselineCount + 4, 'No duplicate created on hotel edit');

  // 5.3 Edit Activity
  const editedAct = updateItem(newActivity.id, {
    title: 'VIP Dotonbori Private Food & Cruise Tour',
    metadata: { category: 'Adventure', duration: '3.0 hours' },
  });
  assert(editedAct?.id === newActivity.id, 'Activity ID preserved after edit');
  assert(editedAct?.title === 'VIP Dotonbori Private Food & Cruise Tour', 'Activity title updated');
  assert((editedAct?.metadata as ActivityMetadata).duration === '3.0 hours', 'Activity duration updated');
  assert(getItems(tripId).length === baselineCount + 4, 'No duplicate created on activity edit');

  // 5.4 Edit Transportation with Date/Time Change
  // Move train from March 15 to early morning March 10 (becoming the very first item)
  const earlierIso = '2028-03-10T05:00:00.000Z';
  const editedTrans = updateItem(newTransport.id, {
    startDateTime: earlierIso,
    metadata: { seat: 'Car 1, Salon Seat 1' },
  });
  assert(editedTrans?.id === newTransport.id, 'Transportation ID preserved after edit');
  assert(editedTrans?.startDateTime === earlierIso, 'Transportation date/time updated');

  // Verify timeline reordering
  const reorderedItems = getItems(tripId);
  assert(reorderedItems[0].id === newTransport.id, 'Edited transport is now 1st chronological item in timeline');
  assert(reorderedItems.length === baselineCount + 4, 'Total store count preserved after timeline reorder');

  // -------------------------------------------------------------------------
  // 6. DELETE WORKFLOW (All 4 Types)
  // -------------------------------------------------------------------------

  // 6.1 Delete Flight
  assert(deleteItem(newFlight.id) === true, 'Flight deleted successfully');
  assert(getItem(newFlight.id) === undefined, 'Flight no longer found in store');
  assert(getItems(tripId).length === baselineCount + 3, 'Store count decremented by 1');

  // 6.2 Delete Hotel
  assert(deleteItem(newHotel.id) === true, 'Hotel deleted successfully');
  assert(getItem(newHotel.id) === undefined, 'Hotel no longer found in store');
  assert(getItems(tripId).length === baselineCount + 2, 'Store count decremented by 2');

  // 6.3 Delete Activity
  assert(deleteItem(newActivity.id) === true, 'Activity deleted successfully');
  assert(getItem(newActivity.id) === undefined, 'Activity no longer found in store');
  assert(getItems(tripId).length === baselineCount + 1, 'Store count decremented by 3');

  // 6.4 Delete Transportation
  assert(deleteItem(newTransport.id) === true, 'Transportation deleted successfully');
  assert(getItem(newTransport.id) === undefined, 'Transportation no longer found in store');
  assert(getItems(tripId).length === baselineCount, 'Store returned to baseline count');

  // Final confirmation: Day groups do not contain deleted items
  const finalDayGroups = groupItemsByDay(getItems(tripId), '2028-03-10');
  const allFinalItemIds = finalDayGroups.flatMap((g) => g.items.map((i) => i.id));
  assert(!allFinalItemIds.includes(newFlight.id), 'Deleted flight absent from timeline');
  assert(!allFinalItemIds.includes(newHotel.id), 'Deleted hotel absent from timeline');
  assert(!allFinalItemIds.includes(newActivity.id), 'Deleted activity absent from timeline');
  assert(!allFinalItemIds.includes(newTransport.id), 'Deleted transportation absent from timeline');

  console.log('\n======================================================');
  console.log('--- All Phase 5 Itinerary Workflow Tests Passed! ---');
  console.log('======================================================\n');
  return true;
}
