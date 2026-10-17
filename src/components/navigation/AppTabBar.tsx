import React, { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs, router, useGlobalSearchParams, usePathname } from 'expo-router';
import { colors, radius, shadows } from '@/theme';
import { useShellInsets, BOTTOM_BAR_HEIGHT } from './useShellInsets';
import { TabBarItem, TabKey } from './TabBarItem';
import { AddActionButton } from './AddActionButton';

import { getActiveTripId, getCachedTrips } from '@/services/trip';

export type AppTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const tabLabelMap: Record<string, string> = {
  index: 'Home',
  trips: 'Trips',
  expenses: 'Expenses',
  profile: 'Profile',
};

/**
 * Persistent Floating Bottom Navigation Bar — Voyaro Shell
 *
 * Source of truth: DESIGN.md & HTML reference
 * - Floating pill container with white surface and subtle border
 * - 5 slots: Home · Trips · [+] · Expenses · Profile
 * - Inactive: icon only
 * - Active: tonal teal pill (bg-primary/10) with icon + label
 * - Center: prominent primary teal circle with plus icon (triggers /add)
 * - Preserves nested navigation states when switching between tabs
 */
export function AppTabBar({ state, descriptors, navigation }: AppTabBarProps) {
  const { bottomOffset } = useShellInsets();
  const globalParams = useGlobalSearchParams<{ tripId?: string }>();
  const pathname = usePathname();

  const handleTabPress = (route: { key: string; name: string }, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const handleAddPress = () => {
    let activeTripId = globalParams?.tripId;
    if (!activeTripId && pathname) {
      const match = pathname.match(/\/trips\/([^/?#]+)/);
      if (match && match[1] && match[1] !== 'create') {
        activeTripId = match[1];
      }
    }
    if (!activeTripId) {
      activeTripId = getActiveTripId() || undefined;
    }
    if (!activeTripId) {
      const cached = getCachedTrips();
      if (cached && cached.length > 0) {
        const ongoing = cached.find((t) => t.status === 'ongoing' || t.status === 'current');
        const upcoming = cached.find((t) => t.status === 'upcoming');
        activeTripId = ongoing?.id || upcoming?.id || cached[0].id;
      }
    }

    if (activeTripId) {
      router.push({
        pathname: '/add',
        params: { tripId: activeTripId },
      });
    } else {
      router.push('/add');
    }
  };

  return (
    <View
      style={[styles.floatingWrapper, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          // Slot 2: The center Add button
          if (route.name === 'add-placeholder') {
            return (
              <AddActionButton
                key={route.key}
                onPress={handleAddPress}
              />
            );
          }

          const isFocused = state.index === index;
          const label =
            descriptors[route.key]?.options?.title ??
            tabLabelMap[route.name] ??
            route.name;

          return (
            <TabBarItem
              key={route.key}
              tabKey={route.name as TabKey}
              label={label}
              isFocused={isFocused}
              onPress={() => handleTabPress(route, isFocused)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 50,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 448, // matches max-w-md from HTML reference
    height: BOTTOM_BAR_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    ...shadows.card,
    shadowColor: '#1a1c1c',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
});
