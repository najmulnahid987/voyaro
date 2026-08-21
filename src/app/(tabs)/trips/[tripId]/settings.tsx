import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

/**
 * Route: /(tabs)/trips/[tripId]/settings
 * Test with: /trips/demo-trip/settings
 */
export default function TripSettingsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return (
    <PlaceholderScreen
      route={`/trips/${tripId}/settings`}
      title="Trip Settings"
      links={[{ label: '← Trip Overview', href: `/(tabs)/trips/${tripId}` }]}
    />
  );
}
