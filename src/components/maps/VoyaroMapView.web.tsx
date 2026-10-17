import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { colors, fontFamily, radius, spacing, typography } from '@/theme';
import { VoyaroMapViewProps, MapMarkerItem, MapRegion } from './types';

function getCategoryColor(type?: string): string {
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

export function VoyaroMapView({
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
  testID = 'voyaro-web-map-view',
}: VoyaroMapViewProps) {
  const iframeRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Default center: fallback to Tokyo, or center of markers, or initialRegion
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

  // Handle messages posted from Leaflet iframe
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'VOYARO_PIN_CLICK' && data.markerId) {
        const found = markers.find((m) => m.id === data.markerId);
        if (found) {
          onMarkerPress?.(found);
        }
      } else if (data.type === 'VOYARO_MAP_CLICK') {
        onMapPress?.();
      } else if (data.type === 'VOYARO_MAP_READY') {
        setIsMapLoaded(true);
      } else if (data.type === 'VOYARO_REGION_CHANGE' && data.region) {
        onRegionChangeComplete?.(data.region);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [markers, onMarkerPress, onMapPress, onRegionChangeComplete]);

  // Programmatic pan when cameraFocusRegion triggers
  const prevFocusTrigger = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (
      cameraFocusRegion &&
      cameraFocusRegion.trigger !== prevFocusTrigger.current &&
      iframeRef.current?.contentWindow
    ) {
      prevFocusTrigger.current = cameraFocusRegion.trigger;
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'PAN_TO',
          lat: cameraFocusRegion.region.latitude,
          lng: cameraFocusRegion.region.longitude,
          zoom: 14,
        },
        '*'
      );
    }
  }, [cameraFocusRegion]);

  // Generate dynamic Leaflet HTML Document
  const leafletHtml = useMemo(() => {
    const serializedMarkers = JSON.stringify(
      markers.map((m) => ({
        id: m.id,
        lat: m.coordinate.latitude,
        lng: m.coordinate.longitude,
        title: m.title || '',
        category: m.type || 'activity',
        color: getCategoryColor(m.type),
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
    
    /* Interactive Custom Pin */
    .voyaro-pin {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.28);
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
    }
    .voyaro-pin:hover {
      transform: scale(1.18);
      box-shadow: 0 6px 14px rgba(0,0,0,0.38);
    }
    .voyaro-pin-selected {
      transform: scale(1.28) !important;
      border-color: #ffffff !important;
      box-shadow: 0 0 0 3px #102e2d, 0 6px 18px rgba(0,0,0,0.48) !important;
      z-index: 1000 !important;
    }
    .voyaro-pin svg {
      width: 16px;
      height: 16px;
      fill: #ffffff;
    }

    /* User GPS Location Pulse Dot */
    .user-pulse-dot {
      width: 14px;
      height: 14px;
      background: #208AEF;
      border: 2.5px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(32, 138, 239, 0.25);
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
      const map = L.map('map', {
        zoomControl: true,
        attributionControl: false
      }).setView([${centerLat}, ${centerLng}], 12);

      const primaryTiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      });
      primaryTiles.on('tileerror', function() {
        L.tileLayer('https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      });
      primaryTiles.addTo(map);

      // Minimal distance scale bar
      L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

      const markersData = ${serializedMarkers};
      const bounds = [];
      const leafletMarkers = {};

      markersData.forEach(function(m) {
        bounds.push([m.lat, m.lng]);
        const isSel = m.isSelected;
        const iconHtml = '<div id="pin-' + m.id + '" class="voyaro-pin ' + (isSel ? 'voyaro-pin-selected' : '') + '" style="background: ' + (isSel ? '#102e2d' : m.color) + '"><svg viewBox="0 0 24 24">' + m.svg + '</svg></div>';
        
        const icon = L.divIcon({
          className: '',
          html: iconHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
        marker.bindTooltip(m.title, { direction: 'top', offset: [0, -16] });
        
        marker.on('click', function(e) {
          L.DomEvent.stopPropagation(e);
          window.parent.postMessage({ type: 'VOYARO_PIN_CLICK', markerId: m.id }, '*');
        });

        leafletMarkers[m.id] = marker;
      });

      // Route geometry line
      const routeCoords = ${serializedRoute};
      if (routeCoords.length >= 2) {
        L.polyline(routeCoords, {
          color: '${routeStrokeColor}',
          weight: ${routeStrokeWidth},
          opacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);
      }

      // User location dot
      const userLoc = ${serializedUserLoc};
      if (userLoc) {
        const userIcon = L.divIcon({
          className: '',
          html: '<div class="user-pulse-dot"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        L.marker([userLoc.lat, userLoc.lng], { icon: userIcon }).addTo(map).bindTooltip('My Location', { direction: 'top', offset: [0, -10] });
      }

      // Initial auto-fit
      ${autoFit ? `
      if (bounds.length >= 2) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      }
      ` : ''}

      // Click on background
      map.on('click', function() {
        window.parent.postMessage({ type: 'VOYARO_MAP_CLICK' }, '*');
      });

      // Region change notify
      map.on('moveend', function() {
        const c = map.getCenter();
        const b = map.getBounds();
        const latDelta = Math.abs(b.getNorth() - b.getSouth());
        const lngDelta = Math.abs(b.getEast() - b.getWest());
        window.parent.postMessage({
          type: 'VOYARO_REGION_CHANGE',
          region: {
            latitude: c.lat,
            longitude: c.lng,
            latitudeDelta: latDelta,
            longitudeDelta: lngDelta
          }
        }, '*');
      });

      // Listen for parent messages
      window.addEventListener('message', function(e) {
        if (!e.data) return;
        if (e.data.type === 'PAN_TO') {
          map.panTo([e.data.lat, e.data.lng], { animate: true });
        }
      });

      window.parent.postMessage({ type: 'VOYARO_MAP_READY' }, '*');
    } catch(err) {
      console.error('Leaflet initialization error:', err);
    }
  </script>
</body>
</html>`;
  }, [markers, selectedMarkerId, routeGeometry, showsUserLocation, userLocation, autoFit, centerLat, centerLng, routeStrokeColor, routeStrokeWidth]);

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* 1. Leaflet Interactive Web Map Canvas */}
      <iframe
        ref={iframeRef}
        srcDoc={leafletHtml}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#eef3f0',
        } as any}
        title="Voyaro Trip Map"
      />

      {/* 2. Loading Spinner while Tiles & Engine initialize */}
      {!isMapLoaded && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading interactive map...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
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
});
