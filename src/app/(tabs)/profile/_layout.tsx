import { Stack } from 'expo-router';

/**
 * Profile section layout.
 * Nested Stack inside the Profile tab — handles pushing sub-screens
 * (account, preferences, notifications, privacy, subscription) on top
 * of the profile index with proper back navigation.
 *
 * Screens:
 *  - index        → profile home / user summary
 *  - account      → account details & email
 *  - preferences  → app preferences
 *  - notifications → notification settings
 *  - privacy      → privacy settings
 *  - subscription → subscription / billing
 */
export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="subscription" />
    </Stack>
  );
}
