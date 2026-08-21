import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';
export default function QuickAddModal() {
  return (
    <PlaceholderScreen
      route="/modal/quick-add"
      title="Quick Add"
      links={[
        { label: 'Add Expense', href: '/modal/add-expense' },
        { label: 'Split Expense', href: '/modal/expense-split' },
        { label: 'Invite Traveler', href: '/modal/invite-traveler' },
      ]}
    />
  );
}
