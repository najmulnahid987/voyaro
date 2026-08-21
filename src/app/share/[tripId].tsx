import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

/** Route: /share/[tripId] */
export default function ShareTripScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return (
    <PlaceholderScreen
      route={`/share/${tripId}`}
      title={`Share Trip: ${tripId}`}
    />
  );
}
