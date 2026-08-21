import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography } from '@/theme';

/**
 * Route: /(auth)/welcome
 * Entry screen of the auth flow.
 * Phase 2: Navigation shell only — no real auth.
 */
export default function WelcomeScreen() {
  return (
    <View style={s.screen}>
      <Text style={s.title}>Welcome</Text>
      <Text style={s.sub}>Route: /(auth)/welcome</Text>

      <Pressable style={s.btn} onPress={() => router.push('/(auth)/login')}>
        <Text style={s.btnText}>→ Log In</Text>
      </Pressable>
      <Pressable style={s.btn} onPress={() => router.push('/(auth)/signup')}>
        <Text style={s.btnText}>→ Sign Up</Text>
      </Pressable>
      <Pressable style={[s.btn, s.btnSecondary]} onPress={() => router.replace('/(tabs)')}>
        <Text style={s.btnText}>→ Skip to App (dev)</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.lg },
  btn: { width: '100%', backgroundColor: colors.primary, borderRadius: 8, padding: spacing.lg, alignItems: 'center' },
  btnSecondary: { backgroundColor: colors.backgroundAlt },
  btnText: { ...typography.label, color: colors.textOnPrimary },
});
