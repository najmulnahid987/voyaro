import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';
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
      ]}
    />
  );
}
