import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';
export default function AIPlanningScreen() {
  return (
    <PlaceholderScreen
      route="/ai/planning"
      title="AI Planning…"
      links={[{ label: 'Result →', href: '/ai/result' }]}
    />
  );
}
