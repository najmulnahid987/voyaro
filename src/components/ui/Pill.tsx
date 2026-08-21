/**
 * Voyaro UI — Pill & Badge
 *
 * Pill — larger, often selectable tag (category filters, trip types)
 * Badge — smaller, status-only indicator (inline within cards / headers)
 *
 * Variants: default | selected | success | warning | error | ai
 */
import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

// ---------------------------------------------------------------------------
// Shared variant config
// ---------------------------------------------------------------------------
type PillVariant = 'default' | 'selected' | 'success' | 'warning' | 'error' | 'ai';

interface VariantStyle {
  container: ViewStyle;
  text: { color: string };
}

const variantMap: Record<PillVariant, VariantStyle> = {
  default: {
    container: {
      backgroundColor: colors.backgroundAlt,
      borderWidth: 0,
    },
    text: { color: colors.textSecondary },
  },
  selected: {
    container: {
      backgroundColor: colors.transparent,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    text: { color: colors.primary },
  },
  success: {
    container: {
      backgroundColor: colors.primarySurface,
      borderWidth: 0,
    },
    text: { color: colors.success },
  },
  warning: {
    container: {
      backgroundColor: 'rgba(176, 74, 74, 0.10)',
      borderWidth: 0,
    },
    text: { color: colors.warning },
  },
  error: {
    container: {
      backgroundColor: 'rgba(176, 74, 74, 0.10)',
      borderWidth: 0,
    },
    text: { color: colors.error },
  },
  ai: {
    container: {
      backgroundColor: colors.primarySurface,
      borderWidth: 0,
    },
    text: { color: colors.primary },
  },
};

// ---------------------------------------------------------------------------
// Pill
// ---------------------------------------------------------------------------
export interface PillProps {
  label: string;
  variant?: PillVariant;
  /** Prefix icon (e.g. spark icon for AI pills) */
  icon?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Pill({
  label,
  variant = 'default',
  icon,
  onPress,
  style,
  testID,
}: PillProps) {
  const v = variantMap[variant];

  const content = (
    <>
      {icon && <View style={pillStyles.icon}>{icon}</View>}
      <Text style={[pillStyles.label, v.text]} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          pillStyles.base,
          v.container,
          pressed && pillStyles.pressed,
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={[pillStyles.base, v.container, style]}>
      {content}
    </View>
  );
}

const pillStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.caption,
    fontWeight: '500',
  },
  icon: {
    marginRight: spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
});

// ---------------------------------------------------------------------------
// Badge — compact status indicator
// ---------------------------------------------------------------------------
export interface BadgeProps {
  label: string;
  variant?: PillVariant;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Badge({ label, variant = 'default', icon, style, testID }: BadgeProps) {
  const v = variantMap[variant];

  return (
    <View testID={testID} style={[badgeStyles.base, v.container, style]}>
      {icon && <View style={badgeStyles.icon}>{icon}</View>}
      <Text style={[badgeStyles.label, v.text]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
    letterSpacing: 0.1,
  },
  icon: {
    marginRight: 3,
  },
});
