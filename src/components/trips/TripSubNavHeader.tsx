/**
 * Voyaro Trip Sub-Navigation Header
 *
 * Persistent sub-navigation header for trip detail screens:
 *   - Overview (/(tabs)/trips/[tripId])
 *   - Itinerary (/(tabs)/trips/[tripId]/itinerary)
 *   - Map (/(tabs)/trips/[tripId]/map)
 *   - Expenses (/(tabs)/trips/[tripId]/expenses)
 *   - Documents (/(tabs)/trips/[tripId]/documents)
 *
 * Visual Source of Truth: Google Stitch trip itinerary & overview design.
 * Features:
 *   - Circular back button (←) returning to My Trips
 *   - Circular primary action button (+) for adding items contextually
 *   - Editorial serif trip title
 *   - Horizontal scrollable pill navigation tabs with active capsule highlight
 */

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
import { router, usePathname } from 'expo-router';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { getTripById } from '@/services/mockData';

export type TripSubNavTabKey =
  | 'overview'
  | 'itinerary'
  | 'map'
  | 'expenses'
  | 'documents';

export interface TripTabItem {
  key: TripSubNavTabKey;
  label: string;
  route: (tripId: string) => string;
}

export const TRIP_SUB_TABS: TripTabItem[] = [
  { key: 'overview', label: 'Overview', route: (id) => `/(tabs)/trips/${id}` },
  { key: 'itinerary', label: 'Itinerary', route: (id) => `/(tabs)/trips/${id}/itinerary` },
  { key: 'map', label: 'Map', route: (id) => `/(tabs)/trips/${id}/map` },
  { key: 'expenses', label: 'Expenses', route: (id) => `/(tabs)/trips/${id}/expenses` },
  { key: 'documents', label: 'Documents', route: (id) => `/(tabs)/trips/${id}/documents` },
];

export interface TripSubNavHeaderProps {
  /**
   * Active trip ID (e.g. 'japan-adventure')
   */
  tripId: string;
  /**
   * Optional manual active tab override. If not supplied, automatically resolves from current pathname.
   */
  activeTab?: TripSubNavTabKey;
  /**
   * Optional manual title override. If not supplied, resolves from mock trip data.
   */
  title?: string;
  /**
   * Optional custom back action
   */
  onBack?: () => void;
  /**
   * Optional custom add action
   */
  onAdd?: () => void;
  /**
   * Optional custom tab press callback
   */
  onTabPress?: (tabKey: TripSubNavTabKey) => void;
}

export function TripSubNavHeader({
  tripId,
  activeTab: propActiveTab,
  title: propTitle,
  onBack,
  onAdd,
  onTabPress,
}: TripSubNavHeaderProps) {
  const pathname = usePathname();
  const effectiveTripId = tripId || 'japan-adventure';

  // 1. Resolve trip data for title
  const trip = useMemo(() => {
    return getTripById(effectiveTripId) || getTripById('japan-adventure')!;
  }, [effectiveTripId]);

  const displayTitle = propTitle || trip?.title || 'Trip Details';

  // 2. Resolve active tab automatically from route if not provided
  const currentTab: TripSubNavTabKey = useMemo(() => {
    if (propActiveTab) return propActiveTab;
    if (pathname.includes('/itinerary')) return 'itinerary';
    if (pathname.includes('/expenses')) return 'expenses';
    if (pathname.includes('/map')) return 'map';
    if (pathname.includes('/documents')) return 'documents';
    return 'overview';
  }, [propActiveTab, pathname]);

  // 3. Navigation handlers
  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/trips');
    }
  };

  const handleAddPress = () => {
    if (onAdd) {
      onAdd();
      return;
    }
    // Context-aware add trigger based on active tab
    if (currentTab === 'expenses') {
      router.push({
        pathname: '/add/expense',
        params: { tripId: effectiveTripId },
      });
    } else {
      router.push({
        pathname: '/add',
        params: { tripId: effectiveTripId },
      });
    }
  };

  const handleTabPress = (tabItem: TripTabItem) => {
    if (onTabPress) {
      onTabPress(tabItem.key);
      return;
    }
    if (tabItem.key === currentTab) return;

    // Use router.replace to avoid infinite stack history when hopping between sibling tabs
    const target = tabItem.route(effectiveTripId);
    router.replace(target as any);
  };

  return (
    <View style={styles.container}>
      {/* ── 1. Top Bar: Back & Add Action Buttons ───────────────────────── */}
      <View style={styles.topBarRow}>
        <Pressable
          onPress={handleBackPress}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back to trips"
          hitSlop={8}
        >
          <Text style={styles.backArrowText}>←</Text>
        </Pressable>

        <Pressable
          onPress={handleAddPress}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add trip reservation or item"
          hitSlop={8}
        >
          <Image
            source={require('@/assets/images/icons/plus.svg')}
            style={styles.plusIcon}
            tintColor={colors.textOnPrimary}
            contentFit="contain"
          />
        </Pressable>
      </View>

      {/* ── 2. Trip Editorial Title ─────────────────────────────────────── */}
      <Text style={styles.tripTitle} numberOfLines={2}>
        {displayTitle}
      </Text>

      {/* ── 3. Horizontal Sub-Navigation Pill Tabs ─────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScrollContent}
        style={styles.tabsScrollView}
      >
        {TRIP_SUB_TABS.map((tab) => {
          const isActive = tab.key === currentTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => handleTabPress(tab)}
              style={({ pressed }) => [
                styles.tabButton,
                isActive && styles.tabButtonActive,
                pressed && !isActive && styles.tabButtonPressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label} tab`}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  isActive && styles.tabButtonTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...shadows.card,
  },
  backArrowText: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '500',
    marginTop: -2,
  },
  addButton: {
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
    transform: [{ scale: 0.94 }],
  },
  tripTitle: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      web: 'Georgia, serif',
      default: 'serif',
    }),
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.28,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  tabsScrollView: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  tabsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  tabButton: {
    paddingVertical: 7,
    paddingHorizontal: 15,
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
});
