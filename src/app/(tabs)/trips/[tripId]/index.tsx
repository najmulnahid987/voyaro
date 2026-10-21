import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { fetchTripById, deleteTrip, setActiveTripId } from '@/services/trip';
import { Trip, getTripById as getDevMockTripById } from '@/services/mockData';
import { leaveTrip } from '@/services/collaboration';
import { AvatarGroup, Badge } from '@/components/ui';
import { useShellInsets } from '@/components/navigation';

/**
 * Route: /(tabs)/trips/[tripId] — Trip Overview / Dashboard (Phase 7 — Step 7)
 *
 * Real Supabase Trip Persistence:
 *   - Fetches live trip details owned by authenticated user
 *   - Respects RLS: displays error state if trip does not exist or user lacks access
 *   - Edit Trip: routes to create screen with tripId prefill
 *   - Delete Trip: confirms and deletes from Supabase with cascade cleanup
 *   - Initial loading state and error retry handling
 */
export default function TripOverviewScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isMountedRef = React.useRef(true);

  const loadTrip = async () => {
    if (!tripId) {
      if (isMountedRef.current) {
        setError('Trip ID is required.');
        setLoading(false);
      }
      return;
    }
    setActiveTripId(tripId);
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      // 1. Fetch live trip from Supabase
      const realTrip = await fetchTripById(tripId);
      if (!isMountedRef.current) return;

      if (realTrip) {
        setTrip(realTrip);
      } else if (__DEV__ && (tripId === 'demo-trip' || tripId === 'japan-adventure')) {
        // Explicit dev-only mock fallback for initial development routes
        const devMock = getDevMockTripById(tripId);
        setTrip(devMock || null);
      } else {
        setError('Trip not found or you do not have permission to view it.');
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load trip details.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadTrip();
    return () => {
      isMountedRef.current = false;
    };
  }, [tripId]);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/trips');
    }
  };

  const handleSharePress = () => {
    if (trip) {
      router.push(`/share/${trip.id}`);
    }
  };

  const handleEditPress = () => {
    if (!trip) return;
    if (trip.userRole === 'viewer') {
      Alert.alert('Read-only Permission', 'Viewers cannot edit trip details.');
      return;
    }
    router.push(`/(tabs)/trips/create?tripId=${trip.id}`);
  };

  const handleDeletePress = () => {
    if (!trip || isDeleting) return;

    // Non-owners leave the trip instead of deleting it
    if (trip.isOwner === false) {
      Alert.alert(
        'Leave Trip',
        `Are you sure you want to leave "${trip.title}"? You will lose access to its itinerary and expenses.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave Trip',
            style: 'destructive',
            onPress: async () => {
              if (isDeleting) return;
              setIsDeleting(true);
              try {
                await leaveTrip(trip.id);
                router.replace('/(tabs)/trips');
              } catch (err: any) {
                if (isMountedRef.current) {
                  setIsDeleting(false);
                }
                Alert.alert('Error', err.message || 'Failed to leave trip.');
              }
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${trip.title}"? This will permanently delete all associated itinerary items and expenses.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isDeleting) return;
            setIsDeleting(true);
            try {
              await deleteTrip(trip.id);
              router.replace('/(tabs)/trips');
            } catch (err: any) {
              if (isMountedRef.current) {
                setIsDeleting(false);
              }
              Alert.alert('Error', err.message || 'Failed to delete trip.');
            }
          },
        },
      ]
    );
  };

  const handleItineraryPress = () => {
    if (trip) {
      router.push(`/(tabs)/trips/${trip.id}/itinerary`);
    }
  };

  const handleItineraryItemPress = (itemId: string) => {
    router.push(`/itinerary/${itemId}`);
  };

  const handleBudgetPress = () => {
    if (trip) {
      router.push(`/(tabs)/trips/${trip.id}/budget`);
    }
  };

  const handleMapPress = () => {
    if (trip) {
      router.push(`/(tabs)/trips/${trip.id}/map`);
    }
  };

  if (loading) {
    return (
      <View style={[styles.safeArea, styles.centeredContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={[styles.safeArea, styles.centeredContainer]}>
        <View style={styles.errorIconCircle}>
          <Image
            source={require('@/assets/images/icons/close.svg')}
            style={styles.errorIcon}
            contentFit="contain"
          />
        </View>
        <Text style={styles.errorTitle}>Unable to View Trip</Text>
        <Text style={styles.errorSubtitle}>
          {error || 'This trip could not be found or has been removed.'}
        </Text>
        <View style={styles.errorActionsRow}>
          <Pressable onPress={handleBackPress} style={styles.backButton}>
            <Text style={styles.backButtonText}>← All Trips</Text>
          </Pressable>
          <Pressable onPress={loadTrip} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
          {/* ── 1. Destination Subtitle, Actions & Metrics ─────────────────── */}
          <View style={styles.heroWrapper}>
            {/* Subtitle & Quick Actions (Share, Edit, Delete) */}
            <View style={styles.topBar}>
              <View style={styles.topBarLeft}>
                <Text style={styles.tripSubtitle}>
                  {trip.destination}{' '}
                  <Text style={styles.bulletDot}>·</Text> {trip.dates}
                </Text>
                {trip.userRole && trip.userRole !== 'owner' && (
                  <Badge
                    label={trip.userRole.toUpperCase()}
                    variant={trip.userRole === 'editor' ? 'selected' : 'default'}
                  />
                )}
              </View>

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

                {trip.isOwner !== false && (
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
                )}

                <Pressable
                  onPress={handleDeletePress}
                  style={({ pressed }) => [
                    styles.glassButton,
                    styles.deleteGlassButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={trip.isOwner !== false ? "Delete trip" : "Leave trip"}
                >
                  <Text style={styles.deleteIconText}>{trip.isOwner !== false ? "✕" : "⇥"}</Text>
                </Pressable>
              </View>
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

              <Pressable
                onPress={() => router.push(`/(tabs)/trips/${trip.id}/travelers`)}
                style={({ pressed }) => [
                  styles.metricCard,
                  pressed && styles.cardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="View travelers"
              >
                <Text style={styles.metricLabel}>TRAVELERS</Text>
                <Text style={styles.metricValue}>{trip.travelerCount}</Text>
              </Pressable>

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

            {/* Travelers & Companions Strip */}
            <Pressable
              onPress={() => router.push(`/(tabs)/trips/${trip.id}/travelers`)}
              style={({ pressed }) => [
                styles.travelersStripCard,
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="View all trip travelers"
            >
              <View style={styles.travelersStripLeft}>
                <AvatarGroup
                  avatars={(trip.travelers || []).map((t: any) => ({
                    name: t.name,
                    source: t.avatarUrl,
                  }))}
                  size="xs"
                  max={4}
                />
                <View style={styles.travelersStripText}>
                  <Text style={styles.travelersStripTitle}>
                    {trip.travelers && trip.travelers.length > 0
                      ? `${trip.travelers.length} ${trip.travelers.length === 1 ? 'Traveler' : 'Travelers'}`
                      : `${trip.travelerCount} Travelers`}
                  </Text>
                  <Text style={styles.travelersStripSub}>
                    {trip.isOwner
                      ? 'Tap to manage collaborators'
                      : `You: ${trip.userRole?.toUpperCase() || 'MEMBER'}`}
                  </Text>
                </View>
              </View>

              <View style={styles.travelersStripRight}>
                {trip.isOwner && (
                  <View style={styles.addTravelerChip}>
                    <Text style={styles.addTravelerChipText}>+ Invite</Text>
                  </View>
                )}
                <Image
                  source={require('@/assets/images/onboarding/arrow-right.svg')}
                  style={styles.stripChevron}
                  contentFit="contain"
                />
              </View>
            </Pressable>
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
    gap: spacing.md,
  },

  // ── Hero Section ───────────────────────────────────────────────────────────
  heroWrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.xs + 2,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  glassButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  backArrowText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionIconText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pencilShape: {
    width: 12,
    height: 2.5,
    backgroundColor: colors.textPrimary,
    transform: [{ rotate: '-45deg' }],
    borderRadius: 1,
  },
  heroTextSection: {
    gap: 2,
    paddingTop: spacing.xs,
  },
  tripTitle: {
    ...typography.display,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.22,
  },
  tripSubtitle: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  bulletDot: {
    color: colors.textMuted,
    fontWeight: '700',
  },

  // Metrics Scroll
  metricsScrollContent: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    gap: 1,
    ...shadows.card,
  },
  metricLabel: {
    ...typography.label,
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  metricValue: {
    ...typography.screenTitle,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Travelers Strip Card ──────────────────────────────────────────────────
  topBarLeft: {
    flex: 1,
    gap: 4,
  },
  travelersStripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
    ...shadows.card,
  },
  travelersStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  travelersStripText: {
    gap: 1,
    flex: 1,
  },
  travelersStripTitle: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  travelersStripSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  travelersStripRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addTravelerChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.primarySurface,
    borderRadius: radius.full,
  },
  addTravelerChipText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  stripChevron: {
    width: 12,
    height: 12,
    tintColor: colors.textMuted,
  },

  // ── Section Shared ─────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs + 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  viewAllArrow: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Flight Hero Card ───────────────────────────────────────────────────────
  flightHeroCard: {
    backgroundColor: colors.primary, // #2c5f5e
    borderRadius: 12,
    padding: 10,
    position: 'relative',
    overflow: 'hidden',
    gap: spacing.xs + 2,
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
    fontSize: 10.5,
    letterSpacing: 0.8,
    fontWeight: '600',
    color: '#b8ecea',
    textTransform: 'uppercase',
  },
  flightNumber: {
    ...typography.display,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 1,
  },
  flightBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  flightBadgeText: {
    ...typography.label,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#ffffff',
  },

  // Route Row
  flightRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  airportCol: {
    width: '32%',
    gap: 1,
  },
  airportColRight: {
    alignItems: 'flex-end',
  },
  airportCode: {
    ...typography.display,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  airportTime: {
    ...typography.label,
    fontSize: 12,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '90deg' }],
  },
  planeIcon: {
    width: 15,
    height: 15,
    tintColor: '#b8ecea',
  },

  // Flight Meta Bar
  flightMetaBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flightMetaItem: {
    gap: 1,
    alignItems: 'center',
  },
  flightMetaLabel: {
    ...typography.caption,
    fontSize: 10,
    color: 'rgba(184, 236, 234, 0.85)',
  },
  flightMetaValue: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  flightMetaDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
  },

  // ── Timeline Itinerary ─────────────────────────────────────────────────────
  timelineWrapper: {
    position: 'relative',
    gap: spacing.md,
  },
  timelineVerticalLine: {
    position: 'absolute',
    left: 13,
    top: 14,
    bottom: 14,
    width: 2,
    backgroundColor: '#e2e2e2',
  },
  dayGroup: {
    gap: 6,
  },
  dayGroupSecond: {
    marginTop: 2,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    fontSize: 11,
    fontWeight: '600',
    color: '#63635f',
  },
  dayBadgeTextAlt: {
    color: colors.textSecondary,
  },
  dayTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dayItemsList: {
    paddingLeft: 36,
    gap: spacing.xs + 2,
  },
  itineraryCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    ...shadows.card,
  },
  itineraryIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#eeeeee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itineraryIcon: {
    width: 18,
    height: 18,
    tintColor: colors.textSecondary,
  },
  itineraryInfo: {
    flex: 1,
    gap: 1,
  },
  itineraryTitle: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  itinerarySubtitle: {
    ...typography.bodySecondary,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // ── Spending Card ──────────────────────────────────────────────────────────
  spendingCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    gap: spacing.xs + 2,
    ...shadows.card,
  },
  spendingNumbersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  spendingOverline: {
    ...typography.label,
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  spendingTotal: {
    ...typography.display,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  spendingRemainingGroup: {
    alignItems: 'flex-end',
  },
  spendingRemaining: {
    ...typography.screenTitle,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  spendingProgressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#eeeeee',
    borderRadius: 3,
    overflow: 'hidden',
  },
  spendingProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  spendingFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spendingFooterText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },

  // ── Map Preview ────────────────────────────────────────────────────────────
  mapContainerCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    gap: spacing.sm,
    ...shadows.card,
  },
  mapVisualPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: '#e8f0ef',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapGridLineH1: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    height: 1.5,
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

  // ── Centered Loading & Error States ────────────────────────────────────────
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(176, 74, 74, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  errorIcon: {
    width: 24,
    height: 24,
    tintColor: colors.error,
  },
  errorTitle: {
    ...typography.sectionTitle,
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  errorSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 300,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  backButton: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  backButtonText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.card,
  },
  retryButtonText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  deleteGlassButton: {
    backgroundColor: 'rgba(176, 74, 74, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  deleteIconText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
});
