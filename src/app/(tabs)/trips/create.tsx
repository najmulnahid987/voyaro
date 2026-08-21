import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

/** Route: /(tabs)/trips/create */
export default function CreateTripScreen() {
  return (
    <PlaceholderScreen
      route="/(tabs)/trips/create"
      title="Create Trip"
      links={[{ label: 'Trip Detail (after create)', href: '/(tabs)/trips/demo-trip-123' }]}
    />
  );
}
