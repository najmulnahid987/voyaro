/**
 * Voyaro Expense Component — BudgetOverviewCard (Phase 6)
 *
 * Displays the high-level financial health of a trip:
 *  1. Total Spent
 *  2. Trip Budget (handles missing or zero budget safely)
 *  3. Remaining Budget (handles negative / over-budget state clearly)
 *  4. Budget Usage Progress Indicator (with warning state when exceeded)
 *  5. Multi-currency breakdown tags when expenses span different currencies
 */

import { colors, radius, shadows, spacing, typography } from '@/theme';
import {
  CurrencyTotal,
  TripBudget,
  TripExpenseSummary,
} from '@/types/expense';
import { formatCurrency } from '@/utils/currencyUtils';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface BudgetOverviewCardProps {
  summary: TripExpenseSummary;
  budget?: TripBudget;
  multiCurrencyTotals?: Record<string, CurrencyTotal>;
  onEditBudget?: () => void;
}

export function BudgetOverviewCard({
  summary,
  budget,
  multiCurrencyTotals,
  onEditBudget,
}: BudgetOverviewCardProps) {
  const hasBudget = budget !== undefined;
  const isOverBudget = summary.isOverBudget || false;
  const percentUsed = summary.percentUsed ?? 0;

  // Progress width calculation (capped at 100% for visual fill)
  let progressFillWidth = '0%';
  if (hasBudget) {
    if (budget.amount === 0) {
      progressFillWidth = isOverBudget ? '100%' : '0%';
    } else {
      progressFillWidth = `${Math.min(100, Math.max(0, percentUsed))}%`;
    }
  }

  // Multi-currency detection
  const distinctCurrencies = multiCurrencyTotals
    ? Object.keys(multiCurrencyTotals).filter((c) => multiCurrencyTotals[c].expenseCount > 0)
    : [];
  const hasMultipleCurrencies = distinctCurrencies.length > 1;

  return (
    <View style={styles.cardContainer}>
      {/* ── Top Header & Over-Budget Badge ─────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeftGroup}>
          <Text style={styles.headerTitle}>Trip Spending</Text>
          {onEditBudget && (
            <Pressable
              onPress={onEditBudget}
              style={({ pressed }) => [
                styles.editBudgetButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={hasBudget ? 'Edit budget' : 'Set budget'}
            >
              <Text style={styles.editBudgetText}>
                {hasBudget ? '✎ Edit' : '+ Set'}
              </Text>
            </Pressable>
          )}
        </View>

        {isOverBudget ? (
          <View style={styles.overBudgetBadge}>
            <Text style={styles.overBudgetBadgeText}>OVER BUDGET</Text>
          </View>
        ) : hasBudget ? (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>{percentUsed}% USED</Text>
          </View>
        ) : (
          <View style={styles.noBudgetBadge}>
            <Text style={styles.noBudgetBadgeText}>NO BUDGET SET</Text>
          </View>
        )}
      </View>

      {/* ── Metric Columns (Total Spent vs Remaining) ──────────────────── */}
      <View style={styles.metricsRow}>
        {/* Total Spent */}
        <View style={styles.metricColumn}>
          <Text style={styles.metricOverline}>TOTAL SPENT</Text>
          <Text style={styles.metricSpentValue}>
            {summary.totalSpentFormatted}
          </Text>
        </View>

        {/* Remaining Budget */}
        <View style={[styles.metricColumn, styles.metricColumnRight]}>
          <Text style={styles.metricOverline}>
            {isOverBudget ? 'OVER BUDGET BY' : 'REMAINING'}
          </Text>
          {hasBudget ? (
            <Text
              style={[
                styles.metricRemainingValue,
                isOverBudget && styles.metricOverBudgetValue,
              ]}
            >
              {isOverBudget
                ? formatCurrency(
                  Math.abs(summary.remainingMinorUnits || 0),
                  summary.currency
                )
                : summary.remainingFormatted || '$0.00'}
            </Text>
          ) : (
            <Text style={styles.metricUnsetValue}>—</Text>
          )}
        </View>
      </View>

      {/* ── Progress Track ─────────────────────────────────────────────── */}
      {hasBudget && (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: progressFillWidth as any },
                isOverBudget && styles.progressFillOverBudget,
              ]}
            />
          </View>

          <View style={styles.progressFooter}>
            <Text style={styles.progressFooterText}>
              {percentUsed}% of budget used
            </Text>
            <Text style={styles.progressFooterText}>
              Budget: {summary.budgetFormatted}
            </Text>
          </View>
        </View>
      )}

      {/* ── Missing Budget Helper ──────────────────────────────────────── */}
      {!hasBudget && (
        <View style={styles.noBudgetNoteBox}>
          <Text style={styles.noBudgetNoteText}>
            No trip budget set. Expenses are tracked against your total spending.
          </Text>
          {onEditBudget && (
            <Pressable
              onPress={onEditBudget}
              style={({ pressed }) => [
                styles.setBudgetCtaButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Set trip budget"
            >
              <Text style={styles.setBudgetCtaText}>+ Set Trip Budget</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Multi-Currency Breakdown (If Applicable) ───────────────────── */}
      {hasMultipleCurrencies && (
        <View style={styles.multiCurrencySection}>
          <Text style={styles.multiCurrencyTitle}>CURRENCY BREAKDOWN</Text>
          <View style={styles.multiCurrencyBadgesRow}>
            {distinctCurrencies.map((curr) => {
              const item = multiCurrencyTotals![curr];
              return (
                <View key={curr} style={styles.currencyPill}>
                  <Text style={styles.currencyPillCode}>{curr}</Text>
                  <Text style={styles.currencyPillAmount}>
                    {item.formattedTotal}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md + 2,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  editBudgetButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  editBudgetText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  overBudgetBadge: {
    backgroundColor: 'rgba(176, 74, 74, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.error,
  },
  overBudgetBadgeText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    color: colors.error,
    letterSpacing: 0.5,
  },
  activeBadge: {
    backgroundColor: 'rgba(44, 95, 94, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  activeBadgeText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  noBudgetBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noBudgetBadgeText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metricColumn: {
    flex: 1,
  },
  metricColumnRight: {
    alignItems: 'flex-end',
  },
  metricOverline: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  metricSpentValue: {
    fontFamily: typography.stat.fontFamily,
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  metricRemainingValue: {
    fontFamily: typography.stat.fontFamily,
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.4,
  },
  metricOverBudgetValue: {
    color: colors.error,
  },
  metricUnsetValue: {
    fontFamily: typography.stat.fontFamily,
    fontSize: 22,
    fontWeight: '600',
    color: colors.textMuted,
  },
  progressSection: {
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  progressFillOverBudget: {
    backgroundColor: colors.error,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs + 2,
  },
  progressFooterText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  noBudgetNoteBox: {
    backgroundColor: colors.background,
    borderRadius: radius.input,
    padding: spacing.sm,
    marginTop: 2,
    alignItems: 'center',
  },
  noBudgetNoteText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  setBudgetCtaButton: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  setBudgetCtaText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  multiCurrencySection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  multiCurrencyTitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  multiCurrencyBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currencyPillCode: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 4,
  },
  currencyPillAmount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
