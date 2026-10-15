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
import { signInWithGoogle, signup, validateSignupCredentials } from '@/services/auth';

/**
 * Route: /(auth)/signup
 * Voyaro Signup Screen (Phase 7 — Step 10)
 *
 * Visual source of truth: Google Stitch Signup design.
 * Features:
 *  - Header with back navigation, Voyaro emblem, title, and subtitle
 *  - Real Google Sign-Up with Supabase OAuth flow
 *  - Honest Apple Sign-Up unavailable state
 *  - Form fields: Name, Email, Password, Confirm Password
 *  - Inline field-level validation matching Phase 1 input design language
 *  - Successful signup sets authenticated = true, onboardingComplete = false,
 *    and navigates to /(auth)/onboarding/travel-style
 *  - Navigation to Log In
 */
export default function SignupScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Field validation errors
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = () => {
    const result = validateSignupCredentials({
      name,
      email,
      password,
      confirmPassword,
    });
    setErrors(result.errors);
    return result.isValid;
  };

  // --- Handlers ---
  const handleGoogleSignup = async () => {
    if (googleLoading || loading) return;
    setGoogleLoading(true);

    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        if (result.error && !result.error.toLowerCase().includes('cancel')) {
          Alert.alert('Google Sign-Up', result.error);
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
      Alert.alert(
        'Google Sign-Up Error',
        err.message || 'An unexpected error occurred during Google sign up.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignup = () => {
    Alert.alert(
      'Apple Sign-Up Unavailable',
      'Sign up with Apple is currently not configured for this project. Please continue with Google or create an account with email and password.'
    );
  };

  const handleSignup = async () => {
    if (loading || googleLoading) return;
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const result = await signup({
        email: email.trim(),
        name: name.trim(),
        password,
      });

      if (!result.success) {
        setErrors((prev) => ({
          ...prev,
          email: result.error || 'Failed to create account.',
        }));
        return;
      }

      if (result.emailConfirmationRequired) {
        Alert.alert(
          'Confirm Your Email',
          'We sent a confirmation link to your email address. Please check your inbox and confirm your account before signing in.',
          [
            {
              text: 'Go to Sign In',
              onPress: () =>
                router.replace({
                  pathname: '/(auth)/login',
                  params: redirect ? { redirect } : undefined,
                }),
            },
          ]
        );
        return;
      }

      if (redirect) {
        router.replace(redirect as any);
      } else {
        router.replace('/(auth)/onboarding/travel-style');
      }
    } catch (err: any) {
      Alert.alert('Sign Up Error', err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };


  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  const handleTerms = () => {
    Alert.alert('Terms of Service', 'Voyaro terms and conditions.');
  };

  const handlePrivacy = () => {
    Alert.alert('Privacy Policy', 'Voyaro privacy policy.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Navigation Bar */}
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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Start planning your next adventure.</Text>
            </View>

            {/* Social Sign-Up */}
            <View style={styles.socialSection}>
              <Button
                variant="ghost"
                label={googleLoading ? 'Signing up with Google...' : 'Continue with Google'}
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
                onPress={handleGoogleSignup}
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
                onPress={handleAppleSignup}
                style={styles.socialButton}
                labelStyle={styles.socialButtonLabel}
              />
            </View>

            {/* Divider */}
            <Divider label="OR" style={styles.divider} />

            {/* Form Section */}
            <View style={styles.formSection}>
              {/* Name */}
              <Input
                label="Full Name"
                placeholder="Jane Doe"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                error={errors.name}
                autoCapitalize="words"
                autoCorrect={false}
              />

              {/* Email */}
              <Input
                label="Email"
                placeholder="jane@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Password */}
              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                error={errors.password}
                secureTextEntry={!isPasswordVisible}
                autoCapitalize="none"
                rightIcon={
                  <Pressable
                    onPress={() => setIsPasswordVisible((v) => !v)}
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

              {/* Confirm Password */}
              <Input
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                error={errors.confirmPassword}
                secureTextEntry={!isConfirmPasswordVisible}
                autoCapitalize="none"
                rightIcon={
                  <Pressable
                    onPress={() => setIsConfirmPasswordVisible((v) => !v)}
                    hitSlop={8}
                    accessibilityLabel={isConfirmPasswordVisible ? 'Hide password' : 'Show password'}
                  >
                    <Image
                      source={
                        isConfirmPasswordVisible
                          ? require('@/assets/images/eye-off-icon.svg')
                          : require('@/assets/images/eye-icon.svg')
                      }
                      style={styles.eyeIcon}
                      contentFit="contain"
                    />
                  </Pressable>
                }
              />

              {/* Submit CTA */}
              <Button
                variant="primary"
                label="Create Account"
                fullWidth
                loading={loading}
                disabled={loading || googleLoading}
                onPress={handleSignup}
                style={styles.signupButton}
              />
            </View>

            {/* Switch to Log In */}
            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>
                Already have an account?{' '}
                <Text
                  style={styles.loginPromptLink}
                  onPress={() => router.push('/(auth)/login')}
                >
                  Log in
                </Text>
              </Text>
            </View>
          </View>

          {/* Footer Disclaimer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By signing up, you agree to our{' '}
              <Text style={styles.legalLink} onPress={handleTerms}>
                Terms
              </Text>{' '}
              and{' '}
              <Text style={styles.legalLink} onPress={handlePrivacy}>
                Privacy Policy
              </Text>
              .
            </Text>
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
  eyeIcon: {
    width: 20,
    height: 20,
  },
  signupButton: {
    marginTop: spacing.xs,
  },

  // --- Login Prompt ---
  loginPrompt: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  loginPromptText: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loginPromptLink: {
    color: colors.primary,
    fontWeight: '600',
  },

  // --- Footer ---
  footer: {
    width: '100%',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
});
