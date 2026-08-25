import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, OnboardingHeader } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/theme';

interface PaceOption {
  id: string;
  title: string;
  description: string;
  unselectedIcon?: any;
}

const PACE_OPTIONS: PaceOption[] = [
  {
    id: 'relaxed',
    title: 'Relaxed',
    description: 'One or two activities a day. Focus on slow mornings and lingering dinners.',
    unselectedIcon: require('@/assets/images/onboarding/spa.svg'),
  },
  {
    id: 'balanced',
    title: 'Balanced',
    description: 'The perfect mix. See the major sites but leave room for spontaneity.',
    unselectedIcon: undefined,
  },
  {
    id: 'packed',
    title: 'Packed',
    description: 'See it all. Every hour counts. Maximizing experiences from sunrise to sunset.',
    unselectedIcon: require('@/assets/images/onboarding/bolt.svg'),
  },
];

/**
 * Route: /(auth)/onboarding/preferences
 * Onboarding Step 3 of 4: "How do you like to travel?"
 */
export default function PreferencesScreen() {
  // Default selection is 'balanced' per Google Stitch design
  const [selectedPace, setSelectedPace] = useState<string>('balanced');

  const handleContinue = () => {
    router.push('/(auth)/onboarding/ready');
  };

  const handleSkip = () => {
    router.push('/(auth)/onboarding/ready');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/onboarding/interests');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Unified Onboarding Header & Step Progress Bar */}
      <OnboardingHeader
        step={3}
        totalSteps={4}
        onBack={handleBack}
        onSkip={handleSkip}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContainer}>
          {/* Header Title Section */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>How do you like to travel?</Text>
            <Text style={styles.subtitle}>
              This helps us set the right pace for your itineraries.
            </Text>
          </View>

          {/* 3 Travel Pace Cards */}
          <View style={styles.cardsContainer}>
            {PACE_OPTIONS.map((option) => {
              const isSelected = selectedPace === option.id;

              return (
                <Pressable
                  key={option.id}
                  onPress={() => setSelectedPace(option.id)}
                  style={[
                    styles.card,
                    isSelected ? styles.cardSelected : styles.cardUnselected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${option.title}: ${option.description}`}
                >
                  {/* Subtle accent backdrop on selected */}
                  {isSelected && <View style={styles.selectedCornerAccent} />}

                  {/* Card Header Row */}
                  <View style={styles.cardHeaderRow}>
                    <Text
                      style={[
                        styles.cardTitle,
                        isSelected ? styles.cardTitleSelected : styles.cardTitleUnselected,
                      ]}
                    >
                      {option.title}
                    </Text>

                    {/* Right Indicator: Checkmark when selected, or option icon when unselected */}
                    {isSelected ? (
                      <View style={styles.checkBadge}>
                        <Image
                          source={require('@/assets/images/onboarding/check.svg')}
                          style={styles.checkIcon}
                          contentFit="contain"
                        />
                      </View>
                    ) : (
                      option.unselectedIcon && (
                        <Image
                          source={option.unselectedIcon}
                          style={styles.optionIcon}
                          contentFit="contain"
                        />
                      )
                    )}
                  </View>

                  {/* Card Description */}
                  <Text style={styles.cardDescription}>{option.description}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom CTA */}
      <View style={styles.bottomBar}>
        <Button
          variant="primary"
          label="Continue"
          rightIcon={
            <Image
              source={require('@/assets/images/onboarding/arrow-right.svg')}
              style={styles.arrowIcon}
              contentFit="contain"
            />
          }
          fullWidth
          onPress={handleContinue}
          style={styles.continueButton}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  mainContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  // --- Header ---
  headerSection: {
    marginBottom: spacing['2xl'],
  },
  title: {
    ...typography.screenTitle,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  // --- Cards ---
  cardsContainer: {
    width: '100%',
    gap: spacing.lg,
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.card,
  },
  cardUnselected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  selectedCornerAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 64,
    height: 64,
    backgroundColor: 'rgba(44, 95, 94, 0.05)',
    borderBottomLeftRadius: 64,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  cardTitleSelected: {
    color: colors.primary,
  },
  cardTitleUnselected: {
    color: colors.textPrimary,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    width: 12,
    height: 12,
  },
  optionIcon: {
    width: 22,
    height: 22,
    tintColor: colors.textSecondary,
  },
  cardDescription: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },

  // --- Bottom Action ---
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  continueButton: {
    height: 54,
  },
  arrowIcon: {
    width: 18,
    height: 18,
    tintColor: colors.textOnPrimary,
  },
});
