/**
 * Voyaro UI — Select
 *
 * A styled select / dropdown trigger row.
 * Does NOT open a picker itself — it emits onPress so the screen
 * can open a bottom sheet, ActionSheet, or Picker as appropriate.
 *
 * Supports: label | placeholder | value | error | helperText
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

// Inline chevron-down icon
function ChevronDown({ color = colors.textMuted }: { color?: string }) {
  return (
    <View style={chevronStyles.wrapper}>
      <View style={[chevronStyles.left, { backgroundColor: color }]} />
      <View style={[chevronStyles.right, { backgroundColor: color }]} />
    </View>
  );
}

export interface SelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  onPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Select({
  label,
  placeholder = 'Select…',
  value,
  error,
  helperText,
  disabled = false,
  onPress,
  containerStyle,
  testID,
}: SelectProps) {
  const hasError = Boolean(error);
  const hasValue = Boolean(value);

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        testID={testID}
        onPress={!disabled ? onPress : undefined}
        accessibilityRole="combobox"
        accessibilityState={{ disabled, expanded: false }}
        style={[
          styles.trigger,
          hasError && styles.triggerError,
          disabled && styles.triggerDisabled,
        ]}
      >
        <Text
          style={[styles.value, !hasValue && styles.placeholder]}
          numberOfLines={1}
        >
          {hasValue ? value : placeholder}
        </Text>
        <ChevronDown color={disabled ? colors.textMuted : colors.textSecondary} />
      </Pressable>

      {(error || helperText) && (
        <Text style={[styles.helperText, hasError && styles.errorText]}>
          {error ?? helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  trigger: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  triggerError: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  value: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.textMuted,
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  errorText: {
    color: colors.error,
  },
});

const chevronStyles = StyleSheet.create({
  wrapper: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    position: 'relative',
  },
  left: {
    position: 'absolute',
    width: 8,
    height: 1.75,
    borderRadius: 1,
    right: 8,
    transform: [{ rotate: '45deg' }],
  },
  right: {
    position: 'absolute',
    width: 8,
    height: 1.75,
    borderRadius: 1,
    left: 8,
    transform: [{ rotate: '-45deg' }],
  },
});
