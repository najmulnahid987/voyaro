import { Stack, useLocalSearchParams } from 'expo-router';
import { colors } from '@/theme';

/**
 * Trip Detail Stack Layout — /(tabs)/trips/[tripId]
 *
 * Nested Stack inside the Trips tab Stack.
 * All screens in this group share the tripId param from the URL segment.
 *
 * Screens:
 *   index       → Trip overview / dashboard
 *   itinerary   → Day-by-day itinerary
 *   map         → Trip map
 *   expenses    → Trip expenses list
 *   budget      → Budget tracker
 *   travelers   → Co-travelers list
 *   documents   → Documents & passports
 *   settings    → Trip settings
 *
 * Tested routes:
 *   /trips/demo-trip
 *   /trips/demo-trip/itinerary
 *   /trips/demo-trip/map
 *   /trips/demo-trip/expenses
 *   /trips/demo-trip/budget
 *   /trips/demo-trip/travelers
 *   /trips/demo-trip/documents
 *   /trips/demo-trip/settings
 */
export default function TripDetailLayout() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const tripLabel = tripId ?? 'Trip';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: tripLabel }}
      />
      <Stack.Screen
        name="itinerary"
        options={{ title: `${tripLabel} — Itinerary` }}
      />
      <Stack.Screen
        name="map"
        options={{ title: `${tripLabel} — Map` }}
      />
      <Stack.Screen
        name="expenses"
        options={{ title: `${tripLabel} — Expenses` }}
      />
      <Stack.Screen
        name="budget"
        options={{ title: `${tripLabel} — Budget` }}
      />
      <Stack.Screen
        name="travelers"
        options={{ title: `${tripLabel} — Travelers` }}
      />
      <Stack.Screen
        name="documents"
        options={{ title: `${tripLabel} — Documents` }}
      />
      <Stack.Screen
        name="settings"
        options={{ title: `${tripLabel} — Settings` }}
      />
    </Stack>
  );
}
