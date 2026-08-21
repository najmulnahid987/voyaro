/**
 * Voyaro UI — IconButton
 *
 * A circular / rounded pressable that renders a single icon.
 * Convenience wrapper around Button's icon variant with defined sizes.
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, shadows } from '@/theme';

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonVariant = 'default' | 'filled' | 'outline' | 'ghost';

export interface IconButtonProps {
  /** The icon element to render (e.g. <SymbolView /> or any ReactNode) */
  icon: React.ReactNode;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

const sizeMap: Record<IconButtonSize, number> = { sm: 36, md: 44, lg: 52 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function IconButton({
  icon,
  size = 'md',
  variant = 'default',
  disabled = false,
  onPress,
  style,
  testID,
  accessibilityLabel,
}: IconButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.92, { duration: 100 });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const dim = sizeMap[size];

  return (
    <AnimatedPressable
      testID={testID}
      onPress={!disabled ? onPress : undefined}
      onPressIn={!disabled ? handlePressIn : undefined}
      onPressOut={!disabled ? handlePressOut : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[
        animatedStyle,
        styles.base,
        { width: dim, height: dim, borderRadius: dim / 2 },
        styles[variant],
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  default: {
    backgroundColor: colors.backgroundAlt,
  },
  filled: {
    backgroundColor: colors.primary,
    ...shadows.float,
  },
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  disabled: {
    opacity: 0.45,
  },
});
