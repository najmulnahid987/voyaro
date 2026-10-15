import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { colors, fontFamily, radius, spacing, typography } from '@/theme';
import { VoyaroMapViewProps } from './types';

export function VoyaroMapView({
  initialRegion,
  region,
  markers = [],
  selectedMarkerId,
  style,
  onMarkerPress,
  testID = 'voyaro-web-map-view',
}: VoyaroMapViewProps) {
  const currentRegion = region || initialRegion;

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Informative Header Pill */}
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Web Platform Mode</Text>
        </View>
        <Text style={styles.platformNote}>Native react-native-maps active on iOS & Android</Text>
      </View>

      {/* Coordinate & Region Dashboard */}
      {currentRegion && (
        <View style={styles.coordCard}>
          <View style={styles.coordItem}>
            <Text style={styles.coordLabel}>CENTER LATITUDE</Text>
            <Text style={styles.coordValue}>{currentRegion.latitude.toFixed(4)}°</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.coordItem}>
            <Text style={styles.coordLabel}>CENTER LONGITUDE</Text>
            <Text style={styles.coordValue}>{currentRegion.longitude.toFixed(4)}°</Text>
          </View>
        </View>
      )}

      {/* Markers Preview List */}
      {markers.length > 0 && (
        <View style={styles.markersContainer}>
          <Text style={styles.markersHeader}>Mapped Destinations ({markers.length})</Text>
          <View style={styles.markerPillsRow}>
            {markers.map((marker, index) => {
              const isSelected = marker.id === selectedMarkerId;
              return (
                <Pressable
                  key={marker.id}
                  onPress={() => onMarkerPress?.(marker)}
                  style={[styles.markerPill, isSelected && styles.markerPillSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Destination ${marker.title || marker.id}`}
                >
                  <Text style={[styles.markerIndex, isSelected && styles.markerIndexSelected]}>
                    {index + 1}
                  </Text>
                  <Text style={[styles.markerTitle, isSelected && styles.markerTitleSelected]}>
                    {marker.title || marker.id}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.card,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontSize: 11,
  },
  platformNote: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  coordCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  coordItem: {
    alignItems: 'center',
  },
  coordLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  coordValue: {
    ...typography.body,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.backgroundAlt,
  },
  markersContainer: {
    marginTop: spacing.xs,
  },
  markersHeader: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  markerPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  markerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  markerPillSelected: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  markerIndex: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.textMuted,
    fontSize: 11,
  },
  markerIndexSelected: {
    color: colors.primary,
  },
  markerTitle: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  markerTitleSelected: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
});
