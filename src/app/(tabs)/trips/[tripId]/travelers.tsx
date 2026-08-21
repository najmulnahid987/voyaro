import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

/**
 * Route: /(tabs)/trips/[tripId]/travelers
 * Test with: /trips/demo-trip/travelers
 */
export default function TripTravelersScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return (
    <PlaceholderScreen
      route={`/trips/${tripId}/travelers`}
      title="Travelers"
      links={[
        { label: 'Invite Traveler (modal)', href: '/modal/invite-traveler' },
        { label: '← Trip Overview', href: `/(tabs)/trips/${tripId}` },
      ]}
    />
  );
}
