import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, IconButton } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { deleteTrip, fetchTripById } from '@/services/trip';
import { leaveTrip } from '@/services/collaboration';
import { Trip, getTripById } from '@/services/mockData';
import { useShellInsets } from '@/components/navigation';

/**
 * Route: /(tabs)/trips/[tripId]/settings
 * Trip Settings Screen (Phase 8 — Step 7 Permission-Aware)
 */
export default function TripSettingsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (tripId) {
      fetchTripById(tripId)
        .then((data) => {
          if (isMounted) {
            const activeTrip =
              data ||
              getTripById(tripId) ||
              (tripId === '[id]' ? getTripById('demo-trip') : null) ||
              null;
            setTrip(activeTrip);
          }
        })
        .catch((err) => {
          console.warn('[TripSettingsScreen] Error loading trip:', err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [tripId]);

  const isOwner = trip?.isOwner !== false && trip?.userRole !== 'editor' && trip?.userRole !== 'viewer';
  const roleLabel = (trip?.userRole || (isOwner ? 'owner' : 'viewer')).toUpperCase();

  const handleEditPress = () => {
    if (!isOwner) {
      Alert.alert(
        'Permission Denied',
        'Only the trip owner can edit trip details and settings.'
      );
      return;
    }
    if (tripId) {
      router.push(`/(tabs)/trips/create?tripId=${tripId}`);
    }
  };

  const handleSharePress = () => {
    if (tripId) {
      router.push(`/share/${tripId}`);
    }
  };

  const handleTravelersPress = () => {
    if (tripId) {
      router.push(`/(tabs)/trips/${tripId}/travelers`);
    }
  };

  const handleDeletePress = () => {
    if (!tripId || deleting || !isOwner) return;

    Alert.alert(
      'Delete Trip',
      'Are you sure you want to permanently delete this trip? All associated itinerary items, budget, and expenses will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (deleting) return;
            setDeleting(true);
            try {
              await deleteTrip(tripId);
              router.replace('/(tabs)/trips');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete trip.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleLeavePress = () => {
    if (!tripId || leaving || isOwner) return;

    Alert.alert(
      'Leave Trip',
      'Are you sure you want to leave this shared trip? You will lose access to its itinerary and expenses until re-invited.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Trip',
          style: 'destructive',
          onPress: async () => {
            if (leaving) return;
            setLeaving(true);
            try {
              await leaveTrip(tripId);
              router.replace('/(tabs)/trips');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to leave trip.');
              setLeaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop: contentPaddingTop + spacing.lg,
            paddingBottom: contentPaddingBottom + spacing.xl,
          },
        ]}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: contentPaddingTop + spacing.lg,
            paddingBottom: contentPaddingBottom + spacing['2xl'] + spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
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
              accessibilityLabel="Back to Trip Overview"
              hitSlop={8}
            >
              <Text style={styles.backArrow}>←</Text>
            </Pressable>

            <Text style={styles.topBarTitle}>Trip Settings</Text>

            <View style={styles.topBarSpacer} />
          </View>

          {/* Trip Role Card */}
          <View style={styles.roleHeaderCard}>
            <View style={styles.roleHeaderInfo}>
              <Text style={styles.roleHeaderTitle}>{trip?.title || 'Trip'}</Text>
              <Text style={styles.roleHeaderSubtitle}>
                {trip?.destination ? `${trip.destination} · ` : ''}
                {trip?.dates || 'Dates not set'}
              </Text>
            </View>
            <Badge
              label={roleLabel}
              variant={
                roleLabel === 'OWNER'
                  ? 'success'
                  : roleLabel === 'EDITOR'
                  ? 'selected'
                  : 'default'
              }
            />
          </View>

          {/* Settings Section Card */}
          <View style={styles.menuCard}>
            {/* Edit Trip Details (Owner only) */}
            <Pressable
              onPress={handleEditPress}
              style={({ pressed }) => [
                styles.menuItem,
                styles.menuItemBorder,
                !isOwner && styles.menuItemDisabled,
                isOwner && pressed && styles.menuItemPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Edit Trip Details"
            >
              <View style={styles.menuTextContainer}>
                <View style={styles.menuLabelRow}>
                  <Text
                    style={[
                      styles.menuLabel,
                      !isOwner && styles.menuLabelMuted,
                    ]}
                  >
                    Edit Trip Details
                  </Text>
                  {!isOwner && (
                    <Text style={styles.ownerOnlyTag}>Owner Only</Text>
                  )}
                </View>
                <Text style={styles.menuSubtitle}>
                  {isOwner
                    ? 'Change trip name, destinations, dates, and budget'
                    : 'Managed by trip owner. Viewers and editors cannot change trip details.'}
                </Text>
              </View>
              {isOwner ? (
                <Image
                  source={require('@/assets/images/onboarding/arrow-right.svg')}
                  style={styles.chevronIcon}
                  contentFit="contain"
                />
              ) : null}
            </Pressable>

            {/* Trip Sharing & Invites */}
            <Pressable
              onPress={handleSharePress}
              style={({ pressed }) => [
                styles.menuItem,
                styles.menuItemBorder,
                pressed && styles.menuItemPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Share Trip"
            >
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>Trip Sharing & Invites</Text>
                <Text style={styles.menuSubtitle}>
                  {isOwner
                    ? 'Invite travel companions, share links, or manage roles'
                    : 'View trip link and share with authorized companions'}
                </Text>
              </View>
              <Image
                source={require('@/assets/images/onboarding/arrow-right.svg')}
                style={styles.chevronIcon}
                contentFit="contain"
              />
            </Pressable>

            {/* Travelers & Members */}
            <Pressable
              onPress={handleTravelersPress}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Travelers"
            >
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>Travelers & Permissions</Text>
                <Text style={styles.menuSubtitle}>
                  {isOwner
                    ? 'Manage active members, roles, and pending invites'
                    : 'View co-travelers and their roles on this trip'}
                </Text>
              </View>
              <Image
                source={require('@/assets/images/onboarding/arrow-right.svg')}
                style={styles.chevronIcon}
                contentFit="contain"
              />
            </Pressable>
          </View>

          {/* Danger Zone: Delete Trip (Owner) or Leave Trip (Collaborator) */}
          {isOwner ? (
            <View style={styles.dangerCard}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              <Text style={styles.dangerSubtitle}>
                Deleting a trip will remove all linked itinerary events, expenses, and budget information. This action cannot be reversed.
              </Text>
              <Pressable
                onPress={handleDeletePress}
                disabled={deleting}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.deleteButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Delete this trip"
              >
                <Text style={styles.deleteButtonText}>
                  {deleting ? 'Deleting Trip...' : 'Delete This Trip'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.leaveCard}>
              <Text style={styles.leaveTitle}>Leave Trip</Text>
              <Text style={styles.leaveSubtitle}>
                Remove this shared trip from your account. You will lose access to its itinerary and expenses until re-invited by the owner.
              </Text>
              <Pressable
                onPress={handleLeavePress}
                disabled={leaving}
                style={({ pressed }) => [
                  styles.leaveButton,
                  pressed && styles.leaveButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Leave this trip"
              >
                <Text style={styles.leaveButtonText}>
                  {leaving ? 'Leaving Trip...' : 'Leave This Trip'}
                </Text>
              </Pressable>
            </View>
          )}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
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
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  roleHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  roleHeaderInfo: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.sm,
  },
  roleHeaderTitle: {
    ...typography.cardTitle,
    fontSize: 16,
    color: colors.textPrimary,
  },
  roleHeaderSubtitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemPressed: {
    backgroundColor: colors.backgroundAlt,
  },
  menuItemDisabled: {
    opacity: 0.75,
  },
  menuTextContainer: {
    flex: 1,
    gap: 3,
  },
  menuLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  menuLabel: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  menuLabelMuted: {
    color: colors.textSecondary,
  },
  ownerOnlyTag: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuSubtitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chevronIcon: {
    width: 16,
    height: 16,
    tintColor: colors.textMuted,
  },

  dangerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(176, 74, 74, 0.25)',
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.card,
  },
  dangerTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  dangerSubtitle: {
    ...typography.bodySecondary,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: 'rgba(176, 74, 74, 0.10)',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  deleteButtonPressed: {
    backgroundColor: colors.error,
  },
  deleteButtonText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },

  leaveCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.card,
  },
  leaveTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  leaveSubtitle: {
    ...typography.bodySecondary,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  leaveButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  leaveButtonPressed: {
    backgroundColor: colors.surface,
  },
  leaveButtonText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

