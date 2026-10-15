/**
 * Route: /(tabs)/trips/[tripId]/map — Interactive Trip Map View
 *
 * Displays all destination stops, route lines, day pins, and city highlights
 * for the current trip under the persistent TripSubNavHeader.
 */

import React, { useState, useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { getTripById } from '@/services/mockData';
import { useShellInsets } from '@/components/navigation';
import { VoyaroMapView, MapMarkerItem, MapRegion } from '@/components/maps';

interface MapStop {
  id: string;
  city: string;
  region: string;
  dates: string;
  nights: number;
  highlight: string;
  hotel: string;
  temp: string;
  pinType: 'start' | 'transit' | 'end';
  latitude: number;
  longitude: number;
}

const JAPAN_STOPS: MapStop[] = [
  {
    id: 'tokyo',
    city: 'Tokyo',
    region: 'Kanto',
    dates: 'Mar 10 — 13',
    nights: 3,
    highlight: 'Shinjuku, Meiji Jingu & TeamLab Planets',
    hotel: 'Hotel Gracery Shinjuku',
    temp: '16°C · Sunny',
    pinType: 'start',
    latitude: 35.6762,
    longitude: 139.6503,
  },
  {
    id: 'hakone',
    city: 'Hakone',
    region: 'Kanagawa',
    dates: 'Mar 13 — 15',
    nights: 2,
    highlight: 'Mt. Fuji view, Lake Ashi & Onsen Ryokan',
    hotel: 'Hakone Ginyu Onsen',
    temp: '13°C · Crisp',
    pinType: 'transit',
    latitude: 35.2323,
    longitude: 139.1069,
  },
  {
    id: 'kyoto',
    city: 'Kyoto',
    region: 'Kansai',
    dates: 'Mar 15 — 18',
    nights: 3,
    highlight: 'Fushimi Inari, Arashiyama Bamboo Grove',
    hotel: 'Ace Hotel Kyoto',
    temp: '17°C · Clear',
    pinType: 'transit',
    latitude: 35.0116,
    longitude: 135.7681,
  },
  {
    id: 'osaka',
    city: 'Osaka',
    region: 'Kansai',
    dates: 'Mar 18 — 20',
    nights: 2,
    highlight: 'Dotonbori food district & Osaka Castle',
    hotel: 'Cross Hotel Osaka',
    temp: '18°C · Mild',
    pinType: 'end',
    latitude: 34.6937,
    longitude: 135.5023,
  },
];

const INITIAL_REGION: MapRegion = {
  latitude: 35.3606,
  longitude: 137.5,
  latitudeDelta: 2.8,
  longitudeDelta: 4.5,
};

export default function TripMapScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const effectiveTripId = tripId || 'japan-adventure';
  const trip = getTripById(effectiveTripId) || getTripById('japan-adventure')!;
  const { contentPaddingBottom } = useShellInsets();

  const [selectedStopId, setSelectedStopId] = useState<string>('tokyo');
  const activeStop = JAPAN_STOPS.find((s) => s.id === selectedStopId) || JAPAN_STOPS[0];

  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    return JAPAN_STOPS.map((stop) => ({
      id: stop.id,
      title: stop.city,
      description: stop.highlight,
      coordinate: {
        latitude: stop.latitude,
        longitude: stop.longitude,
      },
    }));
  }, []);

  const handleItineraryShortcut = () => {
    router.push(`/(tabs)/trips/${effectiveTripId}/itinerary`);
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: spacing.xs, paddingBottom: contentPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* ── 1. Map Canvas Hero Preview (Native & Web) ──────────────────── */}
          <View style={styles.mapCanvasCard}>
            <VoyaroMapView
              testID="trip-map-view"
              style={styles.mapSurface}
              initialRegion={INITIAL_REGION}
              markers={mapMarkers}
              selectedMarkerId={selectedStopId}
              onMarkerPress={(marker) => setSelectedStopId(marker.id)}
            />

            {/* Floating Map Overlay Controls */}
            <View style={styles.mapOverlayHeader} pointerEvents="box-none">
              <View style={styles.routePill}>
                <Image
                  source={require('@/assets/images/icons/location-pin.svg')}
                  style={styles.routeIcon}
                  tintColor={colors.primary}
                  contentFit="contain"
                />
                <Text style={styles.routePillText}>
                  {JAPAN_STOPS.length} Cities · 10 Days Route
                </Text>
              </View>

              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>514 km Total</Text>
              </View>
            </View>
          </View>

          {/* ── 2. Selected Destination Focus Card ────────────────────────── */}
          <View style={styles.destinationCard}>
            <View style={styles.destinationHeaderRow}>
              <View>
                <Text style={styles.destinationCity}>{activeStop.city}</Text>
                <Text style={styles.destinationDates}>
                  {activeStop.region} · {activeStop.dates} ({activeStop.nights} Nights)
                </Text>
              </View>
              <View style={styles.weatherBadge}>
                <Text style={styles.weatherText}>{activeStop.temp}</Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.destinationDetailRow}>
              <View style={styles.detailIconCircle}>
                <Image
                  source={require('@/assets/images/icons/landscape.svg')}
                  style={styles.detailIcon}
                  tintColor={colors.primary}
                  contentFit="contain"
                />
              </View>
              <View style={styles.detailTextWrapper}>
                <Text style={styles.detailLabel}>KEY HIGHLIGHTS</Text>
                <Text style={styles.detailValue}>{activeStop.highlight}</Text>
              </View>
            </View>

            <View style={styles.destinationDetailRow}>
              <View style={styles.detailIconCircle}>
                <Image
                  source={require('@/assets/images/icons/hotel.svg')}
                  style={styles.detailIcon}
                  tintColor={colors.primary}
                  contentFit="contain"
                />
              </View>
              <View style={styles.detailTextWrapper}>
                <Text style={styles.detailLabel}>LODGING</Text>
                <Text style={styles.detailValue}>{activeStop.hotel}</Text>
              </View>
            </View>

            <Pressable
              onPress={handleItineraryShortcut}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
              ]}
            >
              <Text style={styles.actionButtonText}>
                View Daily Itinerary for {activeStop.city} →
              </Text>
            </Pressable>
          </View>

          {/* ── 3. Route Stops Carousel ──────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Journey Sequence</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stopsListContent}
            style={styles.stopsListScrollView}
          >
            {JAPAN_STOPS.map((stop, idx) => {
              const isSelected = stop.id === selectedStopId;
              return (
                <Pressable
                  key={stop.id}
                  onPress={() => setSelectedStopId(stop.id)}
                  style={({ pressed }) => [
                    styles.stopItemCard,
                    isSelected && styles.stopItemCardActive,
                    pressed && styles.stopItemPressed,
                  ]}
                >
                  <View style={styles.stopCardTop}>
                    <Text
                      style={[
                        styles.stopStepNumber,
                        isSelected && styles.stopStepNumberActive,
                      ]}
                    >
                      STOP {idx + 1}
                    </Text>
                    <Text style={styles.stopDuration}>{stop.nights}N</Text>
                  </View>
                  <Text style={styles.stopCardCity}>{stop.city}</Text>
                  <Text style={styles.stopCardDates}>{stop.dates}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    gap: spacing.md,
  },

  // --- Map Canvas ---
  mapCanvasCard: {
    minHeight: 260,
    backgroundColor: '#E8EFEA',
    borderRadius: radius.card,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.12)',
    ...shadows.card,
  },
  mapSurface: {
    width: '100%',
    height: 260,
  },
  mapOverlayHeader: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 5,
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    ...shadows.card,
  },
  routeIcon: {
    width: 14,
    height: 14,
  },
  routePillText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textPrimary,
  },
  distanceBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  distanceText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },

  // --- Destination Card ---
  destinationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...shadows.card,
    gap: spacing.md,
  },
  destinationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  destinationCity: {
    fontFamily: typography.screenTitle.fontFamily,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  destinationDates: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  weatherBadge: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  weatherText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.primary,
  },
  detailDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  destinationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIcon: {
    width: 18,
    height: 18,
  },
  detailTextWrapper: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 1,
  },
  actionButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.primarySurface,
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    alignItems: 'center',
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primary,
  },

  // --- Stops Carousel ---
  sectionTitle: {
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  stopsListScrollView: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  stopsListContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  stopItemCard: {
    width: 130,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...shadows.card,
  },
  stopItemCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F3F7F5',
  },
  stopItemPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  stopCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stopStepNumber: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  stopStepNumberActive: {
    color: colors.primary,
  },
  stopDuration: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  stopCardCity: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  stopCardDates: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
