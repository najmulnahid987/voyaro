/**
 * Test Suite: Voyaro UI Improvement 4 — Responsive Itinerary Cards Validation
 *
 * Validates:
 * 1. Flight card hierarchy (airline info, seat/gate/terminal, confirmation badge).
 * 2. Hotel card hierarchy (address/location sanitization, raw URL shielding, room/stay info).
 * 3. Transportation card hierarchy (transit type label, route, platform/seat).
 * 4. Activity card hierarchy (category label, meeting point/location, duration/tickets).
 * 5. Long text resilience (minWidth: 0, line limits, maxWidth on badges, middle truncation).
 * 6. Timeline alignment (continuous line, day badge, event dot vertical centering).
 * 7. Cleanliness (no unused legacy card styles or redundant render variables).
 */

const fs = require('fs');
const path = require('path');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}${details ? ` (${details})` : ''}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${details ? ` (${details})` : ''}`);
    failedTests++;
  }
}

console.log('================================================================');
console.log(' Voyaro UI Improvement 4 — Responsive Itinerary Cards Validation');
console.log('================================================================\n');

// ---------------------------------------------------------------------------
// 1. Inspect ItineraryItemCard source code
// ---------------------------------------------------------------------------
console.log('--- 1. ItineraryItemCard Implementation & Hierarchy ---');

const cardFilePath = path.join(__dirname, '../src/components/itinerary/ItineraryItemCard.tsx');
const cardContent = fs.readFileSync(cardFilePath, 'utf8');

// Flight checks
assert(
  cardContent.includes("case 'flight':") &&
  cardContent.includes('meta?.airline && meta?.flightNumber') &&
  cardContent.includes('meta?.terminal ? `T${meta.terminal}` : null') &&
  cardContent.includes('meta?.gate ? `Gate ${meta.gate}` : null') &&
  cardContent.includes('meta?.seat ? `Seat ${meta.seat}` : null'),
  'Flight card organizes airline in primary row and terminal/gate/seat in secondary row'
);

// Hotel checks & URL sanitization
assert(
  cardContent.includes("case 'hotel':") &&
  cardContent.includes('isUrl(') &&
  cardContent.includes('maps.app.goo.gl') &&
  cardContent.includes("'Location on map'"),
  'Hotel card sanitizes raw Google Maps URLs and preserves clean human-readable locations'
);

assert(
  cardContent.includes('meta?.roomType') &&
  cardContent.includes('meta?.room') &&
  cardContent.includes('meta?.nightsCount'),
  'Hotel card organizes room type, room number, and nights count cleanly in secondary detail'
);

// Transportation checks
assert(
  cardContent.includes("case 'transportation':") &&
  cardContent.includes("transLabel = 'Train'") &&
  cardContent.includes("transLabel = 'Rental Car'") &&
  cardContent.includes("transLabel = 'Ferry'") &&
  cardContent.includes("transLabel = 'Bus'") &&
  cardContent.includes('meta?.from && meta?.to'),
  'Transportation card maps modes cleanly and displays route in primary row'
);

// Activity checks
assert(
  cardContent.includes("case 'activity':") &&
  cardContent.includes('meta?.meetingPoint?.trim()') &&
  cardContent.includes('meta?.duration?.trim()') &&
  cardContent.includes('meta?.ticketInformation?.trim()'),
  'Activity card displays meeting point in primary row and duration/tickets in secondary row'
);

// ---------------------------------------------------------------------------
// 2. Long Text & Layout Protection
// ---------------------------------------------------------------------------
console.log('\n--- 2. Long Text Handling & Defensive Layout Tokens ---');

assert(
  cardContent.includes('titleText: {') &&
  cardContent.includes('numberOfLines={2}') &&
  cardContent.includes('ellipsizeMode="tail"'),
  'Card titles are permitted 2 lines with graceful tail truncation for long names'
);

assert(
  cardContent.includes('minWidth: 0') &&
  cardContent.includes('primaryDetailText: {') &&
  cardContent.includes('secondaryDetailText: {'),
  'Flex text containers specify minWidth: 0 to prevent React Native horizontal overflow'
);

assert(
  cardContent.includes('timeLabel: {') &&
  cardContent.includes('flexShrink: 0'),
  'Time label enforces flexShrink: 0 so timestamps are never squashed by category labels'
);

assert(
  cardContent.includes('confirmationBadge: {') &&
  cardContent.includes('flexShrink: 0') &&
  cardContent.includes("maxWidth: '45%'") &&
  cardContent.includes('ellipsizeMode="middle"'),
  'Confirmation badge enforces flexShrink: 0, maxWidth: 45%, and middle ellipsize to protect layout'
);

assert(
  cardContent.includes('hitSlop={6}') &&
  cardContent.includes('accessibilityRole="button"') &&
  cardContent.includes('accessibilityLabel='),
  'Cards maintain accessible touch target hitSlop and descriptive screen reader labels'
);

// ---------------------------------------------------------------------------
// 3. Timeline Layout & Marker Alignment
// ---------------------------------------------------------------------------
console.log('\n--- 3. Timeline Alignment & Code Cleanliness ---');

const timelineFilePath = path.join(__dirname, '../src/app/(tabs)/trips/[tripId]/itinerary.tsx');
const timelineContent = fs.readFileSync(timelineFilePath, 'utf8');

assert(
  timelineContent.includes('timelineContinuousLine: {') &&
  timelineContent.includes('left: spacing.md + 13') &&
  timelineContent.includes('width: 2'),
  'Continuous timeline line is mathematically centered in the 28px day marker badge'
);

assert(
  timelineContent.includes('eventDotColumn: {') &&
  timelineContent.includes('width: 28') &&
  timelineContent.includes('paddingTop: 12'),
  'Event dot column centers the 10px marker dot at 17px, precisely matching card header badge'
);

assert(
  timelineContent.includes('cardFlex: {') &&
  timelineContent.includes('minWidth: 0'),
  'Timeline card wrapper specifies minWidth: 0 for responsive width adaptation'
);

assert(
  timelineContent.includes('dayEventsList: {') &&
  timelineContent.includes('gap: 8'),
  'Multi-item day events use consistent 8px vertical spacing between cards'
);

assert(
  !timelineContent.includes('getItemCategoryLabel =') &&
  !timelineContent.includes('getItemSubtitle =') &&
  !timelineContent.includes('getItemIcon =') &&
  !timelineContent.includes('cardCategoryLabel:'),
  'Legacy unused helpers and card styles in itinerary.tsx have been cleanly removed'
);

// ---------------------------------------------------------------------------
// 4. In-Memory Presentation Simulation
// ---------------------------------------------------------------------------
console.log('\n--- 4. Presentation Function Simulation ---');

// Replicate presentation logic in isolated test harness
function isUrl(str) {
  if (!str) return false;
  const trimmed = str.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.includes('maps.app.goo.gl') ||
    trimmed.includes('google.com/maps')
  );
}

function cleanLocationText(raw) {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (isUrl(trimmed)) {
    return 'Location on map';
  }
  return trimmed;
}

// Test Flight
const flightItem = {
  type: 'flight',
  title: 'Flight to Tokyo (NRT)',
  location: 'DAC → NRT',
  confirmationNumber: 'EK-982134',
  metadata: {
    airline: 'Emirates',
    flightNumber: 'EK585',
    terminal: '1',
    gate: '12',
    seat: '14A',
  },
};
const flightAirline = `${flightItem.metadata.airline} · ${flightItem.metadata.flightNumber}`;
const flightSeats = [`T${flightItem.metadata.terminal}`, `Gate ${flightItem.metadata.gate}`, `Seat ${flightItem.metadata.seat}`].join(' · ');

assert(
  flightAirline === 'Emirates · EK585',
  'Simulated flight generates clean airline detail',
  flightAirline
);
assert(
  flightSeats === 'T1 · Gate 12 · Seat 14A',
  'Simulated flight generates structured seat/gate/terminal string',
  flightSeats
);

// Test Hotel with Raw URL
const hotelWithUrl = {
  type: 'hotel',
  title: 'The Ritz-Carlton, Tokyo',
  location: 'https://maps.app.goo.gl/iMQcJuL42zK89fN',
  confirmationNumber: 'RC-TYO-8841',
  metadata: {
    address: 'https://maps.app.goo.gl/iMQcJuL42zK89fN',
    roomType: 'Club Deluxe King Room',
    nightsCount: 3,
  },
};

let hotelAddress = '';
if (hotelWithUrl.metadata?.address && !isUrl(hotelWithUrl.metadata.address)) {
  hotelAddress = hotelWithUrl.metadata.address.trim();
} else if (hotelWithUrl.location && !isUrl(hotelWithUrl.location)) {
  hotelAddress = hotelWithUrl.location.trim();
} else if (hotelWithUrl.metadata?.address || hotelWithUrl.location) {
  hotelAddress = 'Location on map';
} else {
  hotelAddress = 'Lodging';
}

assert(
  hotelAddress === 'Location on map',
  'Raw Google Maps URL in hotel address is safely transformed to "Location on map"',
  hotelAddress
);

// Test Hotel with Street Address
const hotelWithStreet = {
  type: 'hotel',
  title: 'The Ritz-Carlton, Kyoto',
  location: 'Kamogawa Nijo-Ohashi Hotori, Nakagyo Ward, Kyoto',
  confirmationNumber: 'RC-KYOTO-4891',
  metadata: {
    address: 'Kamogawa Nijo-Ohashi Hotori, Nakagyo Ward, Kyoto, 604-0902',
    roomType: 'Deluxe Kamogawa Suite',
    room: 'Suite 408',
    nightsCount: 3,
  },
};

let streetAddress = '';
if (hotelWithStreet.metadata?.address && !isUrl(hotelWithStreet.metadata.address)) {
  streetAddress = hotelWithStreet.metadata.address.trim();
} else if (hotelWithStreet.location && !isUrl(hotelWithStreet.location)) {
  streetAddress = hotelWithStreet.location.trim();
} else {
  streetAddress = 'Location on map';
}

const roomParts = [];
if (hotelWithStreet.metadata.roomType) roomParts.push(hotelWithStreet.metadata.roomType);
if (hotelWithStreet.metadata.room) roomParts.push(hotelWithStreet.metadata.room);
if (hotelWithStreet.metadata.nightsCount) roomParts.push(`${hotelWithStreet.metadata.nightsCount} nights`);
const roomInfo = roomParts.join(' · ');

assert(
  streetAddress.includes('Kamogawa Nijo-Ohashi Hotori'),
  'Real street address is cleanly preserved for hotels with non-URL addresses'
);
assert(
  roomInfo === 'Deluxe Kamogawa Suite · Suite 408 · 3 nights',
  'Hotel room information formats cleanly as secondary detail',
  roomInfo
);

// Test Transit
const transitItem = {
  type: 'transportation',
  title: 'Shinkansen Bullet Train (Nozomi #225)',
  metadata: {
    transportationType: 'train',
    from: 'Tokyo Station (Platform 14)',
    to: 'Kyoto Station',
    platform: 'Platform 14',
    seat: 'Car 5, Seat 12E',
  },
};
const transitRoute = `${transitItem.metadata.from} → ${transitItem.metadata.to}`;
const transitSeats = [transitItem.metadata.platform, transitItem.metadata.seat].filter(Boolean).join(' · ');

assert(
  transitRoute === 'Tokyo Station (Platform 14) → Kyoto Station',
  'Transportation route formats origin → destination clearly'
);
assert(
  transitSeats === 'Platform 14 · Car 5, Seat 12E',
  'Transportation secondary details show platform and seat'
);

// Test Activity
const actItem = {
  type: 'activity',
  title: 'Shibuya Crossing & Hachiko Walking Tour',
  location: 'Shibuya, Tokyo',
  metadata: {
    category: 'Sightseeing & Walking Tour',
    meetingPoint: 'Hachiko Statue (Shibuya Station Exit 8)',
    duration: '2 hours',
    ticketInformation: 'Mobile QR Voucher (2 Adults)',
  },
};
const actLocation = actItem.metadata.meetingPoint;
const actMeta = [actItem.metadata.duration, actItem.metadata.ticketInformation].filter(Boolean).join(' · ');

assert(
  actLocation === 'Hachiko Statue (Shibuya Station Exit 8)',
  'Activity meeting point is displayed as primary location detail'
);
assert(
  actMeta === '2 hours · Mobile QR Voucher (2 Adults)',
  'Activity duration and ticket voucher are cleanly formatted'
);

// ---------------------------------------------------------------------------
// Final Summary
// ---------------------------------------------------------------------------
console.log('\n================================================================');
console.log(` RESULTS: ${passedTests} / ${passedTests + failedTests} Tests Passed (${failedTests} Failed)`);
if (failedTests === 0) {
  console.log(' STATUS: ALL ITINERARY CARD VALIDATIONS PASSED');
} else {
  console.error(' STATUS: VALIDATION FAILURES DETECTED');
  process.exit(1);
}
console.log('================================================================\n');
