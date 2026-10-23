import { Stack } from 'expo-router';

/**
 * Documents tab layout.
 * Nested Stack inside the (tabs) Tabs navigator.
 * Handles navigation within the Documents tab.
 */
export default function DocumentsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
