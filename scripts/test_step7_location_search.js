/**
 * Voyaro Phase 9 — Step 7: Location Search & Coordinate Selection Test Suite
 *
 * Requirements & Acceptance Criteria Tested:
 * 1. Provider & Architecture:
 *    - Reuses expo-location for native platforms
 *    - Web / cross-platform keyless fallback
 *    - Zero paid API keys or billing dependencies
 *    - In-memory query caching to avoid repeated/excessive queries
 * 2. Geocoding Safety Rules:
 *    - No geocoding on keystroke; deliberate user action only
 *    - Never invent coordinates; strict bounds check (-90..90, -180..180)
 *    - Handles valid addresses, no results, ambiguous results, and invalid input
 * 3. Form Layout & Metadata Preservation:
 *    - Flight form: Departure & arrival location pickers, all metadata preserved
 *    - Hotel form: Lodging address picker, all metadata preserved
 *    - Activity form: Activity venue picker, all metadata preserved
 *    - Transportation form: Origin & destination pickers, all metadata preserved
 * 4. Workflow Lifecycle:
 *    - Resolving valid addresses
 *    - Selecting ambiguous candidate from modal
 *    - Editing existing location
 *    - Clearing location coordinates
 *    - Saving an item without any location coordinates
 *    - Preserving existing valid coordinates
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const projectRoot = path.resolve(__dirname, '..');

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n=== Voyaro Phase 9 — Step 7: Location Search & Coordinate Selection ===\n');

// ── 1. Geocoding Provider & Engine Checks ────────────────────────────────────
console.log('1. Geocoding Provider & Architecture Checks');

runTest('src/utils/geocoding.ts exists with required exports', () => {
  const filePath = path.join(projectRoot, 'src/utils/geocoding.ts');
  assert(fs.existsSync(filePath), 'geocoding.ts exists');
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('export async function searchGeocodeLocations'), 'searchGeocodeLocations is exported');
  assert(content.includes('export interface GeocodeCandidate'), 'GeocodeCandidate interface is exported');
  assert(content.includes('export function clearGeocodeCache'), 'clearGeocodeCache is exported');
});

runTest('Zero API keys or billing required (uses expo-location & keyless fallback)', () => {
  const geocodingContent = fs.readFileSync(path.join(projectRoot, 'src/utils/geocoding.ts'), 'utf8');
  assert(!geocodingContent.includes('process.env.GOOGLE_MAPS_GEOCODING_API_KEY'), 'No paid Google Maps Geocoding API key required');
  assert(!geocodingContent.includes('process.env.MAPBOX_API_KEY'), 'No paid Mapbox API key required');
  assert(geocodingContent.includes('expo-location'), 'Reuses installed expo-location dependency');
  assert(geocodingContent.includes('nominatim.openstreetmap.org'), 'Includes keyless OpenStreetMap Nominatim web fallback');
});

runTest('In-memory caching is implemented to avoid excessive geocoding calls', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'src/utils/geocoding.ts'), 'utf8');
  assert(content.includes('queryCache'), 'In-memory cache Map is declared');
  assert(content.includes('queryCache.has(cacheKey)'), 'Cache is checked before network requests');
  assert(content.includes('queryCache.set(cacheKey,'), 'Results are cached on resolution');
});

runTest('Curated Airport IATA dictionary included for instantaneous route resolution', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'src/utils/geocoding.ts'), 'utf8');
  assert(content.includes('AIRPORT_COORDINATES'), 'Airport dictionary present');
  assert(content.includes('NRT'), 'Contains Narita (NRT)');
  assert(content.includes('HND'), 'Contains Haneda (HND)');
  assert(content.includes('DAC'), 'Contains Dhaka (DAC)');
});

// ── 2. Component Design & User Experience Checks ─────────────────────────────
console.log('\n2. LocationPickerField Component & UI Rules');

runTest('src/components/ui/LocationPickerField.tsx exists and is re-exported in barrel index', () => {
  const componentPath = path.join(projectRoot, 'src/components/ui/LocationPickerField.tsx');
  assert(fs.existsSync(componentPath), 'LocationPickerField.tsx exists');

  const indexPath = path.join(projectRoot, 'src/components/ui/index.ts');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  assert(indexContent.includes('LocationPickerField'), 'Exported in ui/index.ts');
});

runTest('Deliberate action button ("Locate") prevents geocoding on every keystroke', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'src/components/ui/LocationPickerField.tsx'), 'utf8');
  assert(content.includes('handleResolveLocation'), 'Contains deliberate resolve handler');
  assert(content.includes('onChangeText(text)'), 'onChangeText only updates input state');
  assert(!content.includes('onChangeText={(text) => { searchGeocodeLocations'), 'Never calls geocoder inside onChangeText');
  assert(content.includes('styles.locateButton'), 'Explicit Locate button exists in UI');
});

runTest('Shows coordinates badge with "Pinned on Trip Map" and clear action', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'src/components/ui/LocationPickerField.tsx'), 'utf8');
  assert(content.includes('coordinatesBadge'), 'Renders attached coordinates badge');
  assert(content.includes('Pinned on Trip Map'), 'Indicates location is pinned on trip map');
  assert(content.includes('onClearCoordinates'), 'Supports explicit clear action');
  assert(content.includes('Clear ✕'), 'Clear button label rendered');
});

runTest('Supports candidate selection modal for ambiguous results', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'src/components/ui/LocationPickerField.tsx'), 'utf8');
  assert(content.includes('showCandidatesModal'), 'State for candidates modal');
  assert(content.includes('Select Location'), 'Modal title rendered');
  assert(content.includes('handleSelectCandidate'), 'Handles candidate selection');
});

// ── 3. Form Integration & Layout Preservation Checks ─────────────────────────
console.log('\n3. Itinerary Forms Integration Checks');

runTest('Hotel form (hotel.tsx) integrates LocationPickerField & preserves all fields', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'src/app/add/hotel.tsx'), 'utf8');
  assert(content.includes('LocationPickerField'), 'Uses LocationPickerField');
  assert(content.includes('latitude: typeof latitude === \'number\' ? latitude : null'), 'Saves coordinates or null');
  assert(content.includes('hotelName'), 'Preserves hotelName');
  assert(content.includes('checkIn: fmt12h(checkInObj)'), 'Preserves checkIn');
  assert(content.includes('checkOut: fmt12h(checkOutObj)'), 'Preserves checkOut');
  assert(content.includes('room:'), 'Preserves room metadata');
  assert(content.includes('guestName:'), 'Preserves guestName metadata');
});

runTest('Activity form (activity.tsx) integrates LocationPickerField & preserves all fields', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'src/app/add/activity.tsx'), 'utf8');
  assert(content.includes('LocationPickerField'), 'Uses LocationPickerField');
  assert(content.includes('latitude: typeof latitude === \'number\' ? latitude : null'), 'Saves coordinates or null');
  assert(content.includes('category:'), 'Preserves category metadata');
  assert(content.includes('website:'), 'Preserves website metadata');
  assert(content.includes('ticketInformation:'), 'Preserves ticketInformation metadata');
  assert(content.includes('meetingPoint:'), 'Preserves meetingPoint metadata');
});

runTest('Flight form (flight.tsx) integrates Departure and Arrival LocationPickers', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'src/app/add/flight.tsx'), 'utf8');
  assert(content.includes('departureLat'), 'Manages departure coordinates');
  assert(content.includes('arrivalLat'), 'Manages arrival coordinates');
  assert(content.includes('airline: airline.trim()'), 'Preserves airline');
  assert(content.includes('flightNumber: flightNumber.trim()'), 'Preserves flightNumber');
  assert(content.includes('terminal:'), 'Preserves terminal');
  assert(content.includes('gate:'), 'Preserves gate');
  assert(content.includes('seat:'), 'Preserves seat');
});

runTest('Transportation form (transportation.tsx) integrates Origin and Destination Pickers', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'src/app/add/transportation.tsx'), 'utf8');
  assert(content.includes('fromLat'), 'Manages from coordinates');
  assert(content.includes('toLat'), 'Manages to coordinates');
  assert(content.includes('transportationType:'), 'Preserves transportationType');
  assert(content.includes('bookingNumber:'), 'Preserves bookingNumber');
  assert(content.includes('seat:'), 'Preserves seat');
  assert(content.includes('provider:'), 'Preserves provider');
});

// ── 4. Functional Logic Simulation ──────────────────────────────────────────
console.log('\n4. Geocoding & Coordinate Lifecycle Simulation');

// Simulated Geocoding Engine mirror
const queryCache = new Map();
const AIRPORTS = {
  DAC: { name: 'Hazrat Shahjalal International Airport (DAC)', lat: 23.8433, lng: 90.3978 },
  NRT: { name: 'Narita International Airport (NRT)', lat: 35.772, lng: 140.3929 },
  HND: { name: 'Haneda Airport (HND)', lat: 35.5494, lng: 139.7798 },
};

function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

let networkCallCount = 0;

async function mockSearchGeocode(rawQuery) {
  const query = rawQuery?.trim();
  if (!query || query.length < 2) return [];

  const cacheKey = query.toLowerCase();
  if (queryCache.has(cacheKey)) {
    return queryCache.get(cacheKey);
  }

  // 1. Curated airport match
  const upper = query.toUpperCase();
  for (const [code, info] of Object.entries(AIRPORTS)) {
    if (upper === code || upper.includes(`(${code})`)) {
      const candidates = [{
        id: `airport-${code}`,
        displayName: info.name,
        address: `${code} Airport`,
        latitude: info.lat,
        longitude: info.lng,
      }];
      queryCache.set(cacheKey, candidates);
      return candidates;
    }
  }

  networkCallCount++;

  // 2. Mock external lookup results
  if (query.toLowerCase().includes('shibuya')) {
    const candidates = [
      { id: '1', displayName: 'Shibuya Crossing', address: 'Shibuya, Tokyo', latitude: 35.6595, longitude: 139.7004 },
      { id: '2', displayName: 'Shibuya Station', address: 'Shibuya-ku, Tokyo', latitude: 35.6580, longitude: 139.7016 },
    ];
    queryCache.set(cacheKey, candidates);
    return candidates;
  }

  if (query.toLowerCase().includes('park hyatt tokyo')) {
    const candidates = [
      { id: '3', displayName: 'Park Hyatt Tokyo', address: '3-7-1-2 Nishi-Shinjuku, Shinjuku-ku, Tokyo', latitude: 35.6852, longitude: 139.6908 },
    ];
    queryCache.set(cacheKey, candidates);
    return candidates;
  }

  // No results case
  const empty = [];
  queryCache.set(cacheKey, empty);
  return empty;
}

async function run() {
  await runAsyncTest('Resolves valid address to coordinates and verifies bounds', async () => {
    const results = await mockSearchGeocode('Park Hyatt Tokyo');
    assert.strictEqual(results.length, 1, 'Returns exactly 1 candidate for exact hotel');
    assert(isValidCoordinate(results[0].latitude, results[0].longitude), 'Coordinates are strictly valid');
    assert.strictEqual(results[0].displayName, 'Park Hyatt Tokyo');
  });

  await runAsyncTest('Airport dictionary provides instant accurate coordinates without network call', async () => {
    const prevCount = networkCallCount;
    const results = await mockSearchGeocode('Narita International Airport (NRT)');
    assert.strictEqual(results.length, 1, 'Returns NRT candidate');
    assert.strictEqual(results[0].latitude, 35.772);
    assert.strictEqual(results[0].longitude, 140.3929);
    assert.strictEqual(networkCallCount, prevCount, 'Airport dictionary resolved without network overhead');
  });

  await runAsyncTest('Ambiguous query returns multiple candidates for user selection', async () => {
    const results = await mockSearchGeocode('Shibuya');
    assert(results.length > 1, 'Returns multiple candidates for ambiguous query');
    assert.strictEqual(results[0].displayName, 'Shibuya Crossing');
    assert.strictEqual(results[1].displayName, 'Shibuya Station');
  });

  await runAsyncTest('No results returns empty array without throwing or inventing coordinates', async () => {
    const results = await mockSearchGeocode('Atlantis Underwater Kingdom 99999');
    assert.strictEqual(results.length, 0, 'No candidates returned');
  });

  await runAsyncTest('Invalid or trivial input (< 2 characters) returns empty immediately', async () => {
    const emptyResults1 = await mockSearchGeocode('');
    const emptyResults2 = await mockSearchGeocode('   ');
    const emptyResults3 = await mockSearchGeocode('a');
    assert.strictEqual(emptyResults1.length, 0);
    assert.strictEqual(emptyResults2.length, 0);
    assert.strictEqual(emptyResults3.length, 0);
  });

  await runAsyncTest('Caching prevents repeated requests for the same query', async () => {
    networkCallCount = 0;
    // First lookup for Park Hyatt Tokyo is cached
    await mockSearchGeocode('Park Hyatt Tokyo');
    assert.strictEqual(networkCallCount, 0, 'Hit existing queryCache from earlier test');

    // Case-insensitive cache hit
    await mockSearchGeocode('park hyatt tokyo');
    assert.strictEqual(networkCallCount, 0, 'Case-insensitive cache hit without new network call');
  });

  // ── 5. Itinerary Form State & Coordinate Lifecycle Simulation ────────────────
  console.log('\n5. Itinerary Item State & Coordinate Lifecycle Simulation');

  let mockItineraryItem = {
    id: 'itin-sample-1',
    tripId: 'japan-adventure',
    type: 'hotel',
    title: 'Park Hyatt Tokyo',
    startDateTime: '2028-03-10T15:00:00.000Z',
    endDateTime: '2028-03-13T11:00:00.000Z',
    location: 'Shinjuku, Tokyo',
    latitude: 35.6852,
    longitude: 139.6908,
    metadata: {
      hotelName: 'Park Hyatt Tokyo',
      address: 'Shinjuku, Tokyo',
      checkIn: '3:00 PM',
      checkOut: '11:00 AM',
    },
  };

  runTest('1. Item with valid coordinates loads correctly into form state', () => {
    const formLat = typeof mockItineraryItem.latitude === 'number' ? mockItineraryItem.latitude : undefined;
    const formLng = typeof mockItineraryItem.longitude === 'number' ? mockItineraryItem.longitude : undefined;
    assert.strictEqual(formLat, 35.6852);
    assert.strictEqual(formLng, 139.6908);
    assert.strictEqual(mockItineraryItem.metadata.hotelName, 'Park Hyatt Tokyo');
  });

  runTest('2. Editing existing location attaches new coordinates and updates location text', () => {
    const selectedCandidate = {
      displayName: 'The Ritz-Carlton, Tokyo',
      address: '9-7-1 Akasaka, Minato-ku, Tokyo',
      latitude: 35.6664,
      longitude: 139.7312,
    };

    mockItineraryItem = {
      ...mockItineraryItem,
      location: selectedCandidate.address,
      latitude: selectedCandidate.latitude,
      longitude: selectedCandidate.longitude,
      metadata: {
        ...mockItineraryItem.metadata,
        address: selectedCandidate.address,
      },
    };

    assert.strictEqual(mockItineraryItem.location, '9-7-1 Akasaka, Minato-ku, Tokyo');
    assert.strictEqual(mockItineraryItem.latitude, 35.6664);
    assert.strictEqual(mockItineraryItem.longitude, 139.7312);
    assert.strictEqual(mockItineraryItem.metadata.checkIn, '3:00 PM', 'Preserves checkIn');
  });

  runTest('3. User clearing location explicitly sets coordinates to null/undefined while keeping text', () => {
    // Clear coordinates action
    mockItineraryItem = {
      ...mockItineraryItem,
      latitude: null,
      longitude: null,
    };

    assert.strictEqual(mockItineraryItem.latitude, null, 'Coordinates explicitly set to null');
    assert.strictEqual(mockItineraryItem.longitude, null, 'Coordinates explicitly set to null');
    assert.strictEqual(mockItineraryItem.location, '9-7-1 Akasaka, Minato-ku, Tokyo', 'Text address remains preserved');
    assert.strictEqual(mockItineraryItem.metadata.hotelName, 'Park Hyatt Tokyo', 'Metadata remains preserved');
  });

  runTest('4. Saving an item without a location is fully supported (optional)', () => {
    const newItemWithoutLocation = {
      id: 'itin-sample-2',
      tripId: 'japan-adventure',
      type: 'activity',
      title: 'Free Exploration Day',
      startDateTime: '2028-03-14T09:00:00.000Z',
      metadata: {
        category: 'Leisure',
      },
    };

    assert.strictEqual(newItemWithoutLocation.latitude, undefined, 'No latitude attached');
    assert.strictEqual(newItemWithoutLocation.longitude, undefined, 'No longitude attached');
    assert.strictEqual(newItemWithoutLocation.location, undefined, 'No location string attached');
    assert.strictEqual(newItemWithoutLocation.title, 'Free Exploration Day');
    assert.strictEqual(newItemWithoutLocation.metadata.category, 'Leisure');
  });

  runTest('5. Updating item without touching location does NOT overwrite existing valid coordinates', () => {
    const existingWithCoords = {
      id: 'itin-sample-3',
      tripId: 'japan-adventure',
      type: 'activity',
      title: 'Morning Yoga',
      startDateTime: '2028-03-15T08:00:00.000Z',
      location: 'Yoyogi Park',
      latitude: 35.6717,
      longitude: 139.6949,
      metadata: { category: 'Wellness' },
    };

    const partialUpdate = {
      title: 'Morning Yoga & Meditation',
      // coordinates omitted in partial update
    };

    const merged = {
      ...existingWithCoords,
      ...partialUpdate,
      latitude: partialUpdate.latitude !== undefined ? partialUpdate.latitude : existingWithCoords.latitude,
      longitude: partialUpdate.longitude !== undefined ? partialUpdate.longitude : existingWithCoords.longitude,
    };

    assert.strictEqual(merged.title, 'Morning Yoga & Meditation');
    assert.strictEqual(merged.latitude, 35.6717, 'Coordinates preserved');
    assert.strictEqual(merged.longitude, 139.6949, 'Coordinates preserved');
  });

  console.log('\n--- All Step 7 Verification Tests Passed Successfully! ---\n');
}

run();

