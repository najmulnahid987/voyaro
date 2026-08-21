import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

/** Route: /(tabs)/ — Home / Dashboard */
export default function HomeScreen() {
  return (
    <PlaceholderScreen
      route="/(tabs)"
      title="Home"
      links={[
        { label: 'Trips tab', href: '/(tabs)/trips' },
        { label: 'Trip Detail (demo id)', href: '/(tabs)/trips/demo-trip-123' },
        { label: 'AI Planner', href: '/ai' },
        { label: 'Calendar (modal)', href: '/calendar' },
        { label: 'Add Flow', href: '/add' },
        { label: 'Design System Demo', href: '/(dev)/design-system-demo' },
      ]}
    />
  );
}
