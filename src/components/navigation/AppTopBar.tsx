import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, radius, shadows } from '@/theme';
import { useShellInsets, TOP_BAR_HEIGHT } from './useShellInsets';

export interface AppTopBarProps {
  onProfilePress?: () => void;
  onSearchPress?: () => void;
}

/**
 * Persistent Floating Top Navigation Bar — Voyaro Shell
 *
 * Source of truth: DESIGN.md & HTML reference
 * - Pill-shaped floating container
 * - Left: Profile icon button (40x40 circle)
 * - Center: Voyaro brand wordmark
 * - Right: Search icon button (40x40 circle)
 */
export function AppTopBar({ onProfilePress, onSearchPress }: AppTopBarProps) {
  const { topOffset } = useShellInsets();

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      router.push('/(tabs)/profile');
    }
  };

  const handleSearchPress = () => {
    if (onSearchPress) {
      onSearchPress();
    } else {
      router.push('/(tabs)/trips');
    }
  };

  return (
    <View
      style={[styles.floatingWrapper, { top: topOffset }]}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        {/* Left: Profile Action */}
        <Pressable
          onPress={handleProfilePress}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          hitSlop={8}
        >
          <Image
            source={require('@/assets/images/onboarding/person.svg')}
            style={styles.icon}
            tintColor={colors.textPrimary}
            contentFit="contain"
          />
        </Pressable>

        {/* Center: Voyaro Wordmark */}
        <Text style={styles.brandTitle} numberOfLines={1}>
          Voyaro
        </Text>

        {/* Right: Search Action */}
        <Pressable
          onPress={handleSearchPress}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Search trips"
          hitSlop={8}
        >
          <Image
            source={require('@/assets/images/icons/search.svg')}
            style={styles.icon}
            tintColor={colors.textPrimary}
            contentFit="contain"
          />
        </Pressable>
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
    height: TOP_BAR_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    ...shadows.card,
    shadowColor: '#1a1c1c',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  icon: {
    width: 20,
    height: 20,
  },
  brandTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: -0.3,
  },
});
