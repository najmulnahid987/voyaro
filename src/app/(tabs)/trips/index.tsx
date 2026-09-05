import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { getAllTrips, Trip } from '@/services/mockData';
import { useShellInsets } from '@/components/navigation';

type FilterType = 'all' | 'ongoing' | 'upcoming' | 'past';

/**
 * Route: /(tabs)/trips — My Trips Screen (Phase 4)
 *
 * Visual Source of Truth: Google Stitch My Trips design (trips.png & trips.html)
 * Features:
 *   - Header with "My Trips", subtitle, and "+ Create Trip" CTA
 *   - Filter bar: Ongoing, Upcoming, Past
 *   - Structured Trip Cards (cover banner, status badge, date, traveler count, itinerary count, budget summary)
 *   - Empty state handling with CTA
 */
export default function TripsScreen() {
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const allTrips = getAllTrips();

  const handleFilterPress = (filter: FilterType) => {
    // Tapping the active filter toggles back to 'all' for effortless browsing
    if (activeFilter === filter) {
      setActiveFilter('all');
    } else {
      setActiveFilter(filter);
    }
  };

  const filteredTrips = allTrips.filter((trip) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'ongoing') return trip.status === 'ongoing' || trip.status === 'current';
    if (activeFilter === 'upcoming') return trip.status === 'upcoming';
    if (activeFilter === 'past') return trip.status === 'past';
    return true;
  });

  const handleTripPress = (tripId: string) => {
    router.push(`/(tabs)/trips/${tripId}`);
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
      >
        <View style={styles.container}>
          {/* ── 1. Header Section ─────────────────────────────────────────── */}
          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>My Trips</Text>
            <View style={styles.headerSubtitleRow}>
              <Text style={styles.headerSubtitle}>
                All your adventures, in one place.
              </Text>
              <Pressable
                onPress={handleCreateTripPress}
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create Trip"
              >
                <Image
                  source={require('@/assets/images/icons/plus.svg')}
                  style={styles.createButtonIcon}
                  contentFit="contain"
                />
                <Text style={styles.createButtonText}>Create Trip</Text>
              </Pressable>
            </View>
          </View>

          {/* ── 2. Filter Navigation Bar ──────────────────────────────────── */}
          <View style={styles.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
            >
              {[
                { id: 'ongoing' as FilterType, label: 'Ongoing' },
                { id: 'upcoming' as FilterType, label: 'Upcoming' },
                { id: 'past' as FilterType, label: 'Past' },
              ].map((filter) => {
                const isActive = activeFilter === filter.id;
                return (
                  <Pressable
                    key={filter.id}
                    onPress={() => handleFilterPress(filter.id)}
                    style={({ pressed }) => [
                      styles.filterPill,
                      isActive ? styles.filterPillActive : styles.filterPillInactive,
                      pressed && styles.pillPressed,
                    ]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`Filter by ${filter.label}`}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isActive
                          ? styles.filterPillTextActive
                          : styles.filterPillTextInactive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* ── 3. Trip Cards List ────────────────────────────────────────── */}
          {filteredTrips.length > 0 ? (
            <View style={styles.tripsList}>
              {filteredTrips.map((trip: Trip) => {
                const isOngoing = trip.status === 'ongoing' || trip.status === 'current';
                const isPast = trip.status === 'past';

                return (
                  <Pressable
                    key={trip.id}
                    onPress={() => handleTripPress(trip.id)}
                    style={({ pressed }) => [
                      styles.tripCard,
                      isPast && styles.tripCardPast,
                      pressed && styles.cardPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Trip: ${trip.title}`}
                  >
                    {/* Top Cover Banner */}
                    <View
                      style={[
                        styles.cardBanner,
                        isOngoing
                          ? styles.bannerOngoing
                          : isPast
                          ? styles.bannerPast
                          : styles.bannerUpcoming,
                      ]}
                    >
                      {/* Status Badge (Top Right) */}
                      {trip.statusBadgeLabel && (
                        <View
                          style={[
                            styles.statusBadge,
                            isOngoing
                              ? styles.statusBadgeOngoing
                              : styles.statusBadgePast,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isOngoing
                                ? styles.statusBadgeTextOngoing
                                : styles.statusBadgeTextPast,
                            ]}
                          >
                            {trip.statusBadgeLabel}
                          </Text>
                        </View>
                      )}

                      {/* Title & Dates */}
                      <View style={styles.bannerInfo}>
                        <Text
                          style={[
                            styles.tripTitle,
                            isPast && styles.tripTitlePast,
                          ]}
                          numberOfLines={1}
                        >
                          {trip.title}
                        </Text>
                        <Text
                          style={[
                            styles.tripDates,
                            isPast && styles.tripDatesPast,
                          ]}
                        >
                          {trip.dates}
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Meta & Budget Footer */}
                    <View style={styles.cardFooter}>
                      <View style={styles.metaRow}>
                        {/* Travelers Count */}
                        <View style={styles.metaItem}>
                          <Image
                            source={require('@/assets/images/icons/group.svg')}
                            style={[
                              styles.metaIcon,
                              isPast && styles.metaIconPast,
                            ]}
                            contentFit="contain"
                          />
                          <Text
                            style={[
                              styles.metaText,
                              isPast && styles.metaTextPast,
                            ]}
                          >
                            {trip.travelerCount}
                          </Text>
                        </View>

                        {/* Itinerary Items Count */}
                        <View style={styles.metaItem}>
                          <Image
                            source={require('@/assets/images/icons/list-alt.svg')}
                            style={[
                              styles.metaIcon,
                              isPast && styles.metaIconPast,
                            ]}
                            contentFit="contain"
                          />
                          <Text
                            style={[
                              styles.metaText,
                              isPast && styles.metaTextPast,
                            ]}
                          >
                            {trip.itineraryCount}
                          </Text>
                        </View>
                      </View>

                      {/* Budget Summary */}
                      {trip.spending && (
                        <View style={styles.budgetGroup}>
                          <Text
                            style={[
                              styles.budgetOverline,
                              trip.spending.isOverBudget && styles.budgetOverlineOver,
                            ]}
                          >
                            {trip.spending.isOverBudget ? 'OVER BUDGET' : 'BUDGET'}
                          </Text>
                          <Text
                            style={[
                              styles.budgetValue,
                              isPast && styles.budgetValuePast,
                            ]}
                          >
                            ${trip.spending.spentFormatted} / ${trip.spending.budgetFormatted}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            /* ── 4. Empty State ───────────────────────────────────────────── */
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconCircle}>
                <Image
                  source={require('@/assets/images/icons/flight.svg')}
                  style={styles.emptyIcon}
                  contentFit="contain"
                />
              </View>
              <Text style={styles.emptyTitle}>No trips found</Text>
              <Text style={styles.emptySubtitle}>
                {activeFilter === 'all'
                  ? 'Start planning your next adventure today!'
                  : `You don't have any ${activeFilter} trips yet.`}
              </Text>
              <Pressable
                onPress={handleCreateTripPress}
                style={({ pressed }) => [
                  styles.emptyCtaButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create your first trip"
              >
                <Text style={styles.emptyCtaText}>Create your first trip</Text>
              </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  // ── Header Section ─────────────────────────────────────────────────────────
  headerSection: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.28,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    maxWidth: 200,
  },
  createButton: {
    backgroundColor: colors.primary, // #2c5f5e
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.card,
  },
  createButtonIcon: {
    width: 18,
    height: 18,
    tintColor: colors.textOnPrimary,
  },
  createButtonText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textOnPrimary,
    letterSpacing: 0.1,
  },

  // ── Filter Bar ─────────────────────────────────────────────────────────────
  filterContainer: {
    marginBottom: spacing.xl,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  filterPillInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#e2e2e2',
  },
  filterPillText: {
    ...typography.label,
    fontSize: 14,
    letterSpacing: 0.1,
  },
  filterPillTextActive: {
    color: colors.textOnPrimary,
    fontWeight: '500',
  },
  filterPillTextInactive: {
    color: colors.textPrimary,
    fontWeight: '500',
  },

  // ── Trip Cards List ────────────────────────────────────────────────────────
  tripsList: {
    gap: spacing.lg,
  },
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    overflow: 'hidden',
    ...shadows.card,
  },
  tripCardPast: {
    opacity: 0.85,
  },

  // Card Banner
  cardBanner: {
    padding: 16,
    position: 'relative',
    minHeight: 110,
    justifyContent: 'flex-end',
  },
  bannerOngoing: {
    backgroundColor: 'rgba(44, 95, 94, 0.10)', // #0f4746 with 10% opacity
  },
  bannerUpcoming: {
    backgroundColor: '#eeeeee',
  },
  bannerPast: {
    backgroundColor: '#e8e8e8',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusBadgeOngoing: {
    backgroundColor: colors.primary,
  },
  statusBadgePast: {
    backgroundColor: '#e2e2e2',
  },
  statusBadgeText: {
    ...typography.label,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusBadgeTextOngoing: {
    color: colors.textOnPrimary,
  },
  statusBadgeTextPast: {
    color: colors.textSecondary,
  },
  bannerInfo: {
    paddingTop: 32,
    gap: 4,
  },
  tripTitle: {
    ...typography.screenTitle,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  tripTitlePast: {
    color: colors.textSecondary,
  },
  tripDates: {
    ...typography.bodySecondary,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  tripDatesPast: {
    color: colors.textMuted,
  },

  // Card Footer
  cardFooter: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    width: 16,
    height: 16,
    tintColor: colors.textSecondary,
  },
  metaIconPast: {
    tintColor: colors.textMuted,
  },
  metaText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  metaTextPast: {
    color: colors.textMuted,
  },
  budgetGroup: {
    alignItems: 'flex-end',
    gap: 2,
  },
  budgetOverline: {
    ...typography.label,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  budgetOverlineOver: {
    color: '#ba1a1a',
  },
  budgetValue: {
    ...typography.label,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  budgetValuePast: {
    color: colors.textSecondary,
  },

  // ── Empty State ────────────────────────────────────────────────────────────
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyIcon: {
    width: 28,
    height: 28,
    tintColor: colors.primary,
  },
  emptyTitle: {
    ...typography.sectionTitle,
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyCtaButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  emptyCtaText: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },

  // ── Pressed states ─────────────────────────────────────────────────────────
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  pillPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
