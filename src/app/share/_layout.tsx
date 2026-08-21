import { Stack } from 'expo-router';

/**
 * Share group layout.
 * Nested Stack inside the root Stack.
 * Routes: /share/[tripId]
 */
export default function ShareLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Dynamic route — tripId param read via useLocalSearchParams */}
      <Stack.Screen name="[tripId]" />
    </Stack>
  );
}
