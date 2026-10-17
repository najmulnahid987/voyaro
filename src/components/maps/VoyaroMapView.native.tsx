import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { WebView } from 'react-native-webview';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { VoyaroMapViewProps, MapMarkerItem, MapRegion } from './types';

function getPinColor(type?: string, isSelected?: boolean): string {
  if (isSelected) return '#102e2d'; // Deepest forest highlight
  switch (type) {
    case 'hotel':
      return '#2c5f5e'; // Brand teal
    case 'flight':
      return '#23527c'; // Sky blue
    case 'activity':
      return '#b86b28'; // Warm amber
    case 'transportation':
      return '#3b7a57'; // Transit green
    default:
      return colors.primary;
  }
}

function getCategorySvgPath(type?: string): string {
  switch (type) {
    case 'hotel':
      return '<path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/>';
    case 'flight':
      return '<path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>';
    case 'transportation':
      return '<path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>';
    case 'activity':
    default:
      return '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>';
  }
}

/**
 * High-performance, keyless Android Map Engine (Leaflet + OpenStreetMap/Carto Voyager).
 * Runs out-of-the-box in Expo Go on all Android devices with zero Google Maps API keys or billing required.
 */
function AndroidLeafletMapView({
  initialRegion,
  region,
  cameraFocusRegion,
  userLocation,
  showsUserLocation,
  markers = [],
  selectedMarkerId,
  style,
  autoFit = true,
  onRegionChangeComplete,
  onMarkerPress,
  onMapPress,
  routeGeometry,
  routeStrokeColor = '#2c5f5e',
  routeStrokeWidth = 4,
  testID,
}: VoyaroMapViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const centerLat = useMemo(() => {
    if (cameraFocusRegion?.region) return cameraFocusRegion.region.latitude;
    if (region?.latitude) return region.latitude;
    if (markers.length > 0) return markers[0].coordinate.latitude;
    if (initialRegion?.latitude) return initialRegion.latitude;
    return 35.6762;
  }, [cameraFocusRegion, region, markers, initialRegion]);

  const centerLng = useMemo(() => {
    if (cameraFocusRegion?.region) return cameraFocusRegion.region.longitude;
    if (region?.longitude) return region.longitude;
    if (markers.length > 0) return markers[0].coordinate.longitude;
    if (initialRegion?.longitude) return initialRegion.longitude;
    return 139.6503;
  }, [cameraFocusRegion, region, markers, initialRegion]);

  const prevFocusTrigger = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (
      cameraFocusRegion &&
      cameraFocusRegion.trigger !== prevFocusTrigger.current &&
      webViewRef.current
    ) {
      prevFocusTrigger.current = cameraFocusRegion.trigger;
      webViewRef.current.injectJavaScript(`
        if (window.map) {
          window.map.panTo([${cameraFocusRegion.region.latitude}, ${cameraFocusRegion.region.longitude}], { animate: true });
        }
        true;
      `);
    }
  }, [cameraFocusRegion]);

  const leafletHtml = useMemo(() => {
    const serializedMarkers = JSON.stringify(
      markers.map((m) => ({
        id: m.id,
        lat: m.coordinate.latitude,
        lng: m.coordinate.longitude,
        title: m.title || '',
        category: m.type || 'activity',
        color: getPinColor(m.type, m.id === selectedMarkerId),
        svg: getCategorySvgPath(m.type),
        isSelected: m.id === selectedMarkerId,
      }))
    );

    const serializedRoute = JSON.stringify(
      routeGeometry && routeGeometry.length >= 2
        ? routeGeometry.map((p) => [p.latitude, p.longitude])
        : []
    );

    const serializedUserLoc = JSON.stringify(
      showsUserLocation && userLocation
        ? { lat: userLocation.latitude, lng: userLocation.longitude }
        : null
    );

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #eef3f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .voyaro-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .voyaro-pin:hover {
      transform: scale(1.15);
    }
    .voyaro-pin-selected {
      transform: scale(1.25) !important;
      box-shadow: 0 0 0 3px #102e2d, 0 6px 18px rgba(0,0,0,0.5) !important;
      z-index: 1000 !important;
    }
    .voyaro-pin svg {
      width: 18px;
      height: 18px;
      fill: #ffffff;
    }
    .user-pulse-dot {
      width: 16px;
      height: 16px;
      background: #208AEF;
      border: 2.5px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(32, 138, 239, 0.3);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(32, 138, 239, 0.5); }
      70% { box-shadow: 0 0 0 14px rgba(32, 138, 239, 0); }
      100% { box-shadow: 0 0 0 0 rgba(32, 138, 239, 0); }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    try {
      window.map = L.map('map', {
        zoomControl: true,
        attributionControl: false
      }).setView([${centerLat}, ${centerLng}], 12);

      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      });
      tiles.on('tileerror', function() {
        L.tileLayer('https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(window.map);
      });
      tiles.addTo(window.map);

      L.control.scale({ position: 'bottomleft', imperial: false }).addTo(window.map);

      const markersData = ${serializedMarkers};
      const bounds = [];

      markersData.forEach(function(m) {
        bounds.push([m.lat, m.lng]);
        const isSel = m.isSelected;
        const iconHtml = '<div class="voyaro-pin ' + (isSel ? 'voyaro-pin-selected' : '') + '" style="background: ' + (isSel ? '#102e2d' : m.color) + '"><svg viewBox="0 0 24 24">' + m.svg + '</svg></div>';
        
        const icon = L.divIcon({
          className: '',
          html: iconHtml,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        const marker = L.marker([m.lat, m.lng], { icon: icon }).addTo(window.map);
        marker.bindTooltip(m.title, { direction: 'top', offset: [0, -18] });
        
        marker.on('click', function(e) {
          L.DomEvent.stopPropagation(e);
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'VOYARO_PIN_CLICK', markerId: m.id }));
          }
        });
      });

      const routeCoords = ${serializedRoute};
      if (routeCoords.length >= 2) {
        L.polyline(routeCoords, {
          color: '${routeStrokeColor}',
          weight: ${routeStrokeWidth},
          opacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(window.map);
      }

      const userLoc = ${serializedUserLoc};
      if (userLoc) {
        const userIcon = L.divIcon({
          className: '',
          html: '<div class="user-pulse-dot"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        L.marker([userLoc.lat, userLoc.lng], { icon: userIcon }).addTo(window.map).bindTooltip('My Location', { direction: 'top', offset: [0, -10] });
      }

      ${autoFit ? `
      if (bounds.length >= 2) {
        window.map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      } else if (bounds.length === 1) {
        window.map.setView(bounds[0], 13);
      }
      ` : ''}

      window.map.on('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'VOYARO_MAP_CLICK' }));
        }
      });

      window.map.on('moveend', function() {
        const c = window.map.getCenter();
        const b = window.map.getBounds();
        const latDelta = Math.abs(b.getNorth() - b.getSouth());
        const lngDelta = Math.abs(b.getEast() - b.getWest());
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'VOYARO_REGION_CHANGE',
            region: {
              latitude: c.lat,
              longitude: c.lng,
              latitudeDelta: latDelta,
              longitudeDelta: lngDelta
            }
          }));
        }
      });

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'VOYARO_MAP_READY' }));
      }
    } catch(err) {
      console.error('Leaflet Android error:', err);
    }
  </script>
</body>
</html>`;
  }, [markers, selectedMarkerId, routeGeometry, showsUserLocation, userLocation, autoFit, centerLat, centerLng, routeStrokeColor, routeStrokeWidth]);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: leafletHtml }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={true}
        onLoadEnd={() => setIsLoaded(true)}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'VOYARO_PIN_CLICK' && data.markerId) {
              const found = markers.find((m) => m.id === data.markerId);
              if (found) {
                onMarkerPress?.(found);
              }
            } else if (data.type === 'VOYARO_MAP_CLICK') {
              onMapPress?.();
            } else if (data.type === 'VOYARO_REGION_CHANGE' && data.region) {
              onRegionChangeComplete?.(data.region);
            } else if (data.type === 'VOYARO_MAP_READY') {
              setIsLoaded(true);
            }
          } catch {}
        }}
        style={StyleSheet.absoluteFill}
      />

      {!isLoaded && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading interactive map...</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Universal Native Map Component:
 * - On Android (Expo Go / unconfigured Google Maps key): Seamlessly renders the high-performance Leaflet WebView engine with zero API keys.
 * - On iOS: Natively renders Apple Maps with GPU acceleration.
 */
export function VoyaroMapView(props: VoyaroMapViewProps) {
  // On Android, use the keyless, high-performance WebView engine so Expo Go works immediately
  if (Platform.OS === 'android') {
    return <AndroidLeafletMapView {...props} />;
  }

  // On iOS, use native Apple Maps (no API key required)
  const {
    initialRegion,
    region,
    markers = [],
    selectedMarkerId,
    style,
    autoFit = true,
    onRegionChangeComplete,
    onMarkerPress,
    onMapPress,
    showsUserLocation = false,
    cameraFocusRegion,
    showsCompass = true,
    showsScale = true,
    routeGeometry,
    routeStrokeColor,
    routeStrokeWidth,
    testID = 'voyaro-native-map-view',
  } = props;

  const mapRef = useRef<MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const hasFittedRef = useRef<boolean>(false);
  const prevMarkerCountRef = useRef<number>(markers.length);
  const prevCameraFocusTriggerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (Math.abs(markers.length - prevMarkerCountRef.current) > 0 && markers.length > 0) {
      hasFittedRef.current = false;
      prevMarkerCountRef.current = markers.length;
    }
  }, [markers.length]);

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !autoFit || hasFittedRef.current) {
      return;
    }

    if (markers.length >= 2) {
      mapRef.current.fitToCoordinates(
        markers.map((m) => m.coordinate),
        {
          edgePadding: { top: 70, right: 50, bottom: 200, left: 50 },
          animated: true,
        }
      );
      hasFittedRef.current = true;
    } else if (markers.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: markers[0].coordinate.latitude,
          longitude: markers[0].coordinate.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        500
      );
      hasFittedRef.current = true;
    }
  }, [isMapReady, markers, autoFit]);

  const prevSelectedMarkerIdRef = useRef<string | undefined>(selectedMarkerId);

  useEffect(() => {
    if (
      isMapReady &&
      selectedMarkerId &&
      selectedMarkerId !== prevSelectedMarkerIdRef.current &&
      mapRef.current
    ) {
      prevSelectedMarkerIdRef.current = selectedMarkerId;
      const selected = markers.find((m) => m.id === selectedMarkerId);
      if (selected) {
        mapRef.current.animateToRegion(
          {
            latitude: selected.coordinate.latitude - 0.005,
            longitude: selected.coordinate.longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          },
          350
        );
      }
    } else if (!selectedMarkerId) {
      prevSelectedMarkerIdRef.current = undefined;
    }
  }, [selectedMarkerId, isMapReady, markers]);

  useEffect(() => {
    if (
      isMapReady &&
      mapRef.current &&
      cameraFocusRegion &&
      cameraFocusRegion.trigger !== prevCameraFocusTriggerRef.current
    ) {
      prevCameraFocusTriggerRef.current = cameraFocusRegion.trigger;
      mapRef.current.animateToRegion(cameraFocusRegion.region, 500);
    }
  }, [cameraFocusRegion, isMapReady]);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        region={region}
        onMapReady={() => {
          setIsMapReady(true);
          setMapError(null);
        }}
        onPress={() => onMapPress?.()}
        onRegionChangeComplete={(r) => onRegionChangeComplete?.(r)}
        showsCompass={showsCompass}
        showsScale={showsScale}
        showsUserLocation={showsUserLocation}
        loadingEnabled={false}
      >
        {markers.map((marker) => {
          const isSelected = marker.id === selectedMarkerId;
          const pinColor = getPinColor(marker.type, isSelected);

          return (
            <Marker
              key={marker.id}
              identifier={marker.id}
              coordinate={marker.coordinate}
              title={marker.title}
              description={marker.description}
              pinColor={pinColor}
              tracksViewChanges={false}
              onPress={(e) => {
                e.stopPropagation?.();
                onMarkerPress?.(marker);
              }}
            />
          );
        })}

        {routeGeometry && routeGeometry.length >= 2 && (
          <Polyline
            coordinates={routeGeometry}
            strokeColor={routeStrokeColor || colors.primary}
            strokeWidth={routeStrokeWidth || 4}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      {!isMapReady && !mapError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Apple Maps...</Text>
        </View>
      )}

      {mapError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Map Unavailable</Text>
          <Text style={styles.errorText}>{mapError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EEF3F0',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(238, 243, 240, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  loadingText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 5,
  },
  errorTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
