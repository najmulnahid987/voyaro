import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors, fontFamily, spacing, typography } from '@/theme';
import { VoyaroMapViewProps, MapMarkerItem } from './types';

export function VoyaroMapView({
  initialRegion,
  region,
  markers = [],
  selectedMarkerId,
  style,
  onRegionChangeComplete,
  onMarkerPress,
  showsUserLocation = false,
  showsCompass = true,
  showsScale = true,
  testID = 'voyaro-native-map-view',
}: VoyaroMapViewProps) {
  const mapRef = useRef<MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Animate to selected marker if provided and map is ready
  useEffect(() => {
    if (isMapReady && selectedMarkerId && mapRef.current) {
      const selected = markers.find((m) => m.id === selectedMarkerId);
      if (selected) {
        mapRef.current.animateToRegion(
          {
            latitude: selected.coordinate.latitude,
            longitude: selected.coordinate.longitude,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          },
          400
        );
      }
    }
  }, [selectedMarkerId, isMapReady, markers]);

  const handleMarkerPress = (marker: MapMarkerItem) => {
    onMarkerPress?.(marker);
  };

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
        onRegionChangeComplete={(r) => onRegionChangeComplete?.(r)}
        showsCompass={showsCompass}
        showsScale={showsScale}
        showsUserLocation={showsUserLocation}
        loadingEnabled={false}
      >
        {markers.map((marker) => {
          const isSelected = marker.id === selectedMarkerId;
          return (
            <Marker
              key={marker.id}
              identifier={marker.id}
              coordinate={marker.coordinate}
              title={marker.title}
              description={marker.description}
              pinColor={isSelected ? colors.primaryHover : marker.pinColor || colors.primary}
              onPress={() => handleMarkerPress(marker)}
            />
          );
        })}
      </MapView>

      {!isMapReady && !mapError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>
            Initializing {Platform.OS === 'ios' ? 'Apple Maps' : 'Google Maps'}...
          </Text>
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
    backgroundColor: colors.backgroundAlt,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    zIndex: 10,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    zIndex: 10,
  },
  errorTitle: {
    ...typography.body,
    fontFamily: fontFamily.semiBold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
