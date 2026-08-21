/**
 * Dev-only route group layout.
 * These screens are never referenced in production navigation.
 */
import { Stack } from 'expo-router';

export default function DevLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="design-system-demo"
        options={{ title: 'Design System', headerShown: true }}
      />
    </Stack>
  );
}
