import React, { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { Trip, getTripById as getDevMockTripById } from '@/services/mockData';
import { fetchTripById, getActiveTripId, getCachedTrips, setActiveTripId } from '@/services/trip';
import { useItinerary } from '@/services/itineraryStore';
import {
  groupItemsByDay,
  parseDate,
} from '@/utils/itineraryDateUtils';
import { useShellInsets } from '@/components/navigation';
import { ConcreteItineraryItem } from '@/types/itinerary';
import { ItineraryItemCard } from '@/components/itinerary';

/**
 * Route: /(tabs)/trips/[tripId]/itinerary
 *
 * Itinerary Timeline Screen — Voyaro Phase 7 — Step 8
 *
 * Supabase Persistent Itinerary Timeline:
 *   - Trip title and sub-navigation tabs (Overview, Itinerary, Map, Expenses, Documents)
 *   - Continuous vertical timeline with day header badges (Date, Month, Weekday)
 *   - Chronological item cards with type badges, formatted times, titles, and metadata
 *   - Live reactive Supabase state integration via `useItinerary(tripId)`
 *   - Loading indicator, pull-to-refresh, error recovery, and empty state
 *   - Direct navigation to `/itinerary/[itemId]` on card press
 *   - Direct navigation to `/add` for adding new reservations
 */

export default function TripItineraryScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const effectiveTripId = tripId || getActiveTripId() || '';
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();

  useEffect(() => {
    if (effectiveTripId) {
      setActiveTripId(effectiveTripId);
    }
  }, [effectiveTripId]);

  const [trip, setTrip] = useState<Trip | null>(() => {
    return (effectiveTripId ? getCachedTrips()?.find((t) => t.id === effectiveTripId) : null) || null;
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadTrip() {
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
    loadTrip();
    return () => {
      isMounted = false;
    };
  }, [effectiveTripId]);

  // 1. Reactive Supabase Itinerary State
  const { items, loading, error, refresh } = useItinerary(effectiveTripId);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  // 2. Group items chronologically by local calendar day
  const dayGroups = useMemo(() => {
    return groupItemsByDay(items, trip?.startDate);
  }, [items, trip?.startDate]);

  // 3. Navigation handlers
  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(`/(tabs)/trips/${trip?.id || effectiveTripId}`);
    }
  };

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  const handleItemPress = (itemId: string) => {
    router.push(`/itinerary/${itemId}`);
  };

  const handleAddPress = () => {
    router.push({ pathname: '/add', params: { tripId: effectiveTripId } });
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.container}>
          {/* ── 1. Timeline Content Area ─────────────────────────────────── */}
          {loading && items.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading itinerary timeline...</Text>
            </View>
          ) : error && items.length === 0 ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconCircle}>
                <Image
                  source={require('@/assets/images/icons/close.svg')}
                  style={styles.errorIcon}
                  contentFit="contain"
                />
              </View>
              <Text style={styles.errorTitle}>Unable to load itinerary</Text>
              <Text style={styles.errorSubtitle}>{error}</Text>
              <Pressable
                onPress={refresh}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
            </View>
          ) : dayGroups.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateIconCircle}>
                <Image
                  source={require('@/assets/images/icons/list-alt.svg')}
                  style={styles.emptyStateIcon}
                  contentFit="contain"
                  tintColor={colors.primary}
                />
              </View>
              <Text style={styles.emptyStateTitle}>No Itinerary Items Yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                {trip?.userRole === 'viewer'
                  ? 'No itinerary items have been scheduled for this trip yet.'
                  : 'Add your flights, hotels, activities, or ground transportation to see your travel timeline here.'}
              </Text>
              {trip?.userRole !== 'viewer' && (
                <Pressable
                  onPress={handleAddPress}
                  style={({ pressed }) => [
                    styles.emptyStateButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.emptyStateButtonText}>+ Add Reservation</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.timelineSection}>
              {/* Continuous vertical line spanning all days */}
              <View style={styles.timelineContinuousLine} />

              {dayGroups.map((group, groupIdx) => {
                // Extract month and weekday from group
                const sampleDate =
                  parseDate(group.items[0].startDateTime) ||
                  parseDate(group.date) ||
                  new Date();
                const dayOfMonth = sampleDate.getDate();
                const monthName = sampleDate.toLocaleDateString('en-US', {
                  month: 'long',
                });
                const weekdayName = sampleDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                });

                return (
                  <View
                    key={group.date}
                    style={[
                      styles.dayGroupWrapper,
                      groupIdx > 0 && styles.dayGroupSpacing,
                    ]}
                  >
                    {/* Day Header Row */}
                    <View style={styles.dayHeaderRow}>
                      <View style={styles.dayCircleBadge}>
                        <Text style={styles.dayCircleBadgeText}>
                          {dayOfMonth}
                        </Text>
                      </View>
                      <View style={styles.dayHeaderInfo}>
                        <Text style={styles.dayMonthLabel}>
                          {monthName.toUpperCase()}
                        </Text>
                        <Text style={styles.dayWeekdayLabel}>
                          {weekdayName}
                        </Text>
                      </View>
                    </View>

                    {/* Day Events List */}
                    <View style={styles.dayEventsList}>
                      {group.items.map((item) => (
                        <View key={item.id} style={styles.eventRow}>
                          {/* Left column: Timeline node dot */}
                          <View style={styles.eventDotColumn}>
                            <View style={styles.eventDotRing}>
                              <View style={styles.eventDotCenter} />
                            </View>
                          </View>

                          {/* Right column: Card */}
                          <ItineraryItemCard
                            item={item}
                            onPress={() => handleItemPress(item.id)}
                            showConfirmation={true}
                            style={styles.cardFlex}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    width: '100%',
    paddingBottom: spacing.xl,
  },

  // --- Top Header ---
  headerSection: {
    paddingHorizontal: spacing.xl, // 20px per Stitch spec
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  backArrowText: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '500',
    marginTop: -2,
  },
  addIconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.float,
  },
  plusIcon: {
    width: 18,
    height: 18,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  tripTitle: {
    fontFamily: typography.screenTitle.fontFamily,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    letterSpacing: -0.28,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },

  // --- Sub-Navigation Tabs ---
  tabsScrollView: {
    marginHorizontal: -spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  tabsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.transparent,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  tabButtonPressed: {
    backgroundColor: colors.backgroundAlt,
  },
  tabButtonText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },

  // --- Timeline Layout ---
  timelineSection: {
    position: 'relative',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  timelineContinuousLine: {
    position: 'absolute',
    top: 14,
    bottom: 0,
    left: spacing.md + 13, // Centers inside the 28px left circle (12px margin + 14px center - 1px line width)
    width: 2,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  dayGroupWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  dayGroupSpacing: {
    marginTop: spacing.md, // 12px between days
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dayCircleBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dayCircleBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dayHeaderInfo: {
    flexDirection: 'column',
  },
  dayMonthLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: colors.primary,
  },
  dayWeekdayLabel: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 0,
  },

  // --- Event Rows ---
  dayEventsList: {
    flexDirection: 'column',
    gap: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  eventDotColumn: {
    width: 28,
    alignItems: 'center',
    paddingTop: 12, // Centers dot at 17px, matching the card's top header row
    zIndex: 2,
  },
  eventDotRing: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  eventDotCenter: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: colors.primary,
  },

  cardFlex: {
    flex: 1,
    minWidth: 0,
  },

  // --- Empty State ---
  emptyStateContainer: {
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyStateIcon: {
    width: 28,
    height: 28,
  },
  emptyStateTitle: {
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.button,
    ...shadows.float,
  },
  emptyStateButtonText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnPrimary,
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
});
