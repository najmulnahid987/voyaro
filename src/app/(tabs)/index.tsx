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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { getHomeDashboardData, Trip } from '@/services/mockData';

/**
 * Route: /(tabs)/ — Home Screen (Phase 4)
 *
 * Visual Source of Truth: Google Stitch Home design (home.png & home.html)
 * Travel command center answering:
 *   1. What is my next trip?
 *   2. What is happening next?
 *   3. What trips do I have?
 *   4. What is important right now?
 *   5. What should I do next?
 */
export default function HomeScreen() {
  const data = getHomeDashboardData();
  const { currentTrip, comingUpEvents, pastTrips } = data;

  const handleTripPress = (tripId: string) => {
    router.push(`/(tabs)/trips/${tripId}`);
  };

  const handleItineraryPress = () => {
    router.push(`/(tabs)/trips/${currentTrip.id}/itinerary`);
  };

  const handleSpendingPress = () => {
    router.push(`/(tabs)/trips/${currentTrip.id}/budget`);
  };

  const handleAllTripsPress = () => {
    router.push('/(tabs)/trips');
  };

  const handleAiPlanPress = () => {
    router.push('/ai');
  };

  const handleProfilePress = () => {
    router.push('/(tabs)/profile');
  };

  const handleSearchPress = () => {
    router.push('/(tabs)/trips');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Floating Header Bar */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerBar}>
          {/* Profile Icon / Avatar */}
          <Pressable
            onPress={handleProfilePress}
            style={({ pressed }) => [
              styles.avatarButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Profile"
          >
            <Image
              source={require('@/assets/images/onboarding/person.svg')}
              style={styles.avatarIcon}
              contentFit="contain"
            />
          </Pressable>

          {/* Voyaro Brand Title */}
          <Text style={styles.headerTitle}>Voyaro</Text>

          {/* Search Trigger */}
          <Pressable
            onPress={handleSearchPress}
            style={({ pressed }) => [
              styles.searchButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Search trips"
          >
            <Image
              source={require('@/assets/images/icons/search.svg')}
              style={styles.searchIcon}
              contentFit="contain"
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* ── 1. Featured / Current Trip Hero Card ─────────────────────────── */}
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
                <Text style={styles.heroOverline}>CURRENT TRIP</Text>
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

          {/* ── 2. Current Trip Spending Quick View ──────────────────────────── */}
          {currentTrip.spending && (
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
                    $1,240
                    <Text style={styles.spendingCents}>.50</Text>
                  </Text>
                  <Text style={styles.spendingBudget}>
                    of ${currentTrip.spending.budgetFormatted} budget
                  </Text>
                </View>
                <View style={styles.spendingBadge}>
                  <Text style={styles.spendingBadgeText}>
                    {currentTrip.spending.percentUsed}% Used
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${currentTrip.spending.percentUsed}%` },
                  ]}
                />
              </View>
            </Pressable>
          )}

          {/* ── 3. Coming Up Timeline Section ─────────────────────────────────── */}
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
              Let Voyaro's AI craft a bespoke itinerary for your next dream destination.
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
          <View style={styles.pastTripsSection}>
            <View style={styles.sectionHeaderRow}>
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
        </View>
      </ScrollView>
    </SafeAreaView>
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

  // ── Header Bar ─────────────────────────────────────────────────────────────
  headerWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  headerBar: {
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...shadows.card,
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    width: 18,
    height: 18,
    tintColor: colors.primary,
  },
  headerTitle: {
    ...typography.screenTitle,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: -0.3,
  },
  searchButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    width: 22,
    height: 22,
    tintColor: colors.primary,
  },

  // ── Hero Card ──────────────────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.primaryHover, // #1e4241 deep forest brand color
    borderRadius: radius.card,
    overflow: 'hidden',
    shadowColor: colors.primaryHover,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 6,
  },
  heroContent: {
    padding: spacing.lg,
  },
  heroTextGroup: {
    gap: 2,
  },
  heroOverline: {
    ...typography.label,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.80)',
    textTransform: 'uppercase',
  },
  heroTitle: {
    ...typography.display,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  heroDates: {
    ...typography.body,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.90)',
    marginTop: 2,
  },
  nextEventCard: {
    marginTop: spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextEventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  nextEventIconCircle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextEventIcon: {
    width: 24,
    height: 24,
    tintColor: '#ffffff',
  },
  nextEventInfo: {
    gap: 1,
  },
  nextEventLabel: {
    ...typography.label,
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    textTransform: 'uppercase',
  },
  nextEventRoute: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  nextEventTime: {
    ...typography.screenTitle,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: '#ffffff',
  },

  // ── Spending Card ──────────────────────────────────────────────────────────
  spendingCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...shadows.card,
  },
  spendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  spendingOverline: {
    ...typography.label,
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  receiptIcon: {
    width: 20,
    height: 20,
    tintColor: colors.textSecondary,
  },
  spendingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  spendingAmountGroup: {
    gap: 2,
  },
  spendingAmount: {
    ...typography.display,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  spendingCents: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  spendingBudget: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  spendingBadge: {
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.20)',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  spendingBadgeText: {
    ...typography.label,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 3,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },

  // ── Coming Up Timeline ─────────────────────────────────────────────────────
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitleUnderline: {
    ...typography.sectionTitle,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary,
    textDecorationStyle: 'solid',
  },
  sectionActionUnderline: {
    ...typography.label,
    fontSize: 14,
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
    left: 24,
    top: 20,
    bottom: 20,
    width: 2,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  timelineItem: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...shadows.card,
  },
  timelineItemSecond: {
    marginTop: spacing.sm,
  },
  timelineIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
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
    width: 20,
    height: 20,
    tintColor: colors.primary,
  },
  hotelEventIcon: {
    width: 20,
    height: 20,
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
