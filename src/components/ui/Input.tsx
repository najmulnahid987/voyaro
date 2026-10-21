/**
 * Voyaro UI — Input
 *
 * Supports: label | placeholder | error | helperText
 *           leftIcon | rightIcon | focused state
 */
import React, { useRef, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  testID,
  onFocus,
  onBlur,
  ...textInputProps
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleFocus = (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setFocused(false);
    onBlur?.(e);
  };

  const hasError = Boolean(error);

  return (
    <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
      <View style={containerStyle}>
        {/* Label */}
        {Boolean(label) ? (
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        ) : null}

        {/* Input row */}
        <View
          style={[
            styles.inputContainer,
            focused && styles.inputFocused,
            hasError && styles.inputError,
          ]}
        >
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}

          <TextInput
            ref={inputRef}
            testID={testID}
            style={[
              styles.input,
              leftIcon ? styles.inputWithLeft : null,
              rightIcon ? styles.inputWithRight : null,
            ]}
            placeholderTextColor={colors.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            accessibilityLabel={label || textInputProps.placeholder}
            aria-invalid={hasError}
            accessibilityHint={hasError && error ? `Error: ${error}` : textInputProps.accessibilityHint}
            {...textInputProps}
          />

          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>

        {/* Helper / Error text */}
        {Boolean(error || helperText) ? (
          <Text
            style={[styles.helperText, hasError && styles.errorText]}
            numberOfLines={2}
            accessibilityRole={hasError ? 'alert' : undefined}
            accessibilityLiveRegion={hasError ? 'polite' : undefined}
          >
            {error ?? helperText}
          </Text>
        ) : null}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  inputContainer: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  inputFocused: {
    borderColor: colors.borderFocused,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },

  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    // Remove default text input padding on Android
    paddingVertical: 0,
  },
  inputWithLeft: {
    paddingLeft: spacing.xs,
  },
  inputWithRight: {
    paddingRight: spacing.xs,
  },

  iconLeft: {
    paddingLeft: spacing.md,
  },
  iconRight: {
    paddingRight: spacing.md,
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
