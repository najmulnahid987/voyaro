import { PlaceholderScreen } from '@/components/dev/PlaceholderScreen';

/**
 * Route: /(tabs)/trips
 * Trip list screen.
 * Phase 2: Navigation shell — uses "demo-trip" as the test tripId.
 */
export default function TripsScreen() {
  return (
    <PlaceholderScreen
      route="/(tabs)/trips"
      title="Trips"
      links={[
        { label: 'Create Trip', href: '/(tabs)/trips/create' },
        // ── demo-trip routes (canonical test ID) ──────────────────────
        { label: '→ Trip Overview', href: '/(tabs)/trips/demo-trip' },
        { label: '→ Trip Itinerary', href: '/(tabs)/trips/demo-trip/itinerary' },
        { label: '→ Trip Map', href: '/(tabs)/trips/demo-trip/map' },
        { label: '→ Trip Expenses', href: '/(tabs)/trips/demo-trip/expenses' },
        { label: '→ Trip Budget', href: '/(tabs)/trips/demo-trip/budget' },
        { label: '→ Trip Travelers', href: '/(tabs)/trips/demo-trip/travelers' },
        { label: '→ Trip Documents', href: '/(tabs)/trips/demo-trip/documents' },
        { label: '→ Trip Settings', href: '/(tabs)/trips/demo-trip/settings' },
      ]}
    />
  );
}
