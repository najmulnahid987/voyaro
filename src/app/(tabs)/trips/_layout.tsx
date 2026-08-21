import { Stack } from 'expo-router';

/**
 * Trips section layout.
 * Wraps: trips list (index), create trip, and the [tripId] sub-stack.
 *
 * NOTE: This Stack is nested inside the (tabs) Tabs navigator.
 * It handles navigation WITHIN the Trips tab: list → create → detail.
 */
export default function TripsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      {/* [tripId] is itself a nested Stack (defined in [tripId]/_layout.tsx) */}
      <Stack.Screen name="[tripId]" />
    </Stack>
  );
}
