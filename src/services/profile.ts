/**
 * Voyaro Profile Management Service (Phase 7 — Step 6)
 *
 * Connects the user profile and onboarding flows to the Supabase `profiles` table.
 *
 * Guarantees:
 *  - Profile ID always matches the authenticated Supabase user ID (`auth.uid()`)
 *  - Never trusts client-supplied user IDs to bypass ownership
 *  - Safe profile retrieval and auto-creation fallback (avoids duplicate records)
 *  - Saves display name, avatar, traveler type, interests, travel pace, and onboarding status
 *  - Reactivity via listeners when preferences change
 */

import { supabase } from './supabase';
import { DomainProfile, mapProfileRowToDomain } from './mappers';
import { ProfileRow, ProfileUpdate } from '@/types/database.types';

export type { DomainProfile };

// ---------------------------------------------------------------------------
// 1. Profile Types & Allowed Enums
// ---------------------------------------------------------------------------

export type TravelStyle = 'solo' | 'couple' | 'family' | 'friends' | 'business';
export type TravelPace = 'relaxed' | 'balanced' | 'packed';

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string | null;
  travelStyle?: TravelStyle | null;
  interests?: string[];
  travelPace?: TravelPace | null;
  onboardingCompleted?: boolean;
}

// ---------------------------------------------------------------------------
// 2. Cached State & Reactive Subscriptions
// ---------------------------------------------------------------------------

let currentProfile: DomainProfile | null = null;
type ProfileListener = (profile: DomainProfile | null) => void;
const profileListeners = new Set<ProfileListener>();

function notifyProfileListeners() {
  const snapshot = currentProfile ? { ...currentProfile } : null;
  profileListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.warn('[Voyaro Profile] Listener notification error:', err);
    }
  });
}

export function subscribeToProfile(listener: ProfileListener): () => void {
  profileListeners.add(listener);
  try {
    listener(currentProfile ? { ...currentProfile } : null);
  } catch (err) {
    console.warn('[Voyaro Profile] Initial listener error:', err);
  }

  return () => {
    profileListeners.delete(listener);
  };
}

export function getCachedProfile(): DomainProfile | null {
  return currentProfile ? { ...currentProfile } : null;
}

export function clearProfileCache(): void {
  currentProfile = null;
  notifyProfileListeners();
}

// ---------------------------------------------------------------------------
// 3. Profile Fetching & Auto-Creation
// ---------------------------------------------------------------------------

/**
 * Retrieves the profile for the authenticated user from Supabase.
 * Returns null if the user is unauthenticated or has no profile.
 */
export async function getProfile(): Promise<DomainProfile | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    currentProfile = null;
    notifyProfileListeners();
    return null;
  }

  try {
    const { data: row, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('[Voyaro Profile] Error fetching profile:', error.message);
      return currentProfile;
    }

    if (!row) {
      return null;
    }

    currentProfile = mapProfileRowToDomain(row as ProfileRow);
    notifyProfileListeners();
    return currentProfile;
  } catch (err: any) {
    console.warn('[Voyaro Profile] Exception in getProfile:', err);
    return currentProfile;
  }
}

/**
 * Ensures a valid profile row exists in `public.profiles` for the current user.
 * If not present (e.g. edge cases), safely creates one with zero duplicates.
 */
export async function ensureProfile(): Promise<DomainProfile> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('[Voyaro Profile] Cannot ensure profile: User is not authenticated.');
  }

  // 1. Check if profile already exists
  const existing = await getProfile();
  if (existing) {
    return existing;
  }

  // 2. Profile missing -> insert initial profile row
  const displayName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Traveler';

  try {
    const { data: createdRow, error: insertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: displayName,
        email: user.email || '',
        interests: [],
        onboarding_completed: false,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`[Voyaro Profile] Failed to create profile: ${insertError.message}`);
    }

    currentProfile = mapProfileRowToDomain(createdRow as ProfileRow);
    notifyProfileListeners();
    return currentProfile;
  } catch (err: any) {
    console.error('[Voyaro Profile] Error in ensureProfile:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 4. Updating Profile & Preferences
// ---------------------------------------------------------------------------

/**
 * Updates the authenticated user's profile with partial input.
 * All updates are locked to the user ID authenticated in Supabase.
 */
export async function updateProfile(updates: UpdateProfileInput): Promise<DomainProfile> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('[Voyaro Profile] Cannot update profile: User is not authenticated.');
  }

  // Ensure user profile record exists in public.profiles
  await ensureProfile();

  const payload: ProfileUpdate = {};

  if (updates.displayName !== undefined) {
    payload.display_name = updates.displayName.trim();
  }
  if (updates.avatarUrl !== undefined) {
    payload.avatar_url = updates.avatarUrl;
  }
  if (updates.travelStyle !== undefined) {
    payload.travel_style = updates.travelStyle;
  }
  if (updates.interests !== undefined) {
    payload.interests = updates.interests;
  }
  if (updates.travelPace !== undefined) {
    payload.travel_pace = updates.travelPace;
  }
  if (updates.onboardingCompleted !== undefined) {
    payload.onboarding_completed = updates.onboardingCompleted;
  }

  try {
    const { data: updatedRow, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error(`[Voyaro Profile] Database update failed: ${error.message}`);
    }

    currentProfile = mapProfileRowToDomain(updatedRow as ProfileRow);
    notifyProfileListeners();
    return currentProfile;
  } catch (err: any) {
    console.error('[Voyaro Profile] Update error:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 5. Specialized Onboarding Flow Updaters
// ---------------------------------------------------------------------------

export async function saveTravelStyle(travelStyle: TravelStyle): Promise<DomainProfile> {
  return updateProfile({ travelStyle });
}

export async function saveInterests(interests: string[]): Promise<DomainProfile> {
  return updateProfile({ interests });
}

export async function saveTravelPace(travelPace: TravelPace): Promise<DomainProfile> {
  return updateProfile({ travelPace });
}

export async function saveOnboardingCompleted(): Promise<DomainProfile> {
  return updateProfile({ onboardingCompleted: true });
}
