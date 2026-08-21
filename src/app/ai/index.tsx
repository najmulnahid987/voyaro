import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';
export default function AIIndexScreen() {
  return (
    <PlaceholderScreen
      route="/ai"
      title="AI Planner"
      links={[
        { label: 'Planning (loading)', href: '/ai/planning' },
        { label: 'Result', href: '/ai/result' },
      ]}
    />
  );
}
