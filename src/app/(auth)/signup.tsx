import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

export default function SignupScreen() {
  return (
    <PlaceholderScreen
      route="/(auth)/signup"
      title="Sign Up"
      links={[
        { label: 'Log In', href: '/(auth)/login' },
        { label: 'Onboarding — Travel Style', href: '/(auth)/onboarding/travel-style' },
        { label: 'Enter App (dev skip)', href: '/(tabs)', replace: true },
      ]}
    />
  );
}
