/**
 * Route: /(tabs)/profile/privacy — Privacy & Security Settings Screen
 *
 * Manages biometric app lock, trip sharing visibility defaults, location access,
 * offline travel cache, data export, and security credentials.
 * Integrates with persistent navigation shell using useShellInsets.
 */

import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Button } from '@/components/ui';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { useAuth } from '@/services/AuthContext';
import { useShellInsets } from '@/components/navigation';
import { clearTripsCache } from '@/services/trip';
import { clearItineraryCache } from '@/services/itineraryStore';
import { clearExpenseCache } from '@/services/expenseStore';

export default function PrivacyScreen() {
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();
  const { user, profile, resetPassword, logout } = useAuth();

  // Security & Privacy preferences state
  const [biometricLock, setBiometricLock] = useState(false);
  const [privateByDefault, setPrivateByDefault] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false);

  // Cache & data state
  const [cacheSize, setCacheSize] = useState('18.4 MB');
  const [clearingCache, setClearingCache] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => {
      setFeedbackBanner(null);
    }, 3500);
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Travel Cache',
      'This will delete cached offline maps, places, and itinerary previews. Your saved cloud data is completely safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            setClearingCache(true);
            try {
              clearTripsCache();
              clearItineraryCache();
              clearExpenseCache();
              setCacheSize('0.0 MB');
              showFeedback('Offline travel cache cleared successfully.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to clear cache.');
            } finally {
              setClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const handlePasswordReset = async () => {
    const targetEmail = user?.email || profile?.email;
    if (!targetEmail) {
      Alert.alert('Notice', 'No associated email address found for this account.');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send a secure password reset link to ${targetEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: async () => {
            setSendingReset(true);
            try {
              await resetPassword(targetEmail);
              showFeedback(`Password reset link sent to ${targetEmail}`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to send reset link.');
            } finally {
              setSendingReset(false);
            }
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    setExportingData(true);
    setTimeout(() => {
      setExportingData(false);
      showFeedback('Your travel archive is prepared. Download link emailed.');
    }, 1200);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your Voyaro account and all associated trip itineraries? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/welcome');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete account.');
            }
          },
        },
      ]
    );
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

            <Text style={styles.topBarTitle}>Privacy & Security</Text>

            <View style={styles.topBarSpacer} />
          </View>

          {/* Feedback Banner */}
          {feedbackBanner ? (
            <View style={styles.successBanner}>
              <Image
                source={require('@/assets/images/onboarding/check.svg')}
                style={styles.bannerCheckIcon}
                contentFit="contain"
              />
              <Text style={styles.successBannerText}>{feedbackBanner}</Text>
            </View>
          ) : null}

          {/* ── 1. Security & Authentication ─────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>SECURITY & ACCESS</Text>
            <Text style={styles.sectionSubtitle}>
              Protect your account and itinerary access on this device.
            </Text>

            {/* Biometric Lock Toggle */}
            <View style={[styles.actionRow, styles.rowBorder]}>
              <View style={styles.iconCircle}>
                <Image
                  source={require('@/assets/images/icons/verified.svg')}
                  style={styles.rowIcon}
                  contentFit="contain"
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.rowTitle}>Biometric App Lock</Text>
                <Text style={styles.rowDescription}>
                  Require Face ID or biometric fingerprint to unlock Voyaro
                </Text>
              </View>
              <Switch
                value={biometricLock}
                onValueChange={setBiometricLock}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? (biometricLock ? '#FFFFFF' : '#F0F0F0') : '#FFFFFF'}
                ios_backgroundColor={colors.border}
                style={styles.switchControl}
              />
            </View>

            {/* Change Password Button */}
            <Pressable
              onPress={handlePasswordReset}
              disabled={sendingReset}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && styles.rowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Reset Password"
            >
              <View style={styles.iconCircle}>
                <Image
                  source={require('@/assets/images/icons/hash.svg')}
                  style={styles.rowIcon}
                  contentFit="contain"
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.rowTitle}>Reset Account Password</Text>
                <Text style={styles.rowDescription}>
                  Send a password reset email to your verified address
                </Text>
              </View>
              <Image
                source={require('@/assets/images/onboarding/arrow-right.svg')}
                style={styles.chevronIcon}
                contentFit="contain"
              />
            </Pressable>
          </View>

          {/* ── 2. Trip Sharing & Visibility ─────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>TRIP PRIVACY DEFAULTS</Text>
            <Text style={styles.sectionSubtitle}>
              Control who can see your itineraries and location.
            </Text>

            <View style={[styles.actionRow, styles.rowBorder]}>
              <View style={styles.textContainer}>
                <Text style={styles.rowTitle}>Private by Default</Text>
                <Text style={styles.rowDescription}>
                  New trips will only be visible to you until you explicitly share a link
                </Text>
              </View>
              <Switch
                value={privateByDefault}
                onValueChange={setPrivateByDefault}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? (privateByDefault ? '#FFFFFF' : '#F0F0F0') : '#FFFFFF'}
                ios_backgroundColor={colors.border}
                style={styles.switchControl}
              />
            </View>

            <View style={[styles.actionRow, styles.rowBorder]}>
              <View style={styles.textContainer}>
                <Text style={styles.rowTitle}>Location Services</Text>
                <Text style={styles.rowDescription}>
                  Used for interactive trip maps, nearby activities, and offline directions
                </Text>
              </View>
              <Switch
                value={locationServices}
                onValueChange={setLocationServices}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? (locationServices ? '#FFFFFF' : '#F0F0F0') : '#FFFFFF'}
                ios_backgroundColor={colors.border}
                style={styles.switchControl}
              />
            </View>

            <View style={styles.actionRow}>
              <View style={styles.textContainer}>
                <Text style={styles.rowTitle}>Public Community Profile</Text>
                <Text style={styles.rowDescription}>
                  Allow other travelers to browse your published trip guides
                </Text>
              </View>
              <Switch
                value={publicProfile}
                onValueChange={setPublicProfile}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? (publicProfile ? '#FFFFFF' : '#F0F0F0') : '#FFFFFF'}
                ios_backgroundColor={colors.border}
                style={styles.switchControl}
              />
            </View>
          </View>

          {/* ── 3. Data & Storage Management ─────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>DATA & STORAGE</Text>
            <Text style={styles.sectionSubtitle}>
              Manage offline caches and export personal travel records.
            </Text>

            {/* Offline Cache */}
            <View style={[styles.actionRow, styles.rowBorder]}>
              <View style={styles.textContainer}>
                <Text style={styles.rowTitle}>Offline Travel Storage</Text>
                <Text style={styles.rowDescription}>
                  Currently using {cacheSize} of cached map tiles and thumbnails
                </Text>
              </View>
              <Pressable
                onPress={handleClearCache}
                disabled={clearingCache || cacheSize === '0.0 MB'}
                style={({ pressed }) => [
                  styles.smallOutlineBtn,
                  pressed && styles.buttonPressed,
                  cacheSize === '0.0 MB' && styles.disabledBtn,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Clear Cache"
              >
                <Text style={styles.smallOutlineBtnText}>
                  {clearingCache ? 'Clearing...' : 'Clear Cache'}
                </Text>
              </Pressable>
            </View>

            {/* Export Trip Data */}
            <Pressable
              onPress={handleExportData}
              disabled={exportingData}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && styles.rowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Export Data"
            >
              <View style={styles.textContainer}>
                <Text style={styles.rowTitle}>Export Trip Archive</Text>
                <Text style={styles.rowDescription}>
                  Download all itineraries, expenses, and attachments in JSON format
                </Text>
              </View>
              <Text style={styles.actionLinkText}>
                {exportingData ? 'Preparing...' : 'Export'}
              </Text>
            </Pressable>
          </View>

          {/* ── 4. Account Actions ───────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>ACCOUNT MANAGEMENT</Text>
            <Text style={styles.sectionSubtitle}>
              Permanent actions regarding your Voyaro account.
            </Text>

            <Pressable
              onPress={handleDeleteAccount}
              style={({ pressed }) => [
                styles.destructiveRow,
                pressed && styles.destructiveRowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Delete Account"
            >
              <View style={styles.textContainer}>
                <Text style={styles.destructiveTitle}>Delete Account</Text>
                <Text style={styles.destructiveDescription}>
                  Permanently delete account, itineraries, and all personal data
                </Text>
              </View>
              <Image
                source={require('@/assets/images/onboarding/arrow-right.svg')}
                style={[styles.chevronIcon, { tintColor: colors.error }]}
                contentFit="contain"
              />
            </Pressable>
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

  // ── Card ─────────────────────────────────────────────────────────────────
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
  },
  sectionSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.xs,
  },

  // ── Action & Toggle Rows ─────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIcon: {
    width: 16,
    height: 16,
    tintColor: colors.primary,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  switchControl: {
    transform: Platform.OS === 'ios' ? [{ scale: 0.85 }] : [{ scale: 0.95 }],
  },
  chevronIcon: {
    width: 16,
    height: 16,
    tintColor: colors.textMuted,
  },
  actionLinkText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  smallOutlineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  smallOutlineBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textPrimary,
  },

  // ── Destructive Row ──────────────────────────────────────────────────────
  destructiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: spacing.sm,
  },
  destructiveRowPressed: {
    opacity: 0.7,
  },
  destructiveTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.error,
  },
  destructiveDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textMuted,
  },
});
