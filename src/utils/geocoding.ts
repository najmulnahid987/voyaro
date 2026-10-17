/**
 * Voyaro Geocoding Utility (Phase 9 — Step 7: Location Search & Coordinate Selection)
 *
 * Provides deliberate, cached location search & coordinate resolution adhering to:
 * - Reuses expo-location on iOS & Android native platforms.
 * - Keyless OpenStreetMap Nominatim fallback with safe web & native handling.
 * - Keyless Open-Meteo Geocoding fallback with open CORS for web browsers.
 * - Direct latitude/longitude coordinate parsing (e.g. "22.6563, 92.1793").
 * - Noise sanitization (removes interior floors like "3rd floor", Google Plus codes like "M52H+VJC").
 * - Progressive sub-query fallback for unindexed local building names.
 * - Zero third-party API keys or billing required.
 * - In-memory query caching to avoid repeated/excessive geocoding requests.
 * - Never auto-geocodes on typing keystroke.
 * - Never invents or fabricates coordinates.
 * - Handles single, ambiguous (multiple), and zero-result queries.
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface GeocodeCandidate {
  id: string;
  displayName: string;
  address?: string;
  latitude: number;
  longitude: number;
}

// In-memory cache for resolved queries: query -> GeocodeCandidate[]
const queryCache = new Map<string, GeocodeCandidate[]>();

/**
 * Curated airport dictionary for rapid, exact IATA route coordinate resolution.
 */
const AIRPORT_COORDINATES: Record<string, { name: string; lat: number; lng: number }> = {
  DAC: { name: 'Hazrat Shahjalal International Airport (DAC)', lat: 23.8433, lng: 90.3978 },
  NRT: { name: 'Narita International Airport (NRT)', lat: 35.772, lng: 140.3929 },
  HND: { name: 'Haneda Airport (HND)', lat: 35.5494, lng: 139.7798 },
  DXB: { name: 'Dubai International Airport (DXB)', lat: 25.2532, lng: 55.3657 },
  JFK: { name: 'John F. Kennedy International Airport (JFK)', lat: 40.6413, lng: -73.7781 },
  LHR: { name: 'London Heathrow Airport (LHR)', lat: 51.47, lng: -0.4543 },
  CDG: { name: 'Charles de Gaulle Airport (CDG)', lat: 49.0097, lng: 2.5479 },
  SIN: { name: 'Singapore Changi Airport (SIN)', lat: 1.3644, lng: 103.9915 },
  KIX: { name: 'Kansai International Airport (KIX)', lat: 34.432, lng: 135.2304 },
  LAX: { name: 'Los Angeles International Airport (LAX)', lat: 33.9416, lng: -118.4085 },
  BKK: { name: 'Suvarnabhumi Airport (BKK)', lat: 13.69, lng: 100.7501 },
  DOH: { name: 'Hamad International Airport (DOH)', lat: 25.2731, lng: 51.6081 },
};

function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
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
 * Detects if the query is a raw coordinate pair (e.g. "22.6563, 92.1793" or "22.6563 92.1793").
 */
export function parseDirectCoordinates(query: string): { latitude: number; longitude: number } | null {
  const match = query.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*[,\s]\s*([+-]?\d+(?:\.\d+)?)\s*$/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (isValidCoordinate(lat, lng)) {
      return { latitude: lat, longitude: lng };
    }
  }
  return null;
}

/**
 * Cleans non-geographic or interior noise that breaks standard geocoders
 * (such as "3rd floor", "Floor 2", "Level 4", "Apt 2B", "Suite 100", Google Plus Codes like "M52H+VJC").
 */
export function cleanAddressQuery(raw: string): string {
  return raw
    .replace(/\b\d+(?:st|nd|rd|th)?\s+floor\b,?\s*/gi, '')
    .replace(/\bfloor\s+\d+\b,?\s*/gi, '')
    .replace(/\b(?:level|apt|suite|flat|room)\s+\w+,?\s*/gi, '')
    .replace(/\b[A-Z0-9]{4}\+[A-Z0-9]{2,}\b,?\s*/gi, '')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

/**
 * OpenStreetMap Nominatim geocoder query with safety timeout and platform header checks.
 */
async function searchNominatim(query: string): Promise<GeocodeCandidate[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (Platform.OS !== 'web') {
      headers['User-Agent'] = 'Voyaro-Travel-App/1.0 (contact@voyaro.app)';
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

    const response = await fetch(url, {
      headers,
      signal: controller?.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);
    if (!response.ok) return [];

    const json = await response.json();
    if (!Array.isArray(json)) return [];

    const candidates: GeocodeCandidate[] = [];
    json.forEach((item: any, idx: number) => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (isValidCoordinate(lat, lon)) {
        const parts = (item.display_name || query).split(',');
        const primaryTitle = parts[0]?.trim() || query;
        const subtitle = parts.slice(1, 4).join(',').trim();

        candidates.push({
          id: item.place_id ? String(item.place_id) : `osm-${idx}`,
          displayName: primaryTitle,
          address: subtitle || item.display_name,
          latitude: lat,
          longitude: lon,
        });
      }
    });

    return candidates;
  } catch {
    return [];
  }
}

/**
 * Open-Meteo Geocoding API with open CORS, zero API key, and rapid response for Web and Native.
 */
async function searchOpenMeteo(query: string): Promise<GeocodeCandidate[]> {
  try {
    const cleanWord = query.replace(/[0-9#,-]+/g, ' ').trim();
    if (cleanWord.length < 2) return [];

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanWord)}&count=5&language=en&format=json`;
    const response = await fetch(url, { signal: controller?.signal });

    if (timeoutId) clearTimeout(timeoutId);
    if (!response.ok) return [];

    const json = await response.json();
    if (!json.results || !Array.isArray(json.results)) return [];

    const candidates: GeocodeCandidate[] = [];
    json.results.forEach((item: any, idx: number) => {
      if (isValidCoordinate(item.latitude, item.longitude)) {
        const subtitle = [item.admin1, item.country].filter(Boolean).join(', ');
        candidates.push({
          id: `om-${item.id || idx}`,
          displayName: item.name,
          address: subtitle || item.name,
          latitude: item.latitude,
          longitude: item.longitude,
        });
      }
    });

    return candidates;
  } catch {
    return [];
  }
}

/**
 * Resolves a place name or address string to candidate coordinates.
 * Only called on deliberate user action (e.g. tapping "Locate" button).
 */
export async function searchGeocodeLocations(rawQuery: string): Promise<GeocodeCandidate[]> {
  const query = rawQuery?.trim();
  if (!query || query.length < 2) {
    return [];
  }

  const cacheKey = query.toLowerCase();
  if (queryCache.has(cacheKey)) {
    return queryCache.get(cacheKey)!;
  }

  // 1. Direct coordinate pair check (e.g. "22.6563, 92.1793")
  const direct = parseDirectCoordinates(query);
  if (direct) {
    const candidates: GeocodeCandidate[] = [
      {
        id: `direct-${direct.latitude.toFixed(4)}-${direct.longitude.toFixed(4)}`,
        displayName: `${direct.latitude.toFixed(4)}°, ${direct.longitude.toFixed(4)}°`,
        address: query,
        latitude: direct.latitude,
        longitude: direct.longitude,
      },
    ];
    queryCache.set(cacheKey, candidates);
    return candidates;
  }

  // 2. Curated airport dictionary (e.g. "NRT", "DAC", "Tokyo (NRT)")
  const upper = query.toUpperCase();
  for (const [code, info] of Object.entries(AIRPORT_COORDINATES)) {
    if (upper === code || upper.includes(`(${code})`) || upper.includes(` ${code}`)) {
      const candidates: GeocodeCandidate[] = [
        {
          id: `airport-${code}`,
          displayName: info.name,
          address: `${code} Airport`,
          latitude: info.lat,
          longitude: info.lng,
        },
      ];
      queryCache.set(cacheKey, candidates);
      return candidates;
    }
  }

  // 3. Prepare cleaned query & progressive sub-query candidates
  const cleaned = cleanAddressQuery(query);
  const parts = cleaned.split(',').map((s) => s.trim()).filter(Boolean);

  const candidateQueries: string[] = [cleaned];
  for (let i = 1; i < parts.length; i++) {
    const sub = parts.slice(i).join(', ').trim();
    if (sub.length >= 2 && !candidateQueries.includes(sub)) {
      candidateQueries.push(sub);
    }
  }
  if (parts.length > 2) {
    const lastPart = parts[parts.length - 1].trim();
    if (lastPart.length >= 2 && !candidateQueries.includes(lastPart)) {
      candidateQueries.push(lastPart);
    }
  }

  // 4. Try native expo-location geocoder on iOS and Android first
  if (Platform.OS !== 'web') {
    for (const q of candidateQueries) {
      try {
        const nativeResults = await Location.geocodeAsync(q);
        if (Array.isArray(nativeResults) && nativeResults.length > 0) {
          const nativeCandidates: GeocodeCandidate[] = [];
          nativeResults.forEach((res, index) => {
            if (isValidCoordinate(res.latitude, res.longitude)) {
              nativeCandidates.push({
                id: `native-${index}-${res.latitude.toFixed(4)}-${res.longitude.toFixed(4)}`,
                displayName: q,
                address: `${res.latitude.toFixed(4)}°, ${res.longitude.toFixed(4)}°`,
                latitude: res.latitude,
                longitude: res.longitude,
              });
            }
          });

          if (nativeCandidates.length > 0) {
            queryCache.set(cacheKey, nativeCandidates);
            return nativeCandidates;
          }
        }
      } catch (nativeErr) {
        console.warn('[geocoding] Native geocodeAsync error, attempting fallbacks:', nativeErr);
        break; // Fall through to Nominatim & Open-Meteo
      }
    }
  }

  // 5. OpenStreetMap Nominatim & Open-Meteo progressive resolution
  for (const q of candidateQueries) {
    if (q.length < 2) continue;

    // A. OpenStreetMap Nominatim
    const nomResults = await searchNominatim(q);
    if (nomResults.length > 0) {
      queryCache.set(cacheKey, nomResults);
      return nomResults;
    }

    // B. Open-Meteo Geocoding (works reliably across web & mobile)
    const omResults = await searchOpenMeteo(q);
    if (omResults.length > 0) {
      queryCache.set(cacheKey, omResults);
      return omResults;
    }
  }

  queryCache.set(cacheKey, []);
  return [];
}

/**
 * Clears the in-memory geocoding query cache (useful in tests).
 */
export function clearGeocodeCache(): void {
  queryCache.clear();
}

