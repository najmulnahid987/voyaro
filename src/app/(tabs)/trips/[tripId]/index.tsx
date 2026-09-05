import React from 'react';
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
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { getTripById, Trip } from '@/services/mockData';
import { useShellInsets } from '@/components/navigation';

/**
 * Route: /(tabs)/trips/[tripId] — Trip Overview / Dashboard (Phase 4)
 *
 * Visual Source of Truth: Google Stitch Trip Overview design (trip-overview.png & trip-overview.html)
 * Command center answering:
 *   - Destination, dates, duration, travelers, budget, planned items
 *   - "Next up" flight hero card with airport codes, times, gate, terminal, seat
 *   - "Your Itinerary" day-by-day timeline with item detail links
 *   - "Trip Spending" progress and budget summary
 *   - "Map" preview card
 *
 * Links to sub-routes:
 *   - /share/[tripId]
 *   - /(tabs)/trips/[tripId]/itinerary
 *   - /(tabs)/trips/[tripId]/budget
 *   - /(tabs)/trips/[tripId]/expenses
 *   - /(tabs)/trips/[tripId]/map
 *   - /(tabs)/trips/[tripId]/travelers
 *   - /(tabs)/trips/[tripId]/documents
 *   - /(tabs)/trips/[tripId]/settings
 *   - /itinerary/[itemId]
 */
export default function TripOverviewScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();
  const trip = getTripById(tripId || 'demo-trip') || getTripById('japan-adventure')!;

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/trips');
    }
  };

  const handleSharePress = () => {
    router.push(`/share/${trip.id}`);
  };

  const handleEditPress = () => {
    router.push('/(tabs)/trips/create');
  };

  const handleItineraryPress = () => {
    router.push(`/(tabs)/trips/${trip.id}/itinerary`);
  };

  const handleItineraryItemPress = (itemId: string) => {
    router.push(`/itinerary/${itemId}`);
  };

  const handleBudgetPress = () => {
    router.push(`/(tabs)/trips/${trip.id}/budget`);
  };

  const handleMapPress = () => {
    router.push(`/(tabs)/trips/${trip.id}/map`);
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: contentPaddingTop, paddingBottom: contentPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* ── 1. Top Navigation & Hero Area ─────────────────────────────── */}
          <View style={styles.heroWrapper}>
            {/* Top Bar with Back, Share, Edit */}
            <View style={styles.topBar}>
              <Pressable
                onPress={handleBackPress}
                style={({ pressed }) => [
                  styles.glassButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Back to trips"
              >
                <Text style={styles.backArrowText}>←</Text>
              </Pressable>

              <View style={styles.topBarRight}>
                <Pressable
                  onPress={handleSharePress}
                  style={({ pressed }) => [
                    styles.glassButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Share trip"
                >
                  <Text style={styles.actionIconText}>↗</Text>
                </Pressable>

                <Pressable
                  onPress={handleEditPress}
                  style={({ pressed }) => [
                    styles.glassButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit trip"
                >
                  <View style={styles.pencilShape} />
                </Pressable>
              </View>
            </View>

            {/* Trip Title & Destination Subtitle */}
            <View style={styles.heroTextSection}>
              <Text style={styles.tripTitle} numberOfLines={2}>
                {trip.title}
              </Text>
              <Text style={styles.tripSubtitle}>
                {trip.destination}{' '}
                <Text style={styles.bulletDot}>·</Text> Mar 10 — 20
              </Text>
            </View>

            {/* Horizontal Metric Pills Scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.metricsScrollContent}
            >
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>DURATION</Text>
                <Text style={styles.metricValue}>12 Days</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>TRAVELERS</Text>
                <Text style={styles.metricValue}>{trip.travelerCount}</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>BUDGET</Text>
                <Text style={styles.metricValue}>$3k</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>PLANNED</Text>
                <Text style={styles.metricValue}>
                  {trip.itineraryCount || 15} Items
                </Text>
              </View>
            </ScrollView>
          </View>

          {/* ── 2. "Next up" Featured Flight Card ─────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Next up</Text>
            </View>

            <Pressable
              onPress={() => handleItineraryItemPress('event-flight-tokyo')}
              style={({ pressed }) => [
                styles.flightHeroCard,
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Next up flight: EK585 Dhaka to Tokyo"
            >
              {/* Subtle top-right glow */}
              <View style={styles.glowOverlay} />

              {/* Flight Header */}
              <View style={styles.flightHeader}>
                <View>
                  <Text style={styles.flightAirlineLabel}>
                    FLIGHT · EMIRATES
                  </Text>
                  <Text style={styles.flightNumber}>EK585</Text>
                </View>
                <View style={styles.flightBadge}>
                  <Text style={styles.flightBadgeText}>In 3h 45m</Text>
                </View>
              </View>

              {/* Airport Route Line */}
              <View style={styles.flightRouteRow}>
                {/* Departure */}
                <View style={styles.airportCol}>
                  <Text style={styles.airportCode}>DAC</Text>
                  <Text style={styles.airportTime}>8:30 PM</Text>
                </View>

                {/* Connecting Line & Plane */}
                <View style={styles.flightLineWrapper}>
                  <View style={styles.flightLine} />
                  <View style={styles.planeIconCircle}>
                    <Image
                      source={require('@/assets/images/icons/flight.svg')}
                      style={styles.planeIcon}
                      contentFit="contain"
                    />
                  </View>
                </View>

                {/* Arrival */}
                <View style={[styles.airportCol, styles.airportColRight]}>
                  <Text style={styles.airportCode}>NRT</Text>
                  <Text style={styles.airportTime}>11:15 AM</Text>
                </View>
              </View>

              {/* Gate, Terminal, Seat Footer Bar */}
              <View style={styles.flightMetaBar}>
                <View style={styles.flightMetaItem}>
                  <Text style={styles.flightMetaLabel}>Gate</Text>
                  <Text style={styles.flightMetaValue}>12</Text>
                </View>
                <View style={styles.flightMetaDivider} />
                <View style={styles.flightMetaItem}>
                  <Text style={styles.flightMetaLabel}>Terminal</Text>
                  <Text style={styles.flightMetaValue}>1</Text>
                </View>
                <View style={styles.flightMetaDivider} />
                <View style={styles.flightMetaItem}>
                  <Text style={styles.flightMetaLabel}>Seat</Text>
                  <Text style={styles.flightMetaValue}>14A</Text>
                </View>
              </View>
            </Pressable>
          </View>

          {/* ── 3. "Your Itinerary" Day-by-Day Timeline ──────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Your Itinerary</Text>
              <Pressable
                onPress={handleItineraryPress}
                hitSlop={8}
                style={styles.viewAllBtn}
                accessibilityRole="button"
                accessibilityLabel="View full itinerary"
              >
                <Text style={styles.viewAllText}>View all</Text>
                <Text style={styles.viewAllArrow}>→</Text>
              </Pressable>
            </View>

            <View style={styles.timelineWrapper}>
              {/* Continuous vertical line */}
              <View style={styles.timelineVerticalLine} />

              {/* Day 1 */}
              <View style={styles.dayGroup}>
                <View style={styles.dayHeaderRow}>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>10</Text>
                  </View>
                  <Text style={styles.dayTitle}>Day 1 · March 10</Text>
                </View>

                <View style={styles.dayItemsList}>
                  {/* Event 1: Flight */}
                  <Pressable
                    onPress={() => handleItineraryItemPress('event-flight-tokyo')}
                    style={({ pressed }) => [
                      styles.itineraryCard,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.itineraryIconBox}>
                      <Image
                        source={require('@/assets/images/onboarding/flight-takeoff.svg')}
                        style={styles.itineraryIcon}
                        contentFit="contain"
                      />
                    </View>
                    <View style={styles.itineraryInfo}>
                      <Text style={styles.itineraryTitle} numberOfLines={1}>
                        Flight to Tokyo
                      </Text>
                      <Text style={styles.itinerarySubtitle} numberOfLines={1}>
                        DAC to NRT · 8:30 PM
                      </Text>
                    </View>
                  </Pressable>

                  {/* Event 2: Hotel */}
                  <Pressable
                    onPress={() => handleItineraryItemPress('event-hotel-ritz')}
                    style={({ pressed }) => [
                      styles.itineraryCard,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.itineraryIconBox}>
                      <Image
                        source={require('@/assets/images/icons/hotel.svg')}
                        style={styles.itineraryIcon}
                        contentFit="contain"
                      />
                    </View>
                    <View style={styles.itineraryInfo}>
                      <Text style={styles.itineraryTitle} numberOfLines={1}>
                        The Ritz-Carlton, Kyoto
                      </Text>
                      <Text style={styles.itinerarySubtitle} numberOfLines={1}>
                        Check-in · 3:00 PM
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>

              {/* Day 2 */}
              <View style={[styles.dayGroup, styles.dayGroupSecond]}>
                <View style={styles.dayHeaderRow}>
                  <View style={[styles.dayBadge, styles.dayBadgeAlt]}>
                    <Text style={[styles.dayBadgeText, styles.dayBadgeTextAlt]}>
                      11
                    </Text>
                  </View>
                  <Text style={styles.dayTitle}>Day 2 · March 11</Text>
                </View>

                <View style={styles.dayItemsList}>
                  {/* Event 3: Dining */}
                  <Pressable
                    onPress={() => handleItineraryItemPress('event-breakfast')}
                    style={({ pressed }) => [
                      styles.itineraryCard,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.itineraryIconBox}>
                      <Image
                        source={require('@/assets/images/onboarding/restaurant.svg')}
                        style={styles.itineraryIcon}
                        contentFit="contain"
                      />
                    </View>
                    <View style={styles.itineraryInfo}>
                      <Text style={styles.itineraryTitle} numberOfLines={1}>
                        Breakfast at Hotel
                      </Text>
                      <Text style={styles.itinerarySubtitle} numberOfLines={1}>
                        8:00 AM
                      </Text>
                    </View>
                  </Pressable>

                  {/* Event 4: Activity / Sightseeing */}
                  <Pressable
                    onPress={() => handleItineraryItemPress('event-shibuya')}
                    style={({ pressed }) => [
                      styles.itineraryCard,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.itineraryIconBox}>
                      <Image
                        source={require('@/assets/images/icons/landscape.svg')}
                        style={styles.itineraryIcon}
                        contentFit="contain"
                      />
                    </View>
                    <View style={styles.itineraryInfo}>
                      <Text style={styles.itineraryTitle} numberOfLines={1}>
                        Shibuya Crossing
                      </Text>
                      <Text style={styles.itinerarySubtitle} numberOfLines={1}>
                        Sightseeing · 10:30 AM
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* ── 4. "Trip Spending" Summary ────────────────────────────────── */}
          <View style={styles.section}>
            <Pressable
              onPress={handleBudgetPress}
              style={({ pressed }) => [
                styles.spendingCard,
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="View trip spending and budget"
            >
              <Text style={styles.sectionTitle}>Trip Spending</Text>

              <View style={styles.spendingNumbersRow}>
                <View>
                  <Text style={styles.spendingOverline}>TOTAL SPENT</Text>
                  <Text style={styles.spendingTotal}>$1,240.50</Text>
                </View>
                <View style={styles.spendingRemainingGroup}>
                  <Text style={styles.spendingOverline}>REMAINING</Text>
                  <Text style={styles.spendingRemaining}>$1,759.50</Text>
                </View>
              </View>

              {/* Progress Track */}
              <View style={styles.spendingProgressTrack}>
                <View
                  style={[
                    styles.spendingProgressFill,
                    { width: '41%' },
                  ]}
                />
              </View>

              {/* Footer labels */}
              <View style={styles.spendingFooterRow}>
                <Text style={styles.spendingFooterText}>41% of budget</Text>
                <Text style={styles.spendingFooterText}>Budget: $3,000</Text>
              </View>
            </Pressable>
          </View>

          {/* ── 5. "Map" Preview Section ──────────────────────────────────── */}
          <View style={styles.section}>
            <Pressable
              onPress={handleMapPress}
              style={({ pressed }) => [
                styles.mapContainerCard,
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open trip map"
            >
              <Text style={styles.sectionTitle}>Map</Text>

              <View style={styles.mapVisualPlaceholder}>
                {/* Visual stylised road lines & markers */}
                <View style={styles.mapGridLineH1} />
                <View style={styles.mapGridLineH2} />
                <View style={styles.mapGridLineV1} />
                <View style={styles.mapGridLineV2} />

                <View style={styles.mapPinTokyo}>
                  <View style={styles.mapPinInnerDot} />
                  <Text style={styles.mapPinLabel}>Tokyo</Text>
                </View>

                <View style={styles.mapPinKyoto}>
                  <View style={styles.mapPinInnerDot} />
                  <Text style={styles.mapPinLabel}>Kyoto</Text>
                </View>

                <View style={styles.mapRouteConnector} />
              </View>
            </Pressable>
          </View>
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
    flexGrow: 1,
  },
  container: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    gap: spacing.xl,
  },

  // ── Hero Section ───────────────────────────────────────────────────────────
  heroWrapper: {
    paddingHorizontal: 20,
    paddingTop: spacing.xs,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  backArrowText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionIconText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pencilShape: {
    width: 14,
    height: 3,
    backgroundColor: colors.textPrimary,
    transform: [{ rotate: '-45deg' }],
    borderRadius: 1,
  },
  heroTextSection: {
    gap: 4,
    paddingTop: spacing.xs,
  },
  tripTitle: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.28,
  },
  tripSubtitle: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  bulletDot: {
    color: colors.textMuted,
    fontWeight: '700',
  },

  // Metrics Scroll
  metricsScrollContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    gap: 2,
    ...shadows.card,
  },
  metricLabel: {
    ...typography.label,
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  metricValue: {
    ...typography.screenTitle,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Section Shared ─────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 20,
    gap: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  viewAllArrow: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Flight Hero Card ───────────────────────────────────────────────────────
  flightHeroCard: {
    backgroundColor: colors.primary, // #2c5f5e
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    gap: spacing.md,
    ...shadows.card,
  },
  glowOverlay: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  flightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  flightAirlineLabel: {
    ...typography.label,
    fontSize: 12,
    letterSpacing: 1.0,
    fontWeight: '600',
    color: '#b8ecea',
    textTransform: 'uppercase',
  },
  flightNumber: {
    ...typography.display,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 2,
  },
  flightBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  flightBadgeText: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '500',
    color: '#ffffff',
  },

  // Route Row
  flightRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  airportCol: {
    width: '32%',
    gap: 2,
  },
  airportColRight: {
    alignItems: 'flex-end',
  },
  airportCode: {
    ...typography.display,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  airportTime: {
    ...typography.label,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.90)',
  },
  flightLineWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: spacing.sm,
  },
  flightLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: 'rgba(184, 236, 234, 0.50)',
    position: 'absolute',
  },
  planeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '90deg' }],
  },
  planeIcon: {
    width: 18,
    height: 18,
    tintColor: '#b8ecea',
  },

  // Flight Meta Bar
  flightMetaBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flightMetaItem: {
    gap: 2,
    alignItems: 'center',
  },
  flightMetaLabel: {
    ...typography.caption,
    fontSize: 12,
    color: 'rgba(184, 236, 234, 0.85)',
  },
  flightMetaValue: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  flightMetaDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
  },

  // ── Timeline Itinerary ─────────────────────────────────────────────────────
  timelineWrapper: {
    position: 'relative',
    gap: spacing.lg,
  },
  timelineVerticalLine: {
    position: 'absolute',
    left: 15,
    top: 16,
    bottom: 16,
    width: 2,
    backgroundColor: '#e2e2e2',
  },
  dayGroup: {
    gap: spacing.sm,
  },
  dayGroupSecond: {
    marginTop: spacing.xs,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e1dfdb',
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  dayBadgeAlt: {
    backgroundColor: '#eeeeee',
  },
  dayBadgeText: {
    ...typography.label,
    fontSize: 12,
    fontWeight: '600',
    color: '#63635f',
  },
  dayBadgeTextAlt: {
    color: colors.textSecondary,
  },
  dayTitle: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dayItemsList: {
    paddingLeft: 44,
    gap: spacing.sm,
  },
  itineraryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    ...shadows.card,
  },
  itineraryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eeeeee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itineraryIcon: {
    width: 20,
    height: 20,
    tintColor: colors.textSecondary,
  },
  itineraryInfo: {
    flex: 1,
    gap: 2,
  },
  itineraryTitle: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  itinerarySubtitle: {
    ...typography.bodySecondary,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // ── Spending Card ──────────────────────────────────────────────────────────
  spendingCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    gap: spacing.md,
    ...shadows.card,
  },
  spendingNumbersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  spendingOverline: {
    ...typography.label,
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  spendingTotal: {
    ...typography.display,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  spendingRemainingGroup: {
    alignItems: 'flex-end',
  },
  spendingRemaining: {
    ...typography.screenTitle,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  spendingProgressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#eeeeee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  spendingProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  spendingFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spendingFooterText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // ── Map Preview ────────────────────────────────────────────────────────────
  mapContainerCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    gap: spacing.md,
    ...shadows.card,
  },
  mapVisualPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#e8f0ef',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapGridLineH1: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(44, 95, 94, 0.12)',
  },
  mapGridLineH2: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(44, 95, 94, 0.12)',
  },
  mapGridLineV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '35%',
    width: 2,
    backgroundColor: 'rgba(44, 95, 94, 0.12)',
  },
  mapGridLineV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: '30%',
    width: 2,
    backgroundColor: 'rgba(44, 95, 94, 0.12)',
  },
  mapRouteConnector: {
    position: 'absolute',
    width: 140,
    height: 2,
    backgroundColor: colors.primary,
    transform: [{ rotate: '-25deg' }],
  },
  mapPinTokyo: {
    position: 'absolute',
    right: '25%',
    top: '30%',
    alignItems: 'center',
    gap: 2,
  },
  mapPinKyoto: {
    position: 'absolute',
    left: '25%',
    bottom: '30%',
    alignItems: 'center',
    gap: 2,
  },
  mapPinInnerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  mapPinLabel: {
    ...typography.label,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Pressed Feedback ───────────────────────────────────────────────────────
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.95 }],
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
