import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

export default function TravelStyleScreen() {
  return (
    <PlaceholderScreen
      route="/(auth)/onboarding/travel-style"
      title="Travel Style"
      links={[{ label: 'Next → Interests', href: '/(auth)/onboarding/interests' }]}
    />
  );
}
