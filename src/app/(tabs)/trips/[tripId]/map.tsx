import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

/**
 * Route: /(tabs)/trips/[tripId]/map
 * Test with: /trips/demo-trip/map
 */
export default function TripMapScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return (
    <PlaceholderScreen
      route={`/trips/${tripId}/map`}
      title="Map"
      links={[{ label: '← Trip Overview', href: `/(tabs)/trips/${tripId}` }]}
    />
  );
}
