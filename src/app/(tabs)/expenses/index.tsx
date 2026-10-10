import React from 'react';
import { ExpenseDashboardView } from '@/components/expenses';

/**
 * Route: /(tabs)/expenses — Main Expenses Tab (Phase 6)
 *
 * Persistent navigation shell entry for trip expenses.
 * Allows switching between trips while maintaining strict trip-scoped financial isolation.
 */
export default function ExpensesScreen() {
  return (
    <ExpenseDashboardView
      showTripSelector={true}
      showSubTabs={false}
    />
  );
}
