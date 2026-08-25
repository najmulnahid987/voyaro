import { router } from 'expo-router';
import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';
import { logout } from '@/services/auth';

export default function ProfileScreen() {
  return (
    <PlaceholderScreen
      route="/(tabs)/profile"
      title="Profile"
      links={[
        { label: 'Account', href: '/(tabs)/profile/account' },
        { label: 'Preferences', href: '/(tabs)/profile/preferences' },
        { label: 'Notifications', href: '/(tabs)/profile/notifications' },
        { label: 'Privacy', href: '/(tabs)/profile/privacy' },
        { label: 'Subscription', href: '/(tabs)/profile/subscription' },
        {
          label: 'Log out',
          onPress: () => {
            logout();
            router.replace('/(auth)/welcome');
          },
        },
      ]}
    />
  );
}
