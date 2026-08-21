/**
 * Voyaro UI — Divider
 *
 * A horizontal (or vertical) separator line.
 * Supports an optional centred label (e.g. "or", "Today").
 */
import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, spacing, typography } from '@/theme';

export interface DividerProps {
  /** Optional label centred in the divider */
  label?: string;
  /** Direction — defaults to 'horizontal' */
  orientation?: 'horizontal' | 'vertical';
  /** Override line color */
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Divider({
  label,
  orientation = 'horizontal',
  color = colors.border,
  style,
  testID,
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <View
        testID={testID}
        style={[styles.vertical, { backgroundColor: color }, style]}
      />
    );
  }

  if (label) {
    return (
      <View testID={testID} style={[styles.row, style]}>
        <View style={[styles.line, { backgroundColor: color }]} />
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.line, { backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[styles.horizontal, { backgroundColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    width: '100%',
    height: 1,
  },
  vertical: {
    height: '100%',
    width: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 0,
  },
});
