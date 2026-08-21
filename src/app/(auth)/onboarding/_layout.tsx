import { Stack } from 'expo-router';

/**
 * Onboarding sub-group layout (nested inside auth group).
 * Wraps: travel-style, interests, preferences.
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="travel-style" />
      <Stack.Screen name="interests" />
      <Stack.Screen name="preferences" />
    </Stack>
  );
}
