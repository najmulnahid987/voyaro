/**
 * Voyaro UI — IconButton
 *
 * A circular / rounded pressable that renders a single icon.
 * Convenience wrapper around Button's icon variant with defined sizes.
 */
import React from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, shadows } from '@/theme';

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
  accessibilityHint?: string;
  hitSlop?: PressableProps['hitSlop'];
}

const sizeMap: Record<IconButtonSize, number> = { sm: 32, md: 40, lg: 48 };

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
  accessibilityHint,
  hitSlop,
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
  const effectiveHitSlop =
    hitSlop ??
    (size === 'sm'
      ? { top: 6, bottom: 6, left: 6, right: 6 }
      : size === 'md'
        ? { top: 2, bottom: 2, left: 2, right: 2 }
        : undefined);

  return (
    <AnimatedPressable
      testID={testID}
      onPress={!disabled ? onPress : undefined}
      onPressIn={!disabled ? handlePressIn : undefined}
      onPressOut={!disabled ? handlePressOut : undefined}
      hitSlop={effectiveHitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
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
