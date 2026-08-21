import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

/**
 * Route: /(tabs)/trips/[tripId]/budget
 * Test with: /trips/demo-trip/budget
 */
export default function TripBudgetScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return (
    <PlaceholderScreen
      route={`/trips/${tripId}/budget`}
      title="Budget"
      links={[{ label: '← Trip Overview', href: `/(tabs)/trips/${tripId}` }]}
    />
  );
}
