import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

/**
 * Route: /(tabs)/trips/[tripId]
 * Trip overview / dashboard.
 * Test with: /trips/demo-trip
 */
export default function TripOverviewScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return (
    <PlaceholderScreen
      route={`/trips/${tripId}`}
      title={`Trip Overview`}
      links={[
        { label: 'Itinerary', href: `/(tabs)/trips/${tripId}/itinerary` },
        { label: 'Map', href: `/(tabs)/trips/${tripId}/map` },
        { label: 'Expenses', href: `/(tabs)/trips/${tripId}/expenses` },
        { label: 'Budget', href: `/(tabs)/trips/${tripId}/budget` },
        { label: 'Travelers', href: `/(tabs)/trips/${tripId}/travelers` },
        { label: 'Documents', href: `/(tabs)/trips/${tripId}/documents` },
        { label: 'Settings', href: `/(tabs)/trips/${tripId}/settings` },
        { label: 'Share Trip', href: `/share/${tripId}` },
        { label: 'Itinerary Item (global deep-link)', href: `/itinerary/item-abc` },
      ]}
    />
  );
}
