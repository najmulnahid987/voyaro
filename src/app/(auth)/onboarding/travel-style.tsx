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

interface TravelStyleOption {
  id: string;
  label: string;
  icon: any;
}

const TRAVEL_STYLES: TravelStyleOption[] = [
  {
    id: 'solo',
    label: 'Solo',
    icon: require('@/assets/images/onboarding/person.svg'),
  },
  {
    id: 'couple',
    label: 'Couple',
    icon: require('@/assets/images/onboarding/heart.svg'),
  },
  {
    id: 'family',
    label: 'Family',
    icon: require('@/assets/images/onboarding/family.svg'),
  },
  {
    id: 'friends',
    label: 'Friends',
    icon: require('@/assets/images/onboarding/groups.svg'),
  },
  {
    id: 'business',
    label: 'Business',
    icon: require('@/assets/images/onboarding/briefcase.svg'),
  },
];

/**
 * Route: /(auth)/onboarding/travel-style
 * Onboarding Step 1 of 4: "What kind of traveler are you?"
 */
export default function TravelStyleScreen() {
  const [selectedStyle, setSelectedStyle] = useState<string>('solo');

  const handleNext = () => {
    if (!selectedStyle) return;
    router.push('/(auth)/onboarding/interests');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/signup');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Unified Onboarding Header & Step Progress Bar */}
      <OnboardingHeader
        step={1}
        totalSteps={4}
        onBack={handleBack}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContainer}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>What kind of traveler are you?</Text>
            <Text style={styles.subtitle}>
              We tailor your recommendations based on who you're exploring the world with.
            </Text>
          </View>

          {/* Cards Grid */}
          <View style={styles.gridContainer}>
            {/* Top 4 cards in 2x2 grid */}
            <View style={styles.gridRow}>
              {TRAVEL_STYLES.slice(0, 4).map((option) => {
                const isSelected = selectedStyle === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setSelectedStyle(option.id)}
                    style={[
                      styles.card,
                      styles.halfCard,
                      isSelected ? styles.cardSelected : styles.cardUnselected,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={option.label}
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
                        source={option.icon}
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
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Bottom 5th card spanning full width (Business) */}
            {TRAVEL_STYLES.slice(4).map((option) => {
              const isSelected = selectedStyle === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setSelectedStyle(option.id)}
                  style={[
                    styles.card,
                    styles.fullCard,
                    isSelected ? styles.cardSelected : styles.cardUnselected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={option.label}
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
                      source={option.icon}
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
                    {option.label}
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
          label="Next Step"
          disabled={!selectedStyle}
          rightIcon={
            <Image
              source={require('@/assets/images/onboarding/arrow-right.svg')}
              style={styles.arrowIcon}
              contentFit="contain"
            />
          }
          fullWidth
          onPress={handleNext}
          style={styles.nextButton}
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

  // --- Header ---
  headerSection: {
    marginBottom: spacing['2xl'],
  },
  title: {
    ...typography.screenTitle,
    fontSize: 26,
    lineHeight: 34,
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
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    position: 'relative',
    ...shadows.card,
  },
  halfCard: {
    width: '47.5%',
    minHeight: 140,
  },
  fullCard: {
    width: '100%',
    minHeight: 130,
  },
  cardUnselected: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    width: 12,
    height: 12,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  optionIcon: {
    width: 44,
    height: 44,
  },
  cardLabel: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cardLabelSelected: {
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // --- Bottom Action ---
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  nextButton: {
    height: 54,
  },
  arrowIcon: {
    width: 18,
    height: 18,
    tintColor: colors.textOnPrimary,
  },
});
