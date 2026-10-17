import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Route: /trip/[tripId]
 *
 * Backward-compatibility redirect for legacy shared links using the singular "trip" prefix.
 * Redirects to the canonical Expo Router route: /(tabs)/trips/[tripId].
 */
export default function LegacyTripRedirectScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  if (!tripId) {
    return <Redirect href="/(tabs)/trips" />;
  }

  return <Redirect href={`/(tabs)/trips/${encodeURIComponent(tripId)}` as any} />;
}
