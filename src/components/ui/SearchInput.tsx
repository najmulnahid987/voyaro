/**
 * Voyaro UI — SearchInput
 *
 * A purpose-built search field with a leading search icon and optional
 * clear button. Composes Input internally.
 *
 * Intentionally kept separate from Input to avoid prop-pollution.
 */
import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

// Simple inline SVG-style icon using View shapes (avoids external icon deps)
function SearchIcon() {
  return (
    <View style={searchIconStyles.wrapper} pointerEvents="none">
      <View style={searchIconStyles.circle} />
      <View style={searchIconStyles.handle} />
    </View>
  );
}

function ClearIcon() {
  return (
    <View style={clearIconStyles.wrapper} pointerEvents="none">
      <View style={[clearIconStyles.line, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[clearIconStyles.line, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

export interface SearchInputProps extends Omit<TextInputProps, 'style'> {
  containerStyle?: StyleProp<ViewStyle>;
  /** Called when the user taps the × clear button */
  onClear?: () => void;
  testID?: string;
}

export function SearchInput({
  value,
  containerStyle,
  onClear,
  onChangeText,
  testID,
  ...rest
}: SearchInputProps) {
  const [focused, setFocused] = useState(false);

  const handleClear = () => {
    onChangeText?.('');
    onClear?.();
  };

  return (
    <View
      style={[
        styles.container,
        focused && styles.containerFocused,
        containerStyle,
      ]}
    >
      <View style={styles.searchIcon}>
        <SearchIcon />
      </View>

      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        clearButtonMode="never" // we handle this manually
        accessibilityRole="search"
        {...rest}
      />

      {Boolean(value) && (
        <Pressable
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={8}
          accessibilityLabel="Clear search"
        >
          <ClearIcon />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.transparent,
    overflow: 'hidden',
  },
  containerFocused: {
    borderColor: colors.borderFocused,
    backgroundColor: colors.surface,
  },
  searchIcon: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Inline icon geometry
const searchIconStyles = StyleSheet.create({
  wrapper: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  circle: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 1.75,
    borderColor: colors.textMuted,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  handle: {
    width: 1.75,
    height: 6,
    backgroundColor: colors.textMuted,
    borderRadius: 1,
    position: 'absolute',
    bottom: 0,
    right: 1,
    transform: [{ rotate: '-45deg' }],
  },
});

const clearIconStyles = StyleSheet.create({
  wrapper: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    width: 12,
    height: 1.75,
    backgroundColor: colors.textMuted,
    borderRadius: 1,
  },
});
