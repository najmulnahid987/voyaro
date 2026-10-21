/**
 * Route: /(tabs)/profile/account — Account Details Screen
 *
 * Provides display name editing, avatar preset selection, and custom image URL.
 * Sits inside the persistent navigation shell with proper top/bottom insets.
 */

import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Avatar, Button, Input } from '@/components/ui';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { useAuth } from '@/services/AuthContext';
import { useShellInsets } from '@/components/navigation';

const PRESET_AVATARS = [
  { label: 'Mountain', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80' },
  { label: 'Ocean', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80' },
  { label: 'Forest', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80' },
  { label: 'Desert', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80' },
];

export default function AccountScreen() {
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();
  const { profile, user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [loading, setLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    }
    if (profile?.avatarUrl !== undefined) {
      setAvatarUrl(profile.avatarUrl || '');
    }
  }, [profile]);

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setErrorMessage('Display name cannot be empty.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      await updateProfile({
        displayName: trimmedName,
        avatarUrl: avatarUrl.trim() || null,
      });

      setSuccessBanner(true);
      setTimeout(() => {
        setSuccessBanner(false);
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update account details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (url: string) => {
    setAvatarUrl(url);
    if (errorMessage) setErrorMessage(null);
  };

  const handleClearAvatar = () => {
    setAvatarUrl('');
    if (errorMessage) setErrorMessage(null);
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: contentPaddingTop,
              paddingBottom: contentPaddingBottom + spacing.xl,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Top Sub-Navigation Bar */}
            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.iconCircleButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={8}
              >
                <Text style={styles.backArrow}>←</Text>
              </Pressable>

              <Text style={styles.topBarTitle}>Account Details</Text>

              <View style={styles.topBarSpacer} />
            </View>

            {/* Success Banner */}
            {successBanner ? (
              <View style={styles.successBanner}>
                <Image
                  source={require('@/assets/images/onboarding/check.svg')}
                  style={styles.bannerCheckIcon}
                  contentFit="contain"
                />
                <Text style={styles.successBannerText}>
                  Account details updated successfully!
                </Text>
              </View>
            ) : null}

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Avatar Preview Section */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>PROFILE PICTURE</Text>
              <View style={styles.avatarCentered}>
                <Avatar
                  size="xl"
                  name={displayName || 'Traveler'}
                  source={avatarUrl ? avatarUrl : undefined}
                />
              </View>

              {/* Avatar Presets */}
              <View style={styles.presetSection}>
                <Text style={styles.presetLabel}>Choose a photo preset:</Text>
                <View style={styles.presetsRow}>
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = avatarUrl === preset.url;
                    return (
                      <Pressable
                        key={preset.label}
                        onPress={() => handleSelectPreset(preset.url)}
                        style={[
                          styles.presetItem,
                          isSelected && styles.presetItemSelected,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={preset.label}
                      >
                        <Image
                          source={{ uri: preset.url }}
                          style={styles.presetThumb}
                          contentFit="cover"
                        />
                        {isSelected ? (
                          <View style={styles.presetCheck}>
                            <Image
                              source={require('@/assets/images/onboarding/check.svg')}
                              style={styles.presetCheckIcon}
                              contentFit="contain"
                            />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                  {avatarUrl ? (
                    <Pressable
                      onPress={handleClearAvatar}
                      style={styles.clearPresetBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                    >
                      <Text style={styles.clearPresetText}>Remove</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {/* Custom Avatar URL Input */}
              <View style={styles.customUrlSection}>
                <Input
                  label="Or enter custom image URL"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChangeText={(val) => {
                    setAvatarUrl(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  helperText="Paste a direct image link (PNG, JPG, WebP)"
                />
              </View>
            </View>

            {/* Personal Details Card */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>PERSONAL DETAILS</Text>
              <View style={styles.formFields}>
                <Input
                  label="Display Name"
                  placeholder="Jane Doe"
                  value={displayName}
                  onChangeText={(val) => {
                    setDisplayName(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />

                <Input
                  label="Email Address"
                  value={profile?.email || user?.email || ''}
                  editable={false}
                  helperText="Managed by authentication provider"
                />
              </View>
            </View>

            {/* Save CTA */}
            <Button
              variant="primary"
              label={loading ? 'Saving Changes...' : 'Save Changes'}
              loading={loading}
              onPress={handleSave}
              style={styles.saveButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    gap: spacing.md,
  },

  // ── Top Navigation Bar ───────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: 2,
  },
  topBarTitle: {
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  topBarSpacer: {
    width: 32,
  },
  iconCircleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  backArrow: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },

  // ── Banners ──────────────────────────────────────────────────────────────
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: 'rgba(44, 95, 94, 0.10)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.input,
    padding: spacing.sm,
  },
  bannerCheckIcon: {
    width: 14,
    height: 14,
    tintColor: colors.primary,
  },
  successBannerText: {
    fontFamily: fontFamily.medium,
    fontSize: 12.5,
    color: colors.primary,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: 'rgba(176, 74, 74, 0.08)',
    borderRadius: radius.input,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorBannerText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Cards ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    ...shadows.card,
  },
  sectionHeader: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  avatarCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  presetSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  presetLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: colors.textSecondary,
    marginBottom: spacing.xs + 2,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  presetItem: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  presetItemSelected: {
    borderColor: colors.primary,
    borderWidth: 2.5,
  },
  presetThumb: {
    width: '100%',
    height: '100%',
  },
  presetCheck: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(44, 95, 94, 0.50)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetCheckIcon: {
    width: 14,
    height: 14,
    tintColor: colors.textOnPrimary,
  },
  clearPresetBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  clearPresetText: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  customUrlSection: {
    marginTop: spacing.md,
  },
  formFields: {
    gap: spacing.sm + 2,
  },

  // ── Actions ──────────────────────────────────────────────────────────────
  saveButton: {
    height: 44,
    marginTop: spacing.xs,
  },
});
