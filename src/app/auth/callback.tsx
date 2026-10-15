import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { handleAuthRedirectUrl, initAuth } from '@/services/auth';

/**
 * Route: /auth/callback
 * OAuth Callback Handler — Voyaro (Phase 7 — Step 10)
 *
 * Handles returning OAuth redirects from Google on Web and Native deep links.
 * Extracts the authorization code or tokens, establishes the Supabase session,
 * and routes to the appropriate destination based on onboarding completion status.
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function processCallback() {
      try {
        let callbackUrl = '';

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          callbackUrl = window.location.href;
        } else {
          // Construct deep link URL from params if available
          const queryParts = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join('&');
          callbackUrl = queryParts ? `voyaro://auth/callback?${queryParts}` : 'voyaro://auth/callback';
        }

        // Process session exchange
        const result = await handleAuthRedirectUrl(callbackUrl);

        if (!isMounted) return;

        if (!result.success) {
          // If already authenticated via Supabase background listener
          const refreshedAuth = await initAuth();
          if (refreshedAuth.authenticated) {
            if (refreshedAuth.onboardingComplete) {
              router.replace('/(tabs)');
            } else {
              router.replace('/(auth)/onboarding/travel-style');
            }
            return;
          }

          setErrorMessage(result.error || 'Failed to authenticate with Google.');
          setProcessing(false);
          return;
        }

        // Navigate based on persistent profile onboarding completion
        if (result.onboardingComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/onboarding/travel-style');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMessage(err.message || 'An unexpected error occurred during Google sign in.');
        setProcessing(false);
      }
    }

    processCallback();

    return () => {
      isMounted = false;
    };
  }, [params]);

  const handleReturnToLogin = () => {
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.logoCard}>
            <Image
              source={require('@/assets/images/voyaro-logo.png')}
              style={styles.logoImage}
              contentFit="contain"
              accessibilityLabel="Voyaro Logo"
            />
          </View>

          {processing ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
              <Text style={styles.title}>Completing Sign-In</Text>
              <Text style={styles.subtitle}>
                Connecting your Google account with Voyaro...
              </Text>
            </View>
          ) : (
            <View style={styles.stateContainer}>
              <Text style={styles.errorTitle}>Authentication Failed</Text>
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
              <Button
                variant="primary"
                label="Return to Log In"
                fullWidth
                onPress={handleReturnToLogin}
                style={styles.actionButton}
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.card,
  },
  logoCard: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  stateContainer: {
    width: '100%',
    alignItems: 'center',
  },
  spinner: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  errorTitle: {
    ...typography.screenTitle,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorBanner: {
    backgroundColor: 'rgba(176, 74, 74, 0.10)',
    borderRadius: radius.button,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing.lg,
    width: '100%',
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionButton: {
    marginTop: spacing.sm,
  },
});
