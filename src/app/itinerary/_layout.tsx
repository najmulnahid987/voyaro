import { Stack } from 'expo-router';

/**
 * Itinerary group layout.
 * This is a nested Stack inside the root Stack.
 * Routes: /itinerary/[itemId]
 */
export default function ItineraryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Dynamic route — itemId param read via useLocalSearchParams */}
      <Stack.Screen name="[itemId]" />
    </Stack>
  );
}
