import { Stack } from 'expo-router';

/**
 * Route group: /invite
 * Handles invitation preview and acceptance flows.
 */
export default function InviteLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[token]" />
    </Stack>
  );
}
