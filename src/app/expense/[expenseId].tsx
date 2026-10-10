/**
 * Route: /expense/[expenseId] — Expense Details Screen (Phase 6)
 *
 * Requirements:
 *  - Show the selected expense's:
 *      * Title
 *      * Amount and currency (formatted)
 *      * Category (label and icon)
 *      * Date (formatted calendar date)
 *      * Payer, if available
 *      * Notes, if available
 *  - Actions:
 *      * Edit: Opens existing /add/expense in edit mode with all fields prepopulated.
 *      * Delete: Confirmation dialog, cancelable, deletes through shared store,
 *        returns to appropriate screen and immediately updates list & totals.
 *  - Reactive: subscribes to in-memory expenseStore via useExpense(expenseId).
 *  - No backend, no persistence, strictly in-memory.
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { deleteExpense, useExpense } from '@/services/expenseStore';
import { getTripById, getTripTravelers } from '@/services/mockData';
import { EXPENSE_CATEGORY_META, ExpenseCategory } from '@/types/expense';
import { formatCurrency, getCurrencyConfig } from '@/utils/currencyUtils';
import { formatItineraryDate } from '@/utils/itineraryDateUtils';
import { Button, Card } from '@/components/ui';

// ---------------------------------------------------------------------------
// Category Icon Helper
// ---------------------------------------------------------------------------

function getCategoryIconSource(category: ExpenseCategory) {
  switch (category) {
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

// ---------------------------------------------------------------------------
// Main Screen Component
// ---------------------------------------------------------------------------

export default function ExpenseDetailScreen() {
  const { expenseId, tripId } = useLocalSearchParams<{
    expenseId: string;
    tripId?: string;
  }>();
  const insets = useSafeAreaInsets();

  // 1. Reactive expense state from centralized store
  const { expense, exists } = useExpense(expenseId);

  // 2. Modals state for Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // 3. Trip & Traveler context
  const effectiveTripId = expense?.tripId || tripId || 'japan-adventure';
  const trip = useMemo(() => getTripById(effectiveTripId), [effectiveTripId]);
  const tripTravelers = useMemo(
    () => getTripTravelers(effectiveTripId),
    [effectiveTripId]
  );

  // Payer display resolution
  const payerName = useMemo(() => {
    if (!expense?.paidBy) return null;
    const traveler = tripTravelers.find((t) => t.id === expense.paidBy);
    if (traveler) {
      return `${traveler.name}${traveler.isCurrentUser ? ' (You)' : ''}`;
    }
    return expense.paidBy;
  }, [expense, tripTravelers]);

  // ---------------------------------------------------------------------------
  // Navigation Handlers
  // ---------------------------------------------------------------------------

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(`/(tabs)/trips/${effectiveTripId}/expenses` as any);
    }
  };

  const handleEditPress = () => {
    if (!expense) return;
    router.push({
      pathname: '/add/expense',
      params: { expenseId: expense.id, tripId: expense.tripId },
    });
  };

  const handleDeletePress = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (!expense) return;
    const targetTripId = expense.tripId;
    deleteExpense(expense.id);
    setShowDeleteConfirm(false);

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(`/(tabs)/trips/${targetTripId}/expenses` as any);
    }
  };

  // ---------------------------------------------------------------------------
  // Empty / Not Found State (e.g. deleted or invalid param)
  // ---------------------------------------------------------------------------

  if (!exists || !expense) {
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.iconCircleButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>Expense Details</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIconCircle}>
            <Image
              source={require('@/assets/images/icons/receipt.svg')}
              style={styles.notFoundIcon}
              contentFit="contain"
              tintColor={colors.primary}
            />
          </View>
          <Text style={styles.notFoundTitle}>Expense Not Found</Text>
          <Text style={styles.notFoundSubtitle}>
            This expense may have been deleted or does not exist in your current trip.
          </Text>
          <Button
            label="Back to Expenses"
            variant="primary"
            onPress={handleBack}
            style={styles.notFoundButton}
          />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Formatted Displays
  // ---------------------------------------------------------------------------

  const categoryMeta = EXPENSE_CATEGORY_META[expense.category];
  const formattedAmount = formatCurrency(expense.amount, expense.currency);
  const currencyConfig = getCurrencyConfig(expense.currency);
  const formattedDate = formatItineraryDate(expense.date, 'full');

  return (
    <View style={styles.screen}>
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 16 : 12) + 6,
          },
        ]}
      >
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.iconCircleButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <Text style={styles.topBarTitle}>Expense Details</Text>

        <View style={styles.topBarActions}>
          <Pressable
            onPress={handleEditPress}
            style={({ pressed }) => [
              styles.iconCircleButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Edit expense"
          >
            <Text style={styles.editIconText}>✎</Text>
          </Pressable>

          <Pressable
            onPress={handleDeletePress}
            style={({ pressed }) => [
              styles.deleteCircleButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Delete expense"
          >
            <Image
              source={require('@/assets/images/icons/close.svg')}
              style={styles.deleteIcon}
              tintColor={colors.destructive}
              contentFit="contain"
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* ── 1. Hero Card: Amount, Category Pill, Title, Date ───────── */}
          <Card style={styles.heroCard} variant="elevated">
            {/* Category Pill */}
            <View style={styles.heroTopRow}>
              <View style={styles.categoryBadgeContainer}>
                <Image
                  source={getCategoryIconSource(expense.category)}
                  style={styles.categoryBadgeIcon}
                  tintColor={colors.primary}
                  contentFit="contain"
                />
                <Text style={styles.categoryBadgeText}>
                  {categoryMeta.label}
                </Text>
              </View>

              <View style={styles.currencyCodePill}>
                <Text style={styles.currencyCodePillText}>
                  {expense.currency}
                </Text>
              </View>
            </View>

            {/* Large Formatted Amount */}
            <Text style={styles.heroAmount}>{formattedAmount}</Text>

            {/* Title */}
            <Text style={styles.heroTitle}>{expense.title}</Text>

            {/* Date Row */}
            <View style={styles.heroDateRow}>
              <Image
                source={require('@/assets/images/icons/calendar.svg')}
                style={styles.heroDateIcon}
                tintColor={colors.primary}
                contentFit="contain"
              />
              <Text style={styles.heroDateText}>{formattedDate}</Text>
            </View>
          </Card>

          {/* ── 2. Information Details Card ─────────────────────────────── */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Financial Breakdown</Text>

            <Card style={styles.detailCard} variant="standard">
              {/* Category */}
              <View style={styles.infoRow}>
                <View style={styles.infoRowLabelGroup}>
                  <Image
                    source={getCategoryIconSource(expense.category)}
                    style={styles.infoRowIcon}
                    tintColor={colors.primary}
                    contentFit="contain"
                  />
                  <Text style={styles.infoRowLabel}>Category</Text>
                </View>
                <Text style={styles.infoRowValue}>{categoryMeta.label}</Text>
              </View>

              <View style={styles.infoRowDivider} />

              {/* Amount & Currency */}
              <View style={styles.infoRow}>
                <View style={styles.infoRowLabelGroup}>
                  <Image
                    source={require('@/assets/images/icons/receipt.svg')}
                    style={styles.infoRowIcon}
                    tintColor={colors.primary}
                    contentFit="contain"
                  />
                  <Text style={styles.infoRowLabel}>Amount & Currency</Text>
                </View>
                <Text style={styles.infoRowValue}>
                  {formattedAmount} ({currencyConfig.name})
                </Text>
              </View>

              <View style={styles.infoRowDivider} />

              {/* Date */}
              <View style={styles.infoRow}>
                <View style={styles.infoRowLabelGroup}>
                  <Image
                    source={require('@/assets/images/icons/calendar.svg')}
                    style={styles.infoRowIcon}
                    tintColor={colors.primary}
                    contentFit="contain"
                  />
                  <Text style={styles.infoRowLabel}>Expense Date</Text>
                </View>
                <Text style={styles.infoRowValue}>{expense.date}</Text>
              </View>

              {/* Payer (if available) */}
              {payerName ? (
                <>
                  <View style={styles.infoRowDivider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoRowLabelGroup}>
                      <Image
                        source={require('@/assets/images/onboarding/person.svg')}
                        style={styles.infoRowIcon}
                        tintColor={colors.primary}
                        contentFit="contain"
                      />
                      <Text style={styles.infoRowLabel}>Paid By</Text>
                    </View>
                    <View style={styles.payerBadge}>
                      <Text style={styles.payerBadgeText}>{payerName}</Text>
                    </View>
                  </View>
                </>
              ) : null}

              {/* Associated Trip */}
              {trip ? (
                <>
                  <View style={styles.infoRowDivider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoRowLabelGroup}>
                      <Image
                        source={require('@/assets/images/icons/landscape.svg')}
                        style={styles.infoRowIcon}
                        tintColor={colors.primary}
                        contentFit="contain"
                      />
                      <Text style={styles.infoRowLabel}>Trip</Text>
                    </View>
                    <Text style={styles.infoRowValue}>{trip.title}</Text>
                  </View>
                </>
              ) : null}
            </Card>
          </View>

          {/* ── 3. Notes Card (if available) ─────────────────────────────── */}
          {expense.notes ? (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeading}>Notes & Details</Text>
              <Card style={styles.notesCard} variant="standard">
                <Text style={styles.notesText}>{expense.notes}</Text>
              </Card>
            </View>
          ) : null}

          {/* ── 4. Audit Metadata ────────────────────────────────────────── */}
          <View style={styles.metaInfoContainer}>
            <Text style={styles.metaInfoText}>
              Expense ID: {expense.id}
            </Text>
            {expense.updatedAt && (
              <Text style={styles.metaInfoText}>
                Last updated:{' '}
                {new Date(expense.updatedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            )}
          </View>

          {/* ── 5. Action Buttons Row ────────────────────────────────────── */}
          <View style={styles.actionButtonsContainer}>
            <Button
              label="Edit Expense"
              variant="primary"
              onPress={handleEditPress}
              style={styles.actionButton}
            />
            <Button
              label="Delete Expense"
              variant="destructive"
              onPress={handleDeletePress}
              style={styles.actionButton}
            />
          </View>
        </View>
      </ScrollView>

      {/* ── 6. Delete Confirmation Modal ───────────────────────────────── */}
      {showDeleteConfirm && (
        <Modal
          visible={showDeleteConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteConfirm(false)}
        >
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogCard}>
              <View style={styles.dialogIconCircle}>
                <Image
                  source={require('@/assets/images/icons/close.svg')}
                  style={styles.dialogIcon}
                  tintColor={colors.destructive}
                  contentFit="contain"
                />
              </View>

              <Text style={styles.dialogTitle}>Delete this expense?</Text>
              <Text style={styles.dialogSubtitle}>
                Are you sure? &ldquo;{expense.title}&rdquo; ({formattedAmount}) will
                be permanently removed and your trip totals will update immediately.
              </Text>

              <View style={styles.dialogButtonRow}>
                <Button
                  label="Cancel"
                  variant="outline"
                  onPress={() => setShowDeleteConfirm(false)}
                  style={styles.dialogCancelButton}
                />
                <Button
                  label="Delete"
                  variant="destructive"
                  onPress={handleConfirmDelete}
                  style={styles.dialogConfirmButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  container: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },

  // ── Top Navigation Bar ───────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  topBarTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topBarSpacer: {
    width: 40,
  },
  iconCircleButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  deleteCircleButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(176, 74, 74, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(176, 74, 74, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  editIconText: {
    fontSize: 16,
    color: colors.primary,
    lineHeight: 18,
  },
  deleteIcon: {
    width: 16,
    height: 16,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },

  // ── Hero Summary Card ────────────────────────────────────────────────────
  heroCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  categoryBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    gap: 6,
  },
  categoryBadgeIcon: {
    width: 14,
    height: 14,
  },
  categoryBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  currencyCodePill: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  currencyCodePillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  heroAmount: {
    ...typography.stat,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  heroDateIcon: {
    width: 15,
    height: 15,
  },
  heroDateText: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    fontFamily: fontFamily.medium,
  },

  // ── Details Section ──────────────────────────────────────────────────────
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  detailCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  infoRowLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoRowIcon: {
    width: 16,
    height: 16,
  },
  infoRowLabel: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    fontFamily: fontFamily.medium,
  },
  infoRowValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fontFamily.semiBold,
    textAlign: 'right',
  },
  infoRowDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  payerBadge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  payerBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Notes Card ───────────────────────────────────────────────────────────
  notesCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesText: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },

  // ── Meta Info Container ──────────────────────────────────────────────────
  metaInfoContainer: {
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xl,
    paddingVertical: spacing.xs,
  },
  metaInfoText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // ── Bottom Action Buttons ────────────────────────────────────────────────
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },

  // ── Empty / Not Found ────────────────────────────────────────────────────
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  notFoundIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  notFoundIcon: {
    width: 36,
    height: 36,
  },
  notFoundTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  notFoundSubtitle: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  notFoundButton: {
    minWidth: 180,
  },

  // ── Delete Confirmation Dialog ───────────────────────────────────────────
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.sheet,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sheet,
  },
  dialogIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(176, 74, 74, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  dialogIcon: {
    width: 24,
    height: 24,
  },
  dialogTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  dialogSubtitle: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dialogButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  dialogCancelButton: {
    flex: 1,
  },
  dialogConfirmButton: {
    flex: 1,
  },
});
