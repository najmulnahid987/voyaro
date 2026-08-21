/**
 * Voyaro UI — Badge
 *
 * A compact, non-interactive status label.
 * Extracted from Pill.tsx as its own standalone file so screens can import
 * Badge independently without pulling in Pill's Pressable logic.
 *
 * Variants: default | selected | success | warning | error | ai
 */
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export type BadgeVariant = 'default' | 'selected' | 'success' | 'warning' | 'error' | 'ai';

interface VariantTokens {
  bg: string;
  text: string;
  borderColor?: string;
  borderWidth?: number;
}

const variantTokens: Record<BadgeVariant, VariantTokens> = {
  default: {
    bg: colors.backgroundAlt,
    text: colors.textSecondary,
  },
  selected: {
    bg: colors.transparent,
    text: colors.primary,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  success: {
    bg: colors.primarySurface,
    text: colors.success,
  },
  warning: {
    bg: 'rgba(176, 74, 74, 0.10)',
    text: colors.warning,
  },
  error: {
    bg: 'rgba(176, 74, 74, 0.10)',
    text: colors.error,
  },
  ai: {
    bg: colors.primarySurface,
    text: colors.primary,
  },
};

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  /** Optional leading icon element (e.g. spark icon for AI badge) */
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Badge({
  label,
  variant = 'default',
  icon,
  style,
  testID,
}: BadgeProps) {
  const tokens = variantTokens[variant];

  return (
    <View
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: tokens.bg,
          borderColor: tokens.borderColor ?? 'transparent',
          borderWidth: tokens.borderWidth ?? 0,
        },
        style,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.label, { color: tokens.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
