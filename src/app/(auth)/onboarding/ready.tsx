import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { completeOnboarding } from '@/services/auth';

/**
 * Route: /(auth)/onboarding/ready
 * Onboarding Step 4 of 4: "Onboarding Complete / You're ready to travel."
 *
 * Visual source of truth: Google Stitch Onboarding Complete design.
 */
export default function ReadyScreen() {
  const handleCreateFirstTrip = () => {
    // 1. Complete onboarding in centralized auth service
    completeOnboarding();

    // 2. Navigate to the main authenticated Home screen
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Central Content Area */}
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Circular Flight Takeoff Badge */}
          <View style={styles.iconCircle}>
            <Image
              source={require('@/assets/images/onboarding/flight-takeoff.svg')}
              style={styles.flightIcon}
              contentFit="contain"
              accessibilityLabel="Flight Takeoff"
            />
          </View>

          {/* Text Section */}
          <View style={styles.textSection}>
            <Text style={styles.stepLabel}>ONBOARDING COMPLETE</Text>
            <Text style={styles.title}>You're ready to travel.</Text>
            <Text style={styles.subtitle}>
              Your profile is set. Let's start planning your next adventure.
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Action CTA */}
      <View style={styles.bottomBar}>
        <Button
          variant="primary"
          label="Create my first trip"
          rightIcon={
            <Image
              source={require('@/assets/images/onboarding/arrow-right.svg')}
              style={styles.arrowIcon}
              contentFit="contain"
            />
          }
          fullWidth
          onPress={handleCreateFirstTrip}
          style={styles.ctaButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 320,
    marginTop: -spacing['3xl'],
  },

  // --- Central Icon ---
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
    ...shadows.float,
  },
  flightIcon: {
    width: 32,
    height: 32,
  },

  // --- Text Section ---
  textSection: {
    alignItems: 'center',
  },
  stepLabel: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  title: {
    ...typography.screenTitle,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },

  // --- Bottom Action ---
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background,
  },
  ctaButton: {
    height: 54,
  },
  arrowIcon: {
    width: 18,
    height: 18,
    tintColor: colors.textOnPrimary,
  },
});
