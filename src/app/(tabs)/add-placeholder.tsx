import { Redirect } from 'expo-router';

/**
 * Add placeholder tab route — Voyaro
 *
 * This route exists solely to register the 5th mobile navigation slot
 * in the Tabs navigator so that `tabBarButton: () => <AddTabButton />`
 * can render the floating "+" button in the center of the tab bar.
 *
 * Direct visits to /(tabs)/add-placeholder immediately redirect to /add.
 */
export default function AddPlaceholderScreen() {
  return <Redirect href="/add" />;
}
