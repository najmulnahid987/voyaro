import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

/**
 * Route: /(tabs)/trips/[tripId]/expenses
 * Test with: /trips/demo-trip/expenses
 */
export default function TripExpensesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  return (
    <PlaceholderScreen
      route={`/trips/${tripId}/expenses`}
      title="Expenses"
      links={[
        { label: 'Add Expense (modal)', href: '/modal/add-expense' },
        { label: 'Split Expense (modal)', href: '/modal/expense-split' },
        { label: '← Trip Overview', href: `/(tabs)/trips/${tripId}` },
      ]}
    />
  );
}
