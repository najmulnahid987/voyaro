import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, radius, shadows } from '@/theme';

interface AddActionButtonProps {
  onPress?: () => void;
}

/**
 * AddActionButton — Special center action button for Voyaro bottom navigation.
 *
 * Visually prominent button in Voyaro primary teal with a crisp white plus icon.
 * Triggers the full-screen modal Quick Add flow (/add) without resetting tab state.
 */
export function AddActionButton({ onPress }: AddActionButtonProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/add');
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Quick Add"
      hitSlop={6}
    >
      <View style={styles.circle}>
        <Image
          source={require('@/assets/images/icons/plus.svg')}
          style={styles.icon}
          tintColor={colors.textOnPrimary}
          contentFit="contain"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.float,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: {
    width: 20,
    height: 20,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.93 }],
  },
});
