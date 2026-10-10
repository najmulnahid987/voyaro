/**
 * Voyaro Phase 5 — Strict Itinerary State and Ordering Test Suite
 *
 * Verifies the exact scenario requested:
 * 1. Create items in random order:
 *    - Activity — March 12 2:00 PM
 *    - Flight — March 10 8:30 PM
 *    - Hotel — March 11 3:00 PM
 *    - Train — March 15 9:00 AM
 *    - Activity — March 10 10:00 PM
 * 2. Verify timeline grouping and ordering:
 *    - March 10: 8:30 PM Flight, 10:00 PM Activity
 *    - March 11: 3:00 PM Hotel
 *    - March 12: 2:00 PM Activity
 *    - March 15: 9:00 AM Train
 * 3. Edit item time -> Verify automatic reordering within day
 * 4. Edit item date -> Verify moving to another day
 * 5. Delete an item -> Verify day disappears according to existing design
 * 6. Add overnight flight -> Verify start and end dates representation
 */

import {
  addItem,
  clearItems,
  deleteItem,
  getItem,
  getItems,
  updateItem,
} from '../services/itineraryStore';
import {
  formatDateRange,
  formatItineraryDate,
  formatItineraryTime,
  groupItemsByDay,
  isMultiDayItem,
  sortItineraryItems,
} from './itineraryDateUtils';
import { ConcreteItineraryItem } from '../types/itinerary';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[STRICT TEST FAILURE]: ${message}`);
  }
}

export function runStrictOrderingTests(): void {
  console.log('------------------------------------------------------------');
  console.log('RUNNING STRICT ITINERARY STATE & ORDERING TEST SUITE');
  console.log('------------------------------------------------------------');

  const tripId = 'strict-test-trip-ordering';
  clearItems(tripId);

  // =========================================================================
  // STEP 1: Create 5 items in RANDOM order as specified
  // =========================================================================
  console.log('\n[TEST 1] Creating items in random order...');

  // 1. Activity — March 12 2:00 PM
  const item1 = addItem({
    tripId,
    type: 'activity',
    title: 'Activity',
    startDateTime: '2028-03-12T14:00:00.000Z',
    endDateTime: '2028-03-12T16:00:00.000Z',
    location: 'Shibuya, Tokyo',
    metadata: { category: 'Culture' },
  });

  // 2. Flight — March 10 8:30 PM
  const item2 = addItem({
    tripId,
    type: 'flight',
    title: 'Flight',
    startDateTime: '2028-03-10T20:30:00.000Z',
    endDateTime: '2028-03-10T23:30:00.000Z',
    location: 'DAC → NRT',
    metadata: {
      airline: 'Emirates',
      flightNumber: 'EK585',
      departureAirport: 'DAC',
      arrivalAirport: 'NRT',
    },
  });

  // 3. Hotel — March 11 3:00 PM
  const item3 = addItem({
    tripId,
    type: 'hotel',
    title: 'Hotel',
    startDateTime: '2028-03-11T15:00:00.000Z',
    endDateTime: '2028-03-14T11:00:00.000Z',
    location: 'The Ritz-Carlton Tokyo',
    metadata: {
      hotelName: 'The Ritz-Carlton Tokyo',
      address: 'Tokyo Midtown, 9-7-1 Akasaka, Minato-ku, Tokyo',
      checkIn: '3:00 PM',
      checkOut: '11:00 AM',
      roomType: 'Club King',
    },
  });

  // 4. Train — March 15 9:00 AM
  const item4 = addItem({
    tripId,
    type: 'transportation',
    title: 'Train',
    startDateTime: '2028-03-15T09:00:00.000Z',
    endDateTime: '2028-03-15T11:15:00.000Z',
    location: 'Tokyo Station → Kyoto Station',
    metadata: {
      transportationType: 'train',
      from: 'Tokyo Station',
      to: 'Kyoto Station',
      provider: 'Shinkansen Nozomi',
    },
  });

  // 5. Activity — March 10 10:00 PM
  const item5 = addItem({
    tripId,
    type: 'activity',
    title: 'Activity',
    startDateTime: '2028-03-10T22:00:00.000Z',
    endDateTime: '2028-03-10T23:30:00.000Z',
    location: 'Shinjuku Night Tour, Tokyo',
    metadata: { category: 'Entertainment' },
  });

  const tripItems = getItems(tripId);
  assert(tripItems.length === 5, 'Must have exactly 5 items created');
  console.log('  ✓ 5 items created in random order successfully');

  // =========================================================================
  // STEP 2: Verify the timeline becomes exactly:
  //
  // March 10
  // 8:30 PM Flight
  // 10:00 PM Activity
  //
  // March 11
  // 3:00 PM Hotel
  //
  // March 12
  // 2:00 PM Activity
  //
  // March 15
  // 9:00 AM Train
  // =========================================================================
  console.log('\n[TEST 2] Verifying timeline day grouping and ordering...');

  const dayGroups = groupItemsByDay(tripItems, '2028-03-10');
  assert(dayGroups.length === 4, `Expected 4 day groups, got ${dayGroups.length}`);

  // Day 1: March 10
  const day1 = dayGroups[0];
  const day1Name = formatItineraryDate(day1.date, 'dayMonth');
  console.log(`\nTimeline Day 1: ${day1Name}`);
  assert(day1Name === 'March 10', `Day 1 must be March 10, got ${day1Name}`);
  assert(day1.items.length === 2, `March 10 must have 2 items, got ${day1.items.length}`);
  
  const d1Item1 = day1.items[0];
  const d1Item1Time = formatItineraryTime(d1Item1.startDateTime);
  console.log(`  ${d1Item1Time} ${d1Item1.title}`);
  assert(d1Item1.id === item2.id, 'First item on March 10 must be Flight');
  assert(d1Item1Time === '8:30 PM', `First item time must be 8:30 PM, got ${d1Item1Time}`);

  const d1Item2 = day1.items[1];
  const d1Item2Time = formatItineraryTime(d1Item2.startDateTime);
  console.log(`  ${d1Item2Time} ${d1Item2.title}`);
  assert(d1Item2.id === item5.id, 'Second item on March 10 must be Activity');
  assert(d1Item2Time === '10:00 PM', `Second item time must be 10:00 PM, got ${d1Item2Time}`);

  // Day 2: March 11
  const day2 = dayGroups[1];
  const day2Name = formatItineraryDate(day2.date, 'dayMonth');
  console.log(`\nTimeline Day 2: ${day2Name}`);
  assert(day2Name === 'March 11', `Day 2 must be March 11, got ${day2Name}`);
  assert(day2.items.length === 1, `March 11 must have 1 item, got ${day2.items.length}`);
  const d2Item1 = day2.items[0];
  const d2Item1Time = formatItineraryTime(d2Item1.startDateTime);
  console.log(`  ${d2Item1Time} ${d2Item1.title}`);
  assert(d2Item1.id === item3.id, 'Item on March 11 must be Hotel');
  assert(d2Item1Time === '3:00 PM', `Hotel time must be 3:00 PM, got ${d2Item1Time}`);

  // Day 3: March 12
  const day3 = dayGroups[2];
  const day3Name = formatItineraryDate(day3.date, 'dayMonth');
  console.log(`\nTimeline Day 3: ${day3Name}`);
  assert(day3Name === 'March 12', `Day 3 must be March 12, got ${day3Name}`);
  assert(day3.items.length === 1, `March 12 must have 1 item, got ${day3.items.length}`);
  const d3Item1 = day3.items[0];
  const d3Item1Time = formatItineraryTime(d3Item1.startDateTime);
  console.log(`  ${d3Item1Time} ${d3Item1.title}`);
  assert(d3Item1.id === item1.id, 'Item on March 12 must be Activity');
  assert(d3Item1Time === '2:00 PM', `Activity time must be 2:00 PM, got ${d3Item1Time}`);

  // Day 4: March 15
  const day4 = dayGroups[3];
  const day4Name = formatItineraryDate(day4.date, 'dayMonth');
  console.log(`\nTimeline Day 4: ${day4Name}`);
  assert(day4Name === 'March 15', `Day 4 must be March 15, got ${day4Name}`);
  assert(day4.items.length === 1, `March 15 must have 1 item, got ${day4.items.length}`);
  const d4Item1 = day4.items[0];
  const d4Item1Time = formatItineraryTime(d4Item1.startDateTime);
  console.log(`  ${d4Item1Time} ${d4Item1.title}`);
  assert(d4Item1.id === item4.id, 'Item on March 15 must be Train');
  assert(d4Item1Time === '9:00 AM', `Train time must be 9:00 AM, got ${d4Item1Time}`);

  console.log('  ✓ Timeline matches exact requested structure!');

  // =========================================================================
  // SUB-TEST 1 & 2: Edit an item's time -> Verify it moves automatically
  // =========================================================================
  console.log('\n[TEST 3] Sub-test 1 & 2: Edit item time & verify automatic move within day...');
  // Move Flight from 8:30 PM to 11:00 PM (23:00) on March 10
  updateItem(item2.id, {
    startDateTime: '2028-03-10T23:00:00.000Z',
    endDateTime: '2028-03-11T02:00:00.000Z',
  });

  const updatedGroupsAfterTimeEdit = groupItemsByDay(getItems(tripId), '2028-03-10');
  const march10Group = updatedGroupsAfterTimeEdit.find((g) => g.date === '2028-03-10');
  assert(Boolean(march10Group), 'March 10 group must still exist');
  assert(march10Group!.items.length === 2, 'March 10 group must still have 2 items');

  // Verify order swapped automatically: 10:00 PM Activity is first, 11:00 PM Flight is second
  const firstItemNow = march10Group!.items[0];
  const secondItemNow = march10Group!.items[1];
  assert(firstItemNow.id === item5.id, '10:00 PM Activity must now be FIRST on March 10');
  assert(secondItemNow.id === item2.id, '11:00 PM Flight must now be SECOND on March 10');
  assert(
    formatItineraryTime(firstItemNow.startDateTime) === '10:00 PM',
    'First item time is 10:00 PM'
  );
  assert(
    formatItineraryTime(secondItemNow.startDateTime) === '11:00 PM',
    'Second item time is 11:00 PM'
  );
  console.log('  ✓ Item moved automatically within March 10: 10:00 PM Activity -> 11:00 PM Flight');

  // Restore Flight back to 8:30 PM for clarity
  updateItem(item2.id, {
    startDateTime: '2028-03-10T20:30:00.000Z',
    endDateTime: '2028-03-10T23:30:00.000Z',
  });

  // =========================================================================
  // SUB-TEST 3 & 4: Edit its date -> Verify it moves to another day
  // =========================================================================
  console.log('\n[TEST 4] Sub-test 3 & 4: Edit item date & verify moving to another day...');
  // Move March 12 Activity to March 13 2:00 PM
  updateItem(item1.id, {
    startDateTime: '2028-03-13T14:00:00.000Z',
    endDateTime: '2028-03-13T16:00:00.000Z',
  });

  const updatedGroupsAfterDateEdit = groupItemsByDay(getItems(tripId), '2028-03-10');
  const march12Group = updatedGroupsAfterDateEdit.find((g) => g.date === '2028-03-12');
  const march13Group = updatedGroupsAfterDateEdit.find((g) => g.date === '2028-03-13');

  assert(!march12Group, 'March 12 group must disappear now that it has no items');
  assert(Boolean(march13Group), 'March 13 group must exist now');
  assert(march13Group!.items.length === 1, 'March 13 group must contain the moved activity');
  assert(march13Group!.items[0].id === item1.id, 'March 13 group item must be item1');
  assert(
    formatItineraryTime(march13Group!.items[0].startDateTime) === '2:00 PM',
    'Activity time on March 13 must be 2:00 PM'
  );
  console.log('  ✓ Item moved to March 13, and March 12 disappeared as expected');

  // =========================================================================
  // SUB-TEST 5 & 6: Delete an item -> Verify day becomes empty or disappears
  // =========================================================================
  console.log('\n[TEST 5] Sub-test 5 & 6: Delete an item & verify day disappears per design...');
  // Delete the Train on March 15
  const deleted = deleteItem(item4.id);
  assert(deleted, 'Train item must be deleted');
  assert(getItem(item4.id) === undefined, 'Deleted item must not exist in store');

  const updatedGroupsAfterDelete = groupItemsByDay(getItems(tripId), '2028-03-10');
  const march15Group = updatedGroupsAfterDelete.find((g) => g.date === '2028-03-15');
  assert(!march15Group, 'March 15 must disappear completely from day groups');
  console.log('  ✓ Train deleted and March 15 day group disappeared from timeline per design');

  // =========================================================================
  // SUB-TEST 7 & 8: Add an overnight flight -> Verify start/end dates representation
  // =========================================================================
  console.log('\n[TEST 6] Sub-test 7 & 8: Add overnight flight & verify start/end dates representation...');
  // Add Overnight Flight: Departs March 16 11:00 PM, Arrives March 17 7:00 AM
  const overnightFlight = addItem({
    tripId,
    type: 'flight',
    title: 'Overnight Flight to London (LHR)',
    startDateTime: '2028-03-16T23:00:00.000Z',
    endDateTime: '2028-03-17T07:00:00.000Z',
    location: 'HND → LHR',
    metadata: {
      airline: 'British Airways',
      flightNumber: 'BA008',
      departureAirport: 'HND',
      arrivalAirport: 'LHR',
      departureCity: 'Tokyo',
      arrivalCity: 'London',
    },
  });

  const tripItemsWithOvernight = getItems(tripId);
  const groupsWithOvernight = groupItemsByDay(tripItemsWithOvernight, '2028-03-10');
  const march16Group = groupsWithOvernight.find((g) => g.date === '2028-03-16');
  const march17Group = groupsWithOvernight.find((g) => g.date === '2028-03-17');

  assert(Boolean(march16Group), 'Overnight flight must be grouped under departure date (March 16)');
  assert(!march17Group, 'Arrival date without items must not create an empty group');
  assert(march16Group!.items[0].id === overnightFlight.id, 'March 16 item is the overnight flight');

  // Verify multi-day item detection
  const isMultiDay = isMultiDayItem(overnightFlight.startDateTime, overnightFlight.endDateTime);
  assert(isMultiDay === true, 'isMultiDayItem must return true for overnight flight');

  // Verify time formatting
  const depTime = formatItineraryTime(overnightFlight.startDateTime);
  const arrTime = formatItineraryTime(overnightFlight.endDateTime);
  assert(depTime === '11:00 PM', `Departure time must be 11:00 PM, got ${depTime}`);
  assert(arrTime === '7:00 AM', `Arrival time must be 7:00 AM, got ${arrTime}`);

  // Verify date formatting
  const depDate = formatItineraryDate(overnightFlight.startDateTime, 'short');
  const arrDate = formatItineraryDate(overnightFlight.endDateTime, 'short');
  assert(depDate === 'Mar 16', `Departure date must be Mar 16, got ${depDate}`);
  assert(arrDate === 'Mar 17', `Arrival date must be Mar 17, got ${arrDate}`);

  // Verify date range formatting with times
  const rangeWithTimes = formatDateRange(overnightFlight.startDateTime, overnightFlight.endDateTime, {
    includeTimes: true,
  });
  console.log(`  Overnight flight range with times: "${rangeWithTimes}"`);
  assert(
    rangeWithTimes === 'Mar 16, 11:00 PM – Mar 17, 7:00 AM',
    `Date range with times must be "Mar 16, 11:00 PM – Mar 17, 7:00 AM", got "${rangeWithTimes}"`
  );

  // Verify date range formatting without times
  const rangeDatesOnly = formatDateRange(overnightFlight.startDateTime, overnightFlight.endDateTime, {
    includeTimes: false,
  });
  console.log(`  Overnight flight dates only: "${rangeDatesOnly}"`);
  assert(
    rangeDatesOnly === 'Mar 16 – Mar 17',
    `Date range dates only must be "Mar 16 – Mar 17", got "${rangeDatesOnly}"`
  );

  console.log('  ✓ Overnight flight start/end dates correctly represented across all formatters!');

  console.log('\n============================================================');
  console.log('ALL STRICT ITINERARY STATE & ORDERING TESTS PASSED (100%)');
  console.log('============================================================\n');
}
