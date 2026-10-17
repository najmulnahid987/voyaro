/**
 * Voyaro Routing Service (Phase 9 — Step 8: Route Display)
 *
 * Provides safe, cached route geometry resolution and external navigation integration:
 * - Checks whether an authenticated routing proxy provider is configured.
 * - In-memory caching avoids repeated network requests for identical origin, destination, and mode.
 * - Strictly enforces: NEVER renders a straight line as if it were a real road route.
 * - Handles missing coordinates, unconfigured providers, and failed route queries.
 * - Provides seamless fallback to native Apple Maps / Google Maps navigation.
 */

import { Linking, Platform } from 'react-native';
import { MapCoordinate } from '@/components/maps/types';

export type RouteTravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export interface RouteRequest {
  origin: MapCoordinate;
  destination: MapCoordinate;
  mode?: RouteTravelMode;
  originLabel?: string;
  destinationLabel?: string;
}

export interface RouteResult {
  status: 'success' | 'no_route' | 'provider_not_configured' | 'error';
  geometry?: MapCoordinate[];
  distanceMeters?: number;
  durationSeconds?: number;
  errorMessage?: string;
}

// In-memory route cache: key -> RouteResult
// Cache key format: "originLat,originLng->destLat,destLng:mode"
const routeCache = new Map<string, RouteResult>();

/**
 * Validates coordinate boundary limits.
 */
export function isValidCoordinate(coord?: MapCoordinate | null): boolean {
  if (!coord) return false;
  const { latitude: lat, longitude: lng } = coord;
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
 * Generates deterministic cache key for a route request.
 */
export function getRouteCacheKey(origin: MapCoordinate, destination: MapCoordinate, mode: RouteTravelMode = 'driving'): string {
  const orig = `${origin.latitude.toFixed(5)},${origin.longitude.toFixed(5)}`;
  const dest = `${destination.latitude.toFixed(5)},${destination.longitude.toFixed(5)}`;
  return `${orig}->${dest}:${mode}`;
}

/**
 * Evaluates whether an authorized backend routing proxy or provider is configured.
 * Privileged API keys must NEVER be placed in client-side code.
 * If EXPO_PUBLIC_ROUTING_PROXY_URL is undefined or empty, routing is considered unconfigured.
 */
export function isRouteProviderConfigured(): boolean {
  const proxyUrl = process.env.EXPO_PUBLIC_ROUTING_PROXY_URL;
  return Boolean(proxyUrl && proxyUrl.trim().length > 0);
}

/**
 * Retrieves route geometry from a configured routing service.
 * If no provider is configured, returns `provider_not_configured` without inventing fake straight lines.
 */
export async function fetchRouteGeometry(request: RouteRequest): Promise<RouteResult> {
  const { origin, destination, mode = 'driving' } = request;

  // 1. Validate coordinates
  if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
    return {
      status: 'error',
      errorMessage: 'Invalid coordinates provided for route origin or destination.',
    };
  }

  // Same point check
  if (
    Math.abs(origin.latitude - destination.latitude) < 0.0001 &&
    Math.abs(origin.longitude - destination.longitude) < 0.0001
  ) {
    return {
      status: 'error',
      errorMessage: 'Origin and destination are at the same location.',
    };
  }

  // 2. Check in-memory cache to prevent repeated requests
  const cacheKey = getRouteCacheKey(origin, destination, mode);
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // 3. Check provider configuration
  if (!isRouteProviderConfigured()) {
    const unconfiguredResult: RouteResult = {
      status: 'provider_not_configured',
      errorMessage:
        'In-app road routing is not configured for this environment. Voyaro does not fabricate straight lines as road routes. Use external navigation for live road routing.',
    };
    routeCache.set(cacheKey, unconfiguredResult);
    return unconfiguredResult;
  }

  // 4. If a server-side proxy is configured, query it
  try {
    const proxyUrl = process.env.EXPO_PUBLIC_ROUTING_PROXY_URL!;
    const response = await fetch(
      `${proxyUrl}?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=${mode}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Routing proxy returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.geometry || !Array.isArray(data.geometry) || data.geometry.length < 2) {
      const noRoute: RouteResult = {
        status: 'no_route',
        errorMessage: 'No road route could be found between these locations.',
      };
      routeCache.set(cacheKey, noRoute);
      return noRoute;
    }

    const successResult: RouteResult = {
      status: 'success',
      geometry: data.geometry,
      distanceMeters: data.distanceMeters,
      durationSeconds: data.durationSeconds,
    };
    routeCache.set(cacheKey, successResult);
    return successResult;
  } catch (err: any) {
    const errorResult: RouteResult = {
      status: 'error',
      errorMessage: err?.message || 'Unable to fetch route geometry from routing service.',
    };
    return errorResult;
  }
}

/**
 * Opens the multi-point route in external platform-native maps (Apple Maps or Google Maps).
 * Provides free, full turn-by-turn road navigation, traffic, and transit directions.
 */
export async function openExternalRoute(
  origin: MapCoordinate,
  destination: MapCoordinate,
  originLabel?: string,
  destinationLabel?: string
): Promise<void> {
  const saddr = `${origin.latitude},${origin.longitude}`;
  const daddr = `${destination.latitude},${destination.longitude}`;

  let url: string;
  if (Platform.OS === 'ios') {
    // Apple Maps route scheme
    url = `maps:?saddr=${saddr}&daddr=${daddr}`;
  } else if (Platform.OS === 'android') {
    // Google Maps route intent
    url = `https://www.google.com/maps/dir/?api=1&origin=${saddr}&destination=${daddr}`;
  } else {
    // Web fallback
    url = `https://www.google.com/maps/dir/?api=1&origin=${saddr}&destination=${daddr}`;
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Fallback to web universal Google Maps
      const webFallback = `https://www.google.com/maps/dir/?api=1&origin=${saddr}&destination=${daddr}`;
      await Linking.openURL(webFallback);
    }
  } catch (err) {
    console.warn('[routing] Failed to open external route URL:', err);
  }
}

/**
 * Clears the in-memory route cache (useful for testing).
 */
export function clearRouteCache(): void {
  routeCache.clear();
}
