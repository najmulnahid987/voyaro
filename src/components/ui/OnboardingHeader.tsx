import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { IconButton } from '@/components/ui/IconButton';
import { colors, spacing, typography } from '@/theme';

export interface OnboardingHeaderProps {
  /** Current step number (e.g. 1, 2, 3, 4) */
  step: number;
  /** Total step count (default: 4) */
  totalSteps?: number;
  /** Back navigation handler */
  onBack: () => void;
  /** Optional skip button handler */
  onSkip?: () => void;
}

/**
 * Voyaro UI — OnboardingHeader
 *
 * Unified header & step progress bar for all onboarding screens.
 * Ensures identical visual rhythm, alignment, and progress indicator across steps.
 */
export function OnboardingHeader({
  step,
  totalSteps = 4,
  onBack,
  onSkip,
}: OnboardingHeaderProps) {
  const progressPercentage = Math.min(100, Math.max(0, (step / totalSteps) * 100));

  return (
    <View style={styles.topSection}>
      <View style={styles.topRow}>
        {/* Back Button */}
        <IconButton
          variant="ghost"
          size="sm"
          onPress={onBack}
          icon={
            <Image
              source={require('@/assets/images/arrow-left.svg')}
              style={styles.navIcon}
              contentFit="contain"
            />
          }
          accessibilityLabel="Go back"
        />

        {/* Step Label */}
        <Text style={styles.stepLabel}>
          STEP {step} OF {totalSteps}
        </Text>

        {/* Skip action or balancing spacer */}
        {onSkip ? (
          <Pressable
            onPress={onSkip}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip"
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Progress Track */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navIcon: {
    width: 20,
    height: 20,
  },
  stepLabel: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  skipButtonText: {
    ...typography.label,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    minWidth: 36,
    textAlign: 'right',
  },
  placeholder: {
    width: 36,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
