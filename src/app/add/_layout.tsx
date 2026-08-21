import { Stack } from 'expo-router';

/**
 * Add flows layout.
 * Presented as a full-screen modal stack from the root navigator.
 *
 * Screens:
 *  - index         → quick-add menu (entry point)
 *  - flight        → add a flight
 *  - hotel         → add a hotel
 *  - activity      → add an activity
 *  - transportation → add ground transport
 *  - expense       → add an expense
 */
export default function AddLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="flight" />
      <Stack.Screen name="hotel" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="transportation" />
      <Stack.Screen name="expense" />
    </Stack>
  );
}
