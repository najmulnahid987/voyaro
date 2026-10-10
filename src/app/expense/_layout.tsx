import { Stack } from 'expo-router';

/**
 * Expense group layout.
 * Nested Stack inside the root Stack for expense details.
 * Route: /expense/[expenseId]
 */
export default function ExpenseLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[expenseId]" />
    </Stack>
  );
}
