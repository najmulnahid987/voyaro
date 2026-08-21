import { Redirect } from 'expo-router';

/**
 * Route: /
 * Entry point.
 *
 * Phase 2: Always redirects to welcome (auth flow).
 * Phase 3: Will check auth token → redirect to /(tabs) if signed in.
 */
export default function RootIndex() {
  return <Redirect href="/(auth)/welcome" />;
}
