import { Stack } from 'expo-router';

/**
 * AI planner flow layout.
 * Pushed from the root Stack as a full-screen flow (no modal presentation).
 *
 * Screens:
 *  - index    → AI planner entry / prompt screen
 *  - planning → in-progress / loading state
 *  - result   → generated itinerary result
 */
export default function AILayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="planning" />
      <Stack.Screen name="result" />
    </Stack>
  );
}
