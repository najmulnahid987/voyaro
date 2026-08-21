/**
 * Voyaro UI — SectionHeader
 *
 * Standard section header row used across every screen.
 *
 * Layout:
 *   [Title]               [optional action label / icon]
 *   [optional subtitle]
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
import { colors, spacing, typography } from '@/theme';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Text of the right-side action (e.g. "See all") */
  actionLabel?: string;
  /** Icon to render instead of or alongside actionLabel */
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  actionIcon,
  onAction,
  style,
  testID,
}: SectionHeaderProps) {
  const hasAction = Boolean(actionLabel || actionIcon);

  return (
    <View testID={testID} style={[styles.container, style]}>
      {/* Left: title + subtitle */}
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right: optional action */}
      {hasAction && (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel ?? 'Section action'}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          {actionLabel && (
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          )}
          {actionIcon && <View style={styles.actionIcon}>{actionIcon}</View>}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionPressed: {
    opacity: 0.6,
  },
  actionLabel: {
    ...typography.label,
    color: colors.primary,
  },
  actionIcon: {
    // icon rendered as-is
  },
});
