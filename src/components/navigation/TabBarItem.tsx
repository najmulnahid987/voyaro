import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius } from '@/theme';

export type TabKey = 'index' | 'trips' | 'expenses' | 'profile';

interface TabBarItemProps {
  tabKey: TabKey;
  label: string;
  isFocused: boolean;
  onPress: () => void;
}

const tabIcons: Record<TabKey, any> = {
  index: require('@/assets/images/tabIcons/home.png'),
  trips: require('@/assets/images/tabIcons/explore.png'),
  expenses: require('@/assets/images/icons/receipt.svg'),
  profile: require('@/assets/images/onboarding/person.svg'),
};

/**
 * TabBarItem — Individual tab destination for Voyaro floating bottom navigation.
 *
 * - Inactive: 44x44 circular hit area with icon only in secondary/muted color.
 * - Active: Pill-shaped container with subtle tonal teal background (bg-primary/10),
 *   icon + bold label in Voyaro primary teal (#2c5f5e).
 */
export function TabBarItem({
  tabKey,
  label,
  isFocused,
  onPress,
}: TabBarItemProps) {
  const iconSource = tabIcons[tabKey];

  if (isFocused) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.activeContainer,
          pressed && styles.pressed,
        ]}
        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
        accessibilityRole="tab"
        accessibilityState={{ selected: true }}
        accessibilityLabel={label}
        accessibilityHint={`Switches to ${label} tab`}
      >
        <Image
          source={iconSource}
          style={styles.activeIcon}
          tintColor={colors.primary}
          contentFit="contain"
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
        />
        <Text style={styles.activeLabel}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.inactiveContainer,
        pressed && styles.pressed,
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: false }}
      accessibilityLabel={label}
      accessibilityHint={`Switches to ${label} tab`}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Image
        source={iconSource}
        style={styles.inactiveIcon}
        tintColor={colors.textSecondary}
        contentFit="contain"
        accessibilityElementsHidden={true}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inactiveContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIcon: {
    width: 22,
    height: 22,
  },
  activeContainer: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface, // rgba(44, 95, 94, 0.10)
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeIcon: {
    width: 20,
    height: 20,
  },
  activeLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: -0.1,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
});
