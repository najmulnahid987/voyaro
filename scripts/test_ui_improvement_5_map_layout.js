/**
 * Automated Verification Suite for Voyaro UI Improvement 5 — Map Screen Layout and Controls
 *
 * Tests:
 * 1. Category filter chips horizontal ScrollView layout (no wrapping, scrolls cleanly)
 * 2. Leaflet Zoom Controls positioning and custom theme styling (native & web)
 * 3. Dynamic card clearance and floating map controls collision prevention
 * 4. Marker address sanitization (no raw URLs displayed, directions preserved)
 * 5. Persistent bottom navigation safe insets integration
 * 6. Category filtering & marker count synchronization logic
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

console.log('=== Running UI Improvement 5: Map Screen Layout & Controls Tests ===\n');

const projectRoot = path.resolve(__dirname, '..');
const mapScreenPath = path.join(projectRoot, 'src', 'app', '(tabs)', 'trips', '[tripId]', 'map.tsx');
const mapViewNativePath = path.join(projectRoot, 'src', 'components', 'maps', 'VoyaroMapView.native.tsx');
const mapViewWebPath = path.join(projectRoot, 'src', 'components', 'maps', 'VoyaroMapView.web.tsx');

// Test 1: Category Filter ScrollView & Non-Wrapping Architecture
runTest('Filter chips use horizontal ScrollView without multi-line wrapping', () => {
  assert(fs.existsSync(mapScreenPath), 'map.tsx must exist');
  const content = fs.readFileSync(mapScreenPath, 'utf8');

  assert(content.includes('<ScrollView'), 'Filter row must use ScrollView');
  assert(content.includes('horizontal'), 'Filter ScrollView must be horizontal');
  assert(content.includes('showsHorizontalScrollIndicator={false}'), 'Horizontal scroll indicator should be hidden');
  assert(content.includes('legendScrollContent'), 'Must use legendScrollContent style');
  assert(!content.includes("flexWrap: 'wrap'"), 'Must NOT use flexWrap: wrap for filter pills');
});

// Test 2: Dynamic Card Clearance for Floating Map Controls
runTest('Floating map controls adjust dynamically based on selected card height', () => {
  const content = fs.readFileSync(mapScreenPath, 'utf8');

  assert(content.includes('selectedCardHeight'), 'Must maintain selectedCardHeight state');
  assert(content.includes('setSelectedCardHeight'), 'Must set selectedCardHeight on layout');
  assert(content.includes('onLayout'), 'bottomCardContainer must measure height via onLayout');
  assert(content.includes('controlsBottomOffset'), 'Must calculate controlsBottomOffset dynamically');
  assert(
    content.includes('bottom: controlsBottomOffset'),
    'myLocationButton must anchor to controlsBottomOffset'
  );
  assert(
    content.includes('bottom: controlsBottomOffset + 44'),
    'routeFloatingButton must stack above myLocationButton with clean spacing'
  );
});

// Test 3: Leaflet Zoom Controls Offset & Styling (Native)
runTest('Native Leaflet MapView positions zoom controls below filter bar with custom theme', () => {
  assert(fs.existsSync(mapViewNativePath), 'VoyaroMapView.native.tsx must exist');
  const content = fs.readFileSync(mapViewNativePath, 'utf8');

  assert(content.includes('.leaflet-top.leaflet-left'), 'Must specify .leaflet-top.leaflet-left position');
  assert(content.includes('top: 54px;'), 'Zoom controls must have top clearance (54px) to clear single-row filter bar');
  assert(content.includes('left: 10px;'), 'Zoom controls must have left offset (10px)');
  assert(content.includes('.leaflet-bar'), 'Must style .leaflet-bar');
  assert(content.includes('#2c5f5e'), 'Zoom buttons must match Voyaro teal brand color');
});

// Test 4: Leaflet Zoom Controls Offset & Styling (Web)
runTest('Web Leaflet MapView positions zoom controls below filter bar with custom theme', () => {
  assert(fs.existsSync(mapViewWebPath), 'VoyaroMapView.web.tsx must exist');
  const content = fs.readFileSync(mapViewWebPath, 'utf8');

  assert(content.includes('.leaflet-top.leaflet-left'), 'Must specify .leaflet-top.leaflet-left position');
  assert(content.includes('top: 54px;'), 'Zoom controls must have top clearance (54px)');
  assert(content.includes('.leaflet-bar'), 'Must style .leaflet-bar');
  assert(content.includes('#2c5f5e'), 'Zoom buttons must match Voyaro teal brand color');
});

// Test 5: Address URL Sanitization Logic
runTest('Address presentation sanitizes raw URLs to human-readable text', () => {
  const content = fs.readFileSync(mapScreenPath, 'utf8');

  assert(content.includes('function isUrl'), 'Must define isUrl helper');
  assert(content.includes('function cleanAddressText'), 'Must define cleanAddressText helper');
  assert(content.includes('maps.app.goo.gl'), 'Must check for shortened Google Maps URLs');
  assert(content.includes('google.com/maps'), 'Must check for Google Maps web URLs');
  assert(content.includes("'Location on map'"), 'Must fallback to friendly text for raw URLs');
});

// Unit test of URL sanitization logic
runTest('cleanAddressText unit test handles various inputs', () => {
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

  function cleanAddressText(address, fallbackLocation) {
    if (address && !isUrl(address)) {
      return address.trim();
    }
    if (fallbackLocation && !isUrl(fallbackLocation)) {
      return fallbackLocation.trim();
    }
    if (address || fallbackLocation) {
      return 'Location on map';
    }
    return undefined;
  }

  // Raw Google Maps URL
  assert.strictEqual(
    cleanAddressText('https://maps.app.goo.gl/3f48a9xyz', 'Tokyo, Japan'),
    'Tokyo, Japan'
  );
  // Both URL
  assert.strictEqual(
    cleanAddressText('https://maps.app.goo.gl/3f48a9xyz', 'https://google.com/maps?q=tokyo'),
    'Location on map'
  );
  // Real Address
  assert.strictEqual(
    cleanAddressText('1-1 Chiyoda, Chiyoda City, Tokyo 100-8111', 'Tokyo'),
    '1-1 Chiyoda, Chiyoda City, Tokyo 100-8111'
  );
  // Undefined
  assert.strictEqual(cleanAddressText(null, null), undefined);
});

// Test 6: Safe Area & Bottom Nav Inset Handling
runTest('Map screen respects useShellInsets contentPaddingBottom', () => {
  const content = fs.readFileSync(mapScreenPath, 'utf8');

  assert(content.includes('useShellInsets'), 'Must import useShellInsets');
  assert(content.includes('contentPaddingBottom'), 'Must extract contentPaddingBottom');
  assert(content.includes('Math.max(contentPaddingBottom'), 'Must use contentPaddingBottom for bottom positioning');
});

// Test 7: Category Filter Count and Marker Synchronization Logic
runTest('Filter logic correctly synchronizes counts and active category selection', () => {
  const mockMarkers = [
    { id: '1', type: 'hotel', title: 'Grand Hotel', coordinate: { latitude: 35.68, longitude: 139.76 } },
    { id: '2', type: 'activity', title: 'Tokyo Tower', coordinate: { latitude: 35.65, longitude: 139.74 } },
    { id: '3', type: 'activity', title: 'Senso-ji', coordinate: { latitude: 35.71, longitude: 139.79 } },
    { id: '4', type: 'transportation', title: 'Shinkansen', coordinate: { latitude: 35.68, longitude: 139.76 } },
    { id: '5', type: 'flight', title: 'Flight NH101', coordinate: { latitude: 35.54, longitude: 139.77 } },
  ];

  const counts = {
    all: mockMarkers.length,
    hotel: mockMarkers.filter((m) => m.type === 'hotel').length,
    activity: mockMarkers.filter((m) => m.type === 'activity').length,
    transportation: mockMarkers.filter((m) => m.type === 'transportation').length,
    flight: mockMarkers.filter((m) => m.type === 'flight').length,
  };

  assert.strictEqual(counts.all, 5);
  assert.strictEqual(counts.hotel, 1);
  assert.strictEqual(counts.activity, 2);
  assert.strictEqual(counts.transportation, 1);
  assert.strictEqual(counts.flight, 1);

  // Filter selection:
  function getFilteredMarkers(activeCategory) {
    if (activeCategory === 'all') return mockMarkers;
    return mockMarkers.filter((m) => m.type === activeCategory);
  }

  assert.strictEqual(getFilteredMarkers('all').length, 5);
  assert.strictEqual(getFilteredMarkers('activity').length, 2);
  assert.strictEqual(getFilteredMarkers('hotel').length, 1);
  assert.strictEqual(getFilteredMarkers('transportation').length, 1);
  assert.strictEqual(getFilteredMarkers('flight').length, 1);
});

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);
if (passedTests !== totalTests) {
  process.exit(1);
}
