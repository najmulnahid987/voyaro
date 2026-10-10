/**
 * Voyaro Expense Component — ExpenseItemCard (Phase 6)
 *
 * Renders an individual expense row item within the grouped expense list.
 * Displays:
 *  - Category icon & colored container
 *  - Expense title & category label
 *  - Payer attribution (e.g. "Paid by Alex")
 *  - Notes snippet if available
 *  - Formatted currency amount
 *  - Tap interaction linking to details/edit flow
 */

import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { Expense, EXPENSE_CATEGORY_META, ExpenseCategory } from '@/types/expense';
import { formatCurrency } from '@/utils/currencyUtils';

export interface ExpenseItemCardProps {
  expense: Expense;
  payerName?: string;
  onPress?: (expense: Expense) => void;
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

export function ExpenseItemCard({
  expense,
  payerName,
  onPress,
  style,
}: ExpenseItemCardProps) {
  const categoryMeta = EXPENSE_CATEGORY_META[expense.category];
  const iconSource = getCategoryIcon(expense.category);
  const formattedAmount = formatCurrency(expense.amount, expense.currency);

  const handlePress = () => {
    onPress?.(expense);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${expense.title}, ${categoryMeta.label}, ${formattedAmount}`}
    >
      {/* Category Icon */}
      <View style={styles.iconContainer}>
        <Image
          source={iconSource}
          style={styles.icon}
          tintColor={colors.primary}
          contentFit="contain"
        />
      </View>

      {/* Main Details */}
      <View style={styles.contentContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {expense.title}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.categoryLabel}>{categoryMeta.label}</Text>
          {payerName ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.payerLabel} numberOfLines={1}>
                Paid by {payerName}
              </Text>
            </>
          ) : null}
        </View>

        {expense.notes ? (
          <Text style={styles.notesText} numberOfLines={1}>
            {expense.notes}
          </Text>
        ) : null}
      </View>

      {/* Right Amount Column */}
      <View style={styles.amountContainer}>
        <Text style={styles.amountText}>{formattedAmount}</Text>
        <Text style={styles.arrowText}>→</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: radius.input,
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: {
    width: 20,
    height: 20,
  },
  contentContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontFamily: typography.cardTitle.fontFamily,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  categoryLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: 4,
  },
  payerLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.textMuted,
  },
  notesText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontFamily: typography.stat.fontFamily,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  arrowText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
