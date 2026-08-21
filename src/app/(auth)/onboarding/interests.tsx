import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

export default function InterestsScreen() {
  return (
    <PlaceholderScreen
      route="/(auth)/onboarding/interests"
      title="Interests"
      links={[{ label: 'Next → Preferences', href: '/(auth)/onboarding/preferences' }]}
    />
  );
}
