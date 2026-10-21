/**
 * Route: /(tabs)/profile/subscription — Voyaro Pro Membership & Benefits Screen
 *
 * Displays current membership status, Pro benefits checklist,
 * annual/monthly pricing options, upgrade CTA, and restore purchases.
 * Integrates with persistent navigation shell using useShellInsets.
 */

import React, { useState } from 'react';
import {
  Alert,
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
import { useShellInsets } from '@/components/navigation';

interface ProFeature {
  title: string;
  desc: string;
  icon: any;
}

const PRO_FEATURES: ProFeature[] = [
  {
    title: 'Unlimited Offline Maps & Itineraries',
    desc: 'Access your full itinerary, reservations, and maps without cellular data or roaming.',
    icon: require('@/assets/images/icons/landscape.svg'),
  },
  {
    title: 'Live Flight Status & Gate Changes',
    desc: 'Real-time push alerts for departure delays, gate swaps, and baggage claims.',
    icon: require('@/assets/images/icons/flight.svg'),
  },
  {
    title: 'Smart Receipt Scanning & OCR',
    desc: 'Snap receipts in any currency to auto-extract expenses and split bills with companions.',
    icon: require('@/assets/images/icons/receipt.svg'),
  },
  {
    title: 'Unlimited Trip Collaborators',
    desc: 'Invite all your friends and family members to plan and edit shared trip itineraries.',
    icon: require('@/assets/images/icons/group.svg'),
  },
  {
    title: 'Multi-Currency Live Conversion',
    desc: 'Auto-convert expenses into your home currency using real-time global exchange rates.',
    icon: require('@/assets/images/icons/swap-vert.svg'),
  },
  {
    title: 'Calendar Sync & PDF Export',
    desc: 'Export beautifully formatted PDF trip guides and sync events to Google/Apple Calendar.',
    icon: require('@/assets/images/icons/calendar.svg'),
  },
];

export default function SubscriptionScreen() {
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();

  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [upgrading, setUpgrading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  const handleUpgrade = () => {
    setUpgrading(true);
    setTimeout(() => {
      setUpgrading(false);
      setSuccessBanner(true);
      setTimeout(() => {
        setSuccessBanner(false);
      }, 4000);
    }, 1200);
  };

  const handleRestore = () => {
    setRestoring(true);
    setTimeout(() => {
      setRestoring(false);
      Alert.alert(
        'Restore Purchases',
        'No active Voyaro Pro subscription found for your Apple ID / Google Account.'
      );
    }, 1000);
  };

  return (
    <View style={styles.screen}>
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
      >
        <View style={styles.container}>
          {/* Top Navigation Bar */}
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

            <Text style={styles.topBarTitle}>Subscription</Text>

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
                Welcome to Voyaro Pro! Premium features are now unlocked.
              </Text>
            </View>
          ) : null}

          {/* ── Hero Banner ──────────────────────────────────────────────── */}
          <View style={styles.heroCard}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.proBadge}>
                <Image
                  source={require('@/assets/images/icons/sparkles.svg')}
                  style={styles.sparkleIcon}
                  contentFit="contain"
                />
                <Text style={styles.proBadgeText}>VOYARO PRO</Text>
              </View>
              <View style={styles.currentPlanBadge}>
                <Text style={styles.currentPlanText}>Current: Free Plan</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>Travel Without Limits</Text>
            <Text style={styles.heroSubtitle}>
              Unlock complete offline navigation, live flight updates, receipt scanning, and unlimited group collaboration.
            </Text>
          </View>

          {/* ── Pricing Selector ─────────────────────────────────────────── */}
          <View style={styles.pricingRow}>
            {/* Annual Option */}
            <Pressable
              onPress={() => setBillingCycle('annual')}
              style={[
                styles.pricingCard,
                billingCycle === 'annual'
                  ? styles.pricingCardSelected
                  : styles.pricingCardUnselected,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: billingCycle === 'annual' }}
              accessibilityLabel="Annual billing, $39.99 per year, save 33%"
            >
              <View style={styles.savingsTag}>
                <Text style={styles.savingsTagText}>SAVE 33%</Text>
              </View>
              <Text
                style={[
                  styles.planName,
                  billingCycle === 'annual' && styles.planNameSelected,
                ]}
              >
                Annual Plan
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceAmount}>$39.99</Text>
                <Text style={styles.pricePer}> / year</Text>
              </View>
              <Text style={styles.subPrice}>Just $3.33 / month</Text>
            </Pressable>

            {/* Monthly Option */}
            <Pressable
              onPress={() => setBillingCycle('monthly')}
              style={[
                styles.pricingCard,
                billingCycle === 'monthly'
                  ? styles.pricingCardSelected
                  : styles.pricingCardUnselected,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: billingCycle === 'monthly' }}
              accessibilityLabel="Monthly billing, $4.99 per month"
            >
              <View style={styles.spacerTag} />
              <Text
                style={[
                  styles.planName,
                  billingCycle === 'monthly' && styles.planNameSelected,
                ]}
              >
                Monthly Plan
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceAmount}>$4.99</Text>
                <Text style={styles.pricePer}> / month</Text>
              </View>
              <Text style={styles.subPrice}>Cancel anytime</Text>
            </Pressable>
          </View>

          {/* ── Feature Checklist ────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>WHAT’S INCLUDED IN PRO</Text>

            <View style={styles.featuresList}>
              {PRO_FEATURES.map((feature, idx) => (
                <View
                  key={feature.title}
                  style={[
                    styles.featureItem,
                    idx < PRO_FEATURES.length - 1 && styles.featureBorder,
                  ]}
                >
                  <View style={styles.featureIconContainer}>
                    <Image
                      source={feature.icon}
                      style={styles.featureIcon}
                      contentFit="contain"
                    />
                  </View>
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDesc}>{feature.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ── Actions & Disclaimers ─────────────────────────────────────── */}
          <View style={styles.actionContainer}>
            <Button
              variant="primary"
              label={
                upgrading
                  ? 'Activating Voyaro Pro...'
                  : `Upgrade to Pro — ${billingCycle === 'annual' ? '$39.99/yr' : '$4.99/mo'}`
              }
              loading={upgrading}
              onPress={handleUpgrade}
              style={styles.upgradeBtn}
            />

            <Pressable
              onPress={handleRestore}
              disabled={restoring}
              style={({ pressed }) => [
                styles.restoreBtn,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Restore Purchases"
            >
              <Text style={styles.restoreBtnText}>
                {restoring ? 'Checking Purchases...' : 'Restore Purchases'}
              </Text>
            </Pressable>

            <Text style={styles.disclaimerText}>
              Subscription renews automatically unless cancelled in your App Store or Google Play account settings at least 24 hours prior to the end of the current period.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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

  // ── Hero Banner ──────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
    ...shadows.card,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(44, 95, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  sparkleIcon: {
    width: 13,
    height: 13,
    tintColor: colors.primary,
  },
  proBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  currentPlanBadge: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentPlanText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  heroTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  // ── Pricing Selector ─────────────────────────────────────────────────────
  pricingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pricingCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
    ...shadows.card,
  },
  pricingCardUnselected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pricingCardSelected: {
    backgroundColor: colors.primarySurface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  savingsTag: {
    position: 'absolute',
    top: -10,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  savingsTagText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textOnPrimary,
    letterSpacing: 0.5,
  },
  spacerTag: {
    height: 14,
  },
  planName: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  planNameSelected: {
    color: colors.primary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  priceAmount: {
    fontFamily: fontFamily.semiBold,
    fontSize: 19,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pricePer: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  subPrice: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },

  // ── Features Checklist ───────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    ...shadows.card,
  },
  sectionHeader: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  featuresList: {
    gap: 0,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 9,
    gap: spacing.sm,
  },
  featureBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  featureIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  featureIcon: {
    width: 15,
    height: 15,
    tintColor: colors.primary,
  },
  featureTextCol: {
    flex: 1,
    gap: 1,
  },
  featureTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  featureDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textSecondary,
  },

  // ── Actions ──────────────────────────────────────────────────────────────
  actionContainer: {
    gap: spacing.xs + 2,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  upgradeBtn: {
    height: 44,
  },
  restoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  restoreBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  disclaimerText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
