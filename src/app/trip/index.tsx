import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Route: /trip
 *
 * Backward-compatibility redirect for legacy links without a trip ID.
 * Redirects to the canonical trips list: /(tabs)/trips.
 */
export default function LegacyTripIndexRedirectScreen() {
  return <Redirect href="/(tabs)/trips" />;
}
