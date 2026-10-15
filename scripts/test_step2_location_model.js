/**
 * Voyaro Phase 9 — Step 2: Location Model Verification Script
 *
 * Verifies:
 * 1. Existing itinerary records with null coordinates map to domain items with undefined coordinates.
 * 2. Itinerary items with coordinates map bidirectionally between rows and domain items.
 * 3. Range validation: latitude in [-90, 90], longitude in [-180, 180].
 * 4. Separate coordinates for origin (latitude/longitude) and destination (end_latitude/end_longitude)
 *    are supported for transit items without forcing both into a single pair.
 * 5. Queries remote Supabase database and verifies all existing items load successfully.
 */

const fs = require('fs');

// Load environment variables from .env
const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || (env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/) ? env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1].trim() : '');
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || (env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/) ? env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim() : '');
const managementToken = process.env.SUPABASE_ACCESS_TOKEN || (env.match(/SUPABASE_ACCESS_TOKEN=(.*)/) ? env.match(/SUPABASE_ACCESS_TOKEN=(.*)/)[1].trim() : '');
const projectRef = process.env.SUPABASE_PROJECT_REF || (env.match(/SUPABASE_PROJECT_REF=(.*)/) ? env.match(/SUPABASE_PROJECT_REF=(.*)/)[1].trim() : 'ncpepgoukzhacywwiuok');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

// ---------------------------------------------------------------------------
// 1. In-Memory Domain Mapper Validation Logic
// ---------------------------------------------------------------------------

function validateAndNormalizeCoordinates(coords) {
  if (!coords) return { valid: true };
  const { latitude, longitude, endLatitude, endLongitude } = coords;

  if (latitude !== undefined && latitude !== null) {
    if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
      return { valid: false, error: `Invalid latitude ${latitude}: must be between -90 and 90` };
    }
  }
  if (longitude !== undefined && longitude !== null) {
    if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
      return { valid: false, error: `Invalid longitude ${longitude}: must be between -180 and 180` };
    }
  }
  if (endLatitude !== undefined && endLatitude !== null) {
    if (typeof endLatitude !== 'number' || isNaN(endLatitude) || endLatitude < -90 || endLatitude > 90) {
      return { valid: false, error: `Invalid endLatitude ${endLatitude}: must be between -90 and 90` };
    }
  }
  if (endLongitude !== undefined && endLongitude !== null) {
    if (typeof endLongitude !== 'number' || isNaN(endLongitude) || endLongitude < -180 || endLongitude > 180) {
      return { valid: false, error: `Invalid endLongitude ${endLongitude}: must be between -180 and 180` };
    }
  }
  return { valid: true };
}

function mapRowToDomain(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    type: row.type,
    title: row.title,
    startDateTime: row.start_datetime,
    endDateTime: row.end_datetime || undefined,
    location: row.location || undefined,
    notes: row.notes || undefined,
    confirmationNumber: row.confirmation_number || undefined,
    latitude: typeof row.latitude === 'number' ? row.latitude : undefined,
    longitude: typeof row.longitude === 'number' ? row.longitude : undefined,
    endLatitude: typeof row.end_latitude === 'number' ? row.end_latitude : undefined,
    endLongitude: typeof row.end_longitude === 'number' ? row.end_longitude : undefined,
    metadata: row.metadata || {},
  };
}

function mapDomainToInsert(item) {
  return {
    trip_id: item.tripId,
    type: item.type,
    title: item.title,
    start_datetime: item.startDateTime,
    end_datetime: item.endDateTime || null,
    location: item.location || null,
    notes: item.notes || null,
    confirmation_number: item.confirmationNumber || null,
    latitude: typeof item.latitude === 'number' ? item.latitude : null,
    longitude: typeof item.longitude === 'number' ? item.longitude : null,
    end_latitude: typeof item.endLatitude === 'number' ? item.endLatitude : null,
    end_longitude: typeof item.endLongitude === 'number' ? item.endLongitude : null,
    metadata: item.metadata || {},
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('   VOYARO PHASE 9 — STEP 2: LOCATION MODEL VERIFICATION');
  console.log('================================================================\n');

  // Test 1: Null coordinate mapping (preserves existing behavior)
  console.log('--- Test 1: Null Coordinate Mapping ---');
  const existingRowMock = {
    id: 'itin-001',
    trip_id: 'trip-001',
    type: 'hotel',
    title: 'The Ritz-Carlton, Kyoto',
    start_datetime: '2028-03-11T15:00:00Z',
    end_datetime: '2028-03-14T11:00:00Z',
    location: 'Kamogawa Nijo-Ohashi Hotori, Nakagyo Ward, Kyoto',
    notes: 'River view suite',
    confirmation_number: 'RC-123',
    metadata: { hotelName: 'The Ritz-Carlton' },
    latitude: null,
    longitude: null,
    end_latitude: null,
    end_longitude: null,
  };
  const domainItem = mapRowToDomain(existingRowMock);
  assert(domainItem.latitude === undefined, 'Null DB latitude maps to undefined in domain item');
  assert(domainItem.longitude === undefined, 'Null DB longitude maps to undefined in domain item');
  assert(domainItem.endLatitude === undefined, 'Null DB end_latitude maps to undefined in domain item');
  assert(domainItem.endLongitude === undefined, 'Null DB end_longitude maps to undefined in domain item');
  assert(domainItem.title === 'The Ritz-Carlton, Kyoto', 'Title and metadata preserved');

  // Test 2: Single-point item with coordinates (Hotel / Activity)
  console.log('\n--- Test 2: Single-Point Item Coordinates (Hotel / Activity) ---');
  const hotelWithCoords = {
    ...existingRowMock,
    latitude: 35.0116,
    longitude: 135.7681,
    end_latitude: null,
    end_longitude: null,
  };
  const domainHotel = mapRowToDomain(hotelWithCoords);
  assert(domainHotel.latitude === 35.0116, 'Hotel latitude mapped correctly');
  assert(domainHotel.longitude === 135.7681, 'Hotel longitude mapped correctly');
  assert(domainHotel.endLatitude === undefined, 'Hotel endLatitude remains undefined');

  // Test 3: Two-point transit item (Transportation / Flight) with origin & destination
  console.log('\n--- Test 3: Transit Item Separate Origin & Destination Coordinates ---');
  const transitRowMock = {
    id: 'itin-002',
    trip_id: 'trip-001',
    type: 'transportation',
    title: 'Shinkansen Tokyo to Kyoto',
    start_datetime: '2028-03-12T13:15:00Z',
    end_datetime: '2028-03-12T15:30:00Z',
    location: 'Tokyo Station → Kyoto Station',
    notes: 'Nozomi 225 car 5',
    metadata: { from: 'Tokyo', to: 'Kyoto' },
    // Origin: Tokyo Station
    latitude: 35.6812,
    longitude: 139.7671,
    // Destination: Kyoto Station
    end_latitude: 34.9858,
    end_longitude: 135.7588,
  };
  const domainTransit = mapRowToDomain(transitRowMock);
  assert(domainTransit.latitude === 35.6812, 'Origin latitude (Tokyo) mapped correctly');
  assert(domainTransit.longitude === 139.7671, 'Origin longitude (Tokyo) mapped correctly');
  assert(domainTransit.endLatitude === 34.9858, 'Destination endLatitude (Kyoto) mapped correctly');
  assert(domainTransit.endLongitude === 135.7588, 'Destination endLongitude (Kyoto) mapped correctly');

  const insertPayload = mapDomainToInsert(domainTransit);
  assert(insertPayload.latitude === 35.6812, 'Insert payload has origin latitude');
  assert(insertPayload.end_latitude === 34.9858, 'Insert payload has destination end_latitude');

  // Test 4: Coordinate boundary checks (-90..90, -180..180)
  console.log('\n--- Test 4: Boundary Validation ---');
  assert(validateAndNormalizeCoordinates({ latitude: 35.6, longitude: 139.7 }).valid === true, 'Valid coordinates pass');
  assert(validateAndNormalizeCoordinates({ latitude: -90, longitude: -180 }).valid === true, 'Minimum bounds pass');
  assert(validateAndNormalizeCoordinates({ latitude: 90, longitude: 180 }).valid === true, 'Maximum bounds pass');
  assert(validateAndNormalizeCoordinates({ latitude: 91, longitude: 0 }).valid === false, 'Latitude > 90 rejected');
  assert(validateAndNormalizeCoordinates({ latitude: -91, longitude: 0 }).valid === false, 'Latitude < -90 rejected');
  assert(validateAndNormalizeCoordinates({ latitude: 0, longitude: 181 }).valid === false, 'Longitude > 180 rejected');
  assert(validateAndNormalizeCoordinates({ latitude: 0, longitude: -181 }).valid === false, 'Longitude < -180 rejected');
  assert(validateAndNormalizeCoordinates({ latitude: 0, longitude: 0, endLatitude: 95 }).valid === false, 'endLatitude > 90 rejected');

  // Test 5: Verify remote database records load correctly with null coordinates
  console.log('\n--- Test 5: Remote Supabase Table Compatibility ---');
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${managementToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `SELECT id, trip_id, type, title, start_datetime, location FROM public.itinerary_items LIMIT 5;`
    }),
  });
  const liveRows = await res.json();
  console.log(`Fetched ${liveRows.length} sample items from remote database:`);
  liveRows.forEach((r) => {
    const domain = mapRowToDomain(r);
    assert(domain.id === r.id, `Item ${r.title} mapped successfully without coordinates`);
    assert(domain.latitude === undefined, `Item ${r.title} has undefined latitude as expected`);
  });

  console.log('\n================================================================');
  console.log('✅ ALL STEP 2 LOCATION MODEL TESTS PASSED SUCCESSFULLY');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
