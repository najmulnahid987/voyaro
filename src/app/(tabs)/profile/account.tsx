import React, { useState, useEffect } from 'react';
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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button, IconButton, Input } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useAuth } from '@/services/AuthContext';

const PRESET_AVATARS = [
  { label: 'Mountain', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80' },
  { label: 'Ocean', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80' },
  { label: 'Forest', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80' },
  { label: 'Desert', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80' },
];

export default function AccountScreen() {
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top App Bar */}
        <View style={styles.navBar}>
          <IconButton
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            icon={
              <Image
                source={require('@/assets/images/arrow-left.svg')}
                style={styles.navIcon}
                contentFit="contain"
              />
            }
            accessibilityLabel="Go back"
          />
          <Text style={styles.navTitle}>Account Details</Text>
          <View style={styles.navPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Success Banner */}
            {successBanner && (
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
            )}

            {/* Error Banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* Avatar Preview Section */}
            <View style={styles.avatarCard}>
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
                        {isSelected && (
                          <View style={styles.presetCheck}>
                            <Image
                              source={require('@/assets/images/onboarding/check.svg')}
                              style={styles.presetCheckIcon}
                              contentFit="contain"
                            />
                          </View>
                        )}
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
            <View style={styles.formCard}>
              <Text style={styles.sectionHeader}>PERSONAL DETAILS</Text>
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
                helperText="Email address is managed by Supabase Authentication"
              />
            </View>

            {/* Save CTA */}
            <Button
              variant="primary"
              label="Save Changes"
              fullWidth
              loading={loading}
              onPress={handleSave}
              style={styles.saveButton}
            />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  navIcon: {
    width: 20,
    height: 20,
  },
  navTitle: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  navPlaceholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: spacing.lg,
  },

  // ── Banners ──────────────────────────────────────────────────────────────
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(44, 95, 94, 0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.button,
    padding: spacing.md,
  },
  bannerCheckIcon: {
    width: 16,
    height: 16,
    tintColor: colors.primary,
  },
  successBannerText: {
    ...typography.label,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
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

  // ── Cards ────────────────────────────────────────────────────────────────
  avatarCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...shadows.card,
  },
  sectionHeader: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  avatarCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  presetSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  presetLabel: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  presetItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    backgroundColor: 'rgba(44, 95, 94, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetCheckIcon: {
    width: 16,
    height: 16,
    tintColor: colors.textOnPrimary,
  },
  clearPresetBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  clearPresetText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },
  customUrlSection: {
    marginTop: spacing.lg,
  },

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.card,
  },

  // ── Actions ──────────────────────────────────────────────────────────────
  saveButton: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
});
