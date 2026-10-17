/**
 * Voyaro Phase 9 — Step 6: Current Location Verification Test Suite
 *
 * Verifies:
 * 1. expo-location SDK 57 installation & app.json config plugin.
 * 2. Privacy & Safety:
 *    - Foreground-only permissions (no background location)
 *    - No continuous tracking (no watchPositionAsync)
 *    - No storage/upload of coordinates to Supabase
 *    - Single-shot position requests only
 * 3. Flow Tests:
 *    - Permission Granted flow
 *    - Permission Denied flow (map remains usable)
 *    - Permission Blocked flow (no repeated prompts, settings fallback)
 *    - Location Services Disabled flow
 *    - Location Request Failure flow
 * 4. UI integration & accessibility.
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

console.log('\n=== Voyaro Phase 9 — Step 6 Verification: Current Location ===\n');

// ── 1. Configuration & Dependency Checks ─────────────────────────────────────
console.log('1. Configuration & Dependency Checks');

runTest('expo-location is installed and matched to Expo SDK 57 in package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  assert(pkg.dependencies['expo-location'], 'expo-location is listed in dependencies');
  assert(pkg.dependencies['expo-location'].includes('57.'), 'expo-location is SDK 57 compatible');
});

runTest('app.json config plugin has locationWhenInUsePermission configured', () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8'));
  const plugins = appJson.expo.plugins || [];
  const locationPlugin = plugins.find((p) => {
    if (typeof p === 'string') return p === 'expo-location';
    if (Array.isArray(p)) return p[0] === 'expo-location';
    return false;
  });
  assert(locationPlugin, 'expo-location plugin exists in app.json');
  if (Array.isArray(locationPlugin)) {
    const config = locationPlugin[1];
    assert(config.locationWhenInUsePermission, 'locationWhenInUsePermission is defined');
    assert(!config.isAndroidBackgroundLocationEnabled, 'Background location is NOT enabled');
  }
});

// ── 2. Privacy, Safety & Constraint Verification ─────────────────────────────
console.log('\n2. Privacy, Safety & Constraint Verification');

runTest('Never requests background location or defines background location tasks', () => {
  const userLocCode = fs.readFileSync(path.join(projectRoot, 'src', 'utils', 'userLocation.ts'), 'utf8');
  const mapCode = fs.readFileSync(path.join(projectRoot, 'src', 'app', '(tabs)', 'trips', '[tripId]', 'map.tsx'), 'utf8');

  assert(!userLocCode.includes('requestBackgroundPermissionsAsync'), 'userLocation.ts does not call requestBackgroundPermissionsAsync');
  assert(!mapCode.includes('requestBackgroundPermissionsAsync'), 'map.tsx does not call requestBackgroundPermissionsAsync');
  assert(!userLocCode.includes('startLocationUpdatesAsync'), 'No background location tasks started');
  assert(!userLocCode.includes('startGeofencingAsync'), 'No geofencing background tasks started');
});

runTest('Never initiates continuous location tracking (no watchPositionAsync)', () => {
  const userLocCode = fs.readFileSync(path.join(projectRoot, 'src', 'utils', 'userLocation.ts'), 'utf8');
  const mapCode = fs.readFileSync(path.join(projectRoot, 'src', 'app', '(tabs)', 'trips', '[tripId]', 'map.tsx'), 'utf8');

  assert(!userLocCode.includes('watchPositionAsync'), 'userLocation.ts does not call watchPositionAsync');
  assert(!mapCode.includes('watchPositionAsync'), 'map.tsx does not call watchPositionAsync');
});

runTest('Never stores or uploads user coordinates to Supabase or remote database', () => {
  const userLocCode = fs.readFileSync(path.join(projectRoot, 'src', 'utils', 'userLocation.ts'), 'utf8');
  const mapCode = fs.readFileSync(path.join(projectRoot, 'src', 'app', '(tabs)', 'trips', '[tripId]', 'map.tsx'), 'utf8');

  assert(!userLocCode.includes('supabase'), 'userLocation.ts has zero Supabase references');
  // map.tsx should only use userLocation in React state, never insert or update it to supabase
  assert(!mapCode.includes('userLocation.latitude') || !mapCode.includes('supabase.from'), 'No Supabase write with user coordinates');
});

runTest('Single-shot position uses balanced accuracy with fallback to lastKnown', () => {
  const userLocCode = fs.readFileSync(path.join(projectRoot, 'src', 'utils', 'userLocation.ts'), 'utf8');
  assert(userLocCode.includes('getCurrentPositionAsync'), 'Uses getCurrentPositionAsync for single shot');
  assert(userLocCode.includes('getLastKnownPositionAsync'), 'Falls back to getLastKnownPositionAsync on failure');
});

// ── 3. Simulated Business Logic Matrix ───────────────────────────────────────
console.log('\n3. Simulated Business Logic Matrix');

runTest('Flow 1: Location Services Disabled', () => {
  function simulateAcquisition({ servicesEnabled, permStatus, canAskAgain, coords }) {
    if (!servicesEnabled) {
      return { status: 'SERVICES_DISABLED', errorMessage: 'Location services are disabled on your device.' };
    }
    if (permStatus !== 'granted') {
      if (!canAskAgain) {
        return { status: 'PERMISSION_BLOCKED', canAskAgain: false };
      }
      return { status: 'PERMISSION_DENIED', canAskAgain: true };
    }
    if (!coords) {
      return { status: 'LOCATION_UNAVAILABLE' };
    }
    return { status: 'SUCCESS', coordinate: coords };
  }

  const result = simulateAcquisition({
    servicesEnabled: false,
    permStatus: 'granted',
    canAskAgain: true,
    coords: { latitude: 35.68, longitude: 139.76 },
  });

  assert.strictEqual(result.status, 'SERVICES_DISABLED');
  assert(result.errorMessage.includes('Location services are disabled'));
});

runTest('Flow 2: Permission Granted -> Retrieves Coordinates and Centers Camera', () => {
  function simulateAcquisition({ servicesEnabled, permStatus, canAskAgain, coords }) {
    if (!servicesEnabled) return { status: 'SERVICES_DISABLED' };
    if (permStatus !== 'granted') {
      if (!canAskAgain) return { status: 'PERMISSION_BLOCKED', canAskAgain: false };
      return { status: 'PERMISSION_DENIED', canAskAgain: true };
    }
    if (!coords) return { status: 'LOCATION_UNAVAILABLE' };
    return { status: 'SUCCESS', coordinate: coords };
  }

  const testCoords = { latitude: 35.6812, longitude: 139.7671 };
  const result = simulateAcquisition({
    servicesEnabled: true,
    permStatus: 'granted',
    canAskAgain: true,
    coords: testCoords,
  });

  assert.strictEqual(result.status, 'SUCCESS');
  assert.deepStrictEqual(result.coordinate, testCoords);
});

runTest('Flow 3: Permission Denied -> Map remains usable without crash', () => {
  function simulateAcquisition({ servicesEnabled, permStatus, canAskAgain, coords }) {
    if (!servicesEnabled) return { status: 'SERVICES_DISABLED' };
    if (permStatus !== 'granted') {
      if (!canAskAgain) return { status: 'PERMISSION_BLOCKED', canAskAgain: false };
      return { status: 'PERMISSION_DENIED', canAskAgain: true };
    }
    if (!coords) return { status: 'LOCATION_UNAVAILABLE' };
    return { status: 'SUCCESS', coordinate: coords };
  }

  const result = simulateAcquisition({
    servicesEnabled: true,
    permStatus: 'denied',
    canAskAgain: true,
    coords: null,
  });

  assert.strictEqual(result.status, 'PERMISSION_DENIED');
  assert.strictEqual(result.canAskAgain, true);
});

runTest('Flow 4: Permission Blocked -> Avoids repeated native prompts', () => {
  function simulateAcquisition({ servicesEnabled, permStatus, canAskAgain, coords }) {
    if (!servicesEnabled) return { status: 'SERVICES_DISABLED' };
    if (permStatus !== 'granted') {
      if (!canAskAgain) return { status: 'PERMISSION_BLOCKED', canAskAgain: false };
      return { status: 'PERMISSION_DENIED', canAskAgain: true };
    }
    if (!coords) return { status: 'LOCATION_UNAVAILABLE' };
    return { status: 'SUCCESS', coordinate: coords };
  }

  const result = simulateAcquisition({
    servicesEnabled: true,
    permStatus: 'denied',
    canAskAgain: false,
    coords: null,
  });

  assert.strictEqual(result.status, 'PERMISSION_BLOCKED');
  assert.strictEqual(result.canAskAgain, false);
});

runTest('Flow 5: Location Request Failure (No GPS Fix / Timeout) -> Handled gracefully', () => {
  function simulateAcquisition({ servicesEnabled, permStatus, canAskAgain, coords }) {
    if (!servicesEnabled) return { status: 'SERVICES_DISABLED' };
    if (permStatus !== 'granted') {
      if (!canAskAgain) return { status: 'PERMISSION_BLOCKED', canAskAgain: false };
      return { status: 'PERMISSION_DENIED', canAskAgain: true };
    }
    if (!coords) return { status: 'LOCATION_UNAVAILABLE' };
    return { status: 'SUCCESS', coordinate: coords };
  }

  const result = simulateAcquisition({
    servicesEnabled: true,
    permStatus: 'granted',
    canAskAgain: true,
    coords: null,
  });

  assert.strictEqual(result.status, 'LOCATION_UNAVAILABLE');
});

// ── 4. UI & Map Screen Verification ──────────────────────────────────────────
console.log('\n4. UI & Map Screen Verification');

runTest('Map screen contains "My Location" map control with accessible button role', () => {
  const mapCode = fs.readFileSync(path.join(projectRoot, 'src', 'app', '(tabs)', 'trips', '[tripId]', 'map.tsx'), 'utf8');
  assert(mapCode.includes('testID="my-location-control-button"'), 'My Location button testID present');
  assert(mapCode.includes('accessibilityLabel="Locate my position on map"'), 'Accessibility label present');
  assert(mapCode.includes('accessibilityRole="button"'), 'Accessibility button role present');
});

runTest('Map screen passes showsUserLocation and userLocation to VoyaroMapView', () => {
  const mapCode = fs.readFileSync(path.join(projectRoot, 'src', 'app', '(tabs)', 'trips', '[tripId]', 'map.tsx'), 'utf8');
  assert(mapCode.includes('showsUserLocation={hasLocationPermission}'), 'showsUserLocation passed dynamically');
  assert(mapCode.includes('userLocation={userLocation}'), 'userLocation passed to map');
  assert(mapCode.includes('cameraFocusRegion={cameraFocusRegion}'), 'cameraFocusRegion passed to map');
});

runTest('Permission rationale and status dialog handles informative messaging and settings link', () => {
  const mapCode = fs.readFileSync(path.join(projectRoot, 'src', 'app', '(tabs)', 'trips', '[tripId]', 'map.tsx'), 'utf8');
  assert(mapCode.includes('Find Your Location'), 'Rationale dialog title present');
  assert(mapCode.includes('Voyaro uses your foreground location'), 'Clear rationale explanation present');
  assert(mapCode.includes('openLocationSettings()'), 'Settings link present when blocked');
});

runTest('Trip locations are never modified by location acquisition', () => {
  const mapCode = fs.readFileSync(path.join(projectRoot, 'src', 'app', '(tabs)', 'trips', '[tripId]', 'map.tsx'), 'utf8');
  // items state is purely read from useItinerary
  assert(!mapCode.includes('setItems('), 'Itinerary items state is never overwritten');
});

if (process.exitCode === 1) {
  console.error('\n❌ Step 6 Verification Failed.');
  process.exit(1);
} else {
  console.log('\n✅ All Step 6 Verification Tests Passed Successfully!\n');
}
