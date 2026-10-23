import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Avatar, Badge, Pill } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useAuth } from '@/services/AuthContext';
import { useShellInsets } from '@/components/navigation';

export default function ProfileScreen() {
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();
  const { profile, user, logout, refreshProfile } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    refreshProfile().catch((err) => {
      console.warn('[Voyaro Profile] Failed to refresh profile:', err);
    });
  }, [refreshProfile]);

  const displayName = profile?.displayName || user?.name || 'Traveler';
  const email = profile?.email || user?.email || '';

  const formatTravelStyle = (style?: string) => {
    if (!style) return 'Not set';
    return style.charAt(0).toUpperCase() + style.slice(1) + ' Traveler';
  };

  const formatTravelPace = (pace?: string) => {
    if (!pace) return 'Not set';
    return pace.charAt(0).toUpperCase() + pace.slice(1) + ' Pace';
  };

  const performLogout = async () => {
    setLoggingOut(true);
    try {
      // 1. Pre-emptively transition route to avoid unmount collision with Stack.Protected
      router.replace('/(auth)/welcome');
      // 2. Perform session termination and cache clearing
      await logout();
    } catch (err: any) {
      const msg = err?.message || 'Failed to log out.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (loggingOut) return;

    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined' && typeof window.confirm === 'function'
          ? window.confirm('Are you sure you want to log out of your Voyaro account?')
          : true;
      if (confirmed) {
        performLogout();
      }
      return;
    }

    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your Voyaro account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  const menuItems = [
    {
      label: 'Account Details',
      subtitle: 'Manage your display name and avatar',
      icon: require('@/assets/images/onboarding/person.svg'),
      href: '/(tabs)/profile/account' as const,
    },
    {
      label: 'Travel Preferences',
      subtitle: 'Traveler style, preferred pace, and interests',
      icon: require('@/assets/images/onboarding/heart.svg'),
      href: '/(tabs)/profile/preferences' as const,
    },
    {
      label: 'Notifications',
      subtitle: 'Trip alerts and itinerary reminders',
      icon: require('@/assets/images/icons/ticket.svg'),
      href: '/(tabs)/profile/notifications' as const,
    },
    {
      label: 'Privacy & Security',
      subtitle: 'Account data and security settings',
      icon: require('@/assets/images/icons/verified.svg'),
      href: '/(tabs)/profile/privacy' as const,
    },
    {
      label: 'Subscription',
      subtitle: 'Voyaro Pro membership & benefits',
      icon: require('@/assets/images/icons/sparkles.svg'),
      href: '/(tabs)/profile/subscription' as const,
    },
  ];

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: contentPaddingTop, paddingBottom: contentPaddingBottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header Title */}
          <View style={styles.headerTitleSection}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>
              Your account details and travel preferences.
            </Text>
          </View>

          {/* Profile Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.avatarRow}>
              <Avatar
                size="xl"
                name={displayName}
                source={profile?.avatarUrl}
              />
              <View style={styles.heroInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {displayName}
                </Text>
                {email ? (
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {email}
                  </Text>
                ) : null}
                <View style={styles.badgeRow}>
                  {profile?.travelStyle && (
                    <Badge
                      label={formatTravelStyle(profile.travelStyle)}
                      variant="selected"
                    />
                  )}
                  {profile?.travelPace && (
                    <Badge
                      label={formatTravelPace(profile.travelPace)}
                      variant="default"
                    />
                  )}
                </View>
              </View>
            </View>

            {/* Interests Section */}
            {profile?.interests && profile.interests.length > 0 && (
              <View style={styles.interestsContainer}>
                <Text style={styles.interestsLabel}>TRAVEL INTERESTS</Text>
                <View style={styles.interestsRow}>
                  {profile.interests.map((interest: string) => (
                    <Pill
                      key={interest}
                      label={interest.charAt(0).toUpperCase() + interest.slice(1)}
                      variant="default"
                      style={styles.interestPill}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Settings Section */}
          <View style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.href)}
                style={({ pressed }) => [
                  styles.menuItem,
                  index < menuItems.length - 1 && styles.menuItemBorder,
                  pressed && styles.menuItemPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={styles.menuIconContainer}>
                  <Image
                    source={item.icon}
                    style={styles.menuIcon}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Image
                  source={require('@/assets/images/onboarding/arrow-right.svg')}
                  style={styles.chevronIcon}
                  contentFit="contain"
                />
              </Pressable>
            ))}
          </View>

          {/* Log Out CTA */}
          <Pressable
            onPress={handleLogout}
            disabled={loggingOut}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Log out of Voyaro"
          >
            <Text style={styles.logoutText}>
              {loggingOut ? 'Logging out...' : 'Log Out'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: spacing.md,
  },

  // ── Header Title ─────────────────────────────────────────────────────────
  headerTitleSection: {
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  headerTitle: {
    ...typography.screenTitle,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.28,
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ── Hero Card ────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    ...typography.sectionTitle,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  userEmail: {
    ...typography.bodySecondary,
    fontSize: 13,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  interestsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  interestsLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  interestPill: {
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },

  // ── Menu List ────────────────────────────────────────────────────────────
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemPressed: {
    backgroundColor: colors.backgroundAlt,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.button,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuIcon: {
    width: 20,
    height: 20,
    tintColor: colors.primary,
  },
  menuTextContainer: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  menuSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chevronIcon: {
    width: 16,
    height: 16,
    tintColor: colors.textMuted,
  },

  // ── Logout ───────────────────────────────────────────────────────────────
  logoutButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    ...shadows.card,
  },
  logoutButtonPressed: {
    backgroundColor: 'rgba(176, 74, 74, 0.06)',
    borderColor: colors.error,
  },
  logoutText: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
});
