import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

/**
 * Route: /itinerary/[itemId]
 * Global detail screen for a single itinerary item.
 * Reachable from any trip's itinerary list as a deep-link target.
 * Phase 2: Navigation shell only.
 */
export default function ItineraryItemScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  return (
    <PlaceholderScreen
      route={`/itinerary/${itemId}`}
      title={`Itinerary Item: ${itemId}`}
    />
  );
}
