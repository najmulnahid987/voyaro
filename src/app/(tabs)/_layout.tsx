import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '@/theme';
import { AppTopBar, AppTabBar } from '@/components/navigation';

/**
 * Persistent Shell Tabs Layout — Voyaro
 *
 * Source of truth: DESIGN.md & Phase 4 Navigation Refinement specs
 *
 * Architecture:
 * - Persistent floating Top Header (AppTopBar)
 * - Persistent floating Bottom Navigation (AppTabBar)
 * - Tabs Navigator: Home · Trips · [Add] · Expenses · Profile
 *
 * Screen content scrolls underneath the floating navigation shell.
 * Tab states (including nested stacks like Trips -> [tripId]) are preserved.
 */
export default function TabsLayout() {
  return (
    <View style={styles.shell}>
      <AppTopBar />
      <Tabs
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
        }}
      >
        {/* ── Home ─────────────────────────────────────────────────────────── */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
          }}
        />

        {/* ── Trips ────────────────────────────────────────────────────────── */}
        <Tabs.Screen
          name="trips"
          options={{
            title: 'Trips',
          }}
        />

        {/* ── Add (centre Action trigger) ──────────────────────────────────── */}
        <Tabs.Screen
          name="add-placeholder"
          options={{
            title: 'Add',
          }}
        />

        {/* ── Expenses ─────────────────────────────────────────────────────── */}
        <Tabs.Screen
          name="expenses"
          options={{
            title: 'Expenses',
          }}
        />

        {/* ── Profile ──────────────────────────────────────────────────────── */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
  },
});
