import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';
export default function ExpensesScreen() {
  return (
    <PlaceholderScreen
      route="/(tabs)/expenses"
      title="Expenses"
      links={[
        { label: 'Add Expense (modal)', href: '/modal/add-expense' },
        { label: 'Split Expense (modal)', href: '/modal/expense-split' },
      ]}
    />
  );
}
