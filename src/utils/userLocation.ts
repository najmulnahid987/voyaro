/**
 * User Location Utility (Phase 9 — Step 6: Current Location)
 *
 * Encapsulates foreground location acquisition adhering strictly to:
 * - Single-shot position requests only (no continuous tracking)
 * - Zero storage / zero upload of coordinates to Supabase or third-parties
 * - Foreground-only permissions (no background location)
 * - Safe handling of disabled location services, denied permissions, and GPS failures
 * - Avoidance of repeated native permission prompts when canAskAgain is false
 */

import { Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import { MapCoordinate } from '@/components/maps/types';

export type LocationAcquisitionStatus =
  | 'SUCCESS'
  | 'SERVICES_DISABLED'
  | 'PERMISSION_DENIED'
  | 'PERMISSION_BLOCKED'
  | 'LOCATION_UNAVAILABLE';

export interface LocationAcquisitionResult {
  status: LocationAcquisitionStatus;
  coordinate?: MapCoordinate;
  errorMessage?: string;
  canAskAgain?: boolean;
}

/**
 * Checks whether device location services (GPS/network) are enabled.
 */
export async function checkLocationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    console.warn('[userLocation] Error checking location services:', error);
    return false;
  }
}

/**
 * Checks existing foreground location permission without prompting the user.
 */
export async function getExistingLocationPermission(): Promise<Location.LocationPermissionResponse | null> {
  try {
    return await Location.getForegroundPermissionsAsync();
  } catch (error) {
    console.warn('[userLocation] Error getting foreground permissions:', error);
    return null;
  }
}

/**
 * Requests foreground location permission from the user.
 * Note: Never requests background permissions.
 */
export async function requestForegroundLocationPermission(): Promise<Location.LocationPermissionResponse | null> {
  try {
    return await Location.requestForegroundPermissionsAsync();
  } catch (error) {
    console.warn('[userLocation] Error requesting foreground permissions:', error);
    return null;
  }
}

/**
 * Attempts a single-shot retrieval of current position.
 * Tries high/balanced current position first, then falls back to last known position.
 * Never starts continuous background/foreground watchers.
 */
export async function fetchCurrentPosition(): Promise<MapCoordinate | null> {
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    if (
      position &&
      typeof position.coords?.latitude === 'number' &&
      typeof position.coords?.longitude === 'number'
    ) {
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    }
  } catch (currentPosErr) {
    console.warn('[userLocation] getCurrentPositionAsync failed, attempting lastKnown:', currentPosErr);
  }

  // Graceful fallback to last known location
  try {
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (
      lastKnown &&
      typeof lastKnown.coords?.latitude === 'number' &&
      typeof lastKnown.coords?.longitude === 'number'
    ) {
      return {
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude,
      };
    }
  } catch (lastKnownErr) {
    console.warn('[userLocation] getLastKnownPositionAsync failed:', lastKnownErr);
  }

  return null;
}

/**
 * Opens device app settings so the user can enable location permission if previously blocked.
 */
export async function openLocationSettings(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  } catch (err) {
    console.warn('[userLocation] Error opening settings:', err);
  }
}

/**
 * Orchestrates current position acquisition:
 * 1. Checks device location services
 * 2. Verifies / requests foreground permission
 * 3. Retrieves single-shot coordinates
 */
export async function acquireCurrentLocation(
  onExplainRationale?: () => Promise<boolean>
): Promise<LocationAcquisitionResult> {
  // 1. Check if location services are enabled on device
  const servicesEnabled = await checkLocationServicesEnabled();
  if (!servicesEnabled) {
    return {
      status: 'SERVICES_DISABLED',
      errorMessage: 'Location services are disabled on your device. Please turn them on in Settings to view your current position.',
    };
  }

  // 2. Check existing permission status
  let permission = await getExistingLocationPermission();

  if (!permission || permission.status !== Location.PermissionStatus.GRANTED) {
    // If user previously denied and system refuses to ask again
    if (permission && !permission.canAskAgain && permission.status === Location.PermissionStatus.DENIED) {
      return {
        status: 'PERMISSION_BLOCKED',
        canAskAgain: false,
        errorMessage: 'Location permission was previously declined. To view your position on the trip map, please enable location access for Voyaro in Settings.',
      };
    }

    // Explain why location access is useful before system prompt if callback provided
    if (onExplainRationale) {
      const userAgreed = await onExplainRationale();
      if (!userAgreed) {
        return {
          status: 'PERMISSION_DENIED',
          canAskAgain: permission?.canAskAgain ?? true,
          errorMessage: 'Location access was not enabled.',
        };
      }
    }

    // Prompt user for foreground permission
    permission = await requestForegroundLocationPermission();
    if (!permission || permission.status !== Location.PermissionStatus.GRANTED) {
      return {
        status: permission?.canAskAgain === false ? 'PERMISSION_BLOCKED' : 'PERMISSION_DENIED',
        canAskAgain: permission?.canAskAgain ?? false,
        errorMessage: 'Location permission was not granted. The map remains fully usable without current location.',
      };
    }
  }

  // 3. Retrieve single-shot position
  const coordinate = await fetchCurrentPosition();
  if (!coordinate) {
    return {
      status: 'LOCATION_UNAVAILABLE',
      errorMessage: 'Unable to determine your current location. Please check your signal and try again.',
    };
  }

  return {
    status: 'SUCCESS',
    coordinate,
  };
}
