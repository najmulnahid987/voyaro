import { router } from 'expo-router';
import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

export default function LoginScreen() {
  return (
    <PlaceholderScreen
      route="/(auth)/login"
      title="Log In"
      links={[
        { label: 'Sign Up', href: '/(auth)/signup' },
        { label: 'Forgot password (modal)', href: '/modal/quick-add' },
        { label: 'Enter App (dev skip)', href: '/(tabs)', replace: true },
      ]}
    />
  );
}
