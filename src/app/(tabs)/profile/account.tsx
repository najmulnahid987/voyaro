import { router } from 'expo-router';
import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';
import { logout } from '@/services/auth';

export default function AccountScreen() {
  return (
    <PlaceholderScreen
      route="/(tabs)/profile/account"
      title="Account"
      links={[
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
