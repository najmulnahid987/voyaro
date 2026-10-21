/**
 * Route: /(tabs)/profile/preferences — Travel Preferences Screen
 *
 * Configures traveler style, preferred pace, and interest tags.
 * Integrates with persistent navigation shell using useShellInsets.
 */

import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Button } from '@/components/ui';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { useAuth } from '@/services/AuthContext';
import { TravelStyle, TravelPace } from '@/services/profile';
import { useShellInsets } from '@/components/navigation';

interface StyleOption {
  id: TravelStyle;
  label: string;
  icon: any;
}

const TRAVEL_STYLES: StyleOption[] = [
  { id: 'solo', label: 'Solo', icon: require('@/assets/images/onboarding/person.svg') },
  { id: 'couple', label: 'Couple', icon: require('@/assets/images/onboarding/heart.svg') },
  { id: 'family', label: 'Family', icon: require('@/assets/images/onboarding/family.svg') },
  { id: 'friends', label: 'Friends', icon: require('@/assets/images/onboarding/groups.svg') },
  { id: 'business', label: 'Business', icon: require('@/assets/images/onboarding/briefcase.svg') },
];

interface PaceOption {
  id: TravelPace;
  title: string;
  desc: string;
}

const PACE_OPTIONS: PaceOption[] = [
  { id: 'relaxed', title: 'Relaxed', desc: '1–2 activities per day, slow mornings' },
  { id: 'balanced', title: 'Balanced', desc: 'Even mix of highlights and free time' },
  { id: 'packed', title: 'Packed', desc: 'Every hour planned, sunrise to sunset' },
];

interface InterestOption {
  id: string;
  label: string;
  icon: any;
}

const INTEREST_OPTIONS: InterestOption[] = [
  { id: 'food', label: 'Food & Dining', icon: require('@/assets/images/onboarding/restaurant.svg') },
  { id: 'culture', label: 'Art & Culture', icon: require('@/assets/images/onboarding/museum.svg') },
  { id: 'nature', label: 'Nature & Parks', icon: require('@/assets/images/onboarding/forest.svg') },
  { id: 'adventure', label: 'Outdoor Adventure', icon: require('@/assets/images/onboarding/hiking.svg') },
  { id: 'relaxation', label: 'Spa & Wellness', icon: require('@/assets/images/onboarding/spa.svg') },
  { id: 'shopping', label: 'Shopping', icon: require('@/assets/images/onboarding/shopping.svg') },
  { id: 'nightlife', label: 'Nightlife & Bars', icon: require('@/assets/images/onboarding/nightlife.svg') },
];

export default function ProfilePreferencesScreen() {
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();
  const { profile, updateProfile } = useAuth();

  const [selectedStyle, setSelectedStyle] = useState<TravelStyle>(
    (profile?.travelStyle as TravelStyle) || 'solo'
  );
  const [selectedPace, setSelectedPace] = useState<TravelPace>(
    (profile?.travelPace as TravelPace) || 'balanced'
  );
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    profile?.interests && profile.interests.length > 0 ? profile.interests : ['food', 'culture']
  );

  const [loading, setLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.travelStyle) {
      setSelectedStyle(profile.travelStyle as TravelStyle);
    }
    if (profile?.travelPace) {
      setSelectedPace(profile.travelPace as TravelPace);
    }
    if (profile?.interests) {
      setSelectedInterests(profile.interests);
    }
  }, [profile]);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
    if (errorMessage) setErrorMessage(null);
  };

  const handleSave = async () => {
    setErrorMessage(null);
    setLoading(true);

    try {
      await updateProfile({
        travelStyle: selectedStyle,
        travelPace: selectedPace,
        interests: selectedInterests,
      });

      setSuccessBanner(true);
      setTimeout(() => {
        setSuccessBanner(false);
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update travel preferences.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: contentPaddingTop,
              paddingBottom: contentPaddingBottom + spacing.xl,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Top Sub-Navigation Bar */}
            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.iconCircleButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={8}
              >
                <Text style={styles.backArrow}>←</Text>
              </Pressable>

              <Text style={styles.topBarTitle}>Travel Preferences</Text>

              <View style={styles.topBarSpacer} />
            </View>

            {/* Success Banner */}
            {successBanner ? (
              <View style={styles.successBanner}>
                <Image
                  source={require('@/assets/images/onboarding/check.svg')}
                  style={styles.bannerCheckIcon}
                  contentFit="contain"
                />
                <Text style={styles.successBannerText}>
                  Travel preferences updated successfully!
                </Text>
              </View>
            ) : null}

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* ── 1. Traveler Style ────────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>TRAVELER STYLE</Text>
              <Text style={styles.sectionSubtitle}>
                Who do you usually explore the world with?
              </Text>
              <View style={styles.styleGrid}>
                {TRAVEL_STYLES.map((style) => {
                  const isSelected = selectedStyle === style.id;
                  return (
                    <Pressable
                      key={style.id}
                      onPress={() => {
                        setSelectedStyle(style.id);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      style={[
                        styles.styleCard,
                        isSelected ? styles.styleCardSelected : styles.styleCardUnselected,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={style.label}
                    >
                      {isSelected ? (
                        <View style={styles.checkBadge}>
                          <Image
                            source={require('@/assets/images/onboarding/check.svg')}
                            style={styles.checkIcon}
                            contentFit="contain"
                          />
                        </View>
                      ) : null}
                      <Image
                        source={style.icon}
                        style={[
                          styles.styleIcon,
                          { tintColor: isSelected ? colors.primary : colors.textSecondary },
                        ]}
                        contentFit="contain"
                      />
                      <Text
                        style={[
                          styles.styleLabel,
                          isSelected && styles.styleLabelSelected,
                        ]}
                      >
                        {style.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── 2. Travel Pace ───────────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>TRAVEL PACE</Text>
              <Text style={styles.sectionSubtitle}>
                How packed do you prefer your itineraries to be?
              </Text>
              <View style={styles.paceList}>
                {PACE_OPTIONS.map((pace) => {
                  const isSelected = selectedPace === pace.id;
                  return (
                    <Pressable
                      key={pace.id}
                      onPress={() => {
                        setSelectedPace(pace.id);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      style={[
                        styles.paceCard,
                        isSelected ? styles.paceCardSelected : styles.paceCardUnselected,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${pace.title}: ${pace.desc}`}
                    >
                      <View style={styles.paceHeaderRow}>
                        <Text
                          style={[
                            styles.paceTitle,
                            isSelected && styles.paceTitleSelected,
                          ]}
                        >
                          {pace.title}
                        </Text>
                        {isSelected ? (
                          <View style={styles.checkBadge}>
                            <Image
                              source={require('@/assets/images/onboarding/check.svg')}
                              style={styles.checkIcon}
                              contentFit="contain"
                            />
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.paceDesc}>{pace.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── 3. Travel Interests ──────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>TRAVEL INTERESTS</Text>
              <Text style={styles.sectionSubtitle}>
                Choose the activities you care about most.
              </Text>
              <View style={styles.interestsGrid}>
                {INTEREST_OPTIONS.map((interest) => {
                  const isSelected = selectedInterests.includes(interest.id);
                  return (
                    <Pressable
                      key={interest.id}
                      onPress={() => toggleInterest(interest.id)}
                      style={[
                        styles.interestCard,
                        isSelected ? styles.interestCardSelected : styles.interestCardUnselected,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={interest.label}
                    >
                      <Image
                        source={interest.icon}
                        style={[
                          styles.interestIcon,
                          { tintColor: isSelected ? colors.primary : colors.textSecondary },
                        ]}
                        contentFit="contain"
                      />
                      <Text
                        style={[
                          styles.interestLabel,
                          isSelected && styles.interestLabelSelected,
                        ]}
                      >
                        {interest.label}
                      </Text>
                      {isSelected ? (
                        <View style={styles.checkBadgeSmall}>
                          <Image
                            source={require('@/assets/images/onboarding/check.svg')}
                            style={styles.checkIconSmall}
                            contentFit="contain"
                          />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Save Preferences Button */}
            <Button
              variant="primary"
              label={loading ? 'Saving Preferences...' : 'Save Preferences'}
              loading={loading}
              onPress={handleSave}
              style={styles.saveButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    gap: spacing.md,
  },

  // ── Top Navigation Bar ───────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: 2,
  },
  topBarTitle: {
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  topBarSpacer: {
    width: 32,
  },
  iconCircleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  backArrow: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },

  // ── Banners ──────────────────────────────────────────────────────────────
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: 'rgba(44, 95, 94, 0.10)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.input,
    padding: spacing.sm,
  },
  bannerCheckIcon: {
    width: 14,
    height: 14,
    tintColor: colors.primary,
  },
  successBannerText: {
    fontFamily: fontFamily.medium,
    fontSize: 12.5,
    color: colors.primary,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: 'rgba(176, 74, 74, 0.08)',
    borderRadius: radius.input,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorBannerText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: spacing.sm,
    ...shadows.card,
  },
  sectionHeader: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  sectionSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: -2,
    marginBottom: 4,
  },

  // ── 1. Traveler Style ────────────────────────────────────────────────────
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  styleCard: {
    width: '31%',
    minHeight: 76,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    position: 'relative',
  },
  styleCardUnselected: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  styleCardSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  styleIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
  },
  styleLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  styleLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    width: 9,
    height: 9,
    tintColor: colors.textOnPrimary,
  },

  // ── 2. Travel Pace ───────────────────────────────────────────────────────
  paceList: {
    gap: spacing.xs + 2,
  },
  paceCard: {
    borderRadius: 12,
    padding: 10,
  },
  paceCardUnselected: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paceCardSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  paceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  paceTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  paceTitleSelected: {
    color: colors.primary,
  },
  paceDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // ── 3. Interests ─────────────────────────────────────────────────────────
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  interestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.full,
  },
  interestCardUnselected: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  interestCardSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  interestIcon: {
    width: 15,
    height: 15,
  },
  interestLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textPrimary,
  },
  interestLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkBadgeSmall: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 1,
  },
  checkIconSmall: {
    width: 7,
    height: 7,
    tintColor: colors.textOnPrimary,
  },

  // ── CTA ──────────────────────────────────────────────────────────────────
  saveButton: {
    height: 44,
    marginTop: spacing.xs,
  },
});

