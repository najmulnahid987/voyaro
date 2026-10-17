/**
 * Route: /(tabs)/trips/[tripId]/map — Voyaro Trip Map View (Phase 9 — Step 3)
 *
 * Minimalist, full-screen interactive trip map:
 *   - Map occupies all available screen real estate
 *   - Displays markers only for itinerary items belonging to the selected trip with valid coordinates
 *   - Automatically fits to coordinates on screen load without overriding subsequent manual pans/zooms
 *   - Category legend / filter pills (All, Stays, Activities, Transit, Flights)
 *   - Compact floating bottom card for the selected marker with details & shortcut to itinerary
 *   - Useful empty state when no itinerary items have coordinates
 *   - Error and retry state when data fetching fails
 *   - Platform-safe native MapView with web fallback
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { fetchTripById, getActiveTripId, getCachedTrips, setActiveTripId } from '@/services/trip';
import { Trip, getTripById as getDevMockTripById } from '@/services/mockData';
import { useItinerary } from '@/services/itineraryStore';
import { VoyaroMapView, MapCoordinate, MapMarkerItem, MapRegion } from '@/components/maps';
import { useShellInsets } from '@/components/navigation';
import { formatItineraryDate, formatItineraryTime } from '@/utils/itineraryDateUtils';
import {
  ActivityMetadata,
  ConcreteItineraryItem,
  FlightMetadata,
  HotelMetadata,
  ItineraryItemType,
  TransportationMetadata,
} from '@/types/itinerary';
import { canGetDirections, openDestinationDirections } from '@/utils/mapDirections';
import {
  checkLocationServicesEnabled,
  getExistingLocationPermission,
  openLocationSettings,
  requestForegroundLocationPermission,
  fetchCurrentPosition,
} from '@/utils/userLocation';
import {
  fetchRouteGeometry,
  isRouteProviderConfigured,
  openExternalRoute,
} from '@/services/routing';
import * as Location from 'expo-location';

type CategoryFilter = 'all' | 'hotel' | 'activity' | 'transportation' | 'flight';

// Module-level caches to preserve map camera & selected pin across route transitions
const tripCameraCache = new Map<string, MapRegion>();
const tripSelectedMarkerCache = new Map<string, string | null>();

export interface SelectedMarkerPresentation {
  placeName: string;
  reservationTitle: string;
  typeLabel: string;
  categoryIcon: any;
  categoryColor: string;
  scheduledTimeText?: string;
  addressText?: string;
  confirmationNumber?: string;
  canOpenDetail: boolean;
  canDirections: boolean;
}

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

function getCategoryColor(type?: string): string {
  switch (type) {
    case 'hotel':
      return '#2c5f5e';
    case 'flight':
      return '#23527c';
    case 'activity':
      return '#b86b28';
    case 'transportation':
      return '#3b7a57';
    default:
      return colors.primary;
  }
}

function getCategoryIcon(type?: string) {
  switch (type) {
    case 'flight':
      return require('@/assets/images/icons/flight.svg');
    case 'hotel':
      return require('@/assets/images/icons/hotel.svg');
    case 'activity':
      return require('@/assets/images/icons/landscape.svg');
    case 'transportation':
      return require('@/assets/images/icons/swap-vert.svg');
    default:
      return require('@/assets/images/icons/location-pin.svg');
  }
}

function getCategoryLabel(type?: string): string {
  switch (type) {
    case 'hotel':
      return 'Stay / Lodging';
    case 'flight':
      return 'Flight';
    case 'activity':
      return 'Activity';
    case 'transportation':
      return 'Transit';
    default:
      return 'Location';
  }
}

export function getMarkerPresentation(marker: MapMarkerItem): SelectedMarkerPresentation {
  const item = marker.originalItem;
  if (!item) {
    const canDirections = canGetDirections({
      latitude: marker.coordinate?.latitude,
      longitude: marker.coordinate?.longitude,
      address: marker.description,
    });
    return {
      placeName: marker.title,
      reservationTitle: marker.title,
      typeLabel: marker.categoryLabel || 'Location',
      categoryIcon: require('@/assets/images/icons/location-pin.svg'),
      categoryColor: colors.primary,
      addressText: marker.description,
      canOpenDetail: false,
      canDirections,
    };
  }

  const isArrival = Boolean(marker.isDestinationPoint);

  let rawPresentation: Omit<SelectedMarkerPresentation, 'canDirections'>;

  switch (item.type) {
    case 'flight': {
      const meta = item.metadata as FlightMetadata;
      const airportCode = isArrival ? meta?.arrivalAirport : meta?.departureAirport;
      const city = isArrival ? meta?.arrivalCity : meta?.departureCity;
      const placeName = airportCode
        ? `${city ? `${city} ` : ''}(${airportCode})`
        : city || (isArrival ? 'Arrival Airport' : 'Departure Airport');

      const targetDate = isArrival && item.endDateTime ? item.endDateTime : item.startDateTime;
      const dateStr = formatItineraryDate(targetDate, 'medium');
      const timeStr = formatItineraryTime(targetDate);

      let addressText = item.location;
      if (isArrival && (meta?.terminal || meta?.gate)) {
        addressText = [
          meta?.arrivalAirport ? `${meta.arrivalAirport}` : null,
          meta?.terminal ? `Terminal ${meta.terminal}` : null,
          meta?.gate ? `Gate ${meta.gate}` : null,
        ]
          .filter(Boolean)
          .join(' · ');
      }

      rawPresentation = {
        placeName,
        reservationTitle: item.title,
        typeLabel: isArrival ? 'Flight Arrival' : 'Flight Departure',
        categoryIcon: require('@/assets/images/icons/flight.svg'),
        categoryColor: '#23527c',
        scheduledTimeText: timeStr ? `${dateStr} · ${timeStr}` : dateStr,
        addressText: addressText || undefined,
        confirmationNumber: item.confirmationNumber,
        canOpenDetail: true,
      };
      break;
    }

    case 'hotel': {
      const meta = item.metadata as HotelMetadata;
      const placeName = meta?.hotelName || item.title;
      const checkInDate = formatItineraryDate(item.startDateTime, 'short');
      const checkOutDate = item.endDateTime ? formatItineraryDate(item.endDateTime, 'short') : '';
      const checkInTime = meta?.checkIn || formatItineraryTime(item.startDateTime) || '3:00 PM';
      const dateRangeText = checkOutDate
        ? `${checkInDate} – ${checkOutDate} · Check-in ${checkInTime}`
        : `${checkInDate} · Check-in ${checkInTime}`;

      rawPresentation = {
        placeName,
        reservationTitle: item.title,
        typeLabel: 'Hotel Check-in',
        categoryIcon: require('@/assets/images/icons/hotel.svg'),
        categoryColor: '#2c5f5e',
        scheduledTimeText: dateRangeText,
        addressText: meta?.address || item.location,
        confirmationNumber: item.confirmationNumber,
        canOpenDetail: true,
      };
      break;
    }

    case 'transportation': {
      const meta = item.metadata as TransportationMetadata;
      let transTypeLabel = 'Transit';
      if (meta?.transportationType === 'train') transTypeLabel = 'Train';
      else if (meta?.transportationType === 'rental_car') transTypeLabel = 'Rental Car';
      else if (meta?.transportationType === 'ferry') transTypeLabel = 'Ferry';
      else if (meta?.transportationType === 'bus') transTypeLabel = 'Bus';

      const placeName = isArrival
        ? (meta?.to || `${item.title} (Arrival)`)
        : (meta?.from || item.title);

      const targetDate = isArrival && item.endDateTime ? item.endDateTime : item.startDateTime;
      const dateStr = formatItineraryDate(targetDate, 'medium');
      const timeStr = formatItineraryTime(targetDate);

      const seatOrPlatform = [meta?.platform ? `Platform ${meta.platform}` : null, meta?.seat ? `Seat ${meta.seat}` : null]
        .filter(Boolean)
        .join(' · ');

      rawPresentation = {
        placeName,
        reservationTitle: item.title,
        typeLabel: isArrival ? `${transTypeLabel} Arrival` : `${transTypeLabel} Departure`,
        categoryIcon: require('@/assets/images/icons/swap-vert.svg'),
        categoryColor: '#3b7a57',
        scheduledTimeText: timeStr ? `${dateStr} · ${timeStr}` : dateStr,
        addressText: seatOrPlatform || item.location,
        confirmationNumber: meta?.bookingNumber || item.confirmationNumber,
        canOpenDetail: true,
      };
      break;
    }

    case 'activity':
    default: {
      const meta = item.metadata as ActivityMetadata;
      const categoryLabel = meta?.category || 'Activity';
      const dateStr = formatItineraryDate(item.startDateTime, 'medium');
      const timeStr = formatItineraryTime(item.startDateTime);

      rawPresentation = {
        placeName: item.title,
        reservationTitle: categoryLabel,
        typeLabel: categoryLabel,
        categoryIcon: require('@/assets/images/icons/landscape.svg'),
        categoryColor: '#b86b28',
        scheduledTimeText: timeStr ? `${dateStr} · ${timeStr}` : dateStr,
        addressText: meta?.meetingPoint || item.location,
        confirmationNumber: item.confirmationNumber,
        canOpenDetail: true,
      };
      break;
    }
  }

  const canDirections = canGetDirections({
    latitude: marker.coordinate?.latitude,
    longitude: marker.coordinate?.longitude,
    address: rawPresentation.addressText,
  });

  return {
    ...rawPresentation,
    canDirections,
  };
}

export default function TripMapScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const effectiveTripId = tripId || getActiveTripId() || '';
  const { contentPaddingBottom } = useShellInsets();

  useEffect(() => {
    if (effectiveTripId) {
      setActiveTripId(effectiveTripId);
    }
  }, [effectiveTripId]);

  // 1. Load Trip metadata
  const [trip, setTrip] = useState<Trip | null>(() => {
    return (effectiveTripId ? getCachedTrips()?.find((t) => t.id === effectiveTripId) : null) || null;
  });

  useEffect(() => {
    let isMounted = true;
    async function loadTripData() {
      if (!effectiveTripId) return;
      try {
        const liveTrip = await fetchTripById(effectiveTripId);
        if (!isMounted) return;
        if (liveTrip) {
          setTrip(liveTrip);
        } else if (__DEV__ && (effectiveTripId === 'japan-adventure' || effectiveTripId === 'demo-trip')) {
          setTrip(getDevMockTripById(effectiveTripId) || null);
        }
      } catch (e) {
        if (!isMounted) return;
        if (__DEV__ && (effectiveTripId === 'japan-adventure' || effectiveTripId === 'demo-trip')) {
          setTrip(getDevMockTripById(effectiveTripId) || null);
        }
      }
    }
    loadTripData();
    return () => {
      isMounted = false;
    };
  }, [effectiveTripId]);

  // 2. Load Trip Itinerary Items reactively from Supabase repository
  const { items, loading, error, refresh } = useItinerary(effectiveTripId);

  // 3. UI State: Selection & Category Filtering (restores cached selection if user was viewing a marker)
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(() => {
    return tripSelectedMarkerCache.get(effectiveTripId) || null;
  });
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  // User Location State (ephemeral in-memory only, never persisted/uploaded to Supabase)
  const [userLocation, setUserLocation] = useState<MapCoordinate | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [cameraFocusRegion, setCameraFocusRegion] = useState<{ region: MapRegion; trigger: number } | null>(null);

  // Informative Location Rationale / Status Dialog
  const [locationDialog, setLocationDialog] = useState<{
    visible: boolean;
    type: 'rationale' | 'disabled' | 'blocked' | 'error';
    title: string;
    message: string;
    primaryActionLabel?: string;
    onPrimaryAction?: () => void;
    secondaryActionLabel?: string;
  } | null>(null);

  // ── Route Mode State (Phase 9 — Step 8) ──────────────────────────────────
  const [isRouteMode, setIsRouteMode] = useState<boolean>(false);
  const [routeOriginMarker, setRouteOriginMarker] = useState<MapMarkerItem | null>(null);
  const [routeDestMarker, setRouteDestMarker] = useState<MapMarkerItem | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<MapCoordinate[] | undefined>(undefined);
  const [isFetchingRoute, setIsFetchingRoute] = useState<boolean>(false);
  const [routeDialog, setRouteDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    primaryLabel?: string;
    onPrimary?: () => void;
  } | null>(null);


  // 4. Derive valid MapMarkerItems strictly from this trip's records
  const allValidMarkers = useMemo(() => {
    const list: MapMarkerItem[] = [];

    items.forEach((item) => {
      // Primary / Origin coordinate
      if (isValidCoordinate(item.latitude, item.longitude)) {
        list.push({
          id: item.id,
          coordinate: {
            latitude: item.latitude!,
            longitude: item.longitude!,
          },
          title: item.title,
          description: item.location || undefined,
          type: item.type,
          categoryLabel: getCategoryLabel(item.type),
          originalItem: item,
        });
      }

      // Optional distinct destination coordinate for transit / flights
      if (
        (item.type === 'transportation' || item.type === 'flight') &&
        isValidCoordinate(item.endLatitude, item.endLongitude) &&
        (item.endLatitude !== item.latitude || item.endLongitude !== item.longitude)
      ) {
        list.push({
          id: `${item.id}-destination`,
          coordinate: {
            latitude: item.endLatitude!,
            longitude: item.endLongitude!,
          },
          title: `${item.title} (Arrival)`,
          description: item.location || undefined,
          type: item.type,
          categoryLabel: `${getCategoryLabel(item.type)} Arrival`,
          isDestinationPoint: true,
          originalItem: item,
        });
      }
    });

    return list;
  }, [items]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      all: allValidMarkers.length,
      hotel: allValidMarkers.filter((m) => m.type === 'hotel').length,
      activity: allValidMarkers.filter((m) => m.type === 'activity').length,
      transportation: allValidMarkers.filter((m) => m.type === 'transportation').length,
      flight: allValidMarkers.filter((m) => m.type === 'flight').length,
    };
  }, [allValidMarkers]);

  // Filtered markers based on user's active category
  const visibleMarkers = useMemo(() => {
    if (activeCategory === 'all') return allValidMarkers;
    return allValidMarkers.filter((m) => m.type === activeCategory);
  }, [allValidMarkers, activeCategory]);

  // Selected marker object
  const selectedMarker = useMemo(() => {
    if (!selectedMarkerId) return null;
    return allValidMarkers.find((m) => m.id === selectedMarkerId) || null;
  }, [allValidMarkers, selectedMarkerId]);

  // Derived presentation model for selected marker
  const presentation = useMemo(() => {
    if (!selectedMarker) return null;
    return getMarkerPresentation(selectedMarker);
  }, [selectedMarker]);

  const hasSavedCamera = tripCameraCache.has(effectiveTripId);

  // Initial Region based on markers centroid or saved trip camera
  const initialRegion = useMemo<MapRegion>(() => {
    const saved = tripCameraCache.get(effectiveTripId);
    if (saved) return saved;

    if (allValidMarkers.length > 0) {
      let minLat = 90;
      let maxLat = -90;
      let minLng = 180;
      let maxLng = -180;

      allValidMarkers.forEach((m) => {
        minLat = Math.min(minLat, m.coordinate.latitude);
        maxLat = Math.max(maxLat, m.coordinate.latitude);
        minLng = Math.min(minLng, m.coordinate.longitude);
        maxLng = Math.max(maxLng, m.coordinate.longitude);
      });

      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(maxLat - minLat + 0.08, 0.08),
        longitudeDelta: Math.max(maxLng - minLng + 0.08, 0.08),
      };
    }

    // Default regional view (Tokyo / East Asia centroid default)
    return {
      latitude: 35.6762,
      longitude: 139.6503,
      latitudeDelta: 0.25,
      longitudeDelta: 0.25,
    };
  }, [allValidMarkers, effectiveTripId]);

  // ── Route Handlers (Phase 9 — Step 8) ──────────────────────────────────
  const executeRouteResolution = useCallback(async (origin: MapMarkerItem, dest: MapMarkerItem) => {
    setIsFetchingRoute(true);
    setRouteGeometry(undefined);
    try {
      const res = await fetchRouteGeometry({
        origin: origin.coordinate,
        destination: dest.coordinate,
        mode: 'driving',
        originLabel: origin.title,
        destinationLabel: dest.title,
      });

      if (res.status === 'success' && res.geometry) {
        setRouteGeometry(res.geometry);
      } else if (res.status === 'provider_not_configured') {
        setRouteDialog({
          visible: true,
          title: 'Routing Provider Not Configured',
          message:
            'In-app road routing requires a configured routing provider proxy to protect API credentials.\n\nVoyaro never displays a straight line as if it were a real road route.\n\nYou can open this exact route in Apple Maps or Google Maps for complete turn-by-turn navigation with live traffic.',
          primaryLabel: 'Open in Maps ↗',
          onPrimary: () => {
            setRouteDialog(null);
            openExternalRoute(origin.coordinate, dest.coordinate, origin.title, dest.title);
          },
        });
      } else {
        setRouteDialog({
          visible: true,
          title: 'Route Calculation Failed',
          message: res.errorMessage || 'Unable to calculate a road route between the selected locations.',
          primaryLabel: 'Dismiss',
          onPrimary: () => setRouteDialog(null),
        });
      }
    } finally {
      setIsFetchingRoute(false);
    }
  }, []);

  const handlePreviewTransitRoute = useCallback(
    async (item: ConcreteItineraryItem) => {
      if (
        !isValidCoordinate(item.latitude, item.longitude) ||
        !isValidCoordinate(item.endLatitude, item.endLongitude)
      ) {
        setRouteDialog({
          visible: true,
          title: 'Missing Coordinates',
          message: 'This itinerary item does not have both departure and arrival coordinates attached.',
          primaryLabel: 'Dismiss',
          onPrimary: () => setRouteDialog(null),
        });
        return;
      }

      const originCoord: MapCoordinate = { latitude: item.latitude!, longitude: item.longitude! };
      const destCoord: MapCoordinate = { latitude: item.endLatitude!, longitude: item.endLongitude! };

      const originMarkerItem: MapMarkerItem = {
        id: item.id,
        coordinate: originCoord,
        title: item.title,
        type: item.type,
      };
      const destMarkerItem: MapMarkerItem = {
        id: `${item.id}-destination`,
        coordinate: destCoord,
        title: `${item.title} (Arrival)`,
        type: item.type,
        isDestinationPoint: true,
      };

      setIsRouteMode(true);
      setRouteOriginMarker(originMarkerItem);
      setRouteDestMarker(destMarkerItem);
      await executeRouteResolution(originMarkerItem, destMarkerItem);
    },
    [executeRouteResolution]
  );

  const handleExitRouteMode = useCallback(() => {
    setIsRouteMode(false);
    setRouteOriginMarker(null);
    setRouteDestMarker(null);
    setRouteGeometry(undefined);
  }, []);

  // Handlers
  const handleMarkerPress = useCallback(
    (marker: MapMarkerItem) => {
      if (isRouteMode) {
        if (!routeOriginMarker) {
          setRouteOriginMarker(marker);
        } else if (!routeDestMarker) {
          if (marker.id === routeOriginMarker.id) {
            return;
          }
          setRouteDestMarker(marker);
          executeRouteResolution(routeOriginMarker, marker);
        } else {
          setRouteDestMarker(marker);
          executeRouteResolution(routeOriginMarker, marker);
        }
        return;
      }

      setSelectedMarkerId(marker.id);
      tripSelectedMarkerCache.set(effectiveTripId, marker.id);
    },
    [isRouteMode, routeOriginMarker, routeDestMarker, effectiveTripId, executeRouteResolution]
  );

  const handleMapPress = useCallback(() => {
    setSelectedMarkerId(null);
    tripSelectedMarkerCache.set(effectiveTripId, null);
  }, [effectiveTripId]);

  const handleCloseCard = useCallback(() => {
    setSelectedMarkerId(null);
    tripSelectedMarkerCache.set(effectiveTripId, null);
  }, [effectiveTripId]);

  const handleGetDirections = useCallback(() => {
    if (!selectedMarker) return;
    openDestinationDirections({
      latitude: selectedMarker.coordinate.latitude,
      longitude: selectedMarker.coordinate.longitude,
      address: presentation?.addressText,
      label: presentation?.placeName,
    });
  }, [selectedMarker, presentation]);

  const handleRegionChangeComplete = useCallback((newRegion: MapRegion) => {
    tripCameraCache.set(effectiveTripId, newRegion);
  }, [effectiveTripId]);

  const handleOpenItineraryItem = useCallback(
    (item?: ConcreteItineraryItem) => {
      if (item?.id) {
        router.push({
          pathname: '/itinerary/[itemId]',
          params: { itemId: item.id, tripId: effectiveTripId },
        });
      }
    },
    [effectiveTripId]
  );

  const handleGoToItinerary = useCallback(() => {
    router.push(`/(tabs)/trips/${effectiveTripId}/itinerary` as any);
  }, [effectiveTripId]);

  // Handle "My Location" tap: checks services, explains rationale if needed, requests permission, and centers camera
  const handleMyLocationPress = useCallback(async () => {
    if (isLocating) return;

    // 1. Check if location services are enabled on device
    const servicesEnabled = await checkLocationServicesEnabled();
    if (!servicesEnabled) {
      setLocationDialog({
        visible: true,
        type: 'disabled',
        title: 'Location Services Disabled',
        message: 'Location services are turned off on your device. Please turn them on in device Settings to view your current position.',
        primaryActionLabel: 'OK',
        onPrimaryAction: () => setLocationDialog(null),
      });
      return;
    }

    // 2. Check existing permission status without prompting
    const existingPerm = await getExistingLocationPermission();

    // Case A: Permission is already granted
    if (existingPerm && existingPerm.status === Location.PermissionStatus.GRANTED) {
      setHasLocationPermission(true);
      setIsLocating(true);
      try {
        const coords = await fetchCurrentPosition();
        if (coords) {
          setUserLocation(coords);
          const newRegion: MapRegion = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          };
          setCameraFocusRegion({ region: newRegion, trigger: Date.now() });
          tripCameraCache.set(effectiveTripId, newRegion);
        } else {
          setLocationDialog({
            visible: true,
            type: 'error',
            title: 'Location Unavailable',
            message: 'Unable to determine your current position. Please check your signal and try again.',
            primaryActionLabel: 'Dismiss',
            onPrimaryAction: () => setLocationDialog(null),
          });
        }
      } catch (err) {
        setLocationDialog({
          visible: true,
          type: 'error',
          title: 'Location Unavailable',
          message: 'Unable to determine your current position. Please check your signal and try again.',
          primaryActionLabel: 'Dismiss',
          onPrimaryAction: () => setLocationDialog(null),
        });
      } finally {
        setIsLocating(false);
      }
      return;
    }

    // Case B: Permission was previously denied and system refuses to ask again
    if (existingPerm && !existingPerm.canAskAgain && existingPerm.status === Location.PermissionStatus.DENIED) {
      setLocationDialog({
        visible: true,
        type: 'blocked',
        title: 'Location Permission Needed',
        message: 'Location access for Voyaro was previously declined. To view your position on the trip map, please enable location access in your device Settings.',
        primaryActionLabel: 'Open Settings',
        onPrimaryAction: () => {
          setLocationDialog(null);
          openLocationSettings();
        },
        secondaryActionLabel: 'Cancel',
      });
      return;
    }

    // Case C: Undetermined or can ask again -> Explain why location access is useful first!
    setLocationDialog({
      visible: true,
      type: 'rationale',
      title: 'Find Your Location',
      message: 'Voyaro uses your foreground location to show your current position relative to your trip destinations. Your location is never tracked continuously or uploaded.',
      primaryActionLabel: 'Continue',
      onPrimaryAction: async () => {
        setLocationDialog(null);
        setIsLocating(true);
        try {
          const requested = await requestForegroundLocationPermission();
          if (requested && requested.status === Location.PermissionStatus.GRANTED) {
            setHasLocationPermission(true);
            const coords = await fetchCurrentPosition();
            if (coords) {
              setUserLocation(coords);
              const newRegion: MapRegion = {
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              };
              setCameraFocusRegion({ region: newRegion, trigger: Date.now() });
              tripCameraCache.set(effectiveTripId, newRegion);
            } else {
              setLocationDialog({
                visible: true,
                type: 'error',
                title: 'Location Unavailable',
                message: 'Unable to determine your current position. Please check your signal and try again.',
                primaryActionLabel: 'Dismiss',
                onPrimaryAction: () => setLocationDialog(null),
              });
            }
          } else {
            // Permission denied: keep map usable and explain how to enable permission if desired
            setHasLocationPermission(false);
            if (requested && !requested.canAskAgain) {
              setLocationDialog({
                visible: true,
                type: 'blocked',
                title: 'Permission Denied',
                message: 'Location access was not granted. The map remains fully usable. If you change your mind, you can enable location in Settings anytime.',
                primaryActionLabel: 'Open Settings',
                onPrimaryAction: () => {
                  setLocationDialog(null);
                  openLocationSettings();
                },
                secondaryActionLabel: 'Dismiss',
              });
            } else {
              setLocationDialog({
                visible: true,
                type: 'error',
                title: 'Permission Denied',
                message: 'Location access was not granted. The map remains fully usable without current location.',
                primaryActionLabel: 'Dismiss',
                onPrimaryAction: () => setLocationDialog(null),
              });
            }
          }
        } catch (e) {
          console.warn('[map] Error requesting permission:', e);
        } finally {
          setIsLocating(false);
        }
      },
      secondaryActionLabel: 'Not Now',
    });
  }, [isLocating, effectiveTripId]);

  return (
    <View style={styles.container}>
      {/* ── 1. Full-Screen Map Canvas ───────────────────────────────────── */}
      <VoyaroMapView
        testID="trip-full-map-view"
        style={styles.mapCanvas}
        initialRegion={initialRegion}
        markers={visibleMarkers}
        selectedMarkerId={selectedMarkerId || undefined}
        onMarkerPress={handleMarkerPress}
        onMapPress={handleMapPress}
        onRegionChangeComplete={handleRegionChangeComplete}
        autoFit={!hasSavedCamera}
        showsScale={true}
        showsCompass={true}
        showsUserLocation={hasLocationPermission}
        userLocation={userLocation}
        cameraFocusRegion={cameraFocusRegion}
        routeGeometry={routeGeometry}
      />

      {/* ── Route Mode Selection Banner (Phase 9 — Step 8) ──────────────── */}
      {isRouteMode && (
        <View style={styles.routeModeBanner} pointerEvents="box-none">
          <View style={styles.routeModeCard}>
            <View style={styles.routeModeHeader}>
              <View style={styles.routeModeTitleRow}>
                <Image
                  source={require('@/assets/images/icons/place.svg')}
                  style={styles.routeModeIcon}
                  tintColor={colors.primary}
                  contentFit="contain"
                />
                <Text style={styles.routeModeTitle}>Route Selection Mode</Text>
              </View>
              <Pressable
                onPress={handleExitRouteMode}
                style={styles.routeCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Exit route mode"
              >
                <Text style={styles.routeCloseText}>✕ Exit</Text>
              </Pressable>
            </View>

            <View style={styles.routeStepsContainer}>
              <View style={styles.routeStepRow}>
                <View style={[styles.routeStepDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.routeStepLabel}>Origin:</Text>
                <Text style={styles.routeStepValue} numberOfLines={1}>
                  {routeOriginMarker ? routeOriginMarker.title : 'Tap a map pin to set origin'}
                </Text>
              </View>
              <View style={styles.routeStepRow}>
                <View style={[styles.routeStepDot, { backgroundColor: '#b86b28' }]} />
                <Text style={styles.routeStepLabel}>Destination:</Text>
                <Text style={styles.routeStepValue} numberOfLines={1}>
                  {routeDestMarker ? routeDestMarker.title : 'Tap a map pin to set destination'}
                </Text>
              </View>
            </View>

            {isFetchingRoute && (
              <View style={styles.routeLoadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.routeLoadingText}>Resolving road route...</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── 2. Floating Category Legend / Filter Bar ────────────────────── */}
      {allValidMarkers.length > 0 && !isRouteMode && (
        <View style={styles.legendContainer} pointerEvents="box-none">
          <View style={styles.legendPillsRow}>
            {/* All Pill */}
            <Pressable
              onPress={() => setActiveCategory('all')}
              style={[
                styles.legendPill,
                activeCategory === 'all' && styles.legendPillActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Show all locations"
            >
              <Text
                style={[
                  styles.legendPillText,
                  activeCategory === 'all' && styles.legendPillTextActive,
                ]}
              >
                All ({categoryCounts.all})
              </Text>
            </Pressable>

            {/* Stays / Lodging */}
            {categoryCounts.hotel > 0 && (
              <Pressable
                onPress={() => setActiveCategory(activeCategory === 'hotel' ? 'all' : 'hotel')}
                style={[
                  styles.legendPill,
                  activeCategory === 'hotel' && styles.legendPillActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Filter stays"
              >
                <View style={[styles.pillDot, { backgroundColor: getCategoryColor('hotel') }]} />
                <Text
                  style={[
                    styles.legendPillText,
                    activeCategory === 'hotel' && styles.legendPillTextActive,
                  ]}
                >
                  Stays ({categoryCounts.hotel})
                </Text>
              </Pressable>
            )}

            {/* Activities */}
            {categoryCounts.activity > 0 && (
              <Pressable
                onPress={() => setActiveCategory(activeCategory === 'activity' ? 'all' : 'activity')}
                style={[
                  styles.legendPill,
                  activeCategory === 'activity' && styles.legendPillActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Filter activities"
              >
                <View style={[styles.pillDot, { backgroundColor: getCategoryColor('activity') }]} />
                <Text
                  style={[
                    styles.legendPillText,
                    activeCategory === 'activity' && styles.legendPillTextActive,
                  ]}
                >
                  Activities ({categoryCounts.activity})
                </Text>
              </Pressable>
            )}

            {/* Transit */}
            {categoryCounts.transportation > 0 && (
              <Pressable
                onPress={() => setActiveCategory(activeCategory === 'transportation' ? 'all' : 'transportation')}
                style={[
                  styles.legendPill,
                  activeCategory === 'transportation' && styles.legendPillActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Filter transit"
              >
                <View style={[styles.pillDot, { backgroundColor: getCategoryColor('transportation') }]} />
                <Text
                  style={[
                    styles.legendPillText,
                    activeCategory === 'transportation' && styles.legendPillTextActive,
                  ]}
                >
                  Transit ({categoryCounts.transportation})
                </Text>
              </Pressable>
            )}

            {/* Flights */}
            {categoryCounts.flight > 0 && (
              <Pressable
                onPress={() => setActiveCategory(activeCategory === 'flight' ? 'all' : 'flight')}
                style={[
                  styles.legendPill,
                  activeCategory === 'flight' && styles.legendPillActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Filter flights"
              >
                <View style={[styles.pillDot, { backgroundColor: getCategoryColor('flight') }]} />
                <Text
                  style={[
                    styles.legendPillText,
                    activeCategory === 'flight' && styles.legendPillTextActive,
                  ]}
                >
                  Flights ({categoryCounts.flight})
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* ── 3. Selected Marker Compact Card ─────────────────────────────── */}
      {selectedMarker && presentation && selectedMarker.originalItem && (
        <View
          style={[
            styles.bottomCardContainer,
            { bottom: Math.max(contentPaddingBottom, spacing.lg) + spacing.xs },
          ]}
        >
          <View style={styles.selectedCard}>
            {/* Header row: Category Badge, Confirmation Pill, & Close Button */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.categoryBadge}>
                <Image
                  source={presentation.categoryIcon}
                  style={styles.categoryIcon}
                  tintColor={presentation.categoryColor}
                  contentFit="contain"
                />
                <Text
                  style={[
                    styles.categoryBadgeText,
                    { color: presentation.categoryColor },
                  ]}
                >
                  {presentation.typeLabel.toUpperCase()}
                </Text>
              </View>

              <View style={styles.cardHeaderRightActions}>
                {presentation.confirmationNumber ? (
                  <View style={styles.confirmationBadge}>
                    <Text style={styles.confirmationBadgeText}>
                      #{presentation.confirmationNumber}
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleCloseCard}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Close location card"
                >
                  <Image
                    source={require('@/assets/images/icons/close.svg')}
                    style={styles.closeIcon}
                    tintColor={colors.textSecondary}
                    contentFit="contain"
                  />
                </Pressable>
              </View>
            </View>

            {/* Place Name Headline */}
            <Text style={styles.cardTitle} numberOfLines={2}>
              {presentation.placeName}
            </Text>

            {/* Reservation / Activity Title if distinct from Place Name */}
            {presentation.reservationTitle && presentation.reservationTitle !== presentation.placeName ? (
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {presentation.reservationTitle}
              </Text>
            ) : null}

            {/* Scheduled Date & Time */}
            {presentation.scheduledTimeText ? (
              <View style={styles.cardMetaRow}>
                <Image
                  source={require('@/assets/images/icons/clock.svg')}
                  style={styles.metaRowIcon}
                  tintColor={colors.primary}
                  contentFit="contain"
                />
                <Text style={styles.cardDateText}>
                  {presentation.scheduledTimeText}
                </Text>
              </View>
            ) : null}

            {/* Address / Location Detail */}
            {presentation.addressText ? (
              <View style={styles.locationDetailRow}>
                <Image
                  source={require('@/assets/images/icons/location-pin.svg')}
                  style={styles.metaRowIcon}
                  tintColor={colors.textMuted}
                  contentFit="contain"
                />
                <Text style={styles.locationText} numberOfLines={2}>
                  {presentation.addressText}
                </Text>
              </View>
            ) : null}

            {/* Action Buttons: Navigate to Itinerary Detail & Open External Maps Directions */}
            <View style={styles.cardActionsRow}>
              <Pressable
                onPress={() => handleOpenItineraryItem(selectedMarker.originalItem)}
                style={({ pressed }) => [
                  styles.actionButtonPrimary,
                  pressed && styles.actionButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`View reservation details for ${presentation.placeName}`}
              >
                <Text style={styles.actionButtonPrimaryText}>View Details →</Text>
              </Pressable>

              {presentation.canDirections && (
                <Pressable
                  onPress={handleGetDirections}
                  style={({ pressed }) => [
                    styles.actionButtonSecondary,
                    pressed && styles.actionButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Get directions to ${presentation.placeName} in external maps`}
                >
                  <Image
                    source={require('@/assets/images/icons/location-pin.svg')}
                    style={styles.actionButtonIcon}
                    tintColor={colors.primary}
                    contentFit="contain"
                  />
                  <Text style={styles.actionButtonSecondaryText}>Get Directions ↗</Text>
                </Pressable>
              )}

              {selectedMarker.originalItem &&
                (selectedMarker.originalItem.type === 'transportation' || selectedMarker.originalItem.type === 'flight') &&
                isValidCoordinate(selectedMarker.originalItem.latitude, selectedMarker.originalItem.longitude) &&
                isValidCoordinate(selectedMarker.originalItem.endLatitude, selectedMarker.originalItem.endLongitude) && (
                  <Pressable
                    onPress={() => handlePreviewTransitRoute(selectedMarker.originalItem!)}
                    style={({ pressed }) => [
                      styles.actionButtonSecondary,
                      pressed && styles.actionButtonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Preview route between departure and arrival"
                  >
                    <Image
                      source={require('@/assets/images/icons/place.svg')}
                      style={styles.actionButtonIcon}
                      tintColor={colors.primary}
                      contentFit="contain"
                    />
                    <Text style={styles.actionButtonSecondaryText}>Route ⇄</Text>
                  </Pressable>
                )}
            </View>
          </View>
        </View>
      )}

      {/* ── 4. Floating "My Location" Control Button ─────────────────────── */}
      <Pressable
        testID="my-location-control-button"
        onPress={handleMyLocationPress}
        style={({ pressed }) => [
          styles.myLocationButton,
          hasLocationPermission && styles.myLocationButtonActive,
          pressed && styles.buttonPressed,
          {
            bottom: selectedMarker
              ? Math.max(contentPaddingBottom, spacing.lg) + 215
              : Math.max(contentPaddingBottom, spacing.lg) + spacing.md,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Locate my position on map"
        accessibilityHint="Centers map on your current location"
      >
        {isLocating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Image
            source={require('@/assets/images/icons/my-location.svg')}
            style={styles.myLocationIcon}
            tintColor={hasLocationPermission ? colors.primary : colors.textSecondary}
            contentFit="contain"
          />
        )}
      </Pressable>

      {/* ── 5. Floating "Route Mode" Control Button (Step 8) ─────────────── */}
      <Pressable
        testID="route-mode-control-button"
        onPress={() => {
          if (isRouteMode) {
            handleExitRouteMode();
          } else {
            setIsRouteMode(true);
          }
        }}
        style={({ pressed }) => [
          styles.routeFloatingButton,
          isRouteMode && styles.routeFloatingButtonActive,
          pressed && styles.buttonPressed,
          {
            bottom: selectedMarker
              ? Math.max(contentPaddingBottom, spacing.lg) + 275
              : Math.max(contentPaddingBottom, spacing.lg) + spacing.md + 56,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={isRouteMode ? 'Exit route mode' : 'Select two locations for route preview'}
        accessibilityHint="Toggles two-point route selection mode"
      >
        <Image
          source={require('@/assets/images/icons/place.svg')}
          style={styles.myLocationIcon}
          tintColor={isRouteMode ? colors.primary : colors.textSecondary}
          contentFit="contain"
        />
      </Pressable>

      {/* ── 5. Location Permission & Rationale Dialog ───────────────────── */}
      {locationDialog?.visible && (
        <View style={styles.centerOverlay} pointerEvents="box-none">
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconCircle}>
              <Image
                source={
                  locationDialog.type === 'rationale'
                    ? require('@/assets/images/icons/my-location.svg')
                    : locationDialog.type === 'disabled'
                    ? require('@/assets/images/icons/place.svg')
                    : require('@/assets/images/icons/sparkles.svg')
                }
                style={styles.dialogIcon}
                tintColor={colors.primary}
                contentFit="contain"
              />
            </View>

            <Text style={styles.dialogTitle}>{locationDialog.title}</Text>
            <Text style={styles.dialogMessage}>{locationDialog.message}</Text>

            <View style={styles.dialogButtonsRow}>
              {locationDialog.secondaryActionLabel ? (
                <Pressable
                  onPress={() => setLocationDialog(null)}
                  style={({ pressed }) => [
                    styles.dialogSecondaryButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={locationDialog.secondaryActionLabel}
                >
                  <Text style={styles.dialogSecondaryButtonText}>
                    {locationDialog.secondaryActionLabel}
                  </Text>
                </Pressable>
              ) : null}

              {locationDialog.primaryActionLabel ? (
                <Pressable
                  onPress={locationDialog.onPrimaryAction}
                  style={({ pressed }) => [
                    styles.dialogPrimaryButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={locationDialog.primaryActionLabel}
                >
                  <Text style={styles.dialogPrimaryButtonText}>
                    {locationDialog.primaryActionLabel}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      )}

      {/* ── 6. Route Mode Notice Dialog (Phase 9 — Step 8) ──────────────── */}
      {routeDialog?.visible && (
        <View style={styles.centerOverlay} pointerEvents="box-none">
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconCircle}>
              <Image
                source={require('@/assets/images/icons/place.svg')}
                style={styles.dialogIcon}
                tintColor={colors.primary}
                contentFit="contain"
              />
            </View>

            <Text style={styles.dialogTitle}>{routeDialog.title}</Text>
            <Text style={styles.dialogMessage}>{routeDialog.message}</Text>

            <View style={styles.dialogButtonsRow}>
              <Pressable
                onPress={() => setRouteDialog(null)}
                style={({ pressed }) => [
                  styles.dialogSecondaryButton,
                  pressed && styles.actionButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
              >
                <Text style={styles.dialogSecondaryButtonText}>Close</Text>
              </Pressable>

              {routeDialog.primaryLabel ? (
                <Pressable
                  onPress={routeDialog.onPrimary}
                  style={({ pressed }) => [
                    styles.dialogPrimaryButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={routeDialog.primaryLabel}
                >
                  <Text style={styles.dialogPrimaryButtonText}>
                    {routeDialog.primaryLabel}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      )}

      {/* ── 6. Empty State: No Valid Coordinates ────────────────────────── */}
      {!loading && !error && allValidMarkers.length === 0 && (
        <View style={styles.centerOverlay} pointerEvents="box-none">
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Image
                source={require('@/assets/images/icons/location-pin.svg')}
                style={styles.emptyIcon}
                tintColor={colors.primary}
                contentFit="contain"
              />
            </View>

            <Text style={styles.emptyTitle}>No Pinned Locations Yet</Text>
            <Text style={styles.emptyMessage}>
              None of the itinerary reservations in this trip have geographic coordinates saved yet.
            </Text>

            <Pressable
              onPress={handleGoToItinerary}
              style={({ pressed }) => [
                styles.emptyActionButton,
                pressed && styles.actionButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="View itinerary timeline"
            >
              <Text style={styles.emptyActionText}>View Itinerary Timeline →</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── 5. Error & Retry State ──────────────────────────────────────── */}
      {error && !loading && (
        <View style={styles.centerOverlay} pointerEvents="box-none">
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to Load Map</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Pressable
              onPress={refresh}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.actionButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Retry loading map"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── 6. Initial Loading Overlay ──────────────────────────────────── */}
      {loading && allValidMarkers.length === 0 && (
        <View style={styles.centerOverlay} pointerEvents="none">
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingCardText}>Loading trip locations...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  mapCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // --- Category Legend / Filter Bar ---
  legendContainer: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  legendPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.12)',
    ...shadows.card,
  },
  legendPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendPillText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.textPrimary,
    fontSize: 12,
  },
  legendPillTextActive: {
    color: colors.textOnPrimary,
    fontFamily: fontFamily.semiBold,
  },

  // --- Selected Marker Bottom Card ---
  bottomCardContainer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 20,
    alignItems: 'center',
  },
  selectedCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.12)',
    ...shadows.sheet,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardHeaderRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  confirmationBadge: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.08)',
  },
  confirmationBadgeText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.textMuted,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  categoryIcon: {
    width: 12,
    height: 12,
  },
  categoryBadgeText: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    width: 12,
    height: 12,
  },
  cardTitle: {
    ...typography.cardTitle,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  metaRowIcon: {
    width: 12,
    height: 12,
  },
  cardDateText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  locationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  locationPinIcon: {
    width: 12,
    height: 12,
  },
  locationText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  actionButtonPrimaryText: {
    ...typography.label,
    fontFamily: fontFamily.semiBold,
    color: colors.textOnPrimary,
    fontSize: 13,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primarySurface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.15)',
  },
  actionButtonSecondaryText: {
    ...typography.label,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontSize: 13,
  },
  actionButtonIcon: {
    width: 13,
    height: 13,
  },
  actionButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  buttonPressed: {
    opacity: 0.6,
  },

  // --- Center Overlays (Empty / Error / Loading) ---
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    zIndex: 15,
  },
  emptyCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.12)',
    ...shadows.card,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyIcon: {
    width: 22,
    height: 22,
  },
  emptyTitle: {
    ...typography.cardTitle,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyMessage: {
    ...typography.bodySecondary,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyActionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
  },
  emptyActionText: {
    ...typography.label,
    fontFamily: fontFamily.semiBold,
    color: colors.textOnPrimary,
  },

  // --- Error Card ---
  errorCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(176, 74, 74, 0.2)',
    ...shadows.card,
  },
  errorTitle: {
    ...typography.cardTitle,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  errorMessage: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
  },
  retryButtonText: {
    ...typography.label,
    color: colors.textOnPrimary,
  },

  // --- Loading Card ---
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.12)',
    ...shadows.card,
  },
  loadingCardText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },

  // --- Floating "My Location" Control Button ---
  myLocationButton: {
    position: 'absolute',
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.15)',
    zIndex: 15,
    ...shadows.sheet,
  },
  myLocationButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  myLocationIcon: {
    width: 22,
    height: 22,
  },

  // --- Location Rationale & Status Dialog ---
  dialogCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.12)',
    ...shadows.sheet,
  },
  dialogIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  dialogIcon: {
    width: 24,
    height: 24,
  },
  dialogTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  dialogMessage: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  dialogPrimaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogPrimaryButtonText: {
    ...typography.label,
    color: colors.textOnPrimary,
    fontFamily: fontFamily.semiBold,
  },
  dialogSecondaryButton: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.12)',
  },
  dialogSecondaryButtonText: {
    ...typography.label,
    color: colors.textSecondary,
    fontFamily: fontFamily.medium,
  },

  // --- Route Mode HUD & Floating Controls (Step 8) ---
  routeModeBanner: {
    position: 'absolute',
    top: 70,
    left: spacing.md,
    right: spacing.md,
    zIndex: 12,
  },
  routeModeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.15)',
    ...shadows.sheet,
  },
  routeModeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  routeModeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeModeIcon: {
    width: 16,
    height: 16,
  },
  routeModeTitle: {
    ...typography.label,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },
  routeCloseBtn: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.1)',
  },
  routeCloseText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
    fontSize: 11,
  },
  routeStepsContainer: {
    gap: 4,
    marginTop: 4,
  },
  routeStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeStepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeStepLabel: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    width: 75,
  },
  routeStepValue: {
    ...typography.caption,
    fontFamily: fontFamily.regular,
    color: colors.textPrimary,
    flex: 1,
  },
  routeLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  routeLoadingText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 11,
  },
  routeFloatingButton: {
    position: 'absolute',
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.15)',
    ...shadows.card,
    zIndex: 10,
  },
  routeFloatingButtonActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
});
