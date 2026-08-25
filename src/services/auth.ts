/**
 * Voyaro Authentication Service
 *
 * Local fake authentication layer for Phase 3 UI development.
 * Designed with a clean, centralized interface that can be effortlessly
 * replaced by Supabase Auth in later phases without modifying screen UI.
 *
 * Required State:
 *   - authenticated: boolean
 *   - user: User | null
 *   - onboardingComplete: boolean
 *
 * Required Operations:
 *   - login()
 *   - signup()
 *   - logout()
 *   - completeOnboarding()
 *   - getCurrentUser()
 *
 * Fake Credentials:
 *   - Email: demo@voyaro.app
 *   - Password: voyaro123
 */

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
  onboardingComplete: boolean;
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
}

export const DEMO_CREDENTIALS = {
  email: 'demo@voyaro.app',
  password: 'voyaro123',
  name: 'Demo Traveler',
};

// Centralized internal state
let state: AuthState = {
  authenticated: false,
  user: null,
  onboardingComplete: false,
};

// Listeners for reactivity
type AuthListener = (state: AuthState) => void;
const listeners = new Set<AuthListener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener({ ...state });
    } catch (e) {
      console.warn('Auth listener error:', e);
    }
  });
}

/**
 * Get current auth state snapshot
 */
export function getAuthState(): AuthState {
  return { ...state };
}

/**
 * Get currently authenticated user
 */
export function getCurrentUser(): User | null {
  return state.user ? { ...state.user } : null;
}

/**
 * Validate credentials for email/password login
 */
export function validateLoginCredentials(
  email?: string,
  password?: string
): { isValid: boolean; error?: string } {
  const trimmedEmail = (email || '').trim().toLowerCase();

  if (!trimmedEmail) {
    return { isValid: false, error: 'Please enter your email address.' };
  }

  if (!password) {
    return { isValid: false, error: 'Please enter your password.' };
  }

  // Check demo credentials
  if (trimmedEmail === DEMO_CREDENTIALS.email) {
    if (password !== DEMO_CREDENTIALS.password) {
      return { isValid: false, error: 'Invalid password. (Hint: voyaro123)' };
    }
    return { isValid: true };
  }

  // Basic email syntax validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters.' };
  }

  return { isValid: true };
}

/**
 * Validate signup form inputs
 */
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

/**
 * Login operation
 * Supports:
 *   - login() (defaults to demo user)
 *   - login(email, password)
 *   - login({ email, password })
 *   - login({ provider: 'google' | 'apple' })
 */
export function login(
  emailOrParams?: string | LoginParams,
  passwordParam?: string
): AuthResult {
  let email: string = DEMO_CREDENTIALS.email;
  let password: string = DEMO_CREDENTIALS.password;
  let provider: 'email' | 'google' | 'apple' = 'email';
  let name: string = DEMO_CREDENTIALS.name;

  if (typeof emailOrParams === 'object' && emailOrParams !== null) {
    if (emailOrParams.provider) {
      provider = emailOrParams.provider;
      email = `${provider}.traveler@voyaro.app`;
      name = provider === 'google' ? 'Google Traveler' : 'Apple Traveler';
    } else {
      email = emailOrParams.email || '';
      password = emailOrParams.password || '';
    }
  } else if (typeof emailOrParams === 'string') {
    email = emailOrParams;
    password = passwordParam || '';
  }

  // Validate for email/password login
  if (provider === 'email') {
    const validation = validateLoginCredentials(email, password);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    if (typeof emailOrParams === 'object' && emailOrParams?.name) {
      name = emailOrParams.name;
    } else if (email.trim().toLowerCase() === DEMO_CREDENTIALS.email) {
      name = DEMO_CREDENTIALS.name;
    } else {
      const username = email.split('@')[0];
      name = username.charAt(0).toUpperCase() + username.slice(1);
    }
  }

  const user: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    email: email.trim().toLowerCase(),
    name,
    provider,
  };

  state = {
    authenticated: true,
    user,
    onboardingComplete: true, // Login assumes completed onboarding
  };

  notifyListeners();
  return { success: true, user };
}

/**
 * Signup operation
 * Supports:
 *   - signup(email, password, name)
 *   - signup({ email, password, name })
 *   - signup({ provider: 'google' | 'apple' })
 */
export function signup(
  emailOrParams?: string | SignupParams,
  passwordParam?: string,
  nameParam?: string
): AuthResult {
  let email = '';
  let name = '';
  let provider: 'email' | 'google' | 'apple' = 'email';

  if (typeof emailOrParams === 'object' && emailOrParams !== null) {
    if (emailOrParams.provider) {
      provider = emailOrParams.provider;
      email = `${provider}.explorer@voyaro.app`;
      name = provider === 'google' ? 'Google Explorer' : 'Apple Explorer';
    } else {
      email = emailOrParams.email || '';
      name = emailOrParams.name || '';
      const validation = validateSignupCredentials(emailOrParams);
      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        return { success: false, error: firstError };
      }
    }
  } else if (typeof emailOrParams === 'string') {
    email = emailOrParams;
    name = nameParam || email.split('@')[0];
    const validation = validateSignupCredentials({
      email,
      password: passwordParam,
      name,
    });
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      return { success: false, error: firstError };
    }
  } else {
    email = 'newexplorer@voyaro.app';
    name = 'New Explorer';
  }

  const user: User = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    email: email.trim().toLowerCase(),
    name: name || 'New Explorer',
    provider,
  };

  state = {
    authenticated: true,
    user,
    onboardingComplete: false, // Signup starts at onboarding
  };

  notifyListeners();
  return { success: true, user };
}

/**
 * Complete onboarding operation
 */
export function completeOnboarding(): AuthResult {
  state = {
    ...state,
    onboardingComplete: true,
  };

  notifyListeners();
  return { success: true, user: state.user || undefined };
}

/**
 * Logout operation
 */
export function logout(): AuthResult {
  state = {
    authenticated: false,
    user: null,
    onboardingComplete: false,
  };

  notifyListeners();
  return { success: true };
}

/**
 * Subscribe to auth state updates
 */
export function subscribeToAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ── Backward compatibility aliases ──────────────────────────────────
export type FakeUser = User;
export type FakeAuthState = {
  isAuthenticated: boolean;
  isOnboardingCompleted: boolean;
  user: User | null;
  authenticated: boolean;
  onboardingComplete: boolean;
};

export const getFakeAuthState = (): FakeAuthState => ({
  isAuthenticated: state.authenticated,
  isOnboardingCompleted: state.onboardingComplete,
  user: state.user,
  authenticated: state.authenticated,
  onboardingComplete: state.onboardingComplete,
});

export const setFakeAuthState = (
  nextState: Partial<AuthState & { isAuthenticated?: boolean; isOnboardingCompleted?: boolean }>
): AuthState => {
  state = {
    authenticated: nextState.authenticated ?? nextState.isAuthenticated ?? state.authenticated,
    user: nextState.user !== undefined ? nextState.user : state.user,
    onboardingComplete:
      nextState.onboardingComplete ?? nextState.isOnboardingCompleted ?? state.onboardingComplete,
  };
  notifyListeners();
  return getAuthState();
};

export const fakeLogin = (email?: string, name?: string): AuthResult => {
  return login(email ? { email, name: name } : undefined);
};

export const fakeSignup = (email?: string, name?: string): AuthResult => {
  return signup({ email, name });
};

export const fakeCompleteOnboarding = (): AuthResult => {
  return completeOnboarding();
};

export const fakeLogout = (): AuthResult => {
  return logout();
};

export const validateFakeCredentials = (
  email: string,
  password: string
): { success: boolean; error?: string } => {
  const result = validateLoginCredentials(email, password);
  return {
    success: result.isValid,
    error: result.error,
  };
};

/**
 * Centralized Auth Service Export
 */
export const authService = {
  login,
  signup,
  logout,
  completeOnboarding,
  getCurrentUser,
  getAuthState,
  validateLoginCredentials,
  validateSignupCredentials,
  subscribe: subscribeToAuth,
};

export default authService;
