import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

/**
 * Route: /(tabs)/trips/[tripId]/documents
 * Test with: /trips/demo-trip/documents
 */
export default function TripDocumentsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return (
    <PlaceholderScreen
      route={`/trips/${tripId}/documents`}
      title="Documents"
      links={[{ label: '← Trip Overview', href: `/(tabs)/trips/${tripId}` }]}
    />
  );
}
