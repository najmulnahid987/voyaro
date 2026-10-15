/**
-- Voyaro Trip Collaboration Service (Phase 8 — Step 4)
--
-- Manages:
--   - Trip membership listing and role detection (owner, editor, viewer)
--   - Invitation creation, cancellation, and atomic acceptance (via RPC)
--   - Member role changes and member removal / leaving trip
--   - Reactive subscriptions for real-time UI updates
--*/

import { supabase } from './supabase';
import {
  DomainTripInvitation,
  mapTripInvitationRowToDomain,
  mapTripMemberToTraveler,
} from './mappers';
import {
  ProfileRow,
  TripInvitationRow,
  TripMemberRow,
} from '@/types/database.types';
import { Traveler } from './mockData';

// ---------------------------------------------------------------------------
// 1. Reactive Store & Listeners
// ---------------------------------------------------------------------------

type CollaborationListener = (tripId: string) => void;
const listeners = new Set<CollaborationListener>();

function notifyCollaboration(tripId: string) {
  listeners.forEach((listener) => {
    try {
      listener(tripId);
    } catch (err) {
      console.warn('[Voyaro Collaboration] Listener error:', err);
    }
  });
}

export function subscribeToTripCollaboration(
  listener: CollaborationListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// 2. Members Management
// ---------------------------------------------------------------------------

/**
 * Lists all active travelers for a given trip.
 * Queries trip_members and joins profiles to build comprehensive Traveler records.
 */
export async function listTripMembers(tripId: string): Promise<Traveler[]> {
  if (!tripId) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Query trip_members
  const { data: memberRows, error: membersError } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (membersError) {
    console.warn(`[Voyaro Collaboration] Error listing members for ${tripId}:`, membersError.message);
    return [];
  }

  if (!memberRows || memberRows.length === 0) {
    return [];
  }

  // Fetch profiles of all members on this trip
  const userIds = memberRows.map((m: TripMemberRow) => m.user_id);
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  const profileMap = new Map<string, ProfileRow>();
  (profileRows || []).forEach((p: ProfileRow) => profileMap.set(p.id, p));

  const travelers = memberRows.map((member: TripMemberRow) => {
    const profile = profileMap.get(member.user_id);
    return mapTripMemberToTraveler(member, profile, user?.id);
  });

  // Sort so that Owner is first, then Editors, then Viewers
  const rolePriority: Record<string, number> = { owner: 1, editor: 2, viewer: 3 };
  return travelers.sort((a, b) => {
    const pA = rolePriority[a.role || 'viewer'] || 4;
    const pB = rolePriority[b.role || 'viewer'] || 4;
    return pA - pB;
  });
}

/**
 * Returns the current authenticated user's role on the given trip.
 */
export async function fetchUserTripRole(
  tripId: string
): Promise<'owner' | 'editor' | 'viewer' | null> {
  if (!tripId) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return (data as { role: 'owner' | 'editor' | 'viewer' }).role;
}

/**
 * Updates a member's role (editor <-> viewer).
 * Only the trip owner can perform this operation.
 */
export async function updateMemberRole(
  tripId: string,
  userId: string,
  newRole: 'editor' | 'viewer'
): Promise<void> {
  const { error } = await supabase
    .from('trip_members')
    .update({ role: newRole })
    .eq('trip_id', tripId)
    .eq('user_id', userId);

  if (error) {
    console.error(`[Voyaro Collaboration] updateMemberRole failed:`, error.message);
    throw new Error(`Failed to update member role: ${error.message}`);
  }

  notifyCollaboration(tripId);
}

/**
 * Removes a collaborator from the trip.
 * Security requirements:
 *   - Only the trip owner can remove members (enforced both in service & RLS).
 *   - The owner cannot remove themselves through ordinary member removal.
 *   - Attempts to remove the trip owner are explicitly blocked.
 *   - Verifies rows were actually deleted under RLS.
 */
export async function removeMember(tripId: string, userId: string): Promise<void> {
  if (!tripId || !userId) {
    throw new Error('Trip ID and User ID are required.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to remove members.');
  }

  // 1. Guard: Check target member role. The owner cannot be removed.
  const { data: targetMember } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();

  if (targetMember?.role === 'owner') {
    throw new Error('The trip owner cannot be removed from the trip.');
  }

  // 2. Perform delete in database (RLS ensures only owner can remove other members, role <> 'owner')
  const { data: deletedRows, error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .select();

  if (error) {
    console.error(`[Voyaro Collaboration] removeMember failed:`, error.message);
    throw new Error(`Failed to remove member: ${error.message}`);
  }

  if (!deletedRows || deletedRows.length === 0) {
    throw new Error('Failed to remove member: permission denied or member not found.');
  }

  notifyCollaboration(tripId);
}

/**
 * Allows the current authenticated user to leave a shared trip.
 * Owners cannot leave; they must transfer ownership or delete the trip.
 */
export async function leaveTrip(tripId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to leave a trip.');
  }

  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', user.id);

  if (error) {
    console.error(`[Voyaro Collaboration] leaveTrip failed:`, error.message);
    throw new Error(`Failed to leave trip: ${error.message}`);
  }

  notifyCollaboration(tripId);
}

// ---------------------------------------------------------------------------
// 3. Invitations Management (Phase 8 — Step 4)
// ---------------------------------------------------------------------------

export interface InvitationStatusResult {
  status: 'pending' | 'accepted' | 'declined' | 'canceled' | 'revoked' | 'expired';
  isExpired: boolean;
  isValid: boolean;
  inviteeEmail: string;
  role: 'editor' | 'viewer';
  tripId: string;
  tripTitle?: string;
  tripDestination?: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Generates an invitation link for a given token.
 * Uses expo-linking to construct a scheme-based or universal web link.
 */
export function getInvitationUrl(token: string): string {
  if (!token?.trim()) return '';
  // In Expo app, Linking.createURL generates the proper scheme (e.g. voyaro://invite/token)
  try {
    const Linking = require('expo-linking');
    return Linking.createURL(`/invite/${token.trim()}`);
  } catch {
    return `voyaro://invite/${token.trim()}`;
  }
}

/**
 * Lists all pending invitations for a specific trip, or across all owned trips.
 * Strict authorization: Only trip owners can list invitations.
 */
export async function listTripInvitations(
  tripId?: string
): Promise<DomainTripInvitation[]> {
  let query = supabase
    .from('trip_invitations')
    .select('*')
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (tripId) {
    query = query.eq('trip_id', tripId);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.warn(`[Voyaro Collaboration] listTripInvitations error:`, error.message);
    return [];
  }

  return (rows as TripInvitationRow[] || []).map(mapTripInvitationRowToDomain);
}

/**
 * Alias for listing invitations belonging to a trip owner.
 */
export const listOwnerInvitations = listTripInvitations;

/**
 * Creates/sends an invitation for a collaborator.
 * Security requirements:
 *   - Caller must be authenticated
 *   - Caller must be the authoritative owner of the trip
 *   - Role must be strictly 'editor' or 'viewer'
 *   - Email normalized to lowercase
 *   - Prevent inviting an existing member
 */
export async function sendTripInvitation(
  tripId: string,
  email: string,
  role: 'editor' | 'viewer' = 'editor'
): Promise<DomainTripInvitation> {
  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  if (role !== 'editor' && role !== 'viewer') {
    throw new Error('Invalid role. Invited role must be "editor" or "viewer".');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to invite travelers.');
  }

  // Security check: Verify caller is trip owner
  const callerRole = await fetchUserTripRole(tripId);
  if (callerRole !== 'owner') {
    throw new Error('Only the trip owner can send invitations.');
  }

  // Check if user is already a member
  const currentMembers = await listTripMembers(tripId);
  const alreadyMember = currentMembers.some(
    (m) => m.email?.toLowerCase() === normalizedEmail
  );
  if (alreadyMember) {
    throw new Error(`${normalizedEmail} is already a member of this trip.`);
  }

  const { data: createdRow, error } = await supabase
    .from('trip_invitations')
    .insert({
      trip_id: tripId,
      inviter_id: user.id,
      invitee_email: normalizedEmail,
      role,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error(`[Voyaro Collaboration] sendTripInvitation error:`, error.message);
    if (error.code === '23505') {
      throw new Error(`A pending invitation has already been sent to ${normalizedEmail}.`);
    }
    throw new Error(`Failed to send invitation: ${error.message}`);
  }

  notifyCollaboration(tripId);
  return mapTripInvitationRowToDomain(createdRow as TripInvitationRow);
}

/**
 * Alias for creating an invitation.
 */
export const createInvitation = sendTripInvitation;

/**
 * Revokes or cancels a pending invitation.
 * Security: Only the trip owner can revoke invitations.
 */
export async function revokeTripInvitation(
  tripId: string,
  invitationId: string
): Promise<void> {
  if (!tripId || !invitationId) {
    throw new Error('Trip ID and Invitation ID are required.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be signed in to revoke invitations.');
  }

  // Update status to 'revoked' so it is audited and permanently blocked.
  // select() verifies mutation succeeded under RLS (only owner can update).
  const { data: updatedRows, error } = await supabase
    .from('trip_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('trip_id', tripId)
    .select();

  if (error) {
    console.error(`[Voyaro Collaboration] revokeTripInvitation error:`, error.message);
    throw new Error(`Failed to revoke invitation: ${error.message}`);
  }

  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('Failed to revoke invitation: permission denied or invitation not found.');
  }

  notifyCollaboration(tripId);
}

/**
 * Cancels or deletes a pending invitation (backwards compatibility).
 */
export async function cancelTripInvitation(
  tripId: string,
  invitationId: string
): Promise<void> {
  return revokeTripInvitation(tripId, invitationId);
}

/**
 * Gets the current status of an invitation by token.
 */
export async function getInvitationStatus(
  token: string
): Promise<InvitationStatusResult | null> {
  if (!token?.trim()) return null;

  const { data: row, error } = await supabase
    .from('trip_invitations')
    .select('*, trips(title, destination)')
    .eq('token', token.trim())
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(row.expires_at);
  const isExpired = row.status === 'expired' || expiresAt <= now;
  const status = isExpired && row.status === 'pending' ? 'expired' : row.status;
  const isValid = status === 'pending' && !isExpired;

  const tripInfo = (row as any).trips;

  return {
    status,
    isExpired,
    isValid,
    inviteeEmail: row.invitee_email,
    role: row.role as 'editor' | 'viewer',
    tripId: row.trip_id,
    tripTitle: tripInfo?.title,
    tripDestination: tripInfo?.destination,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

/**
 * Accepts an invitation using its secure token.
 * Calls the atomic SECURITY DEFINER accept_trip_invitation RPC.
 */
export async function acceptTripInvitation(
  invitationToken: string
): Promise<{ success: boolean; tripId?: string; role?: string; error?: string }> {
  if (!invitationToken?.trim()) {
    return { success: false, error: 'Invitation token is missing.' };
  }

  const { data, error } = await (supabase.rpc as any)('accept_trip_invitation', {
    invitation_token: invitationToken.trim(),
  });

  if (error) {
    console.error('[Voyaro Collaboration] accept_trip_invitation RPC error:', error.message);
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; trip_id?: string; role?: string; error?: string };

  if (result.success && result.trip_id) {
    notifyCollaboration(result.trip_id);
    return {
      success: true,
      tripId: result.trip_id,
      role: result.role,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to accept invitation.',
  };
}

/**
 * Alias for accepting an invitation.
 */
export const acceptInvitation = acceptTripInvitation;

/**
 * Fetches invitation details by token for previewing before acceptance.
 */
export async function fetchInvitationByToken(
  token: string
): Promise<{
  invitation: DomainTripInvitation;
  tripTitle?: string;
  tripDestination?: string;
} | null> {
  if (!token?.trim()) return null;

  const statusResult = await getInvitationStatus(token);
  if (!statusResult) return null;

  const domain: DomainTripInvitation = {
    id: '',
    tripId: statusResult.tripId,
    inviterId: '',
    inviteeEmail: statusResult.inviteeEmail,
    role: statusResult.role,
    token: token.trim(),
    status: statusResult.status,
    createdAt: statusResult.createdAt,
    expiresAt: statusResult.expiresAt,
  };

  return {
    invitation: domain,
    tripTitle: statusResult.tripTitle,
    tripDestination: statusResult.tripDestination,
  };
}
