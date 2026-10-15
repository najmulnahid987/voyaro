import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/services/AuthContext';

/**
 * Root Stack Layout — Voyaro (Phase 7 — Step 5)
 *
 * Encapsulates root routing with:
 *  - Global AuthProvider context
 *  - Declarative route protection via Stack.Protected
 *  - Automatic stack cleanup upon sign out
 */
function RootNavigator() {
  const { authenticated } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* ── Entry ──────────────────────────────────────────────────────── */}
      <Stack.Screen name="index" />

      {/* ── Auth group (welcome, login, signup, onboarding) ────────────── */}
      <Stack.Screen name="(auth)" />

      {/* ── OAuth callback route ────────────────────────────────────────── */}
      <Stack.Screen name="auth/callback" />

      {/* ── Invitation acceptance route ─────────────────────────────────── */}
      <Stack.Screen name="invite" />

      {/* ── Protected Application Screens ──────────────────────────────── */}
      <Stack.Protected guard={authenticated}>
        {/* Main Tab Shell */}
        <Stack.Screen name="(tabs)" />

        {/* Quick-add flow */}
        <Stack.Screen
          name="add"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />

        {/* Itinerary item detail */}
        <Stack.Screen name="itinerary" />

        {/* Expense detail */}
        <Stack.Screen name="expense" />

        {/* AI planner flow */}
        <Stack.Screen
          name="ai"
          options={{ animation: 'slide_from_right' }}
        />

        {/* Trip sharing */}
        <Stack.Screen name="share" />

        {/* Global calendar modal */}
        <Stack.Screen
          name="calendar"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />

        {/* Sheet-style modals */}
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack.Protected>

      {/* ── Dev-only ───────────────────────────────────────────────────── */}
      <Stack.Screen name="(dev)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}
