import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

export default function OnboardingPreferencesScreen() {
  return (
    <PlaceholderScreen
      route="/(auth)/onboarding/preferences"
      title="Preferences"
      links={[{ label: 'Finish → Enter App', href: '/(tabs)', replace: true }]}
    />
  );
}
