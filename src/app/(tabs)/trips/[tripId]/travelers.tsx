import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Avatar, Badge, Button, IconButton } from '@/components/ui';
import { fetchTripById } from '@/services/trip';
import {
  listTripMembers,
  listTripInvitations,
  updateMemberRole,
  removeMember,
  leaveTrip,
  revokeTripInvitation,
  getInvitationUrl,
  subscribeToTripCollaboration,
} from '@/services/collaboration';
import { Traveler, Trip } from '@/services/mockData';
import { DomainTripInvitation } from '@/services/mappers';

/**
 * Route: /(tabs)/trips/[tripId]/travelers — Trip Members UI (Phase 8 — Step 6)
 *
 * Displays:
 *  - Trip owner (highlighted)
 *  - Current members and their roles (Owner, Editor, Viewer)
 *  - Pending invitations (visible only to the authorized trip owner)
 *  - Clear Share / Invite actions
 *  - Full state handling: Loading, Error with Retry, and Empty states
 *  - Owner actions: Change role (Editor <-> Viewer), Remove member, Revoke invitation
 *  - Member actions: View members, Leave trip (non-owners)
 */
export default function TripTravelersScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Traveler[]>([]);
  const [invitations, setInvitations] = useState<DomainTripInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!tripId) {
      setError('Trip ID is required.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const fetchedTrip = await fetchTripById(tripId);

      if (!fetchedTrip) {
        setError('Trip not found or you do not have permission to view it.');
        setTrip(null);
        setMembers([]);
        setInvitations([]);
        return;
      }

      setTrip(fetchedTrip);

      // Load members and invitations in parallel
      const [fetchedMembers, fetchedInvites] = await Promise.all([
        listTripMembers(tripId),
        listTripInvitations(tripId),
      ]);

      setMembers(fetchedMembers);

      // Filter to active, non-expired invitations
      const now = new Date();
      const activeInvites = (fetchedInvites || []).filter(
        (inv) => inv.status === 'pending' && new Date(inv.expiresAt) > now
      );
      setInvitations(activeInvites);
    } catch (err: any) {
      console.warn('[TripTravelersScreen] Error loading travelers:', err);
      setError(err.message || 'Failed to load travelers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to real-time collaboration updates
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

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handleShareTripPress = () => {
    if (tripId) {
      router.push(`/share/${tripId}`);
    }
  };

  const handleMemberPress = (member: Traveler) => {
    // Only the trip owner can modify member roles or remove members
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
              `Are you sure you want to remove ${member.name} from this trip? They will immediately lose access to its itinerary and expenses.`,
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

  const handleLeaveTrip = () => {
    Alert.alert(
      'Leave Trip',
      `Are you sure you want to leave "${trip?.title || 'this trip'}"? You will lose access to its itinerary and expenses.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Trip',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveTrip(tripId);
              router.replace('/(tabs)/trips');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to leave trip.');
            }
          },
        },
      ]
    );
  };

  const handleCopyInviteLink = async (inv: DomainTripInvitation) => {
    const url = getInvitationUrl(inv.token);
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert(
        'Link Copied',
        `Invitation link for ${inv.inviteeEmail} copied to clipboard.`
      );
    } catch (err) {
      console.warn('[TripTravelersScreen] Copy link error:', err);
    }
  };

  const handleShareInviteLink = async (inv: DomainTripInvitation) => {
    const url = getInvitationUrl(inv.token);
    try {
      await Share.share({
        title: 'Voyaro Trip Invitation',
        message: `Join "${trip?.title || 'Trip'}" on Voyaro as ${inv.role === 'editor' ? 'an Editor' : 'a Viewer'}!\n${url}`,
        url,
      });
    } catch (err) {
      console.warn('[TripTravelersScreen] Share invite link error:', err);
    }
  };

  const handleRevokeInvite = (invitationId: string, email: string) => {
    if (!isOwner) return;

    Alert.alert(
      'Revoke Invitation',
      `Are you sure you want to revoke the invitation sent to ${email}? The invitation link will be invalidated immediately.`,
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

  // ---------------------------------------------------------------------------
  // Render States: Loading & Error
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading travelers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
          <Text style={styles.navTitle}>Travelers</Text>
          <View style={styles.navRightPlaceholder} />
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIconCircle}>
            <Image
              source={require('@/assets/images/icons/close.svg')}
              style={styles.errorIcon}
              contentFit="contain"
            />
          </View>
          <Text style={styles.errorTitle}>Unable to View Travelers</Text>
          <Text style={styles.errorSubtitle}>
            {error || 'This trip could not be found or you do not have permission to view its members.'}
          </Text>
          <View style={styles.errorActionsRow}>
            <Button
              label="← All Trips"
              variant="outline"
              onPress={() => router.replace('/(tabs)/trips')}
              style={styles.errorButton}
            />
            <Button
              label="Retry"
              variant="primary"
              onPress={loadData}
              style={styles.errorButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Separate Trip Owner from Co-travelers
  const ownerMember = members.find((m) => m.role === 'owner');
  const coTravelers = members.filter((m) => m.role !== 'owner');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
        <Text style={styles.navTitle}>Travelers</Text>
        <Pressable
          onPress={handleShareTripPress}
          style={styles.inviteHeaderButton}
          accessibilityRole="button"
          accessibilityLabel={isOwner ? 'Invite traveler' : 'Share trip'}
        >
          <Text style={styles.inviteHeaderButtonText}>
            {isOwner ? '+ Invite' : '↗ Share'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.tripCategoryBadge}>
              {trip.status?.toUpperCase() || 'UPCOMING'} TRIP
            </Text>
            {trip.userRole && (
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

          <Text style={styles.tripTitle} numberOfLines={1}>
            {trip.title}
          </Text>
          <Text style={styles.tripSubtitle}>
            {members.length} {members.length === 1 ? 'traveler' : 'travelers'}
            {isOwner && invitations.length > 0 ? ` · ${invitations.length} pending invite` : ''}
            {trip.destination ? ` · ${trip.destination}` : ''}
          </Text>

          {/* Quick Action: Share & Invite */}
          <View style={styles.quickActionRow}>
            <Button
              label={isOwner ? '+ Invite Travel Companion' : '↗ Share Trip Link'}
              variant="primary"
              fullWidth
              onPress={handleShareTripPress}
            />
          </View>
        </View>

        {/* ── Section 1: Trip Owner ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Trip Owner</Text>
          <View style={styles.membersList}>
            {ownerMember ? (
              <View style={styles.memberCard}>
                <Avatar
                  name={ownerMember.name}
                  source={ownerMember.avatarUrl}
                  size="md"
                />
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {ownerMember.name}
                    </Text>
                    {ownerMember.isCurrentUser && (
                      <Text style={styles.youIndicator}>(You)</Text>
                    )}
                  </View>
                  <Text style={styles.memberRoleSubtitle}>Trip Organizer</Text>
                  {ownerMember.email && (
                    <Text style={styles.memberEmail} numberOfLines={1}>
                      {ownerMember.email}
                    </Text>
                  )}
                </View>

                <View style={styles.memberRight}>
                  <Badge label="OWNER" variant="success" />
                </View>
              </View>
            ) : (
              <View style={styles.emptyMemberCard}>
                <Text style={styles.emptyText}>Trip owner information unavailable.</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Section 2: Active Co-Travelers ────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>
              Co-Travelers ({coTravelers.length})
            </Text>
            {isOwner && coTravelers.length > 0 && (
              <Text style={styles.sectionHeaderNote}>Tap member to manage</Text>
            )}
          </View>

          <View style={styles.membersList}>
            {coTravelers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No co-travelers yet</Text>
                <Text style={styles.emptySubtitle}>
                  {isOwner
                    ? 'Invite travel companions to plan the itinerary and track expenses together.'
                    : 'No other collaborators have joined this trip yet.'}
                </Text>
                {isOwner && (
                  <Button
                    label="Send an Invite"
                    variant="outline"
                    onPress={handleShareTripPress}
                    style={styles.emptyInviteButton}
                  />
                )}
              </View>
            ) : (
              coTravelers.map((member) => {
                const isCurrentUser = member.isCurrentUser;
                const canManage = isOwner;

                return (
                  <Pressable
                    key={member.id}
                    onPress={() => handleMemberPress(member)}
                    disabled={!canManage}
                    style={({ pressed }) => [
                      styles.memberCard,
                      canManage && pressed && styles.memberCardPressed,
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
                        variant={member.role === 'editor' ? 'selected' : 'default'}
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
              })
            )}
          </View>
        </View>

        {/* ── Section 3: Pending Invitations (Authorized Owner Only) ────────── */}
        {isOwner && invitations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>
                Pending Invitations ({invitations.length})
              </Text>
            </View>

            <View style={styles.invitesCardList}>
              {invitations.map((inv) => (
                <View key={inv.id} style={styles.inviteItemCard}>
                  <View style={styles.inviteMainRow}>
                    <View style={styles.inviteIconCircle}>
                      <Text style={styles.inviteIconText}>✉</Text>
                    </View>

                    <View style={styles.inviteInfo}>
                      <Text style={styles.inviteEmail} numberOfLines={1}>
                        {inv.inviteeEmail}
                      </Text>
                      <View style={styles.inviteMetaRow}>
                        <Badge
                          label={inv.role.toUpperCase()}
                          variant={inv.role === 'editor' ? 'selected' : 'default'}
                        />
                        <Badge label="PENDING" variant="warning" />
                        <Text style={styles.inviteExpiryText}>
                          {formatExpiresIn(inv.expiresAt)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Invitation Action Buttons */}
                  <View style={styles.inviteActionsRow}>
                    <Pressable
                      onPress={() => handleCopyInviteLink(inv)}
                      style={styles.inviteActionButton}
                      accessibilityRole="button"
                      accessibilityLabel="Copy invitation link"
                    >
                      <Text style={styles.inviteActionButtonText}>Copy Link</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleShareInviteLink(inv)}
                      style={styles.inviteActionButton}
                      accessibilityRole="button"
                      accessibilityLabel="Share invitation link"
                    >
                      <Text style={styles.inviteActionButtonText}>↗ Share</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleRevokeInvite(inv.id, inv.inviteeEmail)}
                      style={styles.revokeActionButton}
                      accessibilityRole="button"
                      accessibilityLabel="Revoke invitation"
                    >
                      <Text style={styles.revokeActionButtonText}>Revoke</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Section 4: Non-owner Leave Trip Option ────────────────────────── */}
        {!isOwner && (
          <View style={styles.leaveTripContainer}>
            <Button
              label="Leave This Trip"
              variant="outline"
              onPress={handleLeaveTrip}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  inviteHeaderButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
  },
  inviteHeaderButtonText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  navRightPlaceholder: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  summaryTopRow: {
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
    marginTop: 2,
  },
  tripSubtitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
  },
  quickActionRow: {
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  sectionHeader: {
    ...typography.label,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderNote: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  membersList: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  memberCardPressed: {
    backgroundColor: colors.backgroundAlt,
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  memberRoleSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
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
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.cardTitle,
    fontSize: 15,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyInviteButton: {
    marginTop: spacing.sm,
  },
  emptyMemberCard: {
    padding: spacing.md,
  },
  emptyText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
  },
  invitesCardList: {
    gap: spacing.sm,
  },
  inviteItemCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  inviteMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  inviteIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteIconText: {
    fontSize: 15,
    color: colors.primary,
  },
  inviteInfo: {
    flex: 1,
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
  inviteExpiryText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  inviteActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inviteActionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.button,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inviteActionButtonText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  revokeActionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.button,
  },
  revokeActionButtonText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.destructive,
    fontWeight: '600',
  },
  leaveTripContainer: {
    marginTop: spacing.xs,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  errorIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  errorIcon: {
    width: 24,
    height: 24,
    tintColor: colors.textSecondary,
  },
  errorTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
    color: colors.textPrimary,
  },
  errorSubtitle: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  errorButton: {
    minWidth: 120,
  },
});
