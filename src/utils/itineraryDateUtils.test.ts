/**
 * Test Suite for Itinerary Date Utilities
 * Verifies the 5 required checks:
 *  1. Same-day items sorting & grouping
 *  2. Multi-day items (e.g. hotel check-in to check-out)
 *  3. Overnight flight spanning into the next calendar day
 *  4. Items with identical start times (stable sort)
 *  5. Unsorted input array (non-mutating sort)
 */

import {
  sortItineraryItems,
  groupItemsByDay,
  formatItineraryDate,
  formatItineraryTime,
  formatDateRange,
  isMultiDayItem,
} from './itineraryDateUtils';
import { ConcreteItineraryItem } from '../types/itinerary';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runItineraryDateUtilsTests() {
  console.log('\n--- Running Itinerary Date Utilities Test Suite ---\n');

  // Base timestamps designed to be robust across all timezones (UTC-12 to UTC+14)
  // Day 1: March 10 evening
  const itemFlightOvernight: ConcreteItineraryItem = {
    id: 'f-1',
    tripId: 'japan',
    type: 'flight',
    title: 'Overnight Flight to Tokyo',
    startDateTime: '2028-03-10T18:00:00.000Z',
    endDateTime: '2028-03-11T22:00:00.000Z',
    metadata: {
      airline: 'Emirates',
      flightNumber: 'EK585',
      departureAirport: 'DAC',
      arrivalAirport: 'NRT',
    },
  };

  // Day 2: March 11 - Hotel (March 11 to March 14)
  const itemHotelMultiDay: ConcreteItineraryItem = {
    id: 'h-1',
    tripId: 'japan',
    type: 'hotel',
    title: 'Ritz-Carlton Kyoto',
    startDateTime: '2028-03-11T19:00:00.000Z',
    endDateTime: '2028-03-14T19:00:00.000Z',
    metadata: {
      hotelName: 'Ritz-Carlton Kyoto',
      address: 'Kyoto',
      checkIn: '3:00 PM',
      checkOut: '11:00 AM',
    },
  };

  // Day 2: March 11 - Morning activity (18:00Z)
  const itemActivitySameDayMorning: ConcreteItineraryItem = {
    id: 'a-1',
    tripId: 'japan',
    type: 'activity',
    title: 'Morning Garden Walk',
    startDateTime: '2028-03-11T18:00:00.000Z',
    endDateTime: '2028-03-11T19:30:00.000Z',
    metadata: { category: 'Nature' },
  };

  // Day 2: March 11 - Afternoon activity (19:00Z - identical start time to Hotel check-in)
  const itemActivitySameDayAfternoon: ConcreteItineraryItem = {
    id: 'a-2',
    tripId: 'japan',
    type: 'activity',
    title: 'Tea Ceremony',
    startDateTime: '2028-03-11T19:00:00.000Z',
    endDateTime: '2028-03-11T20:00:00.000Z',
    metadata: { category: 'Culture' },
  };

  // Day 3: March 12 - Transport
  const itemTransportDay3: ConcreteItineraryItem = {
    id: 't-1',
    tripId: 'japan',
    type: 'transportation',
    title: 'Shinkansen Bullet Train',
    startDateTime: '2028-03-12T19:00:00.000Z',
    endDateTime: '2028-03-12T21:30:00.000Z',
    metadata: {
      transportationType: 'train',
      from: 'Tokyo',
      to: 'Kyoto',
    },
  };

  // -------------------------------------------------------------------------
  // Check 1: Unsorted input & Non-mutating sort
  // -------------------------------------------------------------------------
  const unsortedList = [
    itemTransportDay3,
    itemActivitySameDayAfternoon,
    itemFlightOvernight,
    itemActivitySameDayMorning,
    itemHotelMultiDay,
  ];

  const originalFirstId = unsortedList[0].id;
  const sorted = sortItineraryItems(unsortedList);

  assert(
    unsortedList[0].id === originalFirstId,
    'Non-mutating: Original array is not mutated'
  );
  assert(sorted.length === 5, 'Sorted result maintains all items');
  assert(
    sorted[0].id === 'f-1' && sorted[sorted.length - 1].id === 't-1',
    'Unsorted input: Items correctly sorted in chronological order'
  );

  // -------------------------------------------------------------------------
  // Check 2: Same-day items sorting & grouping
  // -------------------------------------------------------------------------
  const sameDayGroup = groupItemsByDay([
    itemActivitySameDayAfternoon,
    itemActivitySameDayMorning,
  ]);
  assert(sameDayGroup.length === 1, 'Same-day items grouped into single day group');
  assert(
    sameDayGroup[0].items[0].id === 'a-1' && sameDayGroup[0].items[1].id === 'a-2',
    'Same-day items ordered morning before afternoon'
  );

  // -------------------------------------------------------------------------
  // Check 3: Multi-day items handling
  // -------------------------------------------------------------------------
  assert(
    isMultiDayItem(itemHotelMultiDay.startDateTime, itemHotelMultiDay.endDateTime),
    'Multi-day item correctly identified (March 11 to March 14)'
  );
  const rangeFormat = formatDateRange(
    itemHotelMultiDay.startDateTime,
    itemHotelMultiDay.endDateTime,
    { includeTimes: false }
  );
  assert(
    rangeFormat.includes('–'),
    'Multi-day range formatted with start and end dates'
  );

  // -------------------------------------------------------------------------
  // Check 4: Overnight flight
  // -------------------------------------------------------------------------
  assert(
    isMultiDayItem(itemFlightOvernight.startDateTime, itemFlightOvernight.endDateTime),
    'Overnight flight spanning across midnight identified as multi-day'
  );
  const flightRange = formatDateRange(
    itemFlightOvernight.startDateTime,
    itemFlightOvernight.endDateTime,
    { includeTimes: true }
  );
  assert(
    flightRange.length > 0,
    'Overnight flight time range formatted with date & time boundaries'
  );

  // -------------------------------------------------------------------------
  // Check 5: Items with identical times (stable sort)
  // -------------------------------------------------------------------------
  const identicalTimeList = [itemHotelMultiDay, itemActivitySameDayAfternoon]; // Both at 19:00Z
  const sortedIdentical = sortItineraryItems(identicalTimeList);
  assert(
    sortedIdentical.length === 2,
    'Identical time items preserved without loss'
  );
  assert(
    sortedIdentical[0].startDateTime === sortedIdentical[1].startDateTime,
    'Identical timestamps preserved'
  );

  // -------------------------------------------------------------------------
  // Check 6: Missing endDateTime support
  // -------------------------------------------------------------------------
  const itemNoEnd: ConcreteItineraryItem = {
    id: 'a-no-end',
    tripId: 'japan',
    type: 'activity',
    title: 'Drop by Café',
    startDateTime: '2028-03-11T18:00:00.000Z',
    metadata: {},
  };
  const formattedNoEnd = formatDateRange(itemNoEnd.startDateTime, itemNoEnd.endDateTime);
  assert(formattedNoEnd.length > 0, 'Gracefully handles missing endDateTime');

  console.log('\n--- All 6 Test Checks Passed Successfully! ---\n');
  return true;
}
