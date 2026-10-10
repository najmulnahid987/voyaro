/**
 * Route: /add/expense — Add / Edit Expense Screen (Phase 6)
 *
 * Full-screen modal form for recording trip expenses into the centralized in-memory store.
 *
 * Screen Fields:
 *   - Expense Title (merchant or item description, required)
 *   - Amount (numeric input, strictly positive, required)
 *   - Currency Selector (USD, EUR, GBP, JPY, AUD, CAD, CHF, SGD)
 *   - Category Selector (Accommodation, Transportation, Food & Drinks, Activities, Shopping, Flights, Other)
 *   - Expense Date (native calendar date picker)
 *   - Paid By (optional traveler selector)
 *   - Notes (optional reminders, receipt notes)
 *   - Live Expense Preview Card
 *
 * Navigation:
 *   - Receives tripId (and optional expenseId for editing) via useLocalSearchParams.
 *   - Safely falls back to active demo trip ('japan-adventure') if tripId is omitted.
 *   - Returns to previous screen or trip expenses list upon save / cancel.
 */

import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import {
  addExpense,
  deleteExpense,
  getExpenseById,
  updateExpense,
} from '@/services/expenseStore';
import { getAllTrips, getTripById, getTripTravelers } from '@/services/mockData';
import { Button } from '@/components/ui';
import {
  CurrencyCode,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_META,
  ExpenseCategory,
} from '@/types/expense';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';
import {
  formatCurrency,
  getCurrencyConfig,
  SUPPORTED_CURRENCIES,
  toMajorUnits,
  toMinorUnits,
} from '@/utils/currencyUtils';
import {
  validateExpenseAmount,
  validateExpenseDate,
} from '@/utils/expenseValidation';

// Category icon mapper
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

function toIsoDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AddExpenseScreen() {
  const { tripId, expenseId } = useLocalSearchParams<{
    tripId?: string;
    expenseId?: string;
  }>();
  const insets = useSafeAreaInsets();

  // 1. Resolve Trip Reference
  const allTrips = getAllTrips();
  const rawTripId = tripId || 'japan-adventure';
  const effectiveTripId =
    allTrips.some((t) => t.id === rawTripId) ? rawTripId : 'japan-adventure';
  const trip = getTripById(effectiveTripId) || allTrips[0];
  const tripTravelers = getTripTravelers(effectiveTripId);

  // 2. Resolve Existing Item if Edit Mode
  const existingExpense = useMemo(() => {
    return expenseId ? getExpenseById(expenseId) : undefined;
  }, [expenseId]);
  const isEditMode = Boolean(existingExpense);

  // 3. Form State
  const [selectedTripId, setSelectedTripId] = useState<string>(
    () => existingExpense?.tripId || effectiveTripId
  );
  const [title, setTitle] = useState<string>(
    () => existingExpense?.title || ''
  );
  const [amountStr, setAmountStr] = useState<string>(() => {
    if (existingExpense) {
      const major = toMajorUnits(existingExpense.amount, existingExpense.currency);
      return String(major);
    }
    return '';
  });
  const [currency, setCurrency] = useState<CurrencyCode>(
    () => existingExpense?.currency || 'USD'
  );
  const [category, setCategory] = useState<ExpenseCategory>(
    () => existingExpense?.category || 'food_drinks'
  );
  const [date, setDate] = useState<Date>(() => {
    if (existingExpense?.date) {
      const parsed = new Date(existingExpense.date);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });
  const [paidBy, setPaidBy] = useState<string>(
    () => existingExpense?.paidBy || tripTravelers[0]?.id || ''
  );
  const [notes, setNotes] = useState<string>(
    () => existingExpense?.notes || ''
  );

  // 4. UI Flags & Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState<boolean>(false);
  const [showTripDropdown, setShowTripDropdown] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Synchronize state if expenseId changes without cascading effect renders
  const [prevExpenseId, setPrevExpenseId] = useState<string | undefined>(expenseId);
  if (expenseId !== prevExpenseId) {
    setPrevExpenseId(expenseId);
    if (existingExpense) {
      setTitle(existingExpense.title);
      setAmountStr(String(toMajorUnits(existingExpense.amount, existingExpense.currency)));
      setCurrency(existingExpense.currency);
      setCategory(existingExpense.category);
      const parsed = new Date(existingExpense.date);
      if (!isNaN(parsed.getTime())) {
        setDate(parsed);
      }
      setPaidBy(existingExpense.paidBy || '');
      setNotes(existingExpense.notes || '');
      setSelectedTripId(existingExpense.tripId);
    }
  }

  const currencyConfig = useMemo(() => getCurrencyConfig(currency), [currency]);

  // 5. Navigation Handlers
  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(`/(tabs)/trips/${selectedTripId}/expenses` as any);
    }
  };

  const handleConfirmDelete = () => {
    if (!existingExpense) return;
    deleteExpense(existingExpense.id);
    setShowDeleteConfirm(false);
    router.replace(`/(tabs)/trips/${selectedTripId}/expenses` as any);
  };

  // 6. Form Submission
  const handleSubmit = async () => {
    if (isSubmitting) return;

    const newErrors: Record<string, string> = {};

    // Validate title
    if (!title.trim()) {
      newErrors.title = 'Expense title or merchant name is required.';
    } else if (title.trim().length > 120) {
      newErrors.title = 'Title must be 120 characters or fewer.';
    }

    // Validate amount
    const amountVal = validateExpenseAmount(amountStr, currency);
    if (!amountVal.isValid) {
      newErrors.amount = amountVal.error || 'Please enter a valid positive amount.';
    }

    // Validate date
    const dateVal = validateExpenseDate(toIsoDateOnly(date));
    if (!dateVal.isValid) {
      newErrors.date = dateVal.error || 'Please enter a valid calendar date.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const minorUnits = toMinorUnits(amountStr, currency);
      const isoDate = toIsoDateOnly(date);

      if (isEditMode && existingExpense) {
        updateExpense(existingExpense.id, {
          title: title.trim(),
          amount: minorUnits,
          currency,
          category,
          date: isoDate,
          paidBy: paidBy ? paidBy.trim() : undefined,
          notes: notes.trim() ? notes.trim() : undefined,
        });
      } else {
        addExpense({
          tripId: selectedTripId,
          title: title.trim(),
          amount: minorUnits,
          currency,
          category,
          date: isoDate,
          paidBy: paidBy ? paidBy.trim() : undefined,
          notes: notes.trim() ? notes.trim() : undefined,
        });
      }

      // Return to caller screen
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push(`/(tabs)/trips/${selectedTripId}/expenses` as any);
      }
    } catch (err: any) {
      console.warn('Error saving expense:', err);
      setErrors({ form: err.message || 'Failed to save expense.' });
      setIsSubmitting(false);
    }
  };

  // Live preview formatting
  const previewFormattedAmount = useMemo(() => {
    try {
      if (!amountStr.trim()) return `${currencyConfig.symbol}0.00`;
      const minor = toMinorUnits(amountStr, currency);
      return formatCurrency(minor, currency);
    } catch {
      return `${currencyConfig.symbol}0.00`;
    }
  }, [amountStr, currency, currencyConfig]);

  const selectedCategoryMeta = EXPENSE_CATEGORY_META[category];

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 16 : 12) + 8,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 24 : 16) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* ── 1. Top Header ────────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>
                {isEditMode ? 'Edit Expense' : 'Add Expense'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {trip?.title ? `For ${trip.title}` : 'Track spending for your trip'}
              </Text>
            </View>

            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
            >
              <Image
                source={require('@/assets/images/icons/close.svg')}
                style={styles.closeButtonIcon}
                tintColor={colors.textSecondary}
                contentFit="contain"
              />
            </Pressable>
          </View>

          {/* Form-level error alert if any */}
          {errors.form ? (
            <View style={styles.formErrorBox}>
              <Text style={styles.formErrorText}>{errors.form}</Text>
            </View>
          ) : null}

          {/* ── 2. Trip Selector (Shown when editing or multiple trips) ─── */}
          {allTrips.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trip</Text>
              <View style={styles.cardContainer}>
                <Pressable
                  onPress={() => setShowTripDropdown((prev) => !prev)}
                  style={styles.selectTrigger}
                  accessibilityRole="button"
                  accessibilityLabel="Select trip"
                >
                  <View style={styles.selectTriggerLeft}>
                    <Image
                      source={require('@/assets/images/icons/landscape.svg')}
                      style={styles.selectIcon}
                      tintColor={colors.primary}
                      contentFit="contain"
                    />
                    <Text style={styles.selectTriggerText} numberOfLines={1}>
                      {allTrips.find((t) => t.id === selectedTripId)?.title || 'Select Trip'}
                    </Text>
                  </View>
                  <Text style={styles.selectTriggerArrow}>▼</Text>
                </Pressable>

                {showTripDropdown && (
                  <View style={styles.dropdownMenu}>
                    {allTrips.map((t) => (
                      <Pressable
                        key={t.id}
                        onPress={() => {
                          setSelectedTripId(t.id);
                          setShowTripDropdown(false);
                        }}
                        style={[
                          styles.dropdownItem,
                          selectedTripId === t.id && styles.dropdownItemActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            selectedTripId === t.id && styles.dropdownItemTextActive,
                          ]}
                        >
                          {t.title}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── 3. Expense Details (Title & Amount) ───────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expense Details</Text>

            <View style={styles.cardContainer}>
              {/* Expense Title */}
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Expense Title / Merchant *</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    errors.title ? styles.inputWrapperError : null,
                  ]}
                >
                  <TextInput
                    style={styles.textInput}
                    value={title}
                    onChangeText={(t) => {
                      setTitle(t);
                      if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                    }}
                    placeholder="e.g. Sukiyabashi Jiro, Shinkansen, Coffee"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                  />
                </View>
                {errors.title ? (
                  <Text style={styles.errorText}>{errors.title}</Text>
                ) : null}
              </View>

              {/* Amount & Currency */}
              <View style={[styles.fieldGroup, styles.fieldDivider]}>
                <Text style={styles.inputLabel}>Amount & Currency *</Text>

                <View style={styles.amountRow}>
                  {/* Currency Trigger */}
                  <View style={styles.currencyTriggerWrapper}>
                    <Pressable
                      onPress={() => setShowCurrencyDropdown((prev) => !prev)}
                      style={styles.currencyTrigger}
                      accessibilityRole="button"
                      accessibilityLabel="Select currency"
                    >
                      <Text style={styles.currencyTriggerCode}>
                        {currencyConfig.code}
                      </Text>
                      <Text style={styles.currencyTriggerSymbol}>
                        {currencyConfig.symbol}
                      </Text>
                      <Text style={styles.currencyTriggerArrow}>▼</Text>
                    </Pressable>

                    {showCurrencyDropdown && (
                      <View style={styles.currencyDropdown}>
                        <ScrollView
                          nestedScrollEnabled
                          style={styles.currencyDropdownScroll}
                        >
                          {SUPPORTED_CURRENCIES.map((curr) => (
                            <Pressable
                              key={curr.code}
                              onPress={() => {
                                setCurrency(curr.code);
                                setShowCurrencyDropdown(false);
                              }}
                              style={[
                                styles.currencyOption,
                                currency === curr.code && styles.currencyOptionActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.currencyOptionText,
                                  currency === curr.code && styles.currencyOptionTextActive,
                                ]}
                              >
                                {curr.label}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Amount Numeric Input */}
                  <View
                    style={[
                      styles.amountInputWrapper,
                      errors.amount ? styles.inputWrapperError : null,
                    ]}
                  >
                    <Text style={styles.amountPrefixSymbol}>
                      {currencyConfig.symbol}
                    </Text>
                    <TextInput
                      style={styles.amountInput}
                      value={amountStr}
                      onChangeText={(t) => {
                        setAmountStr(t);
                        if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                      }}
                      placeholder={currencyConfig.decimals === 0 ? '5000' : '0.00'}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                {errors.amount ? (
                  <Text style={styles.errorText}>{errors.amount}</Text>
                ) : null}
              </View>

              {/* Category Pill Selector */}
              <View style={[styles.fieldGroup, styles.fieldDivider]}>
                <Text style={styles.inputLabel}>Category *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScrollContent}
                  style={styles.categoryScrollView}
                >
                  {EXPENSE_CATEGORIES.map((catKey) => {
                    const meta = EXPENSE_CATEGORY_META[catKey];
                    const isSelected = category === catKey;
                    const iconSource = getCategoryIconSource(catKey);

                    return (
                      <Pressable
                        key={catKey}
                        onPress={() => setCategory(catKey)}
                        style={({ pressed }) => [
                          styles.categoryPill,
                          isSelected && styles.categoryPillActive,
                          pressed && styles.categoryPillPressed,
                        ]}
                      >
                        <Image
                          source={iconSource}
                          style={styles.categoryPillIcon}
                          tintColor={isSelected ? colors.textOnPrimary : colors.primary}
                          contentFit="contain"
                        />
                        <Text
                          style={[
                            styles.categoryPillText,
                            isSelected && styles.categoryPillTextActive,
                          ]}
                        >
                          {meta.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* ── 4. Date & Attribution ────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date & Attribution</Text>

            <View style={styles.cardContainer}>
              {/* Date */}
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Expense Date *</Text>
                <DateTimePickerField
                  mode="date"
                  value={date}
                  onChange={setDate}
                  hasError={Boolean(errors.date)}
                />
                {errors.date ? (
                  <Text style={styles.errorText}>{errors.date}</Text>
                ) : null}
              </View>

              {/* Paid By (Traveler selector) */}
              {tripTravelers.length > 0 && (
                <View style={[styles.fieldGroup, styles.fieldDivider]}>
                  <Text style={styles.inputLabel}>
                    Paid By <Text style={styles.optionalLabel}>(Optional)</Text>
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScrollContent}
                    style={styles.categoryScrollView}
                  >
                    {tripTravelers.map((traveler) => {
                      const isSelected = paidBy === traveler.id;
                      return (
                        <Pressable
                          key={traveler.id}
                          onPress={() => setPaidBy(traveler.id)}
                          style={({ pressed }) => [
                            styles.travelerPill,
                            isSelected && styles.travelerPillActive,
                            pressed && styles.categoryPillPressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.travelerPillText,
                              isSelected && styles.travelerPillTextActive,
                            ]}
                          >
                            {traveler.name}
                            {traveler.isCurrentUser ? ' (You)' : ''}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* ── 5. Notes & Receipt Info ──────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>

            <View style={styles.cardContainer}>
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>
                  Notes <Text style={styles.optionalLabel}>(Optional)</Text>
                </Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Order numbers, tax details, reminders..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* ── 6. Live Expense Card Preview ─────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.previewSectionHeader}>EXPENSE PREVIEW</Text>

            <View style={styles.previewCard}>
              <View style={styles.previewCardLeft}>
                <View style={styles.previewIconBox}>
                  <Image
                    source={getCategoryIconSource(category)}
                    style={styles.previewCategoryIcon}
                    tintColor={colors.primary}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.previewTextGroup}>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {title.trim() || 'Untitled Expense'}
                  </Text>
                  <Text style={styles.previewSubtitle}>
                    {selectedCategoryMeta.label} · {toIsoDateOnly(date)}
                  </Text>
                </View>
              </View>

              <View style={styles.previewRight}>
                <Text style={styles.previewAmount}>
                  {previewFormattedAmount}
                </Text>
              </View>
            </View>
          </View>

          {/* ── 7. Action Buttons ────────────────────────────────────────── */}
          <View style={styles.actionsSection}>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.primarySubmitButton,
                pressed && styles.buttonPressed,
                isSubmitting && styles.buttonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isEditMode ? 'Save Changes' : 'Save Expense'}
            >
              <Text style={styles.primarySubmitButtonText}>
                {isSubmitting
                  ? isEditMode
                    ? 'Saving Changes...'
                    : 'Saving Expense...'
                  : isEditMode
                  ? 'Save Changes'
                  : 'Save Expense'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            {isEditMode && (
              <Pressable
                onPress={() => setShowDeleteConfirm(true)}
                style={({ pressed }) => [
                  styles.deleteFormButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Delete Expense"
              >
                <Image
                  source={require('@/assets/images/icons/close.svg')}
                  style={styles.deleteButtonIcon}
                  tintColor={colors.destructive}
                  contentFit="contain"
                />
                <Text style={styles.deleteFormButtonText}>Delete Expense</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Delete Confirmation Dialog ───────────────────────────────── */}
      {showDeleteConfirm && existingExpense && (
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
                Are you sure? &ldquo;{existingExpense.title}&rdquo; will be permanently
                removed and your trip totals will update immediately.
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
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  keyboardContainer: {
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

  // 1. Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  headerTitle: {
    fontFamily: typography.screenTitle.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: typography.bodySecondary.fontFamily,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  closeButtonIcon: {
    width: 16,
    height: 16,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Error Alert
  formErrorBox: {
    backgroundColor: 'rgba(176, 74, 74, 0.08)',
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: radius.input,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  formErrorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
  },

  // Section & Card Containers
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },

  // Field Groups & Inputs
  fieldGroup: {
    marginBottom: 0,
  },
  fieldDivider: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  optionalLabel: {
    fontWeight: '400',
    color: colors.textMuted,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
    minHeight: 46,
  },
  inputWrapperError: {
    borderColor: colors.error,
    backgroundColor: 'rgba(176, 74, 74, 0.04)',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    fontWeight: '500',
  },

  // Select Trigger (Dropdown)
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  selectTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectIcon: {
    width: 16,
    height: 16,
    marginRight: spacing.sm,
  },
  selectTriggerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  selectTriggerArrow: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  dropdownMenu: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    overflow: 'hidden',
    ...shadows.sheet,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  dropdownItemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Amount & Currency Row
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  currencyTriggerWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  currencyTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
    height: 48,
    minWidth: 92,
    justifyContent: 'center',
  },
  currencyTriggerCode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 4,
  },
  currencyTriggerSymbol: {
    fontSize: 13,
    color: colors.textSecondary,
    marginRight: 4,
  },
  currencyTriggerArrow: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  currencyDropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    width: 130,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    maxHeight: 180,
    zIndex: 20,
    ...shadows.sheet,
  },
  currencyDropdownScroll: {
    maxHeight: 180,
  },
  currencyOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  currencyOptionActive: {
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
  },
  currencyOptionText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  currencyOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  amountInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  amountPrefixSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  // Category Pills
  categoryScrollView: {
    marginTop: 2,
  },
  categoryScrollContent: {
    gap: spacing.xs,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillPressed: {
    opacity: 0.8,
  },
  categoryPillIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  categoryPillTextActive: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },

  // Traveler Pills
  travelerPill: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  travelerPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  travelerPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  travelerPillTextActive: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },

  // Notes
  notesInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 80,
  },

  // Live Preview Card
  previewSectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
    ...shadows.card,
  },
  previewCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  previewIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  previewCategoryIcon: {
    width: 20,
    height: 20,
  },
  previewTextGroup: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  previewRight: {
    alignItems: 'flex-end',
  },
  previewAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },

  // Actions
  actionsSection: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  primarySubmitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sheet,
  },
  primarySubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textOnPrimary,
    letterSpacing: -0.2,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  deleteFormButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(176, 74, 74, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(176, 74, 74, 0.20)',
    borderRadius: radius.button,
    paddingVertical: 12,
    marginTop: spacing.xs,
  },
  deleteFormButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.destructive,
  },
  deleteButtonIcon: {
    width: 16,
    height: 16,
  },

  // Delete Confirm Dialog
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
