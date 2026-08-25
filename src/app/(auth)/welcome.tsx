import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/theme';

/**
 * Route: /(auth)/welcome
 * Voyaro Welcome Screen (Phase 3)
 *
 * Purpose:
 *  1. Explain what Voyaro is ("Your entire trip. In one place.")
 *  2. Create a positive, calm, editorial first impression
 *  3. Give the traveler a clear path to Create an Account or Log In
 *
 * Visual Relationship with Splash:
 *  - Follows the Splash screen directly
 *  - Replaces the splash branding with a rich travel journey preview visual
 *  - Keeps brand mark small and secondary at the top
 *  - No email/password inputs or login forms
 */
export default function WelcomeScreen() {
  const handleCreateAccount = () => {
    router.push('/(auth)/signup');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const handleTerms = () => {
    Alert.alert('Terms of Service', 'Voyaro terms of service and conditions.');
  };

  const handlePrivacy = () => {
    Alert.alert('Privacy Policy', 'Voyaro privacy policy and data practices.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.container}>
          {/* Top: Subtle secondary brand presence */}
          <View style={styles.brandRow}>
            <Image
              source={require('@/assets/images/voyaro-logo.png')}
              style={styles.brandIcon}
              contentFit="contain"
              accessibilityLabel="Voyaro Logo"
            />
            <Text style={styles.brandName}>Voyaro</Text>
          </View>

          {/* Middle: Editorial Travel Journey Visual & Value Proposition */}
          <View style={styles.middleSection}>
            {/* Travel Journey Visualization Card */}
            <Card variant="elevated" style={styles.visualCard} contentStyle={styles.visualCardContent}>
              {/* Trip header badge */}
              <View style={styles.journeyHeader}>
                <Badge label="Curated Journey" variant="ai" />
                <Text style={styles.journeyDuration}>10 Days • Autumn</Text>
              </View>

              {/* Waypoint Route Visualization */}
              <View style={styles.routeContainer}>
                {/* Connecting Line Track */}
                <View style={styles.routeLine} />

                {/* Waypoint 1: Kyoto */}
                <View style={styles.waypointItem}>
                  <View style={styles.nodeWrapper}>
                    <View style={[styles.nodeCircle, styles.nodeActive]} />
                  </View>
                  <View style={styles.waypointDetails}>
                    <Text style={styles.waypointTitle}>Kyoto</Text>
                    <Text style={styles.waypointMeta}>Arashiyama & Historic Temples</Text>
                  </View>
                  <View style={styles.waypointTag}>
                    <Text style={styles.waypointTagText}>3 nights</Text>
                  </View>
                </View>

                {/* Transit Indicator */}
                <View style={styles.transitRow}>
                  <View style={styles.transitPill}>
                    <View style={styles.transitDot} />
                    <Text style={styles.transitText}>Scenic Rail • 2h 15m</Text>
                  </View>
                </View>

                {/* Waypoint 2: Hakone */}
                <View style={styles.waypointItem}>
                  <View style={styles.nodeWrapper}>
                    <View style={styles.nodeCircle} />
                  </View>
                  <View style={styles.waypointDetails}>
                    <Text style={styles.waypointTitle}>Hakone</Text>
                    <Text style={styles.waypointMeta}>Mount Fuji & Thermal Springs</Text>
                  </View>
                  <View style={styles.waypointTag}>
                    <Text style={styles.waypointTagText}>2 nights</Text>
                  </View>
                </View>

                {/* Transit Indicator */}
                <View style={styles.transitRow}>
                  <View style={styles.transitPill}>
                    <View style={styles.transitDot} />
                    <Text style={styles.transitText}>Express • 1h 40m</Text>
                  </View>
                </View>

                {/* Waypoint 3: Tokyo */}
                <View style={styles.waypointItem}>
                  <View style={styles.nodeWrapper}>
                    <View style={[styles.nodeCircle, styles.nodeCompleted]} />
                  </View>
                  <View style={styles.waypointDetails}>
                    <Text style={styles.waypointTitle}>Tokyo</Text>
                    <Text style={styles.waypointMeta}>Ginza, Shibuya & Modern Culture</Text>
                  </View>
                  <View style={styles.waypointTag}>
                    <Text style={styles.waypointTagText}>5 nights</Text>
                  </View>
                </View>
              </View>

              {/* Summary Stats Row */}
              <View style={styles.summaryBar}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>1</Text>
                  <Text style={styles.summaryLabel}>Itinerary</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>6</Text>
                  <Text style={styles.summaryLabel}>Bookings</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>100%</Text>
                  <Text style={styles.summaryLabel}>Organized</Text>
                </View>
              </View>
            </Card>

            {/* Value Proposition Headline & Copy */}
            <View style={styles.copyContainer}>
              <Text style={styles.headline}>
                Your entire trip.{'\n'}In one place.
              </Text>
              <Text style={styles.supportingText}>
                Plan your itinerary, organize your bookings, manage expenses, and travel with confidence.
              </Text>
            </View>
          </View>

          {/* Bottom: Clear Entry Actions */}
          <View style={styles.bottomSection}>
            <View style={styles.actionButtons}>
              <Button
                variant="primary"
                label="Create an account"
                fullWidth
                onPress={handleCreateAccount}
                style={styles.primaryButton}
              />
              <Button
                variant="secondary"
                label="Log in"
                fullWidth
                onPress={handleLogin}
                style={styles.secondaryButton}
              />
            </View>

            {/* Small Legal / Privacy Disclaimer */}
            <View style={styles.legalContainer}>
              <Text style={styles.legalText}>
                By continuing, you agree to Voyaro's{' '}
                <Text style={styles.legalLink} onPress={handleTerms}>
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text style={styles.legalLink} onPress={handlePrivacy}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: spacing.xl,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },

  // --- Top: Subtle Brand Presence ---
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
  brandIcon: {
    width: 22,
    height: 22,
  },
  brandName: {
    ...typography.label,
    fontSize: 16,
    letterSpacing: 0.2,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  // --- Middle Section ---
  middleSection: {
    marginVertical: spacing.lg,
    alignItems: 'center',
  },

  // --- Journey Card Visual ---
  visualCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  visualCardContent: {
    padding: spacing.lg,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  journeyDuration: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // Route Track
  routeContainer: {
    position: 'relative',
    paddingVertical: spacing.xs,
  },
  routeLine: {
    position: 'absolute',
    left: 8,
    top: 14,
    bottom: 14,
    width: 2,
    backgroundColor: colors.border,
  },
  waypointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  nodeWrapper: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  nodeCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 2.5,
    borderColor: colors.primary,
  },
  nodeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  nodeCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  waypointDetails: {
    flex: 1,
  },
  waypointTitle: {
    ...typography.cardTitle,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  waypointMeta: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 1,
  },
  waypointTag: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  waypointTagText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  transitRow: {
    paddingLeft: 30,
    marginVertical: 2,
  },
  transitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transitDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
  },
  transitText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },

  // Summary Bar inside Card
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    ...typography.stat,
    fontSize: 16,
    lineHeight: 20,
    color: colors.primary,
    fontWeight: '700',
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },

  // --- Copy Section ---
  copyContainer: {
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  headline: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  supportingText: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  // --- Bottom Section ---
  bottomSection: {
    width: '100%',
    paddingTop: spacing.md,
  },
  actionButtons: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryButton: {
    height: 52,
    borderRadius: radius.button,
  },
  secondaryButton: {
    height: 52,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // --- Legal Disclaimer ---
  legalContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  legalText: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  legalLink: {
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
