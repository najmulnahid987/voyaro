import { Stack } from 'expo-router';

/**
 * Auth group layout.
 * Wraps: welcome, login, signup, and onboarding sub-group.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
