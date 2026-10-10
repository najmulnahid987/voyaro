import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';
import { useLocalSearchParams } from 'expo-router';

export default function AddIndexScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const query = tripId ? `?tripId=${tripId}` : '';
  return (
    <PlaceholderScreen
      route="/add"
      title="Quick Add Menu"
      links={[
        { label: 'Add Flight', href: `/add/flight${query}`, replace: true },
        { label: 'Add Hotel', href: `/add/hotel${query}`, replace: true },
        { label: 'Add Activity', href: `/add/activity${query}`, replace: true },
        { label: 'Add Transport', href: `/add/transportation${query}`, replace: true },
        { label: 'Add Expense', href: `/add/expense${query}`, replace: true },
      ]}
    />
  );
}
