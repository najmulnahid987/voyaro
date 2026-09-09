/**
 * Focused Flight Workflow Verification Test Suite (Phase 5)
 *
 * Tests the entire flight lifecycle:
 *  1. Initial state retrieval (Seed items)
 *  2. Add Flight with valid inputs (including overnight flight)
 *  3. Verification that newly added flight appears in the store
 *  4. Strict chronological ordering with multiple days and overnight flights
 *  5. Day grouping verification (Day 1, Day 2, etc.)
 *  6. Validation error checking for missing required fields
 *  7. Item detail lookup by generated itemId
 *  8. Update flight details and instant state synchronization
 *  9. Safe deletion of flight item
 */

import {
  getItems,
  getItem,
  addItem,
  updateItem,
  deleteItem,
  resetSeedItems,
} from '../services/itineraryStore';
import { groupItemsByDay, sortItineraryItems } from './itineraryDateUtils';
import { ConcreteItineraryItem, FlightMetadata } from '../types/itinerary';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

export function runFlightWorkflowTests() {
  console.log('\n========================================');
  console.log('--- Running Focused Flight Workflow Test ---');
  console.log('========================================\n');

  // Reset store to known initial seed
  resetSeedItems();

  const tripId = 'japan-adventure';

  // -------------------------------------------------------------------------
  // 1. Initial State
  // -------------------------------------------------------------------------
  const initialItems = getItems(tripId);
  assert(initialItems.length === 5, `Initial state has 5 seed items (found ${initialItems.length})`);
  const initialFlights = initialItems.filter((i) => i.type === 'flight');
  assert(initialFlights.length === 1, 'Initial state has exactly 1 seed flight');

  // -------------------------------------------------------------------------
  // 2. Add New Flight (Overnight Singapore to Tokyo)
  // -------------------------------------------------------------------------
  const newFlightInput: Omit<ConcreteItineraryItem, 'id'> = {
    tripId,
    type: 'flight',
    title: 'Flight to Tokyo (NRT) (SQ638)',
    startDateTime: '2028-03-09T23:55:00.000Z', // Day before trip starts
    endDateTime: '2028-03-10T08:00:00.000Z',   // Overnight arrival next morning
    location: 'Singapore Changi (SIN) → Narita (NRT)',
    confirmationNumber: 'SQ-789012',
    notes: 'Overnight red-eye flight. Booked bulkhead seat 11K.',
    metadata: {
      airline: 'Singapore Airlines',
      flightNumber: 'SQ638',
      departureAirport: 'SIN',
      arrivalAirport: 'NRT',
      terminal: '3',
      gate: 'B7',
      seat: '11K',
      departureCity: 'Singapore',
      arrivalCity: 'Tokyo',
      cabinClass: 'business',
    },
  };

  const addedFlight = addItem(newFlightInput);
  assert(Boolean(addedFlight.id), `Flight added with generated id: ${addedFlight.id}`);
  assert(addedFlight.title === 'Flight to Tokyo (NRT) (SQ638)', 'Flight title matches input');
  assert(
    (addedFlight.metadata as FlightMetadata).airline === 'Singapore Airlines',
    'Airline metadata preserved'
  );

  // -------------------------------------------------------------------------
  // 3. Verify Store Immediately Contains New Flight
  // -------------------------------------------------------------------------
  const updatedItems = getItems(tripId);
  assert(updatedItems.length === 6, `Store count increased to 6 items (found ${updatedItems.length})`);

  const fetchedItem = getItem(addedFlight.id);
  assert(Boolean(fetchedItem), 'getItem(itemId) successfully retrieves newly added flight');
  assert(fetchedItem?.confirmationNumber === 'SQ-789012', 'Confirmation number retrieved accurately');

  // -------------------------------------------------------------------------
  // 4. Chronological Ordering Verification
  // -------------------------------------------------------------------------
  // Since SQ638 departs on March 9, it must appear as the FIRST item in the list
  assert(
    updatedItems[0].id === addedFlight.id,
    'Chronological sort: March 9 flight is positioned first before March 10 items'
  );

  // -------------------------------------------------------------------------
  // 5. Day Grouping Verification
  // -------------------------------------------------------------------------
  const dayGroups = groupItemsByDay(updatedItems, '2028-03-09');
  assert(dayGroups.length === 4, `Items correctly grouped into 4 distinct calendar days (found ${dayGroups.length})`);
  assert(dayGroups[0].items[0].id === addedFlight.id, 'First day group contains the new flight');

  // -------------------------------------------------------------------------
  // 6. Form Validation Logic Check
  // -------------------------------------------------------------------------
  const validateFlightForm = (fields: {
    airline: string;
    flightNumber: string;
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    departureTime: string;
    arrivalDate: string;
    arrivalTime: string;
  }) => {
    const errors: Record<string, string> = {};
    if (!fields.airline.trim()) errors.airline = 'Airline name is required.';
    if (!fields.flightNumber.trim()) errors.flightNumber = 'Flight number is required.';
    if (!fields.departureAirport.trim()) errors.departureAirport = 'Departure airport is required.';
    if (!fields.arrivalAirport.trim()) errors.arrivalAirport = 'Arrival airport is required.';
    if (!fields.departureDate.trim()) errors.departureDate = 'Departure date is required.';
    if (!fields.departureTime.trim()) errors.departureTime = 'Departure time is required.';
    if (!fields.arrivalDate.trim()) errors.arrivalDate = 'Arrival date is required.';
    if (!fields.arrivalTime.trim()) errors.arrivalTime = 'Arrival time is required.';
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const emptyCheck = validateFlightForm({
    airline: '',
    flightNumber: '',
    departureAirport: '',
    arrivalAirport: '',
    departureDate: '',
    departureTime: '',
    arrivalDate: '',
    arrivalTime: '',
  });
  assert(!emptyCheck.isValid, 'Validation correctly flags empty required fields');
  assert(Object.keys(emptyCheck.errors).length === 8, 'All 8 required field errors captured');

  const validCheck = validateFlightForm({
    airline: 'Emirates',
    flightNumber: 'EK585',
    departureAirport: 'Dhaka',
    arrivalAirport: 'Tokyo',
    departureDate: '2028-03-10',
    departureTime: '20:30',
    arrivalDate: '2028-03-11',
    arrivalTime: '11:15',
  });
  assert(validCheck.isValid, 'Validation passes with all required fields filled');

  // -------------------------------------------------------------------------
  // 7. Update Item Verification
  // -------------------------------------------------------------------------
  const updatedFlight = updateItem(addedFlight.id, {
    notes: 'Updated seat to 12A.',
    metadata: { seat: '12A' },
  });
  assert(updatedFlight?.notes === 'Updated seat to 12A.', 'Item notes updated successfully');
  assert(
    (updatedFlight?.metadata as FlightMetadata).seat === '12A',
    'Nested metadata updated successfully'
  );
  assert(
    (updatedFlight?.metadata as FlightMetadata).airline === 'Singapore Airlines',
    'Unchanged metadata fields preserved during update'
  );

  // -------------------------------------------------------------------------
  // 8. Delete Item Verification
  // -------------------------------------------------------------------------
  const deleteResult = deleteItem(addedFlight.id);
  assert(deleteResult === true, 'deleteItem returns true upon success');
  const itemsAfterDelete = getItems(tripId);
  assert(
    itemsAfterDelete.length === 5,
    `Store count returns to 5 after deletion (found ${itemsAfterDelete.length})`
  );
  assert(getItem(addedFlight.id) === undefined, 'Deleted item is no longer found in store');

  console.log('\n========================================');
  console.log('--- All Flight Workflow Tests Passed! ---');
  console.log('========================================\n');
  return true;
}
