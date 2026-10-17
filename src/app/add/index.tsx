import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { getActiveTripId, getCachedTrips, listTrips, setActiveTripId } from '@/services/trip';
import { Trip, getTripById } from '@/services/mockData';
import { isDevMockTrip } from '@/services/expenseStore';
import { Button } from '@/components/ui';

interface QuickAddOption {
  key: string;
  title: string;
  subtitle: string;
  tag: string;
  icon: any;
  href: string;
}

const QUICK_ADD_OPTIONS: QuickAddOption[] = [
  {
    key: 'expense',
    title: 'Add Expense',
    subtitle: 'Track spending, meals, shopping & bills',
    tag: 'Budget',
    icon: require('@/assets/images/icons/receipt.svg'),
    href: '/add/expense',
  },
  {
    key: 'activity',
    title: 'Add Activity',
    subtitle: 'Tours, sightseeing, museums & attractions',
    tag: 'Itinerary',
    icon: require('@/assets/images/icons/landscape.svg'),
    href: '/add/activity',
  },
  {
    key: 'flight',
    title: 'Add Flight',
    subtitle: 'Air travel, airlines & boarding details',
    tag: 'Travel',
    icon: require('@/assets/images/icons/flight.svg'),
    href: '/add/flight',
  },
  {
    key: 'hotel',
    title: 'Add Accommodation',
    subtitle: 'Hotels, resorts, villas & check-in dates',
    tag: 'Stay',
    icon: require('@/assets/images/icons/hotel.svg'),
    href: '/add/hotel',
  },
  {
    key: 'transportation',
    title: 'Add Ground Transport',
    subtitle: 'Trains, bullet trains, car rentals & ferries',
    tag: 'Transit',
    icon: require('@/assets/images/icons/ticket.svg'),
    href: '/add/transportation',
  },
];

export default function AddIndexScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const insets = useSafeAreaInsets();

  const [trips, setTrips] = useState<Trip[]>(() => getCachedTrips() || []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !getCachedTrips());
  const [selectedTripId, setSelectedTripId] = useState<string | null>(() => {
    if (tripId) return tripId;
    const globalActive = getActiveTripId();
    if (globalActive) return globalActive;
    const cached = getCachedTrips();
    return cached && cached.length > 0 ? cached[0].id : null;
  });
  const [showTripPicker, setShowTripPicker] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchUserTrips() {
      try {
        const fetched = await listTrips();
        if (!isMounted) return;
        setTrips(fetched);
        if (tripId) {
          setSelectedTripId(tripId);
          setActiveTripId(tripId);
        } else if (!selectedTripId && fetched.length > 0) {
          const globalActive = getActiveTripId();
          const match = globalActive && fetched.some((t) => t.id === globalActive);
          const chosen = match ? globalActive : fetched[0].id;
          setSelectedTripId(chosen);
          setActiveTripId(chosen);
        }
      } catch (err) {
        console.warn('[AddIndex] Failed to load trips:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchUserTrips();
    return () => {
      isMounted = false;
    };
  }, [tripId]);

  const activeTrip = useMemo(() => {
    if (!selectedTripId) return null;
    return (
      trips.find((t) => t.id === selectedTripId) ||
      (isDevMockTrip(selectedTripId) ? getTripById(selectedTripId) : null) ||
      null
    );
  }, [selectedTripId, trips]);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/trips');
    }
  };

  const handleOptionPress = (href: string) => {
    if (!selectedTripId) {
      if (trips.length > 0) {
        setShowTripPicker(true);
      } else {
        router.push('/(tabs)/trips/create');
      }
      return;
    }
    router.push({
      pathname: href as any,
      params: { tripId: selectedTripId },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 16 : 12) + 8,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 24 : 16) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle}>Quick Add</Text>
            <Text style={styles.headerSubtitle}>
              {activeTrip
                ? `Add items to ${activeTrip.title}`
                : 'Select what you would like to add'}
            </Text>
          </View>
          <Pressable
            onPress={handleClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Image
              source={require('@/assets/images/icons/close.svg')}
              style={styles.closeIcon}
              tintColor={colors.textSecondary}
              contentFit="contain"
            />
          </Pressable>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading trips...</Text>
          </View>
        )}

        {/* Empty State: No Trips Found */}
        {!isLoading && trips.length === 0 && !activeTrip && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Image
                source={require('@/assets/images/icons/landscape.svg')}
                style={styles.emptyIcon}
                tintColor={colors.primary}
                contentFit="contain"
              />
            </View>
            <Text style={styles.emptyTitle}>No Trips Found</Text>
            <Text style={styles.emptySubtitle}>
              You need to create a trip before you can add reservations, activities, or expenses.
            </Text>
            <Button
              label="Create a Trip"
              variant="primary"
              onPress={() => router.push('/(tabs)/trips/create')}
              style={styles.createTripBtn}
            />
          </View>
        )}

        {/* Active Trip Banner & Switcher */}
        {!isLoading && (trips.length > 0 || activeTrip) && (
          <>
            <View style={styles.tripBanner}>
              <View style={styles.tripBannerLeft}>
                <Text style={styles.tripBannerLabel}>CURRENT TRIP</Text>
                <Text style={styles.tripBannerTitle} numberOfLines={1}>
                  {activeTrip?.title || 'Trip Selected'}
                </Text>
                {activeTrip?.destination ? (
                  <Text style={styles.tripBannerDest} numberOfLines={1}>
                    📍 {activeTrip.destination}
                  </Text>
                ) : null}
              </View>

              {trips.length > 1 && (
                <Pressable
                  onPress={() => setShowTripPicker(true)}
                  style={styles.switchTripButton}
                  accessibilityRole="button"
                  accessibilityLabel="Switch trip"
                >
                  <Text style={styles.switchTripText}>Switch</Text>
                </Pressable>
              )}
            </View>

            {/* Quick Add Options List */}
            <View style={styles.optionsList}>
              {QUICK_ADD_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => handleOptionPress(opt.href)}
                  style={({ pressed }) => [
                    styles.optionCard,
                    pressed && styles.optionCardPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={opt.title}
                >
                  <View style={styles.optionIconContainer}>
                    <Image
                      source={opt.icon}
                      style={styles.optionIcon}
                      tintColor={colors.primary}
                      contentFit="contain"
                    />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <View style={styles.optionTitleRow}>
                      <Text style={styles.optionTitle}>{opt.title}</Text>
                      <View style={styles.optionTag}>
                        <Text style={styles.optionTagText}>{opt.tag}</Text>
                      </View>
                    </View>
                    <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
                  </View>
                  <Text style={styles.optionChevron}>›</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Trip Picker Modal */}
        <Modal
          visible={showTripPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTripPicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowTripPicker(false)}
          >
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Trip</Text>
                <Pressable onPress={() => setShowTripPicker(false)}>
                  <Image
                    source={require('@/assets/images/icons/close.svg')}
                    style={styles.modalCloseIcon}
                    tintColor={colors.textSecondary}
                    contentFit="contain"
                  />
                </Pressable>
              </View>
              <ScrollView style={styles.modalScroll}>
                {trips.map((t) => {
                  const isSelected = t.id === selectedTripId;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => {
                        setSelectedTripId(t.id);
                        setActiveTripId(t.id);
                        setShowTripPicker(false);
                      }}
                      style={[
                        styles.tripItem,
                        isSelected && styles.tripItemActive,
                      ]}
                    >
                      <View style={styles.tripItemTextGroup}>
                        <Text
                          style={[
                            styles.tripItemTitle,
                            isSelected && styles.tripItemTitleActive,
                          ]}
                          numberOfLines={1}
                        >
                          {t.title}
                        </Text>
                        <Text style={styles.tripItemDest} numberOfLines={1}>
                          {t.destination}
                        </Text>
                      </View>
                      {isSelected && (
                        <Image
                          source={require('@/assets/images/icons/checkmark.svg')}
                          style={styles.checkIcon}
                          tintColor={colors.primary}
                          contentFit="contain"
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: fontFamily.semiBold,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: 4,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  closeIcon: {
    width: 18,
    height: 18,
  },
  loadingContainer: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.sheet,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
    ...shadows.card,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyIcon: {
    width: 32,
    height: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fontFamily.semiBold,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  createTripBtn: {
    minWidth: 180,
  },
  tripBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  tripBannerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  tripBannerLabel: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  tripBannerTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tripBannerDest: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  switchTripButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}12`,
  },
  switchTripText: {
    fontSize: 13,
    fontFamily: fontFamily.semiBold,
    fontWeight: '600',
    color: colors.primary,
  },
  optionsList: {
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  optionCardPressed: {
    backgroundColor: colors.backgroundAlt,
    transform: [{ scale: 0.99 }],
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.button,
    backgroundColor: `${colors.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionIcon: {
    width: 24,
    height: 24,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundAlt,
  },
  optionTagText: {
    fontSize: 11,
    fontFamily: fontFamily.semiBold,
    fontWeight: '600',
    color: colors.textMuted,
  },
  optionSubtitle: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    lineHeight: 16,
  },
  optionChevron: {
    fontSize: 22,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderRadius: radius.sheet,
    padding: spacing.lg,
    ...shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fontFamily.semiBold,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseIcon: {
    width: 18,
    height: 18,
  },
  modalScroll: {
    maxHeight: 320,
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.button,
    marginBottom: 6,
  },
  tripItemActive: {
    backgroundColor: `${colors.primary}12`,
  },
  tripItemTextGroup: {
    flex: 1,
  },
  tripItemTitle: {
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tripItemTitleActive: {
    color: colors.primary,
  },
  tripItemDest: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  checkIcon: {
    width: 18,
    height: 18,
    marginLeft: spacing.sm,
  },
});
