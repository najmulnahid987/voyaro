import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

/**
 * Root Stack Layout — Voyaro
 *
 * All top-level routes are declared here.
 * Groups:
 *   (auth)      — welcome, login, signup, onboarding
 *   (tabs)      — main tab bar (home, trips, expenses, profile)
 *   add/        — quick-add flow (stack, no modal frame)
 *   itinerary/  — itinerary item detail [itemId]
 *   ai/         — AI planner flow
 *   share/      — trip share [tripId]
 *   calendar    — global calendar (modal)
 *   modal/      — sheet-style modals (quick-add, expense, split, invite)
 *   (dev)/      — design system demo, dev-only
 *
 * IMPORTANT: Do not add business logic here.
 * Auth guards live in app/index.tsx (redirect) and will be
 * expanded in Phase 3.
 */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />

      <Stack screenOptions={{ headerShown: false }}>

        {/* ── Entry ──────────────────────────────────────────────────────── */}
        {/* Immediately redirects to /(auth)/welcome in Phase 2.
            Phase 3 will add a token check to redirect to /(tabs) if signed in. */}
        <Stack.Screen name="index" />

        {/* ── Auth group ─────────────────────────────────────────────────── */}
        <Stack.Screen name="(auth)" />

        {/* ── Main app ───────────────────────────────────────────────────── */}
        <Stack.Screen name="(tabs)" />

        {/* ── Quick-add flow ─────────────────────────────────────────────── */}
        {/* Presented full-screen over tabs. Has its own nested Stack. */}
        <Stack.Screen
          name="add"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />

        {/* ── Itinerary item detail ──────────────────────────────────────── */}
        {/* Global deep-link target: /itinerary/[itemId] */}
        <Stack.Screen name="itinerary" />

        {/* ── AI planner flow ────────────────────────────────────────────── */}
        <Stack.Screen
          name="ai"
          options={{ animation: 'slide_from_right' }}
        />

        {/* ── Trip sharing ───────────────────────────────────────────────── */}
        {/* Deep-link target: /share/[tripId] */}
        <Stack.Screen name="share" />

        {/* ── Global calendar modal ──────────────────────────────────────── */}
        <Stack.Screen
          name="calendar"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />

        {/* ── Sheet-style modals ─────────────────────────────────────────── */}
        {/* Wraps: quick-add, add-expense, expense-split, invite-traveler */}
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />

        {/* ── Dev-only ───────────────────────────────────────────────────── */}
        {/* Not linked from production navigation */}
        <Stack.Screen name="(dev)" options={{ headerShown: false }} />

      </Stack>
    </>
  );
}
