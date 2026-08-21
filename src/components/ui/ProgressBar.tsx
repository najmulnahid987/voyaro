/**
 * Voyaro UI — ProgressBar
 *
 * Supports:
 *   - progress: 0–1 (or 0–100 via percentage prop)
 *   - variant: default | success | warning | error
 *   - compact mode (thinner track)
 *   - animated fill (Reanimated width transition)
 *   - optional label above track
 */
import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '@/theme';

export type ProgressVariant = 'default' | 'success' | 'warning' | 'error';

const fillColors: Record<ProgressVariant, string> = {
  default: colors.primary,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
};

export interface ProgressBarProps {
  /**
   * Progress value: 0–1 (default) or 0–100 when `percentage` is true.
   */
  value: number;
  /** When true, treats `value` as 0–100 instead of 0–1 */
  percentage?: boolean;
  variant?: ProgressVariant;
  /** Renders a thinner 4px track instead of the default 8px */
  compact?: boolean;
  /** Label shown above the bar (e.g. "Trip completion") */
  label?: string;
  /** Rendered to the right of the bar (e.g. "72%") */
  valueLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ProgressBar({
  value,
  percentage = false,
  variant = 'default',
  compact = false,
  label,
  valueLabel,
  style,
  testID,
}: ProgressBarProps) {
  const normalised = Math.min(1, Math.max(0, percentage ? value / 100 : value));
  const fillColor = fillColors[variant];
  const trackHeight = compact ? 4 : 8;

  const widthPct = useSharedValue(0);

  useEffect(() => {
    widthPct.value = withTiming(normalised * 100, { duration: 600 });
  }, [normalised]);

  const animatedFill = useAnimatedStyle(() => ({
    width: `${widthPct.value}%`,
  }));

  return (
    <View testID={testID} style={[styles.wrapper, style]}>
      {(label || valueLabel) && (
        <View style={styles.labelRow}>
          {label && (
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
          )}
          {valueLabel && (
            <Text style={styles.valueLabel}>{valueLabel}</Text>
          )}
        </View>
      )}

      {/* Track */}
      <View
        style={[
          styles.track,
          { height: trackHeight, borderRadius: trackHeight / 2 },
        ]}
      >
        {/* Fill */}
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: fillColor, borderRadius: trackHeight / 2 },
            animatedFill,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  valueLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  track: {
    width: '100%',
    backgroundColor: colors.backgroundAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
