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
  // 5. EDIT Action Verification
  // -------------------------------------------------------------------------
  const updatedHotel = updateItem(hotel!.id, {
    notes: 'Late check-in requested at 6 PM.',
    metadata: { room: 'Presidential Suite 901' },
  });
  assert(updatedHotel?.notes === 'Late check-in requested at 6 PM.', 'Hotel notes updated successfully');
  assert(
    (updatedHotel?.metadata as HotelMetadata).room === 'Presidential Suite 901',
    'Hotel room metadata updated successfully'
  );
  assert(
    (getItem(hotel!.id)?.metadata as HotelMetadata).room === 'Presidential Suite 901',
    'Store reflects updated hotel room immediately'
  );

  // -------------------------------------------------------------------------
  // 6. DELETE Action Verification
  // -------------------------------------------------------------------------
  const deleteSuccess = deleteItem(activity!.id);
  assert(deleteSuccess === true, 'deleteItem returns true upon success');
  assert(getItem(activity!.id) === undefined, 'Deleted activity item is no longer found in store');
  assert(
    getItems(tripId).length === allSeedItems.length - 1,
    'Store item count decremented by 1 after deletion'
  );

  console.log('\n========================================');
  console.log('--- All Item Detail Workflow Tests Passed! ---');
  console.log('========================================\n');
  return true;
}
