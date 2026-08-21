import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';
export default function AIResultScreen() {
  return (
    <PlaceholderScreen
      route="/ai/result"
      title="AI Result"
      links={[{ label: 'Back to Trips', href: '/(tabs)/trips', replace: true }]}
    />
  );
}
