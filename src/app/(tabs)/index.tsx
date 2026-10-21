import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useShellInsets } from '@/components/navigation';
import { Trip, MOCK_COMING_UP_EVENTS } from '@/services/mockData';
import { listTrips, subscribeToTrips, getCachedTrips, setActiveTripId } from '@/services/trip';
import { useTripExpenses } from '@/services/expenseStore';
import { useItinerary } from '@/services/itineraryStore';
import { formatItineraryTime } from '@/utils/itineraryDateUtils';
import { getCurrencyConfig, toMajorUnits } from '@/utils/currencyUtils';
import { colors, radius, shadows, spacing, typography } from '@/theme';

/**
 * Route: /(tabs)/ — Home Screen (Phase 7 — Step 7)
 *
 * Real Supabase Trip Persistence:
 *   1. Displays current or next upcoming trip for authenticated user
 *   2. Initial loading & Pull-to-refresh
 *   3. Error state with explicit retry (never silently shows fake data)
 *   4. Clean empty state when user has 0 trips
 *   5. Dynamic trip spending view
 *   6. Past trips carousel
 */
export default function HomeScreen() {
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();
  const [trips, setTrips] = useState<Trip[]>(getCachedTrips() || []);
  const [loading, setLoading] = useState<boolean>(!getCachedTrips());
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = React.useRef(true);

  const loadTrips = async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setRefreshing(true);
    } else if (!getCachedTrips()) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await listTrips();
      if (isMountedRef.current) {
        setTrips(data);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load trips. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    const unsubscribe = subscribeToTrips((updated) => {
      if (isMountedRef.current) {
        setTrips(updated);
      }
    });
    loadTrips();
    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Determine current/featured trip: ongoing -> earliest upcoming -> first trip
  const currentTrip: Trip | null = useMemo(() => {
    if (trips.length === 0) return null;
    const ongoing = trips.find((t) => t.status === 'ongoing' || t.status === 'current');
    if (ongoing) return ongoing;
    const upcoming = trips.find((t) => t.status === 'upcoming');
    if (upcoming) return upcoming;
    return trips[0];
  }, [trips]);

  useEffect(() => {
    if (currentTrip?.id) {
      setActiveTripId(currentTrip.id);
    }
  }, [currentTrip?.id]);

  // Determine past trips
  const pastTrips: Trip[] = useMemo(() => {
    return trips.filter((t) => t.status === 'past' && t.id !== currentTrip?.id);
  }, [trips, currentTrip]);

  // Live trip spending from reactive expense store
  const { summary: expenseSummary } = useTripExpenses(currentTrip?.id);
  const currentSpending = useMemo(() => {
    if (
      expenseSummary &&
      (expenseSummary.totalSpentMajorUnits > 0 || (expenseSummary.budgetMinorUnits ?? 0) > 0)
    ) {
      const symbol = getCurrencyConfig(expenseSummary.currency).symbol;
      const budgetMajor = expenseSummary.budgetMinorUnits
        ? toMajorUnits(expenseSummary.budgetMinorUnits, expenseSummary.currency)
        : 0;
      return {
        spent: expenseSummary.totalSpentMajorUnits,
        budget: budgetMajor,
        currency: symbol,
        percentUsed: expenseSummary.percentUsed ?? 0,
        spentFormatted: expenseSummary.totalSpentFormatted,
        budgetFormatted: expenseSummary.budgetFormatted || '0',
        remainingFormatted: expenseSummary.remainingFormatted || '0',
        isOverBudget: expenseSummary.isOverBudget ?? false,
      };
    }
    return currentTrip?.spending;
  }, [expenseSummary, currentTrip?.spending]);

  // Live upcoming itinerary items for current trip
  const { items: liveItineraryItems } = useItinerary(currentTrip?.id);
  const comingUpEvents = useMemo(() => {
    if (liveItineraryItems && liveItineraryItems.length > 0) {
      return liveItineraryItems.slice(0, 2).map((item) => ({
        id: item.id,
        timeLabel: formatItineraryTime(item.startDateTime) || 'Scheduled',
        title: item.title,
        subtitle: item.location || '',
        type: item.type,
      }));
    }
    if (currentTrip?.id === 'japan-adventure' || currentTrip?.id === 'demo-trip') {
      return MOCK_COMING_UP_EVENTS;
    }
    return [];
  }, [liveItineraryItems, currentTrip?.id]);

  const handleTripPress = (tripId: string) => {
    router.push(`/(tabs)/trips/${tripId}`);
  };

  const handleItineraryPress = () => {
    if (currentTrip) {
      router.push(`/(tabs)/trips/${currentTrip.id}/itinerary`);
    }
  };

  const handleSpendingPress = () => {
    if (currentTrip) {
      router.push(`/(tabs)/trips/${currentTrip.id}/budget`);
    }
  };

  const handleAllTripsPress = () => {
    router.push('/(tabs)/trips');
  };

  const handleAiPlanPress = () => {
    router.push('/ai');
  };

  const handleCreateTripPress = () => {
    router.push('/(tabs)/trips/create');
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTrips(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.container}>
          {/* ── Initial Loading State ────────────────────────────────────────── */}
          {loading && trips.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading your adventures...</Text>
            </View>
          ) : error && trips.length === 0 ? (
            /* ── Error State with Retry ─────────────────────────────────────── */
            <View style={styles.errorContainer}>
              <View style={styles.errorIconCircle}>
                <Image
                  source={require('@/assets/images/icons/close.svg')}
                  style={styles.errorIcon}
                  contentFit="contain"
                />
              </View>
              <Text style={styles.errorTitle}>Unable to load trips</Text>
              <Text style={styles.errorSubtitle}>{error}</Text>
              <Pressable
                onPress={() => loadTrips(false)}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Retry loading trips"
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
            </View>
          ) : !currentTrip ? (
            /* ── Empty State Hero Card ──────────────────────────────────────── */
            <View style={styles.emptyHeroCard}>
              <View style={styles.emptyHeroContent}>
                <View style={styles.emptyIconCircle}>
                  <Image
                    source={require('@/assets/images/icons/place.svg')}
                    style={styles.emptyPlaceIcon}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.emptyHeroOverline}>NO UPCOMING TRIPS</Text>
                <Text style={styles.emptyHeroTitle}>Where will your next adventure be?</Text>
                <Text style={styles.emptyHeroSubtitle}>
                  Create a personalized trip or let Voyaro AI craft a custom itinerary for you.
                </Text>
                <View style={styles.emptyHeroActions}>
                  <Pressable
                    onPress={handleCreateTripPress}
                    style={({ pressed }) => [
                      styles.emptyCreateButton,
                      pressed && styles.buttonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Create Trip"
                  >
                    <Image
                      source={require('@/assets/images/icons/plus.svg')}
                      style={styles.emptyCreateButtonIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.emptyCreateButtonText}>Create Trip</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleAiPlanPress}
                    style={({ pressed }) => [
                      styles.emptyAiButton,
                      pressed && styles.buttonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Plan with AI"
                  >
                    <Image
                      source={require('@/assets/images/icons/sparkles.svg')}
                      style={styles.emptyAiButtonIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.emptyAiButtonText}>Plan with AI</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            /* ── 1. Featured / Current Trip Hero Card ───────────────────────── */
            <>
              <Pressable
                onPress={() => handleTripPress(currentTrip.id)}
                style={({ pressed }) => [
                  styles.heroCard,
                  pressed && styles.cardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Current trip: ${currentTrip.title}`}
              >
                <View style={styles.heroContent}>
                  <View style={styles.heroTextGroup}>
                    <View style={styles.heroBadgeRow}>
                      <Text style={styles.heroOverline}>
                        {currentTrip.status === 'ongoing' || currentTrip.status === 'current'
                          ? 'CURRENT TRIP'
                          : 'NEXT TRIP'}
                      </Text>
                      {currentTrip.userRole && currentTrip.userRole !== 'owner' && (
                        <View style={styles.heroRoleBadge}>
                          <Text style={styles.heroRoleBadgeText}>
                            {currentTrip.userRole.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.heroTitle}>{currentTrip.title}</Text>
                    <Text style={styles.heroDates}>{currentTrip.dates}</Text>
                  </View>

                  {/* Next Event Overlay Glass Card */}
                  {currentTrip.nextEvent && (
                    <View style={styles.nextEventCard}>
                      <View style={styles.nextEventLeft}>
                        <View style={styles.nextEventIconCircle}>
                          <Image
                            source={require('@/assets/images/onboarding/flight-takeoff.svg')}
                            style={styles.nextEventIcon}
                            contentFit="contain"
                          />
                        </View>
                        <View style={styles.nextEventInfo}>
                          <Text style={styles.nextEventLabel}>NEXT EVENT</Text>
                          <Text style={styles.nextEventRoute}>
                            {currentTrip.nextEvent.route}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.nextEventTime}>
                        {currentTrip.nextEvent.time}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>

              {/* ── 2. Current Trip Spending Quick View ──────────────────────── */}
              {currentSpending && (
                <Pressable
                  onPress={handleSpendingPress}
                  style={({ pressed }) => [
                    styles.spendingCard,
                    pressed && styles.cardPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Current trip spending"
                >
                  <View style={styles.spendingHeader}>
                    <Text style={styles.spendingOverline}>CURRENT TRIP SPENDING</Text>
                    <Image
                      source={require('@/assets/images/icons/receipt.svg')}
                      style={styles.receiptIcon}
                      contentFit="contain"
                    />
                  </View>

                  <View style={styles.spendingRow}>
                    <View style={styles.spendingAmountGroup}>
                      <Text style={styles.spendingAmount}>
                        {currentSpending.currency || '$'}{currentSpending.spentFormatted}
                      </Text>
                      <Text style={styles.spendingBudget}>
                        of {currentSpending.currency || '$'}{currentSpending.budgetFormatted} budget
                      </Text>
                    </View>
                    <View style={styles.spendingBadge}>
                      <Text style={styles.spendingBadgeText}>
                        {currentSpending.percentUsed}% Used
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(currentSpending.percentUsed ?? 0, 100)}%` as `${number}%`,
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              )}

              {/* ── 3. Coming Up Timeline Section ─────────────────────────────── */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitleUnderline}>Coming Up</Text>
                  <Pressable
                    onPress={handleItineraryPress}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="View all upcoming events"
                  >
                    <Text style={styles.sectionActionUnderline}>View all</Text>
                  </Pressable>
                </View>

                <View style={styles.timelineContainer}>
                  {/* Vertical connecting line */}
                  <View style={styles.timelineLine} />

                  {/* Event 1: Flight */}
                  {comingUpEvents[0] && (
                    <Pressable
                      onPress={handleItineraryPress}
                      style={({ pressed }) => [
                        styles.timelineItem,
                        pressed && styles.itemPressed,
                      ]}
                    >
                      <View style={[styles.timelineIconWrapper, styles.flightIconBg]}>
                        <Image
                          source={require('@/assets/images/onboarding/flight-takeoff.svg')}
                          style={styles.flightEventIcon}
                          contentFit="contain"
                        />
                      </View>
                      <View style={styles.timelineDetails}>
                        <Text style={styles.timelineTimePrimary}>
                          {comingUpEvents[0].timeLabel}
                        </Text>
                        <Text style={styles.timelineTitle}>
                          {comingUpEvents[0].title}
                        </Text>
                        <Text style={styles.timelineSubtitle}>
                          {comingUpEvents[0].subtitle}
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {/* Event 2: Hotel */}
                  {comingUpEvents[1] && (
                    <Pressable
                      onPress={handleItineraryPress}
                      style={({ pressed }) => [
                        styles.timelineItem,
                        styles.timelineItemSecond,
                        pressed && styles.itemPressed,
                      ]}
                    >
                      <View style={[styles.timelineIconWrapper, styles.hotelIconBg]}>
                        <Image
                          source={require('@/assets/images/icons/hotel.svg')}
                          style={styles.hotelEventIcon}
                          contentFit="contain"
                        />
                      </View>
                      <View style={styles.timelineDetails}>
                        <Text style={styles.timelineTimeMuted}>
                          {comingUpEvents[1].timeLabel}
                        </Text>
                        <Text style={styles.timelineTitle}>
                          {comingUpEvents[1].title}
                        </Text>
                        <Text style={styles.timelineSubtitle}>
                          {comingUpEvents[1].subtitle}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                </View>
              </View>
            </>
          )}

          {/* ── 4. AI Planner Prompt Card ("Where next?") ─────────────────────── */}
          <View style={styles.aiCard}>
            <View style={styles.aiGlowOverlay} />
            <View style={styles.aiHeaderRow}>
              <Image
                source={require('@/assets/images/icons/sparkles.svg')}
                style={styles.sparkleIcon}
                contentFit="contain"
              />
              <Text style={styles.aiTitle}>Where next?</Text>
            </View>
            <Text style={styles.aiDescription}>
              {"Let Voyaro's AI craft a bespoke itinerary for your next dream destination."}
            </Text>
            <Pressable
              onPress={handleAiPlanPress}
              style={({ pressed }) => [
                styles.aiButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Plan with AI"
            >
              <Text style={styles.aiButtonText}>Plan with AI</Text>
              <Image
                source={require('@/assets/images/onboarding/arrow-right.svg')}
                style={styles.aiButtonArrow}
                contentFit="contain"
              />
            </Pressable>
          </View>

          {/* ── 5. Past Trips Carousel ────────────────────────────────────────── */}
          {pastTrips.length > 0 && (
            <View style={styles.pastTripsSection}>
              <View style={[styles.sectionHeaderRow, styles.pastTripsHeaderRow]}>
                <Text style={styles.sectionTitleUnderline}>Past Trips</Text>
                <Pressable
                  onPress={handleAllTripsPress}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="See all trips"
                >
                  <Text style={styles.sectionActionUnderline}>See all</Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {pastTrips.map((trip: Trip) => (
                  <Pressable
                    key={trip.id}
                    onPress={() => handleTripPress(trip.id)}
                    style={({ pressed }) => [
                      styles.pastTripCard,
                      pressed && styles.cardPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Past trip: ${trip.title}`}
                  >
                    <View style={styles.pastTripInfo}>
                      <Text style={styles.pastTripTitle}>{trip.title}</Text>
                      <Text style={styles.pastTripDates}>{trip.dates}</Text>
                    </View>
                    <View style={styles.pastTripBottom}>
                      <View style={styles.pastTripIconCircle}>
                        <Image
                          source={
                            trip.category === 'landscape'
                              ? require('@/assets/images/icons/landscape.svg')
                              : trip.category === 'beach'
                                ? require('@/assets/images/onboarding/spa.svg')
                                : require('@/assets/images/icons/flight.svg')
                          }
                          style={styles.pastTripCategoryIcon}
                          contentFit="contain"
                        />
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
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
    paddingBottom: spacing['4xl'],
  },
  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  // ── Hero Card ──────────────────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.primaryHover, // #1e4241 deep forest brand color
    borderRadius: radius.card,
    overflow: 'hidden',
    shadowColor: colors.primaryHover,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
  },
  heroContent: {
    padding: spacing.md,
  },
  heroTextGroup: {
    gap: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroRoleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  heroRoleBadgeText: {
    ...typography.label,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#ffffff',
  },
  heroOverline: {
    ...typography.label,
    fontSize: 10.5,
    letterSpacing: 1.2,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.80)',
    textTransform: 'uppercase',
  },
  heroTitle: {
    ...typography.display,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  heroDates: {
    ...typography.body,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.90)',
    marginTop: 2,
  },
  nextEventCard: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextEventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextEventIconCircle: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextEventIcon: {
    width: 18,
    height: 18,
    tintColor: '#ffffff',
  },
  nextEventInfo: {
    gap: 1,
  },
  nextEventLabel: {
    ...typography.label,
    fontSize: 9.5,
    letterSpacing: 0.8,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    textTransform: 'uppercase',
  },
  nextEventRoute: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  nextEventTime: {
    ...typography.screenTitle,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#ffffff',
  },

  // ── Spending Card ──────────────────────────────────────────────────────────
  spendingCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...shadows.card,
  },
  spendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  spendingOverline: {
    ...typography.label,
    fontSize: 10.5,
    letterSpacing: 0.8,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  receiptIcon: {
    width: 16,
    height: 16,
    tintColor: colors.textSecondary,
  },
  spendingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  spendingAmountGroup: {
    gap: 1,
  },
  spendingAmount: {
    ...typography.display,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  spendingCents: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  spendingBudget: {
    ...typography.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  spendingBadge: {
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.20)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  spendingBadgeText: {
    ...typography.label,
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.primary,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 3,
    marginTop: spacing.xs + 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },

  // ── Coming Up Timeline ─────────────────────────────────────────────────────
  section: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitleUnderline: {
    ...typography.sectionTitle,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary,
    textDecorationStyle: 'solid',
  },
  sectionActionUnderline: {
    ...typography.label,
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary,
  },
  timelineContainer: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 17,
    top: 14,
    bottom: 14,
    width: 2,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  timelineItem: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...shadows.card,
  },
  timelineItemSecond: {
    marginTop: spacing.xs,
  },
  timelineIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    flexShrink: 0,
  },
  flightIconBg: {
    backgroundColor: colors.primarySurface,
  },
  hotelIconBg: {
    backgroundColor: colors.backgroundAlt,
  },
  flightEventIcon: {
    width: 16,
    height: 16,
    tintColor: colors.primary,
  },
  hotelEventIcon: {
    width: 16,
    height: 16,
    tintColor: colors.textSecondary,
  },
  timelineDetails: {
    flex: 1,
    paddingTop: 2,
  },
  timelineTimePrimary: {
    ...typography.label,
    fontSize: 11,
    letterSpacing: 1.0,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  timelineTimeMuted: {
    ...typography.label,
    fontSize: 11,
    letterSpacing: 1.0,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  timelineTitle: {
    ...typography.cardTitle,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  timelineSubtitle: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // ── AI Planner Card ────────────────────────────────────────────────────────
  aiCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.primary, // #2c5f5e
    borderRadius: radius.card,
    padding: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 6,
  },
  aiGlowOverlay: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sparkleIcon: {
    width: 22,
    height: 22,
    tintColor: 'rgba(255, 255, 255, 0.95)',
  },
  aiTitle: {
    ...typography.sectionTitle,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    color: '#ffffff',
  },
  aiDescription: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255, 255, 255, 0.90)',
    marginTop: spacing.sm,
  },
  aiButton: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    ...shadows.card,
  },
  aiButtonText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  aiButtonArrow: {
    width: 16,
    height: 16,
    tintColor: colors.primary,
  },

  // ── Past Trips Carousel ────────────────────────────────────────────────────
  pastTripsSection: {
    marginTop: spacing.xl,
  },
  pastTripsHeaderRow: {
    paddingHorizontal: spacing.lg,
  },
  horizontalScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  pastTripCard: {
    width: 220,
    minHeight: 128,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  pastTripInfo: {
    gap: 2,
  },
  pastTripTitle: {
    ...typography.cardTitle,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pastTripDates: {
    ...typography.label,
    fontSize: 11,
    letterSpacing: 1.0,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  pastTripBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
  pastTripIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastTripCategoryIcon: {
    width: 18,
    height: 18,
    tintColor: colors.textSecondary,
  },

  // ── Empty State Hero Card ─────────────────────────────────────────────────
  emptyHeroCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.card,
  },
  emptyHeroContent: {
    alignItems: 'center',
    width: '100%',
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyPlaceIcon: {
    width: 24,
    height: 24,
    tintColor: colors.primary,
  },
  emptyHeroOverline: {
    ...typography.label,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  emptyHeroTitle: {
    ...typography.screenTitle,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  emptyHeroSubtitle: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    maxWidth: 320,
  },
  emptyHeroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyCreateButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.card,
  },
  emptyCreateButtonIcon: {
    width: 16,
    height: 16,
    tintColor: colors.textOnPrimary,
  },
  emptyCreateButtonText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  emptyAiButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyAiButtonIcon: {
    width: 16,
    height: 16,
    tintColor: colors.textPrimary,
  },
  emptyAiButtonText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // ── Loading & Error States ────────────────────────────────────────────────
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(176, 74, 74, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  errorIcon: {
    width: 24,
    height: 24,
    tintColor: colors.error,
  },
  errorTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  errorSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  retryButtonText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },

  // ── Common States ──────────────────────────────────────────────────────────
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  itemPressed: {
    backgroundColor: colors.backgroundAlt,
  },
});
