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

interface InterestCategory {
  id: string;
  label: string;
  icon: any;
}

const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    id: 'food',
    label: 'Food',
    icon: require('@/assets/images/onboarding/restaurant.svg'),
  },
  {
    id: 'culture',
    label: 'Culture',
    icon: require('@/assets/images/onboarding/museum.svg'),
  },
  {
    id: 'nature',
    label: 'Nature',
    icon: require('@/assets/images/onboarding/forest.svg'),
  },
  {
    id: 'adventure',
    label: 'Adventure',
    icon: require('@/assets/images/onboarding/hiking.svg'),
  },
  {
    id: 'relaxation',
    label: 'Relaxation',
    icon: require('@/assets/images/onboarding/spa.svg'),
  },
  {
    id: 'shopping',
    label: 'Shopping',
    icon: require('@/assets/images/onboarding/shopping.svg'),
  },
  {
    id: 'nightlife',
    label: 'Nightlife',
    icon: require('@/assets/images/onboarding/nightlife.svg'),
  },
];

/**
 * Route: /(auth)/onboarding/interests
 * Onboarding Step 2 of 4: "What do you care about most?"
 */
export default function InterestsScreen() {
  // Multi-selection state (defaults to Food and Culture per Stitch design)
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['food', 'culture']);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    router.push('/(auth)/onboarding/preferences');
  };

  const handleSkip = () => {
    router.push('/(auth)/onboarding/preferences');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/onboarding/travel-style');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Unified Onboarding Header & Step Progress Bar */}
      <OnboardingHeader
        step={2}
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
          {/* Title & Description */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>What do you care about most?</Text>
            <Text style={styles.subtitle}>
              Select as many as you like to help us personalize your itinerary.
            </Text>
          </View>

          {/* Cards Grid */}
          <View style={styles.gridContainer}>
            {/* Top 6 categories in 2x3 grid */}
            <View style={styles.gridRow}>
              {INTEREST_CATEGORIES.slice(0, 6).map((item) => {
                const isSelected = selectedInterests.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleInterest(item.id)}
                    style={[
                      styles.card,
                      styles.halfCard,
                      isSelected ? styles.cardSelected : styles.cardUnselected,
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={item.label}
                  >
                    {/* Checkmark Badge */}
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Image
                          source={require('@/assets/images/onboarding/check.svg')}
                          style={styles.checkIcon}
                          contentFit="contain"
                        />
                      </View>
                    )}

                    {/* Icon */}
                    <View style={styles.iconWrapper}>
                      <Image
                        source={item.icon}
                        style={[
                          styles.optionIcon,
                          { tintColor: isSelected ? colors.primary : colors.textSecondary },
                        ]}
                        contentFit="contain"
                      />
                    </View>

                    {/* Label */}
                    <Text
                      style={[
                        styles.cardLabel,
                        isSelected && styles.cardLabelSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 7th category spanning full width (Nightlife) */}
            {INTEREST_CATEGORIES.slice(6).map((item) => {
              const isSelected = selectedInterests.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleInterest(item.id)}
                  style={[
                    styles.card,
                    styles.fullCard,
                    isSelected ? styles.cardSelected : styles.cardUnselected,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={item.label}
                >
                  {/* Checkmark Badge */}
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Image
                        source={require('@/assets/images/onboarding/check.svg')}
                        style={styles.checkIcon}
                        contentFit="contain"
                      />
                    </View>
                  )}

                  {/* Icon */}
                  <View style={styles.iconWrapper}>
                    <Image
                      source={item.icon}
                      style={[
                        styles.optionIcon,
                        { tintColor: isSelected ? colors.primary : colors.textSecondary },
                      ]}
                      contentFit="contain"
                    />
                  </View>

                  {/* Label */}
                  <Text
                    style={[
                      styles.cardLabel,
                      isSelected && styles.cardLabelSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
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
    paddingTop: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  mainContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  // --- Title ---
  titleSection: {
    marginBottom: spacing.lg,
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

  // --- Grid ---
  gridContainer: {
    width: '100%',
    gap: spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    position: 'relative',
    ...shadows.card,
  },
  halfCard: {
    width: '47.5%',
    minHeight: 110,
  },
  fullCard: {
    width: '100%',
    minHeight: 100,
  },
  cardUnselected: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(44, 95, 94, 0.04)',
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    width: 10,
    height: 10,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  optionIcon: {
    width: 32,
    height: 32,
  },
  cardLabel: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cardLabelSelected: {
    fontWeight: '600',
    color: colors.primary,
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
