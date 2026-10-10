import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ExpenseDashboardView } from '@/components/expenses';

/**
 * Route: /(tabs)/trips/[tripId]/expenses — Trip Expenses Dashboard (Phase 6)
 *
 * Displays financial health, budget progress, and chronological expenses
 * for the currently selected trip only.
 */
export default function TripExpensesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  return (
    <ExpenseDashboardView
      tripId={tripId}
      showHeader={false}
      showSubTabs={false}
    />
  );
}
