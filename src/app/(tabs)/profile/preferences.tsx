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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, IconButton } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useAuth } from '@/services/AuthContext';
import { TravelStyle, TravelPace } from '@/services/profile';

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top App Bar */}
        <View style={styles.navBar}>
          <IconButton
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            icon={
              <Image
                source={require('@/assets/images/arrow-left.svg')}
                style={styles.navIcon}
                contentFit="contain"
              />
            }
            accessibilityLabel="Go back"
          />
          <Text style={styles.navTitle}>Travel Preferences</Text>
          <View style={styles.navPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Success Banner */}
            {successBanner && (
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
            )}

            {/* Error Banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* ── 1. Traveler Style ────────────────────────────────────────── */}
            <View style={styles.sectionCard}>
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
                      onPress={() => setSelectedStyle(style.id)}
                      style={[
                        styles.styleCard,
                        isSelected ? styles.styleCardSelected : styles.styleCardUnselected,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={style.label}
                    >
                      {isSelected && (
                        <View style={styles.checkBadge}>
                          <Image
                            source={require('@/assets/images/onboarding/check.svg')}
                            style={styles.checkIcon}
                            contentFit="contain"
                          />
                        </View>
                      )}
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
            <View style={styles.sectionCard}>
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
                      onPress={() => setSelectedPace(pace.id)}
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
                        {isSelected && (
                          <View style={styles.checkBadge}>
                            <Image
                              source={require('@/assets/images/onboarding/check.svg')}
                              style={styles.checkIcon}
                              contentFit="contain"
                            />
                          </View>
                        )}
                      </View>
                      <Text style={styles.paceDesc}>{pace.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── 3. Travel Interests ──────────────────────────────────────── */}
            <View style={styles.sectionCard}>
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
                      {isSelected && (
                        <View style={styles.checkBadgeSmall}>
                          <Image
                            source={require('@/assets/images/onboarding/check.svg')}
                            style={styles.checkIconSmall}
                            contentFit="contain"
                          />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Save Preferences Button */}
            <Button
              variant="primary"
              label="Save Preferences"
              fullWidth
              loading={loading}
              onPress={handleSave}
              style={styles.saveButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  navIcon: {
    width: 20,
    height: 20,
  },
  navTitle: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  navPlaceholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: spacing.lg,
  },

  // ── Banners ──────────────────────────────────────────────────────────────
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(44, 95, 94, 0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.button,
    padding: spacing.md,
  },
  bannerCheckIcon: {
    width: 16,
    height: 16,
    tintColor: colors.primary,
  },
  successBannerText: {
    ...typography.label,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: 'rgba(176, 74, 74, 0.10)',
    borderRadius: radius.button,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Section Card ─────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.card,
  },
  sectionHeader: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  sectionSubtitle: {
    ...typography.bodySecondary,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },

  // ── 1. Traveler Style ────────────────────────────────────────────────────
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  styleCard: {
    width: '31%',
    minHeight: 88,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    position: 'relative',
  },
  styleCardUnselected: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  styleCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  styleIcon: {
    width: 28,
    height: 28,
    marginBottom: spacing.xs,
  },
  styleLabel: {
    ...typography.caption,
    fontSize: 13,
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
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    width: 10,
    height: 10,
  },

  // ── 2. Travel Pace ───────────────────────────────────────────────────────
  paceList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  paceCard: {
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  paceCardUnselected: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paceCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  paceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paceTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  paceTitleSelected: {
    color: colors.primary,
  },
  paceDesc: {
    ...typography.bodySecondary,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // ── 3. Interests ─────────────────────────────────────────────────────────
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  interestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
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
    width: 18,
    height: 18,
  },
  interestLabel: {
    ...typography.label,
    fontSize: 13,
    color: colors.textPrimary,
  },
  interestLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkBadgeSmall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  checkIconSmall: {
    width: 8,
    height: 8,
  },

  // ── CTA ──────────────────────────────────────────────────────────────────
  saveButton: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
});
