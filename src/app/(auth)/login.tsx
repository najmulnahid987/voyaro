import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Divider, IconButton, Input } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { login, resetPassword, signInWithGoogle } from '@/services/auth';

/**
 * Route: /(auth)/login
 * Voyaro Login Screen (Phase 7 — Step 10)
 *
 * Real Supabase Authentication:
 *  - Header with back navigation, Voyaro emblem, title, and subtitle
 *  - Real Google Sign-In with Supabase Auth OAuth flow
 *  - Honest Apple Sign-In unavailable state
 *  - Email & Password input fields with real Supabase authentication
 *  - Real password reset via Supabase resetPasswordForEmail
 *  - Error handling directly from Supabase Auth responses
 *  - Navigation to Sign Up
 */
export default function LoginScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // --- Handlers ---
  const handleGoogleSignIn = async () => {
    if (googleLoading || loading) return;
    setErrorMessage(null);
    setGoogleLoading(true);

    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        if (result.error && !result.error.toLowerCase().includes('cancel')) {
          setErrorMessage(result.error);
          Alert.alert('Google Sign-In', result.error);
        }
        return;
      }

      if (result.session) {
        if (redirect) {
          router.replace(redirect as any);
        } else if (result.onboardingComplete) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/onboarding/travel-style');
        }
      }
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred during Google sign in.';
      setErrorMessage(msg);
      Alert.alert('Google Sign-In Error', msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = () => {
    Alert.alert(
      'Apple Sign-In Unavailable',
      'Sign in with Apple is currently not configured for this project. Please continue with Google or use your email and password.'
    );
  };

  const handleLogin = async () => {
    if (loading || googleLoading) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setErrorMessage(result.error || 'Invalid credentials');
        return;
      }

      if (redirect) {
        router.replace(redirect as any);
      } else if (result.onboardingComplete) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/onboarding/travel-style');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your email address to receive a password reset link.');
      return;
    }

    setLoading(true);
    const result = await resetPassword(trimmed);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Password Reset Sent',
        `A password reset link has been sent to ${trimmed}. Please check your email inbox.`
      );
    } else {
      setErrorMessage(result.error || 'Failed to send password reset email.');
    }
  };


  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Navigation Bar */}
        <View style={styles.navBar}>
          <IconButton
            variant="ghost"
            size="sm"
            onPress={handleBack}
            icon={
              <Image
                source={require('@/assets/images/arrow-left.svg')}
                style={styles.navIcon}
                contentFit="contain"
              />
            }
            accessibilityLabel="Go back"
          />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mainContainer}>
            {/* Header Section */}
            <View style={styles.headerSection}>
              <View style={styles.logoCard}>
                <Image
                  source={require('@/assets/images/voyaro-logo.png')}
                  style={styles.logoImage}
                  contentFit="contain"
                  accessibilityLabel="Voyaro Logo"
                />
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue planning your trips.</Text>
            </View>

            {/* Social Sign-In */}
            <View style={styles.socialSection}>
              <Button
                variant="ghost"
                label={googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
                loading={googleLoading}
                disabled={loading || googleLoading}
                leftIcon={
                  <Image
                    source={require('@/assets/images/google-icon.svg')}
                    style={styles.socialIcon}
                    contentFit="contain"
                  />
                }
                fullWidth
                onPress={handleGoogleSignIn}
                style={styles.socialButton}
                labelStyle={styles.socialButtonLabel}
              />

              <Button
                variant="ghost"
                label="Continue with Apple"
                disabled={loading || googleLoading}
                leftIcon={
                  <Image
                    source={require('@/assets/images/apple-icon.svg')}
                    style={styles.socialIcon}
                    contentFit="contain"
                  />
                }
                fullWidth
                onPress={handleAppleSignIn}
                style={styles.socialButton}
                labelStyle={styles.socialButtonLabel}
              />
            </View>

            {/* Divider */}
            <Divider label="OR" style={styles.divider} />

            {/* Form Section */}
            <View style={styles.formSection}>
              {/* Inline Error Display */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              {/* Email */}
              <Input
                label="Email"
                placeholder="traveler@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Password */}
              <View style={styles.passwordField}>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <Pressable onPress={handleForgotPassword} hitSlop={8}>
                    <Text style={styles.forgotPasswordLink}>Forgot password?</Text>
                  </Pressable>
                </View>

                <Input
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                  rightIcon={
                    <Pressable
                      onPress={togglePasswordVisibility}
                      hitSlop={8}
                      accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                    >
                      <Image
                        source={
                          isPasswordVisible
                            ? require('@/assets/images/eye-off-icon.svg')
                            : require('@/assets/images/eye-icon.svg')
                        }
                        style={styles.eyeIcon}
                        contentFit="contain"
                      />
                    </Pressable>
                  }
                />
              </View>

              {/* Submit Button */}
              <Button
                variant="primary"
                label="Log In"
                fullWidth
                loading={loading}
                disabled={loading || googleLoading}
                onPress={handleLogin}
                style={styles.loginButton}
              />
            </View>


            {/* Switch to Sign Up */}
            <View style={styles.signUpPrompt}>
              <Text style={styles.signUpText}>
                {"Don't have an account? "}
                <Text
                  style={styles.signUpLink}
                  onPress={() => router.push('/(auth)/signup')}
                >
                  Sign up
                </Text>
              </Text>
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
  keyboardView: {
    flex: 1,
  },
  navBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    alignItems: 'flex-start',
  },
  navIcon: {
    width: 20,
    height: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  mainContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
  },

  // --- Header ---
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
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
    marginBottom: spacing.md,
    ...shadows.card,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // --- Social ---
  socialSection: {
    width: '100%',
    gap: spacing.sm,
  },
  socialButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    height: 52,
    ...shadows.card,
  },
  socialButtonLabel: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  socialIcon: {
    width: 20,
    height: 20,
  },

  // --- Divider ---
  divider: {
    width: '100%',
    marginVertical: spacing.xl,
  },

  // --- Form ---
  formSection: {
    width: '100%',
    gap: spacing.lg,
  },
  errorBanner: {
    backgroundColor: 'rgba(176, 74, 74, 0.10)',
    borderRadius: radius.button,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '500',
    textAlign: 'center',
  },
  passwordField: {
    width: '100%',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  forgotPasswordLink: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  eyeIcon: {
    width: 20,
    height: 20,
  },
  loginButton: {
    marginTop: spacing.xs,
  },
  demoHelper: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  demoHelperText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  demoHelperBold: {
    color: colors.primary,
    fontWeight: '600',
  },

  // --- Sign Up Prompt ---
  signUpPrompt: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  signUpText: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  signUpLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});
