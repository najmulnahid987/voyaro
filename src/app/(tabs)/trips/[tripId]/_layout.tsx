import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, usePathname } from 'expo-router';
import { colors } from '@/theme';
import { TripSubNavHeader, TripSubNavTabKey } from '@/components/trips';
import { useShellInsets } from '@/components/navigation';
import { fetchTripById, getCachedTrips } from '@/services/trip';
import { Trip } from '@/services/mockData';

/**
 * Trip Detail Persistent Layout — /(tabs)/trips/[tripId]
 *
 * Hosts the persistent TripSubNavHeader (Back, Contextual Add, Editorial Title,
 * and Pill Tabs: Overview · Itinerary · Map · Expenses · Documents) at the top.
 * Sub-routes switch seamlessly underneath without unmounting or re-animating the header.
 */
export default function TripDetailLayout() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const effectiveTripId = tripId || 'japan-adventure';
  const pathname = usePathname();
  const { contentPaddingTop } = useShellInsets();

  const [trip, setTrip] = useState<Trip | null>(() => {
    return getCachedTrips()?.find((t) => t.id === effectiveTripId) || null;
  });

  useEffect(() => {
    let isMounted = true;
    if (effectiveTripId) {
      fetchTripById(effectiveTripId).then((t) => {
        if (isMounted && t) {
          setTrip(t);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [effectiveTripId]);

  // Resolve active tab from current route pathname
  const activeTab: TripSubNavTabKey = useMemo(() => {
    if (pathname.includes('/itinerary')) return 'itinerary';
    if (pathname.includes('/expenses')) return 'expenses';
    if (pathname.includes('/map')) return 'map';
    if (pathname.includes('/documents')) return 'documents';
    return 'overview';
  }, [pathname]);

  // Determine whether to display the persistent sub-navigation header
  const isSubTabRoute =
    !pathname.includes('/settings') &&
    !pathname.includes('/travelers');

  const canAdd = trip?.userRole !== 'viewer';

  return (
    <View style={styles.container}>
      {isSubTabRoute && (
        <View style={[styles.headerContainer, { paddingTop: contentPaddingTop }]}>
          <TripSubNavHeader
            tripId={effectiveTripId}
            activeTab={activeTab}
            title={trip?.title}
            canAdd={canAdd}
          />
        </View>
      )}

      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Overview' }} />
          <Stack.Screen name="itinerary" options={{ title: 'Itinerary' }} />
          <Stack.Screen name="map" options={{ title: 'Map' }} />
          <Stack.Screen name="expenses" options={{ title: 'Expenses' }} />
          <Stack.Screen name="documents" options={{ title: 'Documents' }} />
          <Stack.Screen name="budget" options={{ title: 'Budget' }} />
          <Stack.Screen name="travelers" options={{ title: 'Travelers' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.background,
    zIndex: 10,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
