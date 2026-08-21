import { Stack } from 'expo-router';

/**
 * Modal group layout.
 * The root _layout.tsx presents this entire group with presentation: 'modal'.
 * This inner Stack handles navigation between individual modal screens.
 *
 * Screens:
 *  - quick-add       → fast-add bottom sheet entry
 *  - add-expense     → full add-expense form
 *  - expense-split   → split expense between travelers
 *  - invite-traveler → invite a co-traveler to a trip
 */
export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="quick-add" />
      <Stack.Screen name="add-expense" />
      <Stack.Screen name="expense-split" />
      <Stack.Screen name="invite-traveler" />
    </Stack>
  );
}
