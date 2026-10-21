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
      accessibilityHint="Opens quick actions to add a trip, flight, hotel, activity, or expense"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={styles.circle}>
        <Image
          source={require('@/assets/images/icons/plus.svg')}
          style={styles.icon}
          tintColor={colors.textOnPrimary}
          contentFit="contain"
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
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
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.float,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 4,
  },
  icon: {
    width: 16,
    height: 16,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.93 }],
  },
});
