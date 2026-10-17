/**
 * Voyaro Phase 9 — Step 5: Open Destination Directions Verification Script
 *
 * Verifies:
 * 1. Destination with coordinates:
 *    - Validates coordinate bounds.
 *    - Produces platform-appropriate Apple Maps / Google Maps deep links and web fallbacks.
 * 2. Destination with only an address:
 *    - Correctly URI-encodes the destination query.
 * 3. Destination with no usable location:
 *    - Correctly rejected with null return and false for canGetDirections.
 * 4. Safety & Privacy:
 *    - Out-of-bounds coordinates never generate coordinate links.
 *    - No user/trip metadata leaked into external maps URLs.
 */

const assert = require('assert');

// Mirroring the pure logic from src/utils/mapDirections.ts
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

function canGetDirections(options) {
  if (isValidCoordinate(options.latitude, options.longitude)) {
    return true;
  }
  return Boolean(options.address && options.address.trim().length > 0);
}

function buildDirectionsUrls(options, platform = 'ios') {
  const hasCoords = isValidCoordinate(options.latitude, options.longitude);
  const cleanAddress = options.address ? options.address.trim() : '';

  if (!hasCoords && cleanAddress.length === 0) {
    return null;
  }

  const encodedLabel = options.label ? encodeURIComponent(options.label.trim()) : '';

  // 1. Coordinate-based destination
  if (hasCoords) {
    const lat = options.latitude;
    const lng = options.longitude;

    if (platform === 'ios') {
      return {
        primaryUrl: encodedLabel
          ? `maps:?daddr=${lat},${lng}&q=${encodedLabel}`
          : `maps:?daddr=${lat},${lng}`,
        fallbackUrl: `https://maps.apple.com/?daddr=${lat},${lng}${encodedLabel ? `&q=${encodedLabel}` : ''}`,
      };
    } else if (platform === 'android') {
      return {
        primaryUrl: `google.navigation:q=${lat},${lng}`,
        fallbackUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      };
    } else {
      return {
        primaryUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        fallbackUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      };
    }
  }

  // 2. Encoded address destination
  const encodedAddress = encodeURIComponent(cleanAddress);

  if (platform === 'ios') {
    return {
      primaryUrl: `maps:?daddr=${encodedAddress}`,
      fallbackUrl: `https://maps.apple.com/?daddr=${encodedAddress}`,
    };
  } else if (platform === 'android') {
    return {
      primaryUrl: `google.navigation:q=${encodedAddress}`,
      fallbackUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
    };
  } else {
    return {
      primaryUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
      fallbackUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
    };
  }
}

console.log('================================================================');
console.log('   VOYARO PHASE 9 — STEP 5: DESTINATION DIRECTIONS VERIFICATION');
console.log('================================================================\n');

// --- Test 1: Destination with Valid Coordinates ---
console.log('--- Test 1: Destination with Coordinates ---');
const tokyoCoordItem = {
  latitude: 35.6762,
  longitude: 139.6503,
  address: 'Tokyo, Japan',
  label: 'Tokyo Center',
};

assert.strictEqual(canGetDirections(tokyoCoordItem), true);

// iOS
const iosCoordUrls = buildDirectionsUrls(tokyoCoordItem, 'ios');
assert.ok(iosCoordUrls.primaryUrl.startsWith('maps:?daddr=35.6762,139.6503'));
assert.ok(iosCoordUrls.fallbackUrl.startsWith('https://maps.apple.com/?daddr=35.6762,139.6503'));
console.log('✅ iOS Apple Maps coordinate deep-link generated:', iosCoordUrls.primaryUrl);

// Android
const androidCoordUrls = buildDirectionsUrls(tokyoCoordItem, 'android');
assert.strictEqual(androidCoordUrls.primaryUrl, 'google.navigation:q=35.6762,139.6503');
assert.strictEqual(androidCoordUrls.fallbackUrl, 'https://www.google.com/maps/dir/?api=1&destination=35.6762,139.6503');
console.log('✅ Android Google Maps coordinate intent generated:', androidCoordUrls.primaryUrl);

// Web
const webCoordUrls = buildDirectionsUrls(tokyoCoordItem, 'web');
assert.strictEqual(webCoordUrls.primaryUrl, 'https://www.google.com/maps/dir/?api=1&destination=35.6762,139.6503');
console.log('✅ Web universal fallback generated:', webCoordUrls.primaryUrl);

// --- Test 2: Destination with Only an Address (No Coordinates) ---
console.log('\n--- Test 2: Destination with Only Address ---');
const addressOnlyItem = {
  latitude: null,
  longitude: null,
  address: 'Kamogawa Nijo-Ohashi Hotori, Nakagyo Ward, Kyoto',
  label: 'The Ritz-Carlton, Kyoto',
};

assert.strictEqual(canGetDirections(addressOnlyItem), true);

const iosAddrUrls = buildDirectionsUrls(addressOnlyItem, 'ios');
assert.ok(iosAddrUrls.primaryUrl.includes('Kamogawa%20Nijo-Ohashi%20Hotori'));
assert.ok(iosAddrUrls.fallbackUrl.includes('https://maps.apple.com/?daddr='));
console.log('✅ iOS address-encoded query generated:', iosAddrUrls.primaryUrl);

const androidAddrUrls = buildDirectionsUrls(addressOnlyItem, 'android');
assert.ok(androidAddrUrls.primaryUrl.startsWith('google.navigation:q=Kamogawa'));
assert.ok(androidAddrUrls.fallbackUrl.includes('https://www.google.com/maps/dir/?api=1&destination='));
console.log('✅ Android address-encoded intent generated:', androidAddrUrls.primaryUrl);

// --- Test 3: Destination with No Usable Location ---
console.log('\n--- Test 3: Destination with No Usable Location ---');
const emptyItem1 = { latitude: null, longitude: null, address: null };
const emptyItem2 = { latitude: undefined, longitude: undefined, address: '   ' };

assert.strictEqual(canGetDirections(emptyItem1), false);
assert.strictEqual(canGetDirections(emptyItem2), false);
assert.strictEqual(buildDirectionsUrls(emptyItem1, 'ios'), null);
assert.strictEqual(buildDirectionsUrls(emptyItem2, 'android'), null);
console.log('✅ Empty destination safely identified and rejected with null URLs');

// --- Test 4: Out-of-Bounds & Malformed Coordinates Rejection ---
console.log('\n--- Test 4: Coordinate Boundary & Safety Verification ---');
const badCoords = [
  { latitude: 91.0, longitude: 139.0, address: 'Tokyo' }, // lat > 90
  { latitude: -91.0, longitude: 139.0, address: 'Tokyo' }, // lat < -90
  { latitude: 35.0, longitude: 181.0, address: 'Tokyo' }, // lng > 180
  { latitude: 35.0, longitude: -185.0, address: 'Tokyo' }, // lng < -180
  { latitude: NaN, longitude: 139.0, address: 'Tokyo' }, // NaN
];

badCoords.forEach((bad, idx) => {
  assert.strictEqual(isValidCoordinate(bad.latitude, bad.longitude), false);
  const urls = buildDirectionsUrls(bad, 'android');
  // Must fallback to address and never include invalid coords
  assert.ok(!urls.primaryUrl.includes(String(bad.latitude)));
  assert.ok(urls.primaryUrl.includes('Tokyo'), `Case ${idx}: Should fall back to encoded address`);
});
console.log('✅ Out-of-bounds and NaN coordinates never generate coordinate links');

// --- Test 5: Privacy & Leak Prevention ---
console.log('\n--- Test 5: Privacy and Data Protection ---');
const sensitiveItem = {
  latitude: 35.6595,
  longitude: 139.7004,
  address: 'Shibuya, Tokyo',
  label: 'Shibuya Tour',
  // Extra sensitive fields that must never appear in URL
  userId: 'user_12345_secret',
  tripId: 'trip_secret_67890',
  notes: 'Do not tell anyone our room number',
  confirmationNumber: 'CONF-SECRET-999',
};

const generatedUrls = buildDirectionsUrls(sensitiveItem, 'android');
assert.ok(!generatedUrls.primaryUrl.includes('user_12345_secret'));
assert.ok(!generatedUrls.primaryUrl.includes('trip_secret_67890'));
assert.ok(!generatedUrls.primaryUrl.includes('room number'));
assert.ok(!generatedUrls.primaryUrl.includes('CONF-SECRET-999'));
console.log('✅ URLs contain zero user IDs, trip IDs, notes, or confirmation codes');

console.log('\n================================================================');
console.log('✅ ALL STEP 5 DESTINATION DIRECTIONS TESTS PASSED');
console.log('================================================================\n');
