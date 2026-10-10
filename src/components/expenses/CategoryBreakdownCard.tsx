/**
 * Voyaro Expense Component — CategoryBreakdownCard (Phase 6 — Step 7)
 *
 * Displays a clean, readable category-based spending summary for a trip:
 *  1. Spending by category with formatted amounts and item counts.
 *  2. Share of eligible spending represented via horizontal progress bars.
 *  3. Distinct highlight banner for the highest-spending category.
 *  4. Strict currency isolation: multi-currency switcher prevents combining mismatched currencies.
 *  5. Empty state when no expenses are recorded.
 *  6. No external chart libraries required; built with Voyaro design tokens.
 */

import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { CurrencyCode, Expense, ExpenseCategory } from '@/types/expense';
import { getTripCategoryBreakdowns } from '@/utils/currencyUtils';

export interface CategoryBreakdownCardProps {
  expenses: Expense[];
  primaryCurrency?: CurrencyCode;
  style?: StyleProp<ViewStyle>;
}

function getCategoryIcon(cat: ExpenseCategory) {
  switch (cat) {
    case 'food_drinks':
      return require('@/assets/images/onboarding/restaurant.svg');
    case 'accommodation':
      return require('@/assets/images/icons/hotel.svg');
    case 'transportation':
      return require('@/assets/images/onboarding/flight-takeoff.svg');
    case 'activities':
      return require('@/assets/images/icons/landscape.svg');
    case 'shopping':
      return require('@/assets/images/onboarding/shopping.svg');
    case 'flights':
      return require('@/assets/images/icons/flight.svg');
    case 'other':
    default:
      return require('@/assets/images/icons/receipt.svg');
  }
}

export function CategoryBreakdownCard({
  expenses,
  primaryCurrency = 'USD',
  style,
}: CategoryBreakdownCardProps) {
  // 1. Group breakdowns by currency
  const breakdowns = useMemo(() => {
    return getTripCategoryBreakdowns(expenses, primaryCurrency);
  }, [expenses, primaryCurrency]);

  // 2. Active currency tab selection
  const [activeCurrency, setActiveCurrency] = useState<CurrencyCode>(() => {
    return breakdowns[0]?.currency || primaryCurrency;
  });

  // Current active breakdown
  const currentBreakdown = useMemo(() => {
    return (
      breakdowns.find((b) => b.currency === activeCurrency) ||
      breakdowns[0] ||
      getTripCategoryBreakdowns([], primaryCurrency)[0]
    );
  }, [breakdowns, activeCurrency, primaryCurrency]);

  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);

  const displayedCategories = showAllCategories
    ? currentBreakdown.categories
    : currentBreakdown.activeCategories;

  const hasSpending = currentBreakdown.activeCategories.length > 0;
  const highest = currentBreakdown.highestCategory;

  return (
    <View style={[styles.cardContainer, style]}>
      {/* ── 1. Header Row & Currency Switcher ─────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Category Breakdown</Text>
          <Text style={styles.headerSubtitle}>
            {hasSpending
              ? `${currentBreakdown.activeCategories.length} categories · ${currentBreakdown.formattedTotal}`
              : 'No expenses recorded yet'}
          </Text>
        </View>

        {/* Currency Switcher (shown when trip has expenses in multiple currencies) */}
        {breakdowns.length > 1 && (
          <View style={styles.currencySwitchRow}>
            {breakdowns.map((b) => {
              const isSelected = b.currency === activeCurrency;
              return (
                <Pressable
                  key={b.currency}
                  onPress={() => setActiveCurrency(b.currency)}
                  style={({ pressed }) => [
                    styles.currencySwitchPill,
                    isSelected && styles.currencySwitchPillActive,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${b.currency} category breakdown`}
                >
                  <Text
                    style={[
                      styles.currencySwitchText,
                      isSelected && styles.currencySwitchTextActive,
                    ]}
                  >
                    {b.currency}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* ── 2. Highest-Spending Category Banner ───────────────────────── */}
      {highest && (
        <View style={styles.topCategoryBanner}>
          <View style={styles.topCategoryIconBox}>
            <Image
              source={getCategoryIcon(highest.category)}
              style={styles.topCategoryIcon}
              tintColor={colors.primary}
              contentFit="contain"
            />
          </View>
          <View style={styles.topCategoryTextGroup}>
            <Text style={styles.topCategoryOverline}>HIGHEST SPENDING CATEGORY</Text>
            <Text style={styles.topCategoryTitle} numberOfLines={1}>
              {highest.label}{' '}
              <Text style={styles.topCategoryMetrics}>
                · {highest.formattedAmount} ({highest.percentage}% of total)
              </Text>
            </Text>
          </View>
        </View>
      )}

      {/* ── 3. Category Bars or Empty State ───────────────────────────── */}
      {!hasSpending ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Image
              source={require('@/assets/images/icons/receipt.svg')}
              style={styles.emptyIcon}
              tintColor={colors.textMuted}
              contentFit="contain"
            />
          </View>
          <Text style={styles.emptyTitle}>No category spending yet</Text>
          <Text style={styles.emptySubtitle}>
            Expenses you record in {currentBreakdown.currency} will be categorized and show their share of spending here.
          </Text>
        </View>
      ) : (
        <View style={styles.categoriesList}>
          {displayedCategories.map((item) => {
            const iconSource = getCategoryIcon(item.category);
            const fillWidth = `${Math.min(100, Math.max(0, item.percentage))}%`;

            return (
              <View key={item.category} style={styles.categoryRow}>
                {/* Meta Row: Icon + Label + Amount + Percentage */}
                <View style={styles.rowTop}>
                  <View style={styles.rowLabelGroup}>
                    <View style={styles.categoryIconCircle}>
                      <Image
                        source={iconSource}
                        style={styles.categoryIcon}
                        tintColor={item.isHighest ? colors.primary : colors.textSecondary}
                        contentFit="contain"
                      />
                    </View>
                    <View>
                      <View style={styles.categoryTitleGroup}>
                        <Text style={styles.categoryLabel}>{item.label}</Text>
                        {item.isHighest && (
                          <View style={styles.topTag}>
                            <Text style={styles.topTagText}>Top</Text>
                          </View>
                        )}
                      </View>
                      {item.expenseCount > 0 && (
                        <Text style={styles.categoryCountText}>
                          {item.expenseCount} {item.expenseCount === 1 ? 'expense' : 'expenses'}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.rowAmountGroup}>
                    <Text style={styles.categoryAmountText}>
                      {item.formattedAmount}
                    </Text>
                    <View style={styles.percentageBadge}>
                      <Text style={styles.percentageBadgeText}>
                        {item.percentage}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Horizontal Progress Bar Track */}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: fillWidth as any },
                      item.isHighest && styles.barFillHighest,
                    ]}
                  />
                </View>
              </View>
            );
          })}

          {/* Toggle to view all 7 categories or only active ones */}
          {currentBreakdown.categories.length > currentBreakdown.activeCategories.length && (
            <Pressable
              onPress={() => setShowAllCategories((prev) => !prev)}
              style={({ pressed }) => [
                styles.toggleAllButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Toggle all categories visibility"
            >
              <Text style={styles.toggleAllText}>
                {showAllCategories
                  ? 'Show active categories only'
                  : `Show all 7 categories (${currentBreakdown.categories.length - currentBreakdown.activeCategories.length} with $0 spending)`}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------

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

  // ── Header Row ───────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  currencySwitchRow: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.background,
    padding: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencySwitchPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  currencySwitchPillActive: {
    backgroundColor: colors.primary,
  },
  currencySwitchText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  currencySwitchTextActive: {
    color: colors.textOnPrimary,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },

  // ── Highest Category Banner ──────────────────────────────────────────────
  topCategoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radius.input,
    padding: spacing.md - 2,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.15)',
  },
  topCategoryIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCategoryIcon: {
    width: 18,
    height: 18,
  },
  topCategoryTextGroup: {
    flex: 1,
  },
  topCategoryOverline: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  topCategoryTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  topCategoryMetrics: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // ── Categories List ──────────────────────────────────────────────────────
  categoriesList: {
    gap: spacing.md,
  },
  categoryRow: {
    gap: 6,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  categoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.input,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryIcon: {
    width: 16,
    height: 16,
  },
  categoryTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  topTag: {
    backgroundColor: 'rgba(44, 95, 94, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  topTagText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  categoryCountText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    color: colors.textMuted,
  },
  rowAmountGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  categoryAmountText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  percentageBadge: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    minWidth: 36,
    alignItems: 'center',
  },
  percentageBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  // ── Progress Bar Track & Fill ────────────────────────────────────────────
  barTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: 'rgba(44, 95, 94, 0.55)',
  },
  barFillHighest: {
    backgroundColor: colors.primary,
  },

  // ── Toggle All Categories Button ─────────────────────────────────────────
  toggleAllButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  toggleAllText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Empty State ──────────────────────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    width: 22,
    height: 22,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
});
