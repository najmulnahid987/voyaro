import React, { useMemo } from 'react';
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
import { getTripById } from '@/services/mockData';
import { useItinerary } from '@/services/itineraryStore';
import {
  formatItineraryTime,
  groupItemsByDay,
} from '@/utils/itineraryDateUtils';
import { useShellInsets } from '@/components/navigation';
import {
  ConcreteItineraryItem,
  FlightMetadata,
  HotelMetadata,
  TransportationMetadata,
} from '@/types/itinerary';
import { ItineraryItemCard } from '@/components/itinerary';

/**
 * Route: /(tabs)/trips/[tripId]/itinerary
 *
 * Itinerary Timeline Screen — Voyaro Phase 5
 *
 * Visual Source of Truth: Google Stitch itinerary.png & itinerary.html
 * Features:
 *   - Trip title and sub-navigation tabs (Overview, Itinerary, Map, Expenses, Documents)
 *   - Continuous vertical timeline with day header badges (Date, Month, Weekday)
 *   - Chronological item cards with type badges, formatted times, titles, and metadata
 *   - Reactive state integration via `useItinerary(tripId)`
 *   - Direct navigation to `/itinerary/[itemId]` on card press
 *   - Direct navigation to `/add` for adding new reservations
 *   - Responsive safe-area handling with `useShellInsets()`
 */

export default function TripItineraryScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const effectiveTripId = tripId || 'japan-adventure';
  const trip = getTripById(effectiveTripId) || getTripById('japan-adventure')!;
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();

  // 1. Reactive Itinerary State
  const { items } = useItinerary(effectiveTripId);

  // 2. Group items chronologically by local calendar day
  const dayGroups = useMemo(() => {
    return groupItemsByDay(items, trip.startDate);
  }, [items, trip.startDate]);

  // 3. Navigation handlers
  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(`/(tabs)/trips/${trip.id}`);
    }
  };

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  const handleItemPress = (itemId: string) => {
    router.push(`/itinerary/${itemId}`);
  };

  const handleAddPress = () => {
    router.push('/add');
  };

  // 4. Helper to get category label from item
  const getItemCategoryLabel = (item: ConcreteItineraryItem): string => {
    switch (item.type) {
      case 'flight':
        return 'Flight';
      case 'hotel':
        return 'Hotel Check-in';
      case 'activity':
        return item.metadata?.category || 'Explore';
      case 'transportation': {
        const transType = (item.metadata as TransportationMetadata)
          ?.transportationType;
        if (transType === 'train') return 'Train';
        if (transType === 'rental_car') return 'Rental Car';
        if (transType === 'ferry') return 'Ferry';
        if (transType === 'bus') return 'Bus';
        return 'Transport';
      }
      default:
        return 'Event';
    }
  };

  // 5. Helper to get item subtitle / route detail
  const getItemSubtitle = (item: ConcreteItineraryItem): string => {
    switch (item.type) {
      case 'flight': {
        const meta = item.metadata as FlightMetadata;
        if (meta?.airline && meta?.flightNumber) {
          return `${meta.airline} · ${meta.flightNumber}`;
        }
        return meta?.airline || meta?.flightNumber || item.location || '';
      }
      case 'hotel': {
        const meta = item.metadata as HotelMetadata;
        return meta?.room || meta?.address || item.location || 'Kyoto';
      }
      case 'activity': {
        return item.location || 'Tokyo';
      }
      case 'transportation': {
        const meta = item.metadata as TransportationMetadata;
        if (meta?.from && meta?.to) {
          return `${meta.from} → ${meta.to}`;
        }
        return meta?.provider || item.location || '';
      }
      default:
        return '';
    }
  };

  // 6. Helper to get item icon
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return require('@/assets/images/icons/flight.svg');
      case 'hotel':
        return require('@/assets/images/icons/hotel.svg');
      case 'activity':
        return require('@/assets/images/icons/landscape.svg');
      case 'transportation':
      default:
        return require('@/assets/images/onboarding/flight-takeoff.svg');
    }
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
          {/* ── 1. Top Header & Title ────────────────────────────────────── */}
          <View style={styles.headerSection}>
            <View style={styles.topBarRow}>
              <Pressable
                onPress={handleBackPress}
                style={({ pressed }) => [
                  styles.glassButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Text style={styles.backArrowText}>←</Text>
              </Pressable>

              <Pressable
                onPress={handleAddPress}
                style={({ pressed }) => [
                  styles.addIconButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add reservation"
              >
                <Image
                  source={require('@/assets/images/icons/plus.svg')}
                  style={styles.plusIcon}
                  tintColor={colors.textOnPrimary}
                  contentFit="contain"
                />
              </Pressable>
            </View>

            <Text style={styles.tripTitle} numberOfLines={2}>
              {trip.title}
            </Text>

            {/* ── 2. Scrollable Sub-Navigation Tabs ────────────────────────── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
              style={styles.tabsScrollView}
            >
              <Pressable
                onPress={() => handleTabPress(`/(tabs)/trips/${trip.id}`)}
                style={({ pressed }) => [
                  styles.tabButton,
                  pressed && styles.tabButtonPressed,
                ]}
              >
                <Text style={styles.tabButtonText}>Overview</Text>
              </Pressable>

              <View style={[styles.tabButton, styles.tabButtonActive]}>
                <Text style={[styles.tabButtonText, styles.tabButtonTextActive]}>
                  Itinerary
                </Text>
              </View>

              <Pressable
                onPress={() => handleTabPress(`/(tabs)/trips/${trip.id}/map`)}
                style={({ pressed }) => [
                  styles.tabButton,
                  pressed && styles.tabButtonPressed,
                ]}
              >
                <Text style={styles.tabButtonText}>Map</Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  handleTabPress(`/(tabs)/trips/${trip.id}/expenses`)
                }
                style={({ pressed }) => [
                  styles.tabButton,
                  pressed && styles.tabButtonPressed,
                ]}
              >
                <Text style={styles.tabButtonText}>Expenses</Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  handleTabPress(`/(tabs)/trips/${trip.id}/documents`)
                }
                style={({ pressed }) => [
                  styles.tabButton,
                  pressed && styles.tabButtonPressed,
                ]}
              >
                <Text style={styles.tabButtonText}>Documents</Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* ── 3. Timeline Content Area ─────────────────────────────────── */}
          {dayGroups.length === 0 ? (
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
                Add your flights, hotels, activities, or ground transportation
                to see your travel timeline here.
              </Text>
              <Pressable
                onPress={handleAddPress}
                style={({ pressed }) => [
                  styles.emptyStateButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.emptyStateButtonText}>+ Add Reservation</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.timelineSection}>
              {/* Continuous vertical line spanning all days */}
              <View style={styles.timelineContinuousLine} />

              {dayGroups.map((group, groupIdx) => {
                // Extract month and weekday from group
                const sampleDate = new Date(group.items[0].startDateTime);
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
                      {group.items.map((item) => {
                        const timeString = formatItineraryTime(
                          item.startDateTime
                        );
                        const categoryLabel = getItemCategoryLabel(item);
                        const subtitle = getItemSubtitle(item);
                        const iconSource = getItemIcon(item.type);

                        return (
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
                        );
                      })}
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
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  timelineContinuousLine: {
    position: 'absolute',
    top: 20,
    bottom: 0,
    left: spacing.xl + 19, // Centers inside the 40px left circle (20px margin + 20px center - 1px line width)
    width: 2,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  dayGroupWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  dayGroupSpacing: {
    marginTop: spacing['3xl'], // 32px between days
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  dayCircleBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCircleBadgeText: {
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dayHeaderInfo: {
    flexDirection: 'column',
  },
  dayMonthLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  dayWeekdayLabel: {
    fontFamily: typography.body.fontFamily,
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // --- Event Rows ---
  dayEventsList: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eventDotColumn: {
    width: 40,
    alignItems: 'center',
    paddingTop: spacing.lg, // Aligns dot vertically with top of card
    zIndex: 2,
  },
  eventDotRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  eventDotCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },

  cardFlex: {
    flex: 1,
  },
  // --- Item Card ---
  itemCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardCategoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  cardTimeLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  cardTitleText: {
    fontFamily: typography.cardTitle.fontFamily,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: 2,
  },
  cardMetaIcon: {
    width: 14,
    height: 14,
  },
  cardSubtitleText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
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
});
