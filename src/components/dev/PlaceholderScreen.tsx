/**
 * PlaceholderScreen — dev utility component.
 *
 * Used on every stub route during Phase 2 to:
 * 1. Confirm the route resolves without errors.
 * 2. Show the route path on screen.
 * 3. Provide a back button.
 * 4. Accept optional nav links for testing forward navigation.
 *
 * Safe-area handled for all routes.
 */
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@/theme';

interface NavLink {
  label: string;
  href?: string;
  onPress?: () => void;
  replace?: boolean;
}

interface PlaceholderScreenProps {
  route: string;
  title?: string;
  links?: NavLink[];
}

export function PlaceholderScreen({ route, title, links = [] }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        {router.canGoBack() && (
          <Pressable onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>← Back</Text>
          </Pressable>
        )}

        {/* Route badge */}
        <View style={s.badge}>
          <Text style={s.badgeText}>{route}</Text>
        </View>

        {/* Title */}
        <Text style={s.title}>{title ?? route.split('/').pop() ?? 'Screen'}</Text>
        <Text style={s.caption}>Phase 2 placeholder — replace in Phase 3/4</Text>

        {/* Nav links */}
        {links.length > 0 && (
          <View style={s.links}>
            <Text style={s.linksHeader}>Navigate to:</Text>
            {links.map((link, idx) => (
              <Pressable
                key={link.href || `link-${idx}`}
                style={s.linkBtn}
                onPress={() => {
                  if (link.onPress) {
                    link.onPress();
                  } else if (link.href) {
                    link.replace
                      ? router.replace(link.href as any)
                      : router.push(link.href as any);
                  }
                }}
              >
                <Text style={s.linkText}>→ {link.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 90,
    paddingBottom: 110,
    gap: spacing.md,
  },
  back: { alignSelf: 'flex-start', marginBottom: spacing.md },
  backText: { ...typography.label, color: colors.primary },
  badge: {
    backgroundColor: colors.primarySurface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  title: { ...typography.screenTitle, color: colors.textPrimary, textAlign: 'center' },
  caption: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  links: { width: '100%', marginTop: spacing.lg, gap: spacing.sm },
  linksHeader: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  linkBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  linkText: { ...typography.label, color: colors.primary },
});
