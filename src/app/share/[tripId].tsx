import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { colors, radius, spacing, typography } from '@/theme';
import { Avatar, Badge, Button, IconButton, Input } from '@/components/ui';
import { fetchTripById } from '@/services/trip';
import {
  listTripMembers,
  listTripInvitations,
  sendTripInvitation,
  revokeTripInvitation,
  updateMemberRole,
  removeMember,
  getInvitationUrl,
  subscribeToTripCollaboration,
} from '@/services/collaboration';
import { Traveler, Trip } from '@/services/mockData';
import { DomainTripInvitation } from '@/services/mappers';

/**
 * Route: /share/[tripId] — Trip Sharing & Invites (Phase 8 — Step 5)
 * Allows trip owners to invite co-travelers via email, manage roles, copy/share invite links,
 * and view active members & pending invitations.
 */
export default function ShareTripScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Traveler[]>([]);
  const [invitations, setInvitations] = useState<DomainTripInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Invite Form State
  const [isInviteFormOpen, setIsInviteFormOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Link copy feedback state
  const [copiedMainLink, setCopiedMainLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = async () => {
    if (!tripId) return;
    try {
      const [fetchedTrip, fetchedMembers, fetchedInvites] = await Promise.all([
        fetchTripById(tripId),
        listTripMembers(tripId),
        listTripInvitations(tripId),
      ]);
      setTrip(fetchedTrip);
      setMembers(fetchedMembers);
      // Filter out any invitations that are not pending or have already expired
      const now = new Date();
      const activeInvites = (fetchedInvites || []).filter(
        (inv) => inv.status === 'pending' && new Date(inv.expiresAt) > now
      );
      setInvitations(activeInvites);
    } catch (err) {
      console.warn('[ShareTripScreen] Error loading share data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to collaboration events (role updates, invites, members accepted)
    const unsubscribe = subscribeToTripCollaboration((updatedTripId) => {
      if (updatedTripId === tripId) {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tripId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const isOwner = trip?.isOwner !== false;
  const shareLink = `voyaro://trip/${tripId}`;

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handleCopyMainLink = async () => {
    try {
      await Clipboard.setStringAsync(shareLink);
      setCopiedMainLink(true);
      setTimeout(() => setCopiedMainLink(false), 2000);
      Alert.alert('Link Copied', 'Trip link copied to clipboard.');
    } catch (err) {
      console.warn('[ShareTripScreen] Copy link error:', err);
    }
  };

  const handleShareMainLink = async () => {
    try {
      await Share.share({
        title: trip?.title || 'Voyaro Trip',
        message: `Join my trip "${trip?.title || 'Trip'}" to ${trip?.destination || 'Destination'} on Voyaro!\n${shareLink}`,
      });
    } catch (err) {
      console.warn('[ShareTripScreen] Share link error:', err);
    }
  };

  const handleCopyInviteLink = async (inv: DomainTripInvitation) => {
    const url = getInvitationUrl(inv.token);
    try {
      await Clipboard.setStringAsync(url);
      setCopiedToken(inv.token);
      setTimeout(() => setCopiedToken(null), 2500);
      Alert.alert(
        'Invitation Link Copied',
        `Direct invitation link for ${inv.inviteeEmail} copied to clipboard.\n\n${url}`
      );
    } catch (err) {
      console.warn('[ShareTripScreen] Copy invite link error:', err);
    }
  };

  const handleShareInviteLink = async (inv: DomainTripInvitation) => {
    const url = getInvitationUrl(inv.token);
    try {
      await Share.share({
        title: `Voyaro Trip Invitation`,
        message: `You've been invited to join "${trip?.title || 'Trip'}" to ${trip?.destination || 'Destination'} on Voyaro as ${inv.role === 'editor' ? 'an Editor' : 'a Viewer'}!\n${url}`,
        url,
      });
    } catch (err) {
      console.warn('[ShareTripScreen] Share invite link error:', err);
    }
  };

  const handleSendInvite = async () => {
    setEmailError(null);
    const cleanEmail = inviteEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail) {
      setEmailError('Please enter an email address.');
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setSendingInvite(true);
    try {
      const createdInvite = await sendTripInvitation(tripId, cleanEmail, inviteRole);
      setInviteEmail('');
      setIsInviteFormOpen(false);

      const url = getInvitationUrl(createdInvite.token);

      Alert.alert(
        'Invitation Created',
        `Invitation for ${cleanEmail} created as ${inviteRole === 'editor' ? 'an Editor' : 'a Viewer'}.\n\nYou can copy or share the invite link directly.`,
        [
          {
            text: 'Copy Link',
            onPress: () => handleCopyInviteLink(createdInvite),
          },
          {
            text: 'Share Link',
            onPress: () => handleShareInviteLink(createdInvite),
          },
          { text: 'Done', style: 'cancel' },
        ]
      );
      loadData();
    } catch (err: any) {
      Alert.alert('Invitation Failed', err.message || 'Could not send invitation.');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCancelInviteForm = () => {
    setIsInviteFormOpen(false);
    setInviteEmail('');
    setEmailError(null);
  };

  const handleRevokeInvite = async (invitationId: string, email: string) => {
    if (!isOwner) return;

    Alert.alert(
      'Revoke Invitation',
      `Are you sure you want to cancel the invitation sent to ${email}? The invitation link will be invalidated immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeTripInvitation(tripId, invitationId);
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to revoke invitation.');
            }
          },
        },
      ]
    );
  };

  const handleMemberPress = (member: Traveler) => {
    // Only the trip owner can manage permissions; owner cannot demote or remove self here
    if (!isOwner || member.role === 'owner') return;

    const nextRole: 'editor' | 'viewer' = member.role === 'editor' ? 'viewer' : 'editor';
    const nextRoleLabel = nextRole === 'editor' ? 'Editor (Can Edit)' : 'Viewer (Read-only)';

    Alert.alert(
      `Manage ${member.name}`,
      `Current Role: ${member.role?.toUpperCase() || 'MEMBER'}${member.email ? `\nEmail: ${member.email}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Change to ${nextRoleLabel}`,
          onPress: async () => {
            try {
              await updateMemberRole(tripId, member.id, nextRole);
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update role.');
            }
          },
        },
        {
          text: 'Remove from Trip',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Removal',
              `Are you sure you want to remove ${member.name} from this trip?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await removeMember(tripId, member.id);
                      loadData();
                    } catch (err: any) {
                      Alert.alert('Error', err.message || 'Failed to remove member.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const formatExpiresIn = (expiresAtStr: string) => {
    try {
      const diffMs = new Date(expiresAtStr).getTime() - Date.now();
      if (diffMs <= 0) return 'Expired';
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`;
    } catch {
      return 'Expires soon';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading trip details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Nav Bar */}
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
          <Text style={styles.navTitle}>Share Trip</Text>
          <View style={styles.navRightPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Trip Summary Card */}
          <View style={styles.tripCard}>
            <View style={styles.tripCardContent}>
              <View style={styles.badgeRow}>
                <Text style={styles.tripCategoryBadge}>
                  {trip?.status?.toUpperCase() || 'UPCOMING'} TRIP
                </Text>
                {trip?.userRole && (
                  <Badge
                    label={trip.userRole.toUpperCase()}
                    variant={
                      trip.userRole === 'owner'
                        ? 'success'
                        : trip.userRole === 'editor'
                        ? 'selected'
                        : 'default'
                    }
                  />
                )}
              </View>
              <Text style={styles.tripTitle}>{trip?.title || 'Trip'}</Text>
              <Text style={styles.tripDates}>
                {trip?.destination ? `${trip.destination} · ` : ''}
                {trip?.dates || 'Dates not set'}
              </Text>
            </View>
          </View>

          {/* Quick Share Link Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Trip Link</Text>
            <Text style={styles.sectionSubtitle}>
              Share a direct link to this trip with companions who have access.
            </Text>

            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={1}>
                {shareLink}
              </Text>
              <View style={styles.linkButtonsRow}>
                <Pressable
                  onPress={handleCopyMainLink}
                  style={({ pressed }) => [
                    styles.secondaryCopyButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Copy trip link"
                >
                  <Text style={styles.secondaryCopyButtonText}>
                    {copiedMainLink ? '✓ Copied' : 'Copy'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleShareMainLink}
                  style={({ pressed }) => [
                    styles.primaryShareButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Share trip link"
                >
                  <Text style={styles.primaryShareButtonText}>Share</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Invite Section (Owner Only) */}
          {isOwner ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderTitleCol}>
                  <Text style={styles.sectionTitle}>Invite Travelers</Text>
                  <Text style={styles.sectionSubtitle}>
                    Grant edit or read-only access to specific collaborators.
                  </Text>
                </View>

                {!isInviteFormOpen && (
                  <Button
                    label="+ Invite"
                    variant="primary"
                    onPress={() => setIsInviteFormOpen(true)}
                  />
                )}
              </View>

              {/* Collapsible Invite Form */}
              {isInviteFormOpen && (
                <View style={styles.formContainer}>
                  <Input
                    label="Email Address"
                    placeholder="traveler@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={inviteEmail}
                    onChangeText={(text) => {
                      setInviteEmail(text);
                      if (emailError) setEmailError(null);
                    }}
                    error={emailError ?? undefined}
                  />

                  {/* Role Selector: Strictly Editor or Viewer (Owner NOT selectable) */}
                  <View style={styles.roleSelectionWrapper}>
                    <Text style={styles.roleSelectLabel}>Select Role</Text>
                    <View style={styles.roleRow}>
                      <Pressable
                        onPress={() => setInviteRole('editor')}
                        style={[
                          styles.roleChip,
                          inviteRole === 'editor' && styles.roleChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleChipTitle,
                            inviteRole === 'editor' && styles.roleChipTitleActive,
                          ]}
                        >
                          Editor
                        </Text>
                        <Text style={styles.roleChipDesc}>
                          Can edit itinerary & expenses
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setInviteRole('viewer')}
                        style={[
                          styles.roleChip,
                          inviteRole === 'viewer' && styles.roleChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleChipTitle,
                            inviteRole === 'viewer' && styles.roleChipTitleActive,
                          ]}
                        >
                          Viewer
                        </Text>
                        <Text style={styles.roleChipDesc}>
                          Can only view trip details
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Form Action Buttons: Send & Cancel */}
                  <View style={styles.formActionsRow}>
                    <Button
                      label="Cancel"
                      variant="outline"
                      onPress={handleCancelInviteForm}
                      disabled={sendingInvite}
                      style={styles.formActionButton}
                    />
                    <Button
                      label="Send Invitation"
                      variant="primary"
                      onPress={handleSendInvite}
                      loading={sendingInvite}
                      disabled={sendingInvite || !inviteEmail.trim()}
                      style={styles.formActionButton}
                    />
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeText}>
                You are participating as{' '}
                <Text style={styles.noticeRole}>
                  {trip?.userRole?.toUpperCase() || 'A COLLABORATOR'}
                </Text>
                . Only the trip owner can send new invitations or manage permissions.
              </Text>
            </View>
          )}

          {/* Pending Invitations Section */}
          {invitations.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Pending Invitations ({invitations.length})
                </Text>
              </View>

              <View style={styles.invitesList}>
                {invitations.map((inv) => {
                  const isCurrentTokenCopied = copiedToken === inv.token;
                  return (
                    <View key={inv.id} style={styles.inviteItem}>
                      <View style={styles.inviteInfo}>
                        <Text style={styles.inviteEmail}>{inv.inviteeEmail}</Text>
                        <View style={styles.inviteMetaRow}>
                          <Badge
                            label={inv.role.toUpperCase()}
                            variant={inv.role === 'editor' ? 'selected' : 'default'}
                          />
                          <Badge label="PENDING" variant="warning" />
                          <Text style={styles.inviteExpiry}>
                            {formatExpiresIn(inv.expiresAt)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.inviteItemActions}>
                        <Pressable
                          onPress={() => handleCopyInviteLink(inv)}
                          style={styles.copyInviteIconButton}
                          accessibilityRole="button"
                          accessibilityLabel="Copy invitation link"
                        >
                          <Text style={styles.copyInviteIconText}>
                            {isCurrentTokenCopied ? '✓ Copied' : 'Copy'}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => handleShareInviteLink(inv)}
                          style={styles.shareIconButton}
                          accessibilityRole="button"
                          accessibilityLabel="Share invitation link"
                        >
                          <Text style={styles.shareIconText}>↗ Share</Text>
                        </Pressable>

                        {isOwner && (
                          <Pressable
                            onPress={() => handleRevokeInvite(inv.id, inv.inviteeEmail)}
                            style={styles.revokeButton}
                            accessibilityRole="button"
                            accessibilityLabel="Revoke invitation"
                          >
                            <Text style={styles.revokeButtonText}>Revoke</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Current Members Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Current Members ({members.length})
              </Text>
              {isOwner && (
                <Text style={styles.sectionHeaderNote}>Tap member to manage</Text>
              )}
            </View>

            <View style={styles.membersList}>
              {members.map((member) => {
                const isCurrentUser = member.isCurrentUser;
                const isMemberOwner = member.role === 'owner';
                const canManage = isOwner && !isMemberOwner;

                return (
                  <Pressable
                    key={member.id}
                    onPress={() => handleMemberPress(member)}
                    disabled={!canManage}
                    style={({ pressed }) => [
                      styles.memberRow,
                      canManage && pressed && styles.memberRowPressed,
                    ]}
                  >
                    <Avatar
                      name={member.name}
                      source={member.avatarUrl}
                      size="md"
                    />
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {member.name}
                        </Text>
                        {isCurrentUser && (
                          <Text style={styles.youIndicator}>(You)</Text>
                        )}
                      </View>
                      {member.email && (
                        <Text style={styles.memberEmail} numberOfLines={1}>
                          {member.email}
                        </Text>
                      )}
                    </View>

                    <View style={styles.memberRight}>
                      <Badge
                        label={(member.role || 'viewer').toUpperCase()}
                        variant={
                          member.role === 'owner'
                            ? 'success'
                            : member.role === 'editor'
                            ? 'selected'
                            : 'default'
                        }
                      />
                      {canManage && (
                        <Image
                          source={require('@/assets/images/onboarding/arrow-right.svg')}
                          style={styles.chevronIcon}
                          contentFit="contain"
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
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
  container: {
    flex: 1,
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
  navTitle: {
    ...typography.sectionTitle,
    fontSize: 17,
    color: colors.textPrimary,
  },
  navIcon: {
    width: 20,
    height: 20,
    tintColor: colors.textPrimary,
  },
  navRightPlaceholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  tripCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  tripCardContent: {
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripCategoryBadge: {
    ...typography.label,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  tripTitle: {
    ...typography.sectionTitle,
    fontSize: 20,
    color: colors.textPrimary,
  },
  tripDates: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderTitleCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  sectionHeaderNote: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  sectionTitle: {
    ...typography.cardTitle,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  linkText: {
    flex: 1,
    ...typography.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  linkButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  secondaryCopyButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryCopyButtonText: {
    ...typography.label,
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  primaryShareButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
  },
  primaryShareButtonText: {
    ...typography.label,
    fontSize: 11,
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  formContainer: {
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  roleSelectionWrapper: {
    gap: spacing.xs,
  },
  roleSelectLabel: {
    ...typography.label,
    fontSize: 12,
    color: colors.textSecondary,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
    gap: 2,
  },
  roleChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  roleChipTitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  roleChipTitleActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  roleChipDesc: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  formActionButton: {
    flex: 1,
  },
  noticeCard: {
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeText: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  noticeRole: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  invitesList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  inviteItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  inviteInfo: {
    gap: 4,
  },
  inviteEmail: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  inviteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  inviteExpiry: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  inviteItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  copyInviteIconButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.button,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyInviteIconText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  shareIconButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.button,
    backgroundColor: colors.primarySurface,
  },
  shareIconText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  revokeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.button,
  },
  revokeButtonText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.destructive,
    fontWeight: '600',
  },
  membersList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  memberRowPressed: {
    opacity: 0.7,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberName: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  youIndicator: {
    ...typography.caption,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  memberEmail: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },
  memberRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chevronIcon: {
    width: 14,
    height: 14,
    tintColor: colors.textMuted,
  },
});
