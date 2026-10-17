/**
 * Voyaro Navigation & Maps Utility — External Destination Directions (Phase 9 — Step 5)
 *
 * Provides safe, reliable external maps integration:
 *   - Never creates a directions link from invalid coordinates.
 *   - Safely URI-encodes destination address strings when coordinates are absent.
 *   - Respects user privacy: does not request location permissions; does not send
 *     user IDs, trip IDs, notes, or booking references to third parties.
 *   - Selects platform-native deep links (Apple Maps on iOS, Google Maps intent on Android)
 *     with universal web fallbacks.
 *   - Handles link errors gracefully with user-friendly alerts.
 */

import { Alert, Linking, Platform } from 'react-native';

export interface DestinationDirectionsOptions {
  /**
   * Destination latitude (must be within -90 to 90)
   */
  latitude?: number | null;
  /**
   * Destination longitude (must be within -180 to 180)
   */
  longitude?: number | null;
  /**
   * Destination address or place name fallback
   */
  address?: string | null;
  /**
   * Optional place name label (used to label the destination pin in maps app)
   */
  label?: string | null;
}

export interface DirectionsUrls {
  /**
   * Native platform-specific URL scheme (e.g. maps: on iOS, google.navigation: on Android)
   */
  primaryUrl: string;
  /**
   * Universal HTTPS web fallback (Apple Maps on iOS, Google Maps on Android/Web)
   */
  fallbackUrl: string;
}

/**
 * Validates that latitude and longitude are valid numeric coordinates within geographic limits.
 */
export function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
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

/**
 * Checks whether an item has sufficient data (valid coordinates OR a non-empty address)
 * to open external destination directions.
 */
export function canGetDirections(options: DestinationDirectionsOptions): boolean {
  if (isValidCoordinate(options.latitude, options.longitude)) {
    return true;
  }
  return Boolean(options.address && options.address.trim().length > 0);
}

/**
 * Builds safe, platform-appropriate directions URLs.
 * Returns null if neither valid coordinates nor an address string are available.
 */
export function buildDirectionsUrls(options: DestinationDirectionsOptions): DirectionsUrls | null {
  const hasCoords = isValidCoordinate(options.latitude, options.longitude);
  const cleanAddress = options.address ? options.address.trim() : '';

  if (!hasCoords && cleanAddress.length === 0) {
    return null;
  }

  const encodedLabel = options.label ? encodeURIComponent(options.label.trim()) : '';

  // 1. High-precision coordinate-based destination
  if (hasCoords) {
    const lat = options.latitude!;
    const lng = options.longitude!;

    if (Platform.OS === 'ios') {
      return {
        primaryUrl: encodedLabel
          ? `maps:?daddr=${lat},${lng}&q=${encodedLabel}`
          : `maps:?daddr=${lat},${lng}`,
        fallbackUrl: `https://maps.apple.com/?daddr=${lat},${lng}${encodedLabel ? `&q=${encodedLabel}` : ''}`,
      };
    } else if (Platform.OS === 'android') {
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

  // 2. Encoded address fallback destination
  const encodedAddress = encodeURIComponent(cleanAddress);

  if (Platform.OS === 'ios') {
    return {
      primaryUrl: `maps:?daddr=${encodedAddress}`,
      fallbackUrl: `https://maps.apple.com/?daddr=${encodedAddress}`,
    };
  } else if (Platform.OS === 'android') {
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

/**
 * Opens the external maps application for the target destination.
 * Never requests user location permission; gracefully falls back to web if native scheme fails.
 */
export async function openDestinationDirections(
  options: DestinationDirectionsOptions
): Promise<boolean> {
  const urls = buildDirectionsUrls(options);

  if (!urls) {
    Alert.alert(
      'Location Unavailable',
      'This itinerary item does not have geographic coordinates or a valid destination address saved.'
    );
    return false;
  }

  // 1. Attempt primary native scheme
  try {
    const canOpen = await Linking.canOpenURL(urls.primaryUrl);
    if (canOpen) {
      await Linking.openURL(urls.primaryUrl);
      return true;
    }
  } catch (primaryErr) {
    // Primary native scheme check failed or unsupported; fall through to web fallback
    console.warn('[Voyaro Maps] Native maps scheme failed, attempting fallback URL:', primaryErr);
  }

  // 2. Attempt universal web fallback
  try {
    await Linking.openURL(urls.fallbackUrl);
    return true;
  } catch (fallbackErr: any) {
    console.error('[Voyaro Maps] External maps fallback URL failed:', fallbackErr);
    Alert.alert(
      'Unable to Open Maps',
      'Could not open an external maps application. Please check that a web browser or maps app is installed.'
    );
    return false;
  }
}
