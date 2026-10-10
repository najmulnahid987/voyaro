/**
 * Voyaro Expense Component — ExpenseDashboardView (Phase 6)
 *
 * Primary dashboard view for trip expenses, reusable across:
 *  - Trip Detail: /(tabs)/trips/[tripId]/expenses
 *  - Global Tab: /(tabs)/expenses
 *
 * Features:
 *  - Header with Trip title, Sub-navigation tabs (when in trip context), or Trip switcher
 *  - BudgetOverviewCard with Total Spent, Budget, Remaining, Usage %, and Over-Budget states
 *  - Date-grouped transaction timeline with Category icons, Titles, Amounts, and Payer attribution
 *  - Seamless Add Expense triggers
 *  - Engaging empty states for trips with zero expenses
 *  - Full responsiveness with useShellInsets()
 */

import { useShellInsets } from '@/components/navigation';
import { useTripExpenses } from '@/services/expenseStore';
import { getAllTrips, getTripById, getTripTravelers } from '@/services/mockData';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { Expense } from '@/types/expense';
import {
  groupExpensesByDate,
  sumExpensesByCurrency,
} from '@/utils/currencyUtils';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { BudgetOverviewCard } from './BudgetOverviewCard';
import { CategoryBreakdownCard } from './CategoryBreakdownCard';
import { ExpenseItemCard } from './ExpenseItemCard';
import { TripBudgetModal } from './TripBudgetModal';

export interface ExpenseDashboardViewProps {
  /**
   * Target trip ID. Falls back to active demo trip ('japan-adventure') if not supplied.
   */
  tripId?: string;
  /**
   * Whether to show the top sub-navigation bar (Overview · Itinerary · Map · Expenses · Documents).
   * Enabled when viewed within /(tabs)/trips/[tripId]/expenses.
   */
  showSubTabs?: boolean;
  /**
   * Whether to show an interactive Trip Switcher selector (for the global Expenses tab).
   */
  showTripSelector?: boolean;
  /**
   * Whether to render the header section. Set false when hosted inside a layout with persistent TripSubNavHeader.
   */
  showHeader?: boolean;
  /**
   * Optional custom back button handler.
   */
  onBack?: () => void;
}

export function ExpenseDashboardView({
  tripId,
  showSubTabs = false,
  showTripSelector = false,
  showHeader = true,
  onBack,
}: ExpenseDashboardViewProps) {
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();

  // 1. Resolve Trip Reference
  const allTrips = getAllTrips();
  const [activeTripId, setActiveTripId] = useState<string>(
    () => tripId || 'japan-adventure'
  );
  const [showTripMenu, setShowTripMenu] = useState<boolean>(false);
  const [showBudgetModal, setShowBudgetModal] = useState<boolean>(false);

  // If prop tripId changes, sync internal state
  const currentTripId = tripId || activeTripId;
  const trip = getTripById(currentTripId) || allTrips[0];
  const travelers = useMemo(() => getTripTravelers(currentTripId), [currentTripId]);

  // 2. Subscribe to Trip Expenses & Budget State
  const { expenses, budget, summary, isEmpty } = useTripExpenses(currentTripId);

  // 3. Date Grouping & Multi-Currency Detection
  const dayGroups = useMemo(() => {
    return groupExpensesByDate(expenses, summary.currency);
  }, [expenses, summary.currency]);

  const multiCurrencyTotals = useMemo(() => {
    return sumExpensesByCurrency(expenses);
  }, [expenses]);

  // 4. Navigation Handlers
  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.push(`/(tabs)/trips/${currentTripId}` as any);
    }
  };

  const handleAddExpense = () => {
    router.push({
      pathname: '/add/expense',
      params: { tripId: currentTripId },
    });
  };

  const handleExpensePress = (item: Expense) => {
    router.push({
      pathname: `/expense/${item.id}` as any,
      params: { tripId: currentTripId },
    });
  };

  const handleSubTabPress = (route: string) => {
    router.push(route as any);
  };

  // Helper to map payer ID to traveler name
  const getPayerName = (paidBy?: string) => {
    if (!paidBy) return undefined;
    const traveler = travelers.find((t) => t.id === paidBy);
    return traveler ? traveler.name : paidBy;
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: showHeader ? contentPaddingTop : spacing.xs,
            paddingBottom: contentPaddingBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* ── 1. Top Navigation & Header Row ───────────────────────────── */}
          {showHeader && (
            <View style={styles.headerSection}>
              <View style={styles.topBarRow}>
                {/* Back button (when in trip stack context) */}
                {showSubTabs ? (
                  <Pressable
                    onPress={handleBackPress}
                    style={({ pressed }) => [
                      styles.glassButton,
                      pressed && styles.buttonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                  >
                    <Text style={styles.backArrowText}>←</Text>
                  </Pressable>
                ) : (
                  <View style={styles.screenTagBadge}>
                    <Image
                      source={require('@/assets/images/icons/receipt.svg')}
                      style={styles.screenTagIcon}
                      tintColor={colors.primary}
                      contentFit="contain"
                    />
                    <Text style={styles.screenTagText}>EXPENSES</Text>
                  </View>
                )}

                {/* Add Expense Action Button */}
                <Pressable
                  onPress={handleAddExpense}
                  style={({ pressed }) => [
                    styles.addIconButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add Expense"
                >
                  <Image
                    source={require('@/assets/images/icons/plus.svg')}
                    style={styles.plusIcon}
                    tintColor={colors.textOnPrimary}
                    contentFit="contain"
                  />
                </Pressable>
              </View>

              {/* Trip Title / Trip Selector */}
              {showTripSelector && allTrips.length > 1 ? (
                <View style={styles.tripSelectorContainer}>
                  <Pressable
                    onPress={() => setShowTripMenu((prev) => !prev)}
                    style={styles.tripSelectorTrigger}
                    accessibilityRole="button"
                    accessibilityLabel="Switch trip"
                  >
                    <Text style={styles.tripTitle} numberOfLines={1}>
                      {trip.title}
                    </Text>
                    <Text style={styles.tripSelectorArrow}>▼</Text>
                  </Pressable>

                  {showTripMenu && (
                    <View style={styles.tripDropdown}>
                      {allTrips.map((t) => (
                        <Pressable
                          key={t.id}
                          onPress={() => {
                            setActiveTripId(t.id);
                            setShowTripMenu(false);
                          }}
                          style={[
                            styles.tripDropdownItem,
                            t.id === currentTripId && styles.tripDropdownItemActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.tripDropdownText,
                              t.id === currentTripId && styles.tripDropdownTextActive,
                            ]}
                          >
                            {t.title}
                          </Text>
                          <Text style={styles.tripDropdownDates}>{t.dates}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.tripTitle} numberOfLines={2}>
                  {trip.title}
                </Text>
              )}

              {/* Sub-Navigation Tabs (Overview · Itinerary · Map · Expenses · Documents) */}
              {showSubTabs && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabsScrollContent}
                  style={styles.tabsScrollView}
                >
                  <Pressable
                    onPress={() => handleSubTabPress(`/(tabs)/trips/${trip.id}`)}
                    style={({ pressed }) => [
                      styles.tabButton,
                      pressed && styles.tabButtonPressed,
                    ]}
                  >
                    <Text style={styles.tabButtonText}>Overview</Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      handleSubTabPress(`/(tabs)/trips/${trip.id}/itinerary`)
                    }
                    style={({ pressed }) => [
                      styles.tabButton,
                      pressed && styles.tabButtonPressed,
                    ]}
                  >
                    <Text style={styles.tabButtonText}>Itinerary</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleSubTabPress(`/(tabs)/trips/${trip.id}/map`)}
                    style={({ pressed }) => [
                      styles.tabButton,
                      pressed && styles.tabButtonPressed,
                    ]}
                  >
                    <Text style={styles.tabButtonText}>Map</Text>
                  </Pressable>

                  <View style={[styles.tabButton, styles.tabButtonActive]}>
                    <Text style={[styles.tabButtonText, styles.tabButtonTextActive]}>
                      Expenses
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      handleSubTabPress(`/(tabs)/trips/${trip.id}/documents`)
                    }
                    style={({ pressed }) => [
                      styles.tabButton,
                      pressed && styles.tabButtonPressed,
                    ]}
                  >
                    <Text style={styles.tabButtonText}>Documents</Text>
                  </Pressable>
                </ScrollView>
              )}
            </View>
          )}

          {/* ── 2. Budget Overview Hero Card ─────────────────────────────── */}
          <BudgetOverviewCard
            summary={summary}
            budget={budget}
            multiCurrencyTotals={multiCurrencyTotals}
            onEditBudget={() => setShowBudgetModal(true)}
          />

          {/* ── 3. Category Spending Breakdown Card ───────────────────────── */}
          <CategoryBreakdownCard
            expenses={expenses}
            primaryCurrency={summary.currency}
          />

          {/* ── 3. Transaction List Header Row ────────────────────────────── */}
          <View style={styles.listHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>Transactions</Text>
              <Text style={styles.sectionHeaderSubtitle}>
                {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}{' '}
                recorded
              </Text>
            </View>

            <Pressable
              onPress={handleAddExpense}
              style={({ pressed }) => [
                styles.addInlineButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Add Expense"
            >
              <Text style={styles.addInlineButtonText}>+ Add Expense</Text>
            </Pressable>
          </View>

          {/* ── 4. Empty State or Date-Grouped Expenses ───────────────────── */}
          {isEmpty ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Image
                  source={require('@/assets/images/icons/receipt.svg')}
                  style={styles.emptyIcon}
                  tintColor={colors.primary}
                  contentFit="contain"
                />
              </View>
              <Text style={styles.emptyTitle}>No expenses recorded yet</Text>
              <Text style={styles.emptySubtitle}>
                Keep track of your spending on meals, lodging, activities, and transport
                during your journey.
              </Text>
              <Pressable
                onPress={handleAddExpense}
                style={({ pressed }) => [
                  styles.emptyCtaButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add your first expense"
              >
                <Text style={styles.emptyCtaButtonText}>+ Add Your First Expense</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.timelineContainer}>
              {dayGroups.map((group) => (
                <View key={group.date} style={styles.dayGroupSection}>
                  {/* Date Header Badge & Day Total */}
                  <View style={styles.dateHeaderRow}>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeText}>{group.dateLabel}</Text>
                    </View>
                    <Text style={styles.dateDayTotal}>
                      {group.formattedTotal}
                    </Text>
                  </View>

                  {/* List of expenses for this date */}
                  <View style={styles.dayItemsList}>
                    {group.items.map((exp) => (
                      <ExpenseItemCard
                        key={exp.id}
                        expense={exp}
                        payerName={getPayerName(exp.paidBy)}
                        onPress={handleExpensePress}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Trip Budget Modal ─────────────────────────────────────────── */}
      <TripBudgetModal
        visible={showBudgetModal}
        tripId={currentTripId}
        currentBudget={budget}
        currentCurrency={summary.currency}
        onClose={() => setShowBudgetModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  container: {
    flex: 1,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },

  // 1. Header Section
  headerSection: {
    marginBottom: spacing.md,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  backArrowText: {
    fontSize: 20,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  screenTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  screenTagIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
  },
  screenTagText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  addIconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  plusIcon: {
    width: 18,
    height: 18,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  tripTitle: {
    fontFamily: typography.screenTitle.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 4,
  },

  // Trip Selector Dropdown
  tripSelectorContainer: {
    position: 'relative',
    zIndex: 20,
    marginTop: 4,
  },
  tripSelectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripSelectorArrow: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  tripDropdown: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 30,
    overflow: 'hidden',
    ...shadows.sheet,
  },
  tripDropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tripDropdownItemActive: {
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
  },
  tripDropdownText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tripDropdownTextActive: {
    color: colors.primary,
  },
  tripDropdownDates: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Sub-Navigation Tabs
  tabsScrollView: {
    marginTop: spacing.md,
  },
  tabsScrollContent: {
    gap: spacing.xs + 2,
    paddingVertical: 2,
  },
  tabButton: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonPressed: {
    opacity: 0.8,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabButtonText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.textOnPrimary,
  },

  // 3. Transactions Section Header
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeaderTitle: {
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionHeaderSubtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  addInlineButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: 'rgba(44, 95, 94, 0.10)',
  },
  addInlineButtonText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  // 4. Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 36,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyIcon: {
    width: 32,
    height: 32,
  },
  emptyTitle: {
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: typography.bodySecondary.fontFamily,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
    maxWidth: 320,
  },
  emptyCtaButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    ...shadows.card,
  },
  emptyCtaButtonText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },

  // 5. Timeline & Date Groups
  timelineContainer: {
    gap: spacing.lg,
  },
  dayGroupSection: {
    marginBottom: 0,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dateBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBadgeText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dateDayTotal: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayItemsList: {
    marginTop: 2,
  },
});
