import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

/**
 * Route: /(tabs)/trips/[tripId]/itinerary
 * Test with: /trips/demo-trip/itinerary
 */
export default function TripItineraryScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return (
    <PlaceholderScreen
      route={`/trips/${tripId}/itinerary`}
      title="Itinerary"
      links={[
        { label: 'Itinerary Item (global)', href: '/itinerary/item-abc' },
        { label: '← Trip Overview', href: `/(tabs)/trips/${tripId}` },
      ]}
    />
  );
}
