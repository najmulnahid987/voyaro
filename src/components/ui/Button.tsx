/**
 * Voyaro UI — Button
 *
 * Variants: primary | secondary | outline | ghost | destructive | icon
 * Supports: disabled | loading | icon left/right | fullWidth
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '@/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'icon';

export interface ButtonProps {
  /** Visual variant */
  variant?: ButtonVariant;
  /** Button label — optional when variant is 'icon' */
  label?: string;
  /** Icon rendered before the label */
  leftIcon?: React.ReactNode;
  /** Icon rendered after the label */
  rightIcon?: React.ReactNode;
  /** When variant='icon', renders a single icon with no label */
  icon?: React.ReactNode;
  /** Stretch to fill parent width */
  fullWidth?: boolean;
  /** Shows spinner in place of content */
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Press animation constants
// ---------------------------------------------------------------------------
const PRESS_SCALE = 0.98;
const PRESS_OPACITY = 0.9;
const DURATION = 120;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  variant = 'primary',
  label,
  leftIcon,
  rightIcon,
  icon,
  fullWidth = false,
  loading = false,
  disabled = false,
  onPress,
  style,
  labelStyle,
  testID,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withTiming(PRESS_SCALE, { duration: DURATION });
    opacity.value = withTiming(PRESS_OPACITY, { duration: DURATION });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: DURATION });
    opacity.value = withTiming(1, { duration: DURATION });
  };

  const isDisabled = disabled || loading;
  const isIcon = variant === 'icon';

  return (
    <AnimatedPressable
      testID={testID}
      onPress={!isDisabled ? onPress : undefined}
      onPressIn={!isDisabled ? handlePressIn : undefined}
      onPressOut={!isDisabled ? handlePressOut : undefined}
      style={[
        animatedStyle,
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        isIcon && styles.iconOnly,
        isDisabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || variant === 'destructive'
              ? colors.textOnPrimary
              : colors.primary
          }
        />
      ) : isIcon ? (
        <View>{icon}</View>
      ) : (
        <>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          {label && (
            <Text
              style={[
                styles.label,
                labelStyles[variant],
                isDisabled && styles.labelDisabled,
                labelStyle,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          )}
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </>
      )}
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  base: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  iconOnly: {
    width: 52,
    paddingHorizontal: 0,
    borderRadius: radius.button,
  },

  // --- Variants ---
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.backgroundAlt,
  },
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  destructive: {
    backgroundColor: colors.destructive,
  },
  icon: {
    backgroundColor: colors.transparent,
  },

  // --- State ---
  disabled: {
    opacity: 0.45,
  },

  // --- Icon spacing ---
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },

  // --- Label (shared base) ---
  label: {
    ...typography.label,
  },
  labelDisabled: {
    opacity: 0.6,
  },
});

const labelStyles = StyleSheet.create({
  primary: { color: colors.textOnPrimary },
  secondary: { color: colors.textPrimary },
  outline: { color: colors.primary },
  ghost: { color: colors.textPrimary },
  destructive: { color: colors.textOnPrimary },
  icon: { color: colors.textPrimary },
});
