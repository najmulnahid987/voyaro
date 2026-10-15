/**
 * Voyaro Supabase Client Infrastructure (Phase 7 — Step 1)
 *
 * Single shared Supabase client for Voyaro.
 * Features:
 *  - Platform-adaptive session persistence:
 *      * Native (iOS / Android): expo-secure-store (encrypted keychain / keystore)
 *      * Web: localStorage with safe in-memory fallback
 *  - Token auto-refresh synchronized with AppState on mobile
 *  - Strict environment variable validation
 *  - Clear error messaging when configuration is missing or malformed
 */

import { AppState, Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Database } from '../types/database.types';


// ---------------------------------------------------------------------------
// 1. Storage Adapter Configuration
// ---------------------------------------------------------------------------

/**
 * In-memory storage fallback for headless testing, SSR, or environments
 * where neither SecureStore nor window.localStorage is accessible.
 */
class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

const memoryStorageFallback = new MemoryStorage();

/**
 * Platform-aware storage adapter conforming to Supabase SupportedStorage interface.
 */
export const supabaseStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (err) {
        console.warn('[Supabase Storage] Failed to read from web localStorage:', err);
      }
      return memoryStorageFallback.getItem(key);
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn('[Supabase Storage] Failed to read from SecureStore:', err);
      return memoryStorageFallback.getItem(key);
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch (err) {
        console.warn('[Supabase Storage] Failed to write to web localStorage:', err);
      }
      memoryStorageFallback.setItem(key, value);
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.warn('[Supabase Storage] Failed to write to SecureStore:', err);
      memoryStorageFallback.setItem(key, value);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      } catch (err) {
        console.warn('[Supabase Storage] Failed to delete from web localStorage:', err);
      }
      memoryStorageFallback.removeItem(key);
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.warn('[Supabase Storage] Failed to delete from SecureStore:', err);
      memoryStorageFallback.removeItem(key);
    }
  },
};

// ---------------------------------------------------------------------------
// 2. Environment Configuration & Validation
// ---------------------------------------------------------------------------

export interface SupabaseConfigValidation {
  isValid: boolean;
  url?: string;
  anonKey?: string;
  error?: string;
}

/**
 * Validates Supabase environment variables without throwing.
 */
export function validateSupabaseConfig(): SupabaseConfigValidation {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();

  if (!url && !anonKey) {
    return {
      isValid: false,
      error:
        'Missing Supabase credentials. Both EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are unset. Please configure them in your local .env file (see .env.example).',
    };
  }

  if (!url) {
    return {
      isValid: false,
      error:
        'Missing EXPO_PUBLIC_SUPABASE_URL in environment configuration. Please set it in your local .env file.',
    };
  }

  if (!anonKey) {
    return {
      isValid: false,
      error:
        'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY in environment configuration. Please set it in your local .env file.',
    };
  }

  // Basic URL syntax validation
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        isValid: false,
        error: `Invalid EXPO_PUBLIC_SUPABASE_URL protocol "${parsed.protocol}". URL must begin with https:// or http://.`,
      };
    }
  } catch {
    return {
      isValid: false,
      error: `Invalid EXPO_PUBLIC_SUPABASE_URL "${url}". Must be a valid URL string.`,
    };
  }

  return {
    isValid: true,
    url,
    anonKey,
  };
}

/**
 * Returns whether Supabase is configured with valid environment variables.
 */
export function isSupabaseConfigured(): boolean {
  return validateSupabaseConfig().isValid;
}

// ---------------------------------------------------------------------------
// 3. Client Initialization
// ---------------------------------------------------------------------------

let clientInstance: SupabaseClient<Database> | null = null;
let appStateSubscriptionInitialized = false;

/**
 * Attaches the AppState listener to start/stop auto token refresh
 * when the app transitions between foreground and background.
 */
function setupAppStateTokenRefresh(client: SupabaseClient<Database>): void {
  if (appStateSubscriptionInitialized) return;
  if (Platform.OS === 'web') return; // Web browsers handle token refresh natively in tab

  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      client.auth.startAutoRefresh();
    } else {
      client.auth.stopAutoRefresh();
    }
  });

  appStateSubscriptionInitialized = true;
}

/**
 * Creates or retrieves the singleton Supabase client.
 * Throws a clear setup error if environment variables are missing or invalid.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (clientInstance) {
    return clientInstance;
  }

  const validation = validateSupabaseConfig();
  if (!validation.isValid || !validation.url || !validation.anonKey) {
    throw new Error(
      `[Voyaro Supabase Setup Error] ${validation.error || 'Configuration is missing.'}`
    );
  }

  clientInstance = createClient<Database>(validation.url, validation.anonKey, {
    auth: {
      storage: supabaseStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

  setupAppStateTokenRefresh(clientInstance);

  return clientInstance;
}

/**
 * Proxy export for convenient usage: `import { supabase } from '@/services/supabase'`.
 * Defers evaluation until accessed so importing the module will not immediately throw
 * if environment variables are not yet loaded at module evaluation time.
 */
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export default supabase;

