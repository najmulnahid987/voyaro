/**
 * Voyaro Centralized Authentication Service (Phase 7 — Step 5)
 *
 * Real Supabase Authentication integration for Voyaro.
 * Connects directly to Supabase Auth (`supabase.auth`) and the `profiles` table.
 *
 * Capabilities:
 *  - Email & password sign up with automatic profile sync trigger
 *  - Email & password sign in with session storage
 *  - Session restoration on app launch from SecureStore/localStorage
 *  - Real-time auth state subscription (`onAuthStateChange`)
 *  - Password reset via email (`resetPasswordForEmail`)
 *  - Onboarding completion status persistence in `public.profiles`
 *  - Clean logout with full session termination and listener cleanup
 */

import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { ensureProfile, saveOnboardingCompleted } from './profile';

// Complete auth session if redirected on web
WebBrowser.maybeCompleteAuthSession();

// ---------------------------------------------------------------------------
// 1. Domain Types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider?: 'email' | 'google' | 'apple';
}

export interface AuthState {
  authenticated: boolean;
  user: User | null;
  session: Session | null;
  onboardingComplete: boolean;
  isLoading: boolean;
}

export interface LoginParams {
  email?: string;
  password?: string;
  name?: string;
  provider?: 'google' | 'apple';
}

export interface SignupParams {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  provider?: 'google' | 'apple';
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
  session?: Session | null;
  onboardingComplete?: boolean;
  emailConfirmationRequired?: boolean;
}

// ---------------------------------------------------------------------------
// 2. Centralized State & Listeners
// ---------------------------------------------------------------------------

let state: AuthState = {
  authenticated: false,
  user: null,
  session: null,
  onboardingComplete: false,
  isLoading: true,
};

type AuthListener = (state: AuthState) => void;
const listeners = new Set<AuthListener>();

function notifyListeners() {
  const currentSnapshot = { ...state };
  listeners.forEach((listener) => {
    try {
      listener(currentSnapshot);
    } catch (e) {
      console.warn('[Voyaro Auth] Listener notification error:', e);
    }
  });
}

/**
 * Returns a synchronous snapshot of the current auth state.
 */
export function getAuthState(): AuthState {
  return { ...state };
}

/**
 * Returns the currently authenticated user or null.
 */
export function getCurrentUser(): User | null {
  return state.user ? { ...state.user } : null;
}

/**
 * Returns the active Supabase session or null.
 */
export function getSession(): Session | null {
  return state.session;
}

// ---------------------------------------------------------------------------
// 3. Validation Helpers
// ---------------------------------------------------------------------------

export function validateLoginCredentials(
  email?: string,
  password?: string
): { isValid: boolean; error?: string } {
  const trimmedEmail = (email || '').trim().toLowerCase();

  if (!trimmedEmail) {
    return { isValid: false, error: 'Please enter your email address.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }

  if (!password) {
    return { isValid: false, error: 'Please enter your password.' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters.' };
  }

  return { isValid: true };
}

export function validateSignupCredentials(params: {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const nameTrimmed = (params.name || '').trim();
  const emailTrimmed = (params.email || '').trim().toLowerCase();
  const password = params.password || '';
  const confirmPassword = params.confirmPassword;

  if (!nameTrimmed) {
    errors.name = 'Full name is required.';
  }

  if (!emailTrimmed) {
    errors.email = 'Email address is required.';
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      errors.email = 'Please enter a valid email address.';
    }
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  if (confirmPassword !== undefined) {
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// 4. Profile Synchronization Helper
// ---------------------------------------------------------------------------

async function fetchUserProfile(userId: string): Promise<{
  displayName: string;
  avatarUrl?: string;
  onboardingCompleted: boolean;
} | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, onboarding_completed')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      displayName: data.display_name,
      avatarUrl: data.avatar_url ?? undefined,
      onboardingCompleted: data.onboarding_completed,
    };
  } catch (err) {
    console.warn('[Voyaro Auth] Failed to fetch profile from database:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 5. Core Supabase Operations
// ---------------------------------------------------------------------------

/**
 * Sign up a new user using Supabase Auth.
 */
export async function signup(
  emailOrParams?: string | SignupParams,
  passwordParam?: string,
  nameParam?: string
): Promise<AuthResult> {
  let email = '';
  let password = '';
  let name = '';

  if (typeof emailOrParams === 'object' && emailOrParams !== null) {
    if (emailOrParams.provider) {
      if (emailOrParams.provider === 'google') {
        return await signInWithGoogle();
      }
      return {
        success: false,
        error: 'Sign in with Apple is currently not configured for this project.',
      };
    }
    email = (emailOrParams.email || '').trim().toLowerCase();
    password = emailOrParams.password || '';
    name = (emailOrParams.name || '').trim();

    const validation = validateSignupCredentials(emailOrParams);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      return { success: false, error: firstError };
    }
  } else if (typeof emailOrParams === 'string') {
    email = emailOrParams.trim().toLowerCase();
    password = passwordParam || '';
    name = (nameParam || email.split('@')[0]).trim();

    const validation = validateSignupCredentials({ email, password, name });
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      return { success: false, error: firstError };
    }
  } else {
    return { success: false, error: 'Please provide email and password to sign up.' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          full_name: name,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Failed to create user account.' };
    }

    const domainUser: User = {
      id: data.user.id,
      email: data.user.email || email,
      name,
      provider: 'email',
    };

    // If email confirmation is enabled, Supabase does not return an active session
    if (!data.session) {
      return {
        success: true,
        emailConfirmationRequired: true,
        user: domainUser,
      };
    }

    // If an active session is returned (e.g. email confirmation disabled or auto-confirmed)
    const profile = await fetchUserProfile(data.user.id);
    state = {
      authenticated: true,
      user: domainUser,
      session: data.session,
      onboardingComplete: profile?.onboardingCompleted ?? false,
      isLoading: false,
    };

    notifyListeners();
    return {
      success: true,
      user: domainUser,
      session: data.session,
      onboardingComplete: state.onboardingComplete,
      emailConfirmationRequired: false,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred during sign up.',
    };
  }
}

/**
 * Sign in an existing user using Supabase Auth.
 */
export async function login(
  emailOrParams?: string | LoginParams,
  passwordParam?: string
): Promise<AuthResult> {
  let email = '';
  let password = '';

  if (typeof emailOrParams === 'object' && emailOrParams !== null) {
    if (emailOrParams.provider) {
      if (emailOrParams.provider === 'google') {
        return await signInWithGoogle();
      }
      return {
        success: false,
        error: 'Sign in with Apple is currently not configured for this project.',
      };
    }
    email = (emailOrParams.email || '').trim().toLowerCase();
    password = emailOrParams.password || '';
  } else if (typeof emailOrParams === 'string') {
    email = emailOrParams.trim().toLowerCase();
    password = passwordParam || '';
  }

  const validation = validateLoginCredentials(email, password);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user || !data.session) {
      return { success: false, error: 'Sign in succeeded but no active session was returned.' };
    }

    // Fetch user profile from database
    const profile = await fetchUserProfile(data.user.id);
    const resolvedName =
      profile?.displayName ||
      data.user.user_metadata?.name ||
      data.user.user_metadata?.full_name ||
      email.split('@')[0];

    const domainUser: User = {
      id: data.user.id,
      email: data.user.email || email,
      name: resolvedName,
      avatarUrl: profile?.avatarUrl,
      provider: 'email',
    };

    state = {
      authenticated: true,
      user: domainUser,
      session: data.session,
      onboardingComplete: profile?.onboardingCompleted ?? false,
      isLoading: false,
    };

    notifyListeners();
    return {
      success: true,
      user: domainUser,
      session: data.session,
      onboardingComplete: state.onboardingComplete,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred during sign in.',
    };
  }
}

/**
 * Request a password reset email via Supabase Auth.
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  const trimmed = (email || '').trim().toLowerCase();
  if (!trimmed) {
    return { success: false, error: 'Please enter your email address to reset password.' };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to send password reset email.',
    };
  }
}

/**
 * Complete user onboarding and persist status to the Supabase database.
 */
export async function completeOnboarding(): Promise<AuthResult> {
  try {
    await saveOnboardingCompleted();
  } catch (err: any) {
    console.warn('[Voyaro Auth] Failed to save onboarding completion in profile:', err.message);
  }

  state = {
    ...state,
    onboardingComplete: true,
  };

  notifyListeners();
  return { success: true, user: state.user || undefined };
}

/**
 * Sign out of Supabase and clear session from local device storage.
 */
export async function logout(): Promise<AuthResult> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('[Voyaro Auth] Exception during Supabase signOut:', err);
  }

  state = {
    authenticated: false,
    user: null,
    session: null,
    onboardingComplete: false,
    isLoading: false,
  };

  notifyListeners();
  return { success: true };
}

/**
 * Subscribe to auth state updates.
 */
export function subscribeToAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  // Send current state immediately to new subscriber
  try {
    listener({ ...state });
  } catch (e) {
    console.warn('[Voyaro Auth] Error notifying initial listener state:', e);
  }

  return () => {
    listeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// 6. Google OAuth & Deep Link Handlers (Phase 7 — Step 10)
// ---------------------------------------------------------------------------

let isGoogleAuthInProgress = false;

/**
 * Returns true if a Google OAuth request is currently active.
 */
export function isGoogleSigningIn(): boolean {
  return isGoogleAuthInProgress;
}

/**
 * Robustly parses OAuth parameters from both query string (?) and hash fragment (#).
 */
export function parseOAuthUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};

  try {
    // 1. Parse query params (after ?)
    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      const queryString = url.substring(queryIndex + 1).split('#')[0];
      for (const pair of queryString.split('&')) {
        const [k, v] = pair.split('=');
        if (k) {
          params[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
        }
      }
    }

    // 2. Parse hash fragment (after #)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hashString = url.substring(hashIndex + 1);
      for (const pair of hashString.split('&')) {
        const [k, v] = pair.split('=');
        if (k && !params[decodeURIComponent(k)]) {
          params[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
        }
      }
    }
  } catch (err) {
    console.warn('[Voyaro Auth] Failed to parse OAuth URL parameters:', err);
  }

  return params;
}

/**
 * Finalizes authentication success, synchronizes the database profile,
 * and updates centralized state.
 */
export async function finalizeAuthSession(
  session: Session,
  provider: 'email' | 'google' | 'apple' = 'google'
): Promise<AuthResult> {
  let profile = await fetchUserProfile(session.user.id);
  if (!profile) {
    try {
      const ensured = await ensureProfile();
      profile = {
        displayName: ensured.displayName,
        avatarUrl: ensured.avatarUrl ?? undefined,
        onboardingCompleted: ensured.onboardingCompleted,
      };
    } catch (e) {
      console.warn('[Voyaro Auth] Profile auto-creation fallback error:', e);
    }
  }

  const resolvedName =
    profile?.displayName ||
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.name ||
    session.user.email?.split('@')[0] ||
    'Traveler';

  const avatarUrl =
    profile?.avatarUrl ||
    session.user.user_metadata?.avatar_url ||
    session.user.user_metadata?.picture ||
    undefined;

  const domainUser: User = {
    id: session.user.id,
    email: session.user.email || '',
    name: resolvedName,
    avatarUrl,
    provider,
  };

  state = {
    authenticated: true,
    user: domainUser,
    session,
    onboardingComplete: profile?.onboardingCompleted ?? false,
    isLoading: false,
  };

  notifyListeners();

  return {
    success: true,
    user: domainUser,
    session,
    onboardingComplete: state.onboardingComplete,
  };
}

/**
 * Handles incoming OAuth redirect URLs on native and web callbacks.
 * Exchanges PKCE code or establishes session from token fragments.
 */
export async function handleAuthRedirectUrl(url: string): Promise<AuthResult> {
  const params = parseOAuthUrlParams(url);

  // Check for error parameters returned from provider
  if (params.error || params.error_description) {
    const errorMsg =
      params.error_description ||
      params.error ||
      'Authentication was rejected by the provider.';
    return {
      success: false,
      error: errorMsg,
    };
  }

  try {
    // 1. PKCE Authorization Code flow
    if (params.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }
      if (!data?.session) {
        return {
          success: false,
          error: 'Code exchanged successfully, but no session was returned.',
        };
      }
      return await finalizeAuthSession(data.session, 'google');
    }

    // 2. Implicit Grant Token flow
    if (params.access_token) {
      const { data, error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token || '',
      });
      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }
      if (!data?.session) {
        return {
          success: false,
          error: 'Failed to establish session from tokens.',
        };
      }
      return await finalizeAuthSession(data.session, 'google');
    }

    // 3. Fallback: check if session is already stored
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (session?.user) {
      return await finalizeAuthSession(session, 'google');
    }

    return {
      success: false,
      error: sessionError?.message || 'No valid authorization code or session found in redirect URL.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred processing the authentication redirect.',
    };
  }
}

/**
 * Initiates real Google sign-in via Supabase Auth for Web and Native.
 * - Native: Uses WebBrowser.openAuthSessionAsync and custom scheme callback (`voyaro://auth/callback`).
 * - Web: Uses Supabase browser OAuth redirect to `${window.location.origin}/auth/callback`.
 * - Prevents duplicate concurrent requests.
 * - Handles user cancellation cleanly without false errors.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  if (isGoogleAuthInProgress) {
    return {
      success: false,
      error: 'Google authentication is already in progress. Please wait.',
    };
  }

  isGoogleAuthInProgress = true;

  try {
    let redirectUrl: string;
    if (Platform.OS === 'web') {
      const origin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'http://localhost:8081';
      redirectUrl = `${origin}/auth/callback`;
    } else {
      redirectUrl = Linking.createURL('auth/callback', { scheme: 'voyaro' });
    }

    // 1. Web Flow: standard browser redirect
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        let userMessage = error.message;
        if (
          error.message.includes('not enabled') ||
          error.message.includes('Unsupported provider')
        ) {
          userMessage =
            'Google Sign-In is not enabled yet in your Supabase project. Please configure Google provider credentials in your Supabase Dashboard.';
        }
        return {
          success: false,
          error: userMessage,
        };
      }

      // In browser, signInWithOAuth navigates to data.url
      return {
        success: true,
      };
    }

    // 2. Native Flow: In-app browser with WebBrowser.openAuthSessionAsync
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      let userMessage = error.message;
      if (
        error.message.includes('not enabled') ||
        error.message.includes('Unsupported provider')
      ) {
        userMessage =
          'Google Sign-In is not enabled yet in your Supabase project. Please configure Google provider credentials in your Supabase Dashboard.';
      }
      return {
        success: false,
        error: userMessage,
      };
    }

    if (!data?.url) {
      return {
        success: false,
        error: 'Failed to obtain Google authorization URL from Supabase.',
      };
    }

    // Open native browser authentication session
    const browserResult = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
      return {
        success: false,
        error: 'Sign in was cancelled.',
      };
    }

    if (browserResult.type === 'success' && browserResult.url) {
      return await handleAuthRedirectUrl(browserResult.url);
    }

    return {
      success: false,
      error: 'Google authentication was not completed.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred during Google sign in.',
    };
  } finally {
    isGoogleAuthInProgress = false;
  }
}

export const loginWithGoogle = signInWithGoogle;

// ---------------------------------------------------------------------------
// 7. Session Restoration & Auth Lifecycle Management
// ---------------------------------------------------------------------------

let initPromise: Promise<AuthState> | null = null;
let authSubscription: { unsubscribe: () => void } | null = null;
let linkingSubscription: { remove: () => void } | null = null;

/**
 * Restores the existing Supabase session from persistent storage on app startup.
 * Sets up the real-time auth event subscription.
 */
export function initAuth(): Promise<AuthState> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // 1. Restore session from SecureStore / localStorage
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[Voyaro Auth] Session restoration error:', error.message);
      }

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        const resolvedName =
          profile?.displayName ||
          session.user.user_metadata?.name ||
          session.user.user_metadata?.full_name ||
          session.user.email?.split('@')[0] ||
          'Traveler';

        const avatarUrl =
          profile?.avatarUrl ||
          session.user.user_metadata?.avatar_url ||
          session.user.user_metadata?.picture ||
          undefined;

        const domainUser: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: resolvedName,
          avatarUrl,
          provider: (session.user.app_metadata?.provider as any) || 'email',
        };

        state = {
          authenticated: true,
          user: domainUser,
          session,
          onboardingComplete: profile?.onboardingCompleted ?? false,
          isLoading: false,
        };
      } else {
        state = {
          authenticated: false,
          user: null,
          session: null,
          onboardingComplete: false,
          isLoading: false,
        };
      }
    } catch (err) {
      console.warn('[Voyaro Auth] Unexpected error during session initialization:', err);
      state = {
        authenticated: false,
        user: null,
        session: null,
        onboardingComplete: false,
        isLoading: false,
      };
    }

    // 2. Setup active auth state listener
    if (!authSubscription) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            let profile = await fetchUserProfile(session.user.id);
            if (!profile) {
              try {
                const ensured = await ensureProfile();
                profile = {
                  displayName: ensured.displayName,
                  avatarUrl: ensured.avatarUrl ?? undefined,
                  onboardingCompleted: ensured.onboardingCompleted,
                };
              } catch (e) {
                console.warn('[Voyaro Auth] Profile auto-creation fallback error:', e);
              }
            }

            const resolvedName =
              profile?.displayName ||
              session.user.user_metadata?.name ||
              session.user.user_metadata?.full_name ||
              session.user.email?.split('@')[0] ||
              'Traveler';

            const avatarUrl =
              profile?.avatarUrl ||
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture ||
              undefined;

            state = {
              authenticated: true,
              user: {
                id: session.user.id,
                email: session.user.email || '',
                name: resolvedName,
                avatarUrl,
                provider: (session.user.app_metadata?.provider as any) || 'email',
              },
              session,
              onboardingComplete: profile?.onboardingCompleted ?? false,
              isLoading: false,
            };
            notifyListeners();
          } else if (event === 'SIGNED_OUT') {
            state = {
              authenticated: false,
              user: null,
              session: null,
              onboardingComplete: false,
              isLoading: false,
            };
            notifyListeners();
          } else if (event === 'TOKEN_REFRESHED' && session) {
            state = {
              ...state,
              session,
            };
            notifyListeners();
          }
        }
      );
      authSubscription = subscription;
    }

    // 3. Setup incoming deep link listener on native
    if (!linkingSubscription && Platform.OS !== 'web') {
      linkingSubscription = Linking.addEventListener('url', async ({ url }) => {
        if (
          url &&
          (url.includes('code=') || url.includes('access_token=') || url.includes('error='))
        ) {
          try {
            WebBrowser.dismissAuthSession();
          } catch {}
          await handleAuthRedirectUrl(url);
        }
      });
    }

    notifyListeners();
    return { ...state };
  })();

  return initPromise;
}

/**
 * Cleans up the active Supabase auth state change subscription and deep link listeners.
 */
export function cleanupAuthSubscription(): void {
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }
  if (linkingSubscription) {
    linkingSubscription.remove();
    linkingSubscription = null;
  }
}

// ---------------------------------------------------------------------------
// 8. Backward Compatibility Aliases & Barrel Export
// ---------------------------------------------------------------------------

export type FakeUser = User;
export type FakeAuthState = AuthState & {
  isAuthenticated: boolean;
  isOnboardingCompleted: boolean;
};

export const getFakeAuthState = (): FakeAuthState => ({
  ...state,
  isAuthenticated: state.authenticated,
  isOnboardingCompleted: state.onboardingComplete,
});

export const authService = {
  login,
  signup,
  logout,
  signInWithGoogle,
  loginWithGoogle,
  isGoogleSigningIn,
  handleAuthRedirectUrl,
  parseOAuthUrlParams,
  resetPassword,
  completeOnboarding,
  getCurrentUser,
  getAuthState,
  getSession,
  initAuth,
  cleanupAuthSubscription,
  validateLoginCredentials,
  validateSignupCredentials,
  subscribe: subscribeToAuth,
};

export default authService;
