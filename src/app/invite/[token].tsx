import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { Badge, Button } from '@/components/ui';
import { useAuth } from '@/services/AuthContext';
import {
  acceptTripInvitation,
  fetchInvitationByToken,
} from '@/services/collaboration';
import { DomainTripInvitation } from '@/services/mappers';

/**
 * Route: /invite/[token]
 * Invitation Acceptance screen.
 * Displays trip details, invited role, and allows accepting or declining.
 */
export default function InviteAcceptanceScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { authenticated, user } = useAuth();

  const [invitationData, setInvitationData] = useState<{
    invitation: DomainTripInvitation;
    tripTitle?: string;
    tripDestination?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadInvite() {
      if (!token) {
        if (isMounted) {
          setError('Invitation token is missing.');
          setLoading(false);
        }
        return;
      }
      try {
        const data = await fetchInvitationByToken(token);
        if (!isMounted) return;
        if (!data) {
          setError('This invitation is invalid, expired, or has already been used.');
        } else {
          setInvitationData(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load invitation.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadInvite();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const result = await acceptTripInvitation(token);
      if (result.success && result.tripId) {
        Alert.alert(
          'Welcome to the Trip!',
          `You have joined "${invitationData?.tripTitle || 'the trip'}" as ${result.role === 'editor' ? 'an Editor' : 'a Viewer'}.`,
          [
            {
              text: 'View Trip',
              onPress: () => {
                router.replace(`/(tabs)/trips/${result.tripId}`);
              },
            },
          ]
        );
      } else {
        Alert.alert('Unable to Accept', result.error || 'Failed to join trip.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred while accepting.');
    } finally {
      setAccepting(false);
    }
  };

  const handleSignIn = () => {
    router.push({
      pathname: '/(auth)/login',
      params: { redirect: `/invite/${token}` },
    });
  };

  const handleSignUp = () => {
    router.push({
      pathname: '/(auth)/signup',
      params: { redirect: `/invite/${token}` },
    });
  };

  const handleDecline = () => {
    router.replace('/(tabs)/trips');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Checking invitation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !invitationData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <View style={styles.errorIconCircle}>
            <Text style={styles.errorIconText}>!</Text>
          </View>
          <Text style={styles.errorTitle}>Invalid Invitation</Text>
          <Text style={styles.errorSubtitle}>
            {error || 'This invitation link could not be found or has expired.'}
          </Text>
          <Button
            label="Go to My Trips"
            variant="primary"
            onPress={() => router.replace('/(tabs)/trips')}
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { invitation, tripTitle, tripDestination } = invitationData;
  const isEmailMatch =
    !user?.email ||
    user.email.trim().toLowerCase() === invitation.inviteeEmail.trim().toLowerCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Logo / Header Branding */}
        <View style={styles.brandHeader}>
          <Image
            source={require('@/assets/images/voyaro-logo.png')}
            style={styles.logoImage}
            contentFit="contain"
          />
          <Text style={styles.brandTitle}>Voyaro Collaboration</Text>
        </View>

        {/* Invitation Card */}
        <View style={styles.inviteCard}>
          <Text style={styles.inviteOverline}>YOU ARE INVITED TO JOIN</Text>
          {tripDestination ? (
            <Text style={styles.tripDestination}>{tripDestination}</Text>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.roleRow}>
            <Text style={styles.roleLabel}>Assigned Role:</Text>
            <Badge
              label={invitation.role === 'editor' ? 'EDITOR' : 'VIEWER'}
              variant={invitation.role === 'editor' ? 'selected' : 'default'}
            />
          </View>

          <Text style={styles.roleDescription}>
            {invitation.role === 'editor'
              ? 'As an editor, you will be able to add and update itinerary events, activities, and expenses.'
              : 'As a viewer, you will have read-only access to browse the itinerary and view expenses.'}
          </Text>

          <View style={styles.inviteeNotice}>
            <Text style={styles.inviteeNoticeText}>
              Invitation issued to:{' '}
              <Text style={styles.inviteeEmailHighlight}>
                {invitation.inviteeEmail}
              </Text>
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {invitation.status === 'revoked' ? (
            <View style={styles.statusBannerRevoked}>
              <Text style={styles.statusBannerTitle}>Invitation Revoked</Text>
              <Text style={styles.statusBannerText}>
                This invitation was revoked by the trip owner and can no longer be accepted.
              </Text>
              <Button
                label="Go to My Trips"
                variant="primary"
                fullWidth
                onPress={() => router.replace('/(tabs)/trips')}
                style={{ marginTop: spacing.md }}
              />
            </View>
          ) : invitation.status === 'expired' ? (
            <View style={styles.statusBannerExpired}>
              <Text style={styles.statusBannerTitle}>Invitation Expired</Text>
              <Text style={styles.statusBannerText}>
                This invitation has expired. Please ask the trip owner to send a new invitation link.
              </Text>
              <Button
                label="Go to My Trips"
                variant="primary"
                fullWidth
                onPress={() => router.replace('/(tabs)/trips')}
                style={{ marginTop: spacing.md }}
              />
            </View>
          ) : invitation.status === 'accepted' ? (
            <View style={styles.statusBannerAccepted}>
              <Text style={styles.statusBannerTitle}>Already Accepted</Text>
              <Text style={styles.statusBannerText}>
                This invitation has already been accepted. You can view the trip directly.
              </Text>
              <Button
                label="Open Trip"
                variant="primary"
                fullWidth
                onPress={() => router.replace(`/(tabs)/trips/${invitation.tripId}`)}
                style={{ marginTop: spacing.md }}
              />
            </View>
          ) : !authenticated ? (
            <View style={styles.unauthGroup}>
              <Text style={styles.unauthText}>
                Please sign in or create an account to accept this invitation.
              </Text>
              <Button
                label="Sign In"
                variant="primary"
                fullWidth
                onPress={handleSignIn}
                style={{ marginBottom: spacing.sm }}
              />
              <Button
                label="Create Account"
                variant="outline"
                fullWidth
                onPress={handleSignUp}
              />
            </View>
          ) : !isEmailMatch ? (
            <View style={styles.emailMismatchGroup}>
              <Text style={styles.emailMismatchText}>
                You are currently signed in as {user?.email}, but this invite was issued to {invitation.inviteeEmail}.
              </Text>
              <Button
                label="Switch Account"
                variant="outline"
                fullWidth
                onPress={handleSignIn}
              />
            </View>
          ) : (
            <View style={styles.authActionsGroup}>
              <Button
                label="Accept Invitation"
                variant="primary"
                fullWidth
                onPress={handleAccept}
                loading={accepting}
              />
              <Button
                label="Decline"
                variant="ghost"
                fullWidth
                onPress={handleDecline}
                disabled={accepting}
              />
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    justifyContent: 'space-between',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  brandHeader: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  brandTitle: {
    ...typography.display,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  inviteCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.sheet,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.card,
  },
  inviteOverline: {
    ...typography.label,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.primary,
    fontWeight: '700',
  },
  tripTitle: {
    ...typography.screenTitle,
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  tripDestination: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roleLabel: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  roleDescription: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  inviteeNotice: {
    marginTop: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  inviteeNoticeText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },
  inviteeEmailHighlight: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionsContainer: {
    paddingBottom: spacing.lg,
  },
  unauthGroup: {
    gap: spacing.md,
    alignItems: 'center',
  },
  unauthText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emailMismatchGroup: {
    gap: spacing.md,
    alignItems: 'center',
  },
  emailMismatchText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.warning,
    textAlign: 'center',
    lineHeight: 18,
  },
  authActionsGroup: {
    gap: spacing.sm,
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(176, 74, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIconText: {
    fontSize: 28,
    color: colors.destructive,
    fontWeight: '700',
  },
  errorTitle: {
    ...typography.screenTitle,
    fontSize: 20,
    color: colors.textPrimary,
  },
  errorSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  errorButton: {
    marginTop: spacing.md,
  },
  statusBannerRevoked: {
    backgroundColor: 'rgba(176, 74, 74, 0.1)',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.destructive,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusBannerExpired: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusBannerAccepted: {
    backgroundColor: 'rgba(44, 95, 94, 0.1)',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusBannerTitle: {
    ...typography.cardTitle,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  statusBannerText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
