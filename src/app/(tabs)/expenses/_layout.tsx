import { Stack } from 'expo-router';

/**
 * Expenses tab layout.
 * Nested Stack inside the (tabs) Tabs navigator.
 * Handles navigation within the Expenses tab: overview → detail.
 */
export default function ExpensesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
