import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/theme';
import { initAuth, getAuthState } from '@/services/auth';

/**
 * Route: /
 * Voyaro Splash Screen (Phase 7 — Step 5)
 *
 * Displays the Voyaro logo, title, and tagline with a smooth entrance animation.
 * Restores the existing Supabase session and resolves routing:
 *  - Authenticated & Onboarding Complete -> /(tabs)
 *  - Authenticated & Onboarding Pending -> /(auth)/onboarding/travel-style
 *  - Logged Out / No Session -> /(auth)/welcome
 */
export default function SplashScreen() {
  const [fadeAnim] = React.useState(() => new Animated.Value(0));
  const [scaleAnim] = React.useState(() => new Animated.Value(0.96));

  useEffect(() => {
    let isMounted = true;

    // 1. Smooth entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Restore session and navigate
    async function resolveInitialRoute() {
      const isInitialLoading = getAuthState().isLoading;
      const minDisplayTimer = isInitialLoading
        ? new Promise((resolve) => setTimeout(resolve, 1200))
        : Promise.resolve();
      const [auth] = await Promise.all([initAuth(), minDisplayTimer]);

      if (!isMounted) return;

      if (auth.authenticated && auth.session) {
        if (auth.onboardingComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/onboarding/travel-style');
        }
      } else {
        router.replace('/(auth)/welcome');
      }
    }

    resolveInitialRoute();

    return () => {
      isMounted = false;
    };
  }, [fadeAnim, scaleAnim]);


  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Voyaro Brand Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/voyaro-logo.png')}
              style={styles.logoImage}
              contentFit="contain"
              accessibilityLabel="Voyaro Logo"
            />
          </View>

          {/* Typography */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>Voyaro</Text>
            <Text style={styles.subtitle}>Your entire trip. In one place.</Text>
          </View>
        </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 96,
    height: 96,
    marginBottom: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.display,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
