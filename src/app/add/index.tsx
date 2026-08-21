import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';
export default function AddIndexScreen() {
  return (
    <PlaceholderScreen
      route="/add"
      title="Quick Add Menu"
      links={[
        { label: 'Add Flight', href: '/add/flight' },
        { label: 'Add Hotel', href: '/add/hotel' },
        { label: 'Add Activity', href: '/add/activity' },
        { label: 'Add Transport', href: '/add/transportation' },
        { label: 'Add Expense', href: '/add/expense' },
      ]}
    />
  );
}
