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

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import {
  addExpense,
  deleteExpense,
  fetchExpenseById,
  getExpenseById,
  isDevMockTrip,
  updateExpense,
} from '@/services/expenseStore';
import { getTripById, getTripTravelers, Traveler, Trip } from '@/services/mockData';
import { getActiveTripId, getCachedTrips, listTrips } from '@/services/trip';
import { listTripMembers, fetchUserTripRole } from '@/services/collaboration';
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
  const [userTrips, setUserTrips] = useState<Trip[]>(() => getCachedTrips() || []);
  const [selectedTripId, setSelectedTripId] = useState<string>(() => {
    if (tripId) return tripId;
    const globalActive = getActiveTripId();
    if (globalActive) return globalActive;
    const cached = getCachedTrips();
    return cached && cached.length > 0 ? cached[0].id : '';
  });
  const [tripTravelers, setTripTravelers] = useState<Traveler[]>(() =>
    selectedTripId && isDevMockTrip(selectedTripId) ? getTripTravelers(selectedTripId) : []
  );
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadTrips() {
      try {
        const fetched = await listTrips();
        if (!isMounted) return;
        setUserTrips(fetched);
        if (!selectedTripId && fetched.length > 0) {
          const globalActive = getActiveTripId();
          const match = globalActive && fetched.some((t) => t.id === globalActive);
          setSelectedTripId(tripId || (match ? globalActive : fetched[0].id));
        }
      } catch (err) {
        console.warn('[AddExpense] Error loading trips:', err);
      }
    }
    loadTrips();
    return () => {
      isMounted = false;
    };
  }, [tripId, selectedTripId]);

  useEffect(() => {
    let isMounted = true;
    async function loadMembers() {
      if (!selectedTripId) {
        setTripTravelers([]);
        setUserRole(null);
        return;
      }
      try {
        const [members, role] = await Promise.all([
          listTripMembers(selectedTripId),
          fetchUserTripRole(selectedTripId),
        ]);
        if (!isMounted) return;
        if (members && members.length > 0) {
          setTripTravelers(members);
        } else if (isDevMockTrip(selectedTripId)) {
          setTripTravelers(getTripTravelers(selectedTripId));
        } else {
          setTripTravelers([]);
        }
        setUserRole(role);
      } catch (err) {
        console.warn('[AddExpense] Error loading members:', err);
      }
    }
    loadMembers();
    return () => {
      isMounted = false;
    };
  }, [selectedTripId]);

  // 2. Resolve Existing Item if Edit Mode
  const existingExpense = useMemo(() => {
    return expenseId ? getExpenseById(expenseId) : undefined;
  }, [expenseId]);
  const isEditMode = Boolean(expenseId);

  useEffect(() => {
    if (existingExpense?.tripId && existingExpense.tripId !== selectedTripId) {
      setSelectedTripId(existingExpense.tripId);
    }
  }, [existingExpense, selectedTripId]);

  const trip = useMemo(() => {
    if (!selectedTripId) return null;
    return (
      userTrips.find((t) => t.id === selectedTripId) ||
      getCachedTrips()?.find((t) => t.id === selectedTripId) ||
      (isDevMockTrip(selectedTripId) ? getTripById(selectedTripId) : null) ||
      null
    );
  }, [selectedTripId, userTrips]);

  // 3. Form State
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

  // Load existing expense if not in initial cache
  React.useEffect(() => {
    if (expenseId && !existingExpense) {
      fetchExpenseById(expenseId).then((fetched) => {
        if (fetched) {
          setTitle(fetched.title);
          setAmountStr(String(toMajorUnits(fetched.amount, fetched.currency)));
          setCurrency(fetched.currency);
          setCategory(fetched.category);
          setDate(new Date(fetched.date));
          if (fetched.paidBy) setPaidBy(fetched.paidBy);
          if (fetched.notes) setNotes(fetched.notes);
          setSelectedTripId(fetched.tripId);
        }
      });
    }
  }, [expenseId, existingExpense]);

  // 4. UI Flags & Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState<boolean>(false);
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

  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!existingExpense || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteExpense(existingExpense.id);
      setShowDeleteConfirm(false);
      router.replace(`/(tabs)/trips/${selectedTripId}/expenses` as any);
    } catch (err: any) {
      console.error('Failed to delete expense:', err);
      setIsDeleting(false);
      Alert.alert('Error', err?.message || 'Failed to delete expense. Please try again.');
    }
  };

  // 6. Form Submission
  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (userRole === 'viewer') {
      Alert.alert('Permission Denied', 'Viewers cannot create or edit expenses on this trip.');
      return;
    }

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

    if (!selectedTripId) {
      setErrors({ form: 'Please select a trip to record this expense.' });
      Alert.alert('No Trip Selected', 'Please select or create a trip first.');
      return;
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

      if (isEditMode && (existingExpense || expenseId)) {
        await updateExpense(expenseId || existingExpense!.id, {
          title: title.trim(),
          amount: minorUnits,
          currency,
          category,
          date: isoDate,
          paidBy: paidBy ? paidBy.trim() : undefined,
          notes: notes.trim() ? notes.trim() : undefined,
        });
      } else {
        await addExpense({
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
      Alert.alert('Save Failed', err.message || 'Failed to save expense. Please try again.');
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

          {!trip && userTrips.length === 0 && (
            <View style={styles.formErrorBox}>
              <Text style={styles.formErrorText}>
                No trips found. Please create a trip first before recording expenses.
              </Text>
            </View>
          )}

          {/* ── 2. Expense Details (Title & Amount) ───────────────────────── */}
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
    paddingHorizontal: spacing.md,
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
    marginBottom: spacing.md,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontFamily: typography.screenTitle.fontFamily,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontFamily: typography.bodySecondary.fontFamily,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  closeButtonIcon: {
    width: 14,
    height: 14,
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
    padding: spacing.sm,
    marginBottom: spacing.sm + 2,
  },
  formErrorText: {
    fontFamily: fontFamily.medium,
    color: colors.error,
    fontSize: 12,
    fontWeight: '500',
  },

  // Section & Card Containers
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 6,
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    ...shadows.card,
  },

  // Field Groups & Inputs
  fieldGroup: {
    marginBottom: 0,
  },
  fieldDivider: {
    marginTop: spacing.sm + 2,
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 3,
  },
  optionalLabel: {
    fontFamily: fontFamily.regular,
    fontWeight: '400',
    color: colors.textMuted,
  },
  inputWrapper: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
  },
  inputWrapperError: {
    borderColor: colors.error,
    backgroundColor: 'rgba(176, 74, 74, 0.04)',
  },
  textInput: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: 13.5,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.error,
    marginTop: 2,
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
    paddingHorizontal: spacing.sm,
    height: 42,
  },
  selectTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectIcon: {
    width: 15,
    height: 15,
    marginRight: spacing.sm,
  },
  selectTriggerText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  selectTriggerArrow: {
    fontSize: 9,
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
    fontSize: 13,
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
    height: 42,
    minWidth: 84,
    justifyContent: 'center',
  },
  currencyTriggerCode: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 4,
  },
  currencyTriggerSymbol: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 4,
  },
  currencyTriggerArrow: {
    fontSize: 8,
    color: colors.textSecondary,
  },
  currencyDropdown: {
    position: 'absolute',
    top: 46,
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
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  currencyOptionActive: {
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
  },
  currencyOptionText: {
    fontSize: 12.5,
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
    paddingHorizontal: spacing.sm,
    height: 42,
  },
  amountPrefixSymbol: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    fontWeight: '600',
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
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillPressed: {
    opacity: 0.8,
  },
  categoryPillIcon: {
    width: 13,
    height: 13,
    marginRight: 5,
  },
  categoryPillText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 11.5,
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
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  travelerPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  travelerPillText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 11.5,
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
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
    minHeight: 70,
  },

  // Live Preview Card
  previewSectionHeader: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 6,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    ...shadows.card,
  },
  previewCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  previewIconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.input,
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  previewCategoryIcon: {
    width: 17,
    height: 17,
  },
  previewTextGroup: {
    flex: 1,
  },
  previewTitle: {
    fontFamily: typography.cardTitle.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewSubtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  previewRight: {
    alignItems: 'flex-end',
  },
  previewAmount: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },

  // Actions
  actionsSection: {
    marginTop: spacing.sm + 2,
    gap: spacing.sm,
  },
  primarySubmitButton: {
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sheet,
  },
  primarySubmitButtonText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnPrimary,
    letterSpacing: -0.2,
  },
  cancelButton: {
    height: 40,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  deleteFormButton: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(176, 74, 74, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(176, 74, 74, 0.20)',
    borderRadius: radius.button,
    marginTop: spacing.xs,
  },
  deleteFormButtonText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: colors.destructive,
  },
  deleteButtonIcon: {
    width: 14,
    height: 14,
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
