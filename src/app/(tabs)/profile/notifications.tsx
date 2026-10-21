/**
 * Route: /(tabs)/profile/notifications — Notifications & Alerts Screen
 *
 * Configures flight status alerts, itinerary reminders, collaboration notices,
 * and delivery channels (push, email, SMS).
 * Integrates with persistent navigation shell using useShellInsets.
 */

import React, { useState } from 'react';
import {
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
import { useShellInsets } from '@/components/navigation';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon?: any;
  enabled: boolean;
}

export default function NotificationsScreen() {
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();

  // Notification settings state
  const [flightAlerts, setFlightAlerts] = useState(true);
  const [checkInReminders, setCheckInReminders] = useState(true);
  const [timelineAlerts, setTimelineAlerts] = useState(true);

  const [tripInvites, setTripInvites] = useState(true);
  const [expenseSplits, setExpenseSplits] = useState(true);
  const [collaboratorEdits, setCollaboratorEdits] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState(true);
  const [smsUrgentAlerts, setSmsUrgentAlerts] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  const handleSave = () => {
    setSaving(true);
    // Persist preferences
    setTimeout(() => {
      setSaving(false);
      setSuccessBanner(true);
      setTimeout(() => {
        setSuccessBanner(false);
      }, 3000);
    }, 400);
  };

  const renderToggleRow = (
    title: string,
    description: string,
    value: boolean,
    onValueChange: (val: boolean) => void,
    icon?: any,
    isLast: boolean = false
  ) => (
    <View style={[styles.toggleRow, !isLast && styles.rowBorder]}>
      {icon ? (
        <View style={styles.iconCircle}>
          <Image source={icon} style={styles.rowIcon} contentFit="contain" />
        </View>
      ) : null}
      <View style={styles.textContainer}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={Platform.OS === 'android' ? (value ? '#FFFFFF' : '#F0F0F0') : '#FFFFFF'}
        ios_backgroundColor={colors.border}
        style={styles.switchControl}
      />
    </View>
  );

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

            <Text style={styles.topBarTitle}>Notifications</Text>

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
                Notification settings saved successfully!
              </Text>
            </View>
          ) : null}

          {/* ── 1. Trip & Flight Alerts ──────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>TRIP & FLIGHT ALERTS</Text>
            <Text style={styles.sectionSubtitle}>
              Stay on schedule with timely notifications during your travels.
            </Text>

            {renderToggleRow(
              'Live Flight & Gate Updates',
              'Gate changes, flight delays, baggage carousel, and departure boarding calls',
              flightAlerts,
              setFlightAlerts,
              require('@/assets/images/icons/flight.svg')
            )}

            {renderToggleRow(
              'Check-in & Stays Reminders',
              '24-hour reminders for airline check-in and hotel arrival instructions',
              checkInReminders,
              setCheckInReminders,
              require('@/assets/images/icons/hotel.svg')
            )}

            {renderToggleRow(
              'Itinerary Timeline Alerts',
              'Notify 1 hour before scheduled sightseeing, transfers, or reservations',
              timelineAlerts,
              setTimelineAlerts,
              require('@/assets/images/icons/clock.svg'),
              true
            )}
          </View>

          {/* ── 2. Collaboration Alerts ─────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>COLLABORATION & EXPENSES</Text>
            <Text style={styles.sectionSubtitle}>
              Stay updated when travel companions interact with shared trips.
            </Text>

            {renderToggleRow(
              'Trip Invitations',
              'Notify when friends or organizers invite you to collaborate on a trip',
              tripInvites,
              setTripInvites,
              require('@/assets/images/icons/group.svg')
            )}

            {renderToggleRow(
              'Shared Expense Splits',
              'Notify when a companion logs or splits a bill with your account',
              expenseSplits,
              setExpenseSplits,
              require('@/assets/images/icons/receipt.svg')
            )}

            {renderToggleRow(
              'Collaborator Edits',
              'Notify when someone adds or reschedules an item in your itinerary',
              collaboratorEdits,
              setCollaboratorEdits,
              require('@/assets/images/icons/list-alt.svg'),
              true
            )}
          </View>

          {/* ── 3. Delivery Channels ────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>DELIVERY CHANNELS</Text>
            <Text style={styles.sectionSubtitle}>
              Choose how and where you want to receive important travel alerts.
            </Text>

            {renderToggleRow(
              'Push Notifications',
              'Receive alerts directly on this mobile device lock screen',
              pushEnabled,
              setPushEnabled
            )}

            {renderToggleRow(
              'Daily Email Digest',
              'A morning summary of today’s upcoming schedule and weather forecast',
              emailDigest,
              setEmailDigest
            )}

            {renderToggleRow(
              'SMS Critical Alerts',
              'Urgent cancellations and emergency travel notices sent via text message',
              smsUrgentAlerts,
              setSmsUrgentAlerts,
              undefined,
              true
            )}
          </View>

          {/* Save Button */}
          <Button
            variant="primary"
            label={saving ? 'Saving Settings...' : 'Save Settings'}
            loading={saving}
            onPress={handleSave}
            style={styles.saveButton}
          />
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

  // ── Toggle Row ───────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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

  // ── CTA ──────────────────────────────────────────────────────────────────
  saveButton: {
    height: 44,
    marginTop: spacing.xs,
  },
});
