/**
 * Voyaro React Authentication & Profile Context (Phase 7 — Step 6)
 *
 * Provides reactive access to Supabase Auth and User Profile state.
 * Automatically restores session and profile on launch and handles listener cleanup.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  PropsWithChildren,
} from 'react';
import {
  AuthState,
  LoginParams,
  SignupParams,
  AuthResult,
  getAuthState,
  initAuth,
  login,
  signup,
  logout,
  loginWithGoogle,
  resetPassword,
  completeOnboarding,
  subscribeToAuth,
} from './auth';
import {
  DomainProfile,
  getCachedProfile,
  getProfile,
  updateProfile,
  subscribeToProfile,
  UpdateProfileInput,
  clearProfileCache,
} from './profile';
import { clearTripsCache } from './trip';
import { clearItineraryCache } from './itineraryStore';
import { clearExpenseCache } from './expenseStore';
import { clearRouteCache } from './routing/routeService';

export interface AuthContextValue extends AuthState {
  profile: DomainProfile | null;
  login: (emailOrParams?: string | LoginParams, passwordParam?: string) => Promise<AuthResult>;
  signup: (emailOrParams?: string | SignupParams, passwordParam?: string, nameParam?: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  completeOnboarding: () => Promise<AuthResult>;
  updateProfile: (updates: UpdateProfileInput) => Promise<DomainProfile>;
  refreshProfile: () => Promise<DomainProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [authState, setAuthState] = useState<AuthState>(getAuthState());
  const [profile, setProfile] = useState<DomainProfile | null>(getCachedProfile());

  useEffect(() => {
    let isMounted = true;

    // 1. Subscribe to auth and profile changes
    const unsubscribeAuth = subscribeToAuth((nextState) => {
      if (!isMounted) return;
      setAuthState(nextState);
      if (!nextState.authenticated) {
        setProfile(null);
        clearProfileCache();
        clearTripsCache();
        clearItineraryCache();
        clearExpenseCache();
        clearRouteCache();
      }
    });

    const unsubscribeProfile = subscribeToProfile((nextProfile) => {
      if (!isMounted) return;
      setProfile(nextProfile);
    });

    // 2. Trigger asynchronous session restoration & load initial profile
    initAuth().then(async (initialState) => {
      if (!isMounted) return;
      setAuthState(initialState);
      if (initialState.authenticated) {
        await getProfile();
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  const handleLogout = useCallback(async (): Promise<AuthResult> => {
    const result = await logout();
    setProfile(null);
    clearProfileCache();
    clearTripsCache();
    clearItineraryCache();
    clearExpenseCache();
    clearRouteCache();
    return result;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      profile,
      // Onboarding complete is determined by persistent profile state
      onboardingComplete: profile?.onboardingCompleted ?? authState.onboardingComplete,
      login,
      signup,
      loginWithGoogle,
      logout: handleLogout,
      resetPassword,
      completeOnboarding,
      updateProfile,
      refreshProfile: getProfile,
    }),
    [authState, profile, handleLogout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
