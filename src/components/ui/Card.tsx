/**
 * Voyaro UI — Card
 *
 * Variants: standard | elevated | interactive
 *
 * - standard:    White surface, subtle 1px border. No shadow.
 * - elevated:    White surface, card shadow (no border).
 * - interactive: Like elevated, but with press animation.
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, shadows, spacing } from '@/theme';

export type CardVariant = 'standard' | 'elevated' | 'interactive';

export interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  variant = 'standard',
  children,
  style,
  contentStyle,
  onPress,
  testID,
}: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (variant === 'interactive') {
      scale.value = withTiming(0.98, { duration: 120 });
    }
  };
  const handlePressOut = () => {
    if (variant === 'interactive') {
      scale.value = withTiming(1, { duration: 120 });
    }
  };

  const cardStyles = [
    styles.base,
    styles[variant],
    style,
  ];

  const inner = (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  if (variant === 'interactive' && onPress) {
    return (
      <AnimatedPressable
        testID={testID}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        style={[animatedStyle, ...cardStyles]}
      >
        {inner}
      </AnimatedPressable>
    );
  }

  // Non-interactive: wrap in a plain View (keeps flex behaviour predictable)
  if (onPress) {
    return (
      <Pressable testID={testID} onPress={onPress} style={cardStyles}>
        {inner}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={cardStyles}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  content: {
    padding: spacing.xl, // 20px internal padding per spec
  },

  // --- Variants ---
  standard: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    ...shadows.card,
  },
  interactive: {
    ...shadows.card,
  },
});
