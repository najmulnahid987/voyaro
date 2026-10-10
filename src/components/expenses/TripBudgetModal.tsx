/**
 * Voyaro Expense Component — TripBudgetModal (Phase 6)
 *
 * Modal dialog for creating, updating, and clearing a trip's budget.
 *
 * Requirements:
 *  - Trip-scoped: Modifies the budget for the selected trip only.
 *  - Currency selection: User can choose any supported currency.
 *  - Validation: Valid, non-negative numbers (supports $0 and positive amounts).
 *  - Edit mode: Prepopulates existing budget amount and currency.
 *  - Cancelable: User can close or cancel without mutating state.
 *  - Clearable: Supports clearing an optional budget.
 *  - Reactive: Calls in-memory expenseStore which notifies subscribers immediately.
 */

import { Button } from '@/components/ui';
import {
  clearTripBudget,
  setTripBudget,
} from '@/services/expenseStore';
import { getTripById } from '@/services/mockData';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import {
  CurrencyCode,
  SUPPORTED_CURRENCY_CODES,
  TripBudget,
} from '@/types/expense';
import {
  getCurrencyConfig,
  toMajorUnits,
  toMinorUnits,
} from '@/utils/currencyUtils';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
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

export interface TripBudgetModalProps {
  visible: boolean;
  tripId: string;
  currentBudget?: TripBudget;
  currentCurrency?: CurrencyCode;
  onClose: () => void;
  onSave?: (budget: TripBudget) => void;
  onClear?: () => void;
}

export function TripBudgetModal({
  visible,
  tripId,
  currentBudget,
  currentCurrency = 'USD',
  onClose,
  onSave,
  onClear,
}: TripBudgetModalProps) {
  const trip = useMemo(() => getTripById(tripId), [tripId]);

  // Form State
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    return currentBudget?.currency || currentCurrency;
  });

  const [amountStr, setAmountStr] = useState<string>(() => {
    if (currentBudget) {
      const major = toMajorUnits(currentBudget.amount, currentBudget.currency);
      return String(major);
    }
    return '';
  });

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync state whenever modal opens or currentBudget updates without cascading effect renders
  const [prevVisible, setPrevVisible] = useState(visible);
  const [prevBudget, setPrevBudget] = useState(currentBudget);

  if (visible !== prevVisible || currentBudget !== prevBudget) {
    setPrevVisible(visible);
    setPrevBudget(currentBudget);
    if (visible) {
      if (currentBudget) {
        setCurrency(currentBudget.currency);
        setAmountStr(String(toMajorUnits(currentBudget.amount, currentBudget.currency)));
      } else {
        setCurrency(currentCurrency);
        setAmountStr('');
      }
      setError(null);
      setIsSaving(false);
    }
  }

  const currencyConfig = useMemo(() => getCurrencyConfig(currency), [currency]);
  const hasExistingBudget = currentBudget !== undefined;

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handleSave = () => {
    if (isSaving) return;

    const trimmed = amountStr.trim();
    if (!trimmed) {
      setError('Please enter a budget amount.');
      return;
    }

    const cleanNum = parseFloat(trimmed.replace(/[^0-9.-]+/g, ''));
    if (isNaN(cleanNum) || !isFinite(cleanNum)) {
      setError('Please enter a valid numeric budget amount.');
      return;
    }

    if (cleanNum < 0) {
      setError('Budget cannot be negative. Enter 0 or a positive amount.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const minorUnits = toMinorUnits(trimmed, currency);
      const saved = setTripBudget(tripId, minorUnits, currency);
      onSave?.(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save budget.');
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    try {
      clearTripBudget(tripId);
      onClear?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to clear budget.');
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable
          style={styles.backdrop}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Dismiss budget modal"
        />

        <View style={styles.sheetCard}>
          {/* ── Modal Header ─────────────────────────────────────────── */}
          <View style={styles.sheetHeader}>
            <View style={styles.titleGroup}>
              <Text style={styles.sheetTitle}>
                {hasExistingBudget ? 'Edit Trip Budget' : 'Set Trip Budget'}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {trip?.title ? `For ${trip.title}` : 'Specify a spending limit'}
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
                style={styles.closeIcon}
                tintColor={colors.textSecondary}
                contentFit="contain"
              />
            </Pressable>
          </View>

          {/* ── Form Error Banner ────────────────────────────────────── */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Currency Selector ──────────────────────────────────── */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>BUDGET CURRENCY</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.currencyPillsRow}
              >
                {SUPPORTED_CURRENCY_CODES.map((code) => {
                  const isSelected = currency === code;
                  const cfg = getCurrencyConfig(code);
                  return (
                    <Pressable
                      key={code}
                      onPress={() => setCurrency(code)}
                      style={({ pressed }) => [
                        styles.currencyPill,
                        isSelected && styles.currencyPillActive,
                        pressed && styles.buttonPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${code} ${cfg.symbol}`}
                    >
                      <Text
                        style={[
                          styles.currencyPillSymbol,
                          isSelected && styles.currencyPillSymbolActive,
                        ]}
                      >
                        {cfg.symbol}
                      </Text>
                      <Text
                        style={[
                          styles.currencyPillText,
                          isSelected && styles.currencyPillTextActive,
                        ]}
                      >
                        {code}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── Amount Input ───────────────────────────────────────── */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>BUDGET AMOUNT</Text>
              <View
                style={[
                  styles.amountInputContainer,
                  Boolean(error) && styles.amountInputError,
                ]}
              >
                <Text style={styles.amountSymbolPrefix}>
                  {currencyConfig.symbol}
                </Text>
                <TextInput
                  style={styles.amountInput}
                  value={amountStr}
                  onChangeText={(val) => {
                    setAmountStr(val);
                    if (error) setError(null);
                  }}
                  placeholder={currencyConfig.decimals > 0 ? '0.00' : '0'}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  autoFocus={true}
                  accessibilityLabel="Budget amount"
                />
              </View>
              <Text style={styles.helperText}>
                Enter 0 or any positive amount in {currencyConfig.name} ({currency}).
              </Text>
            </View>

            {/* ── Information Banner ─────────────────────────────────── */}
            <View style={styles.infoBanner}>
              <Image
                source={require('@/assets/images/icons/receipt.svg')}
                style={styles.infoBannerIcon}
                tintColor={colors.primary}
                contentFit="contain"
              />
              <Text style={styles.infoBannerText}>
                Only expenses recorded in <Text style={styles.boldText}>{currency}</Text> will be subtracted from this budget. Mismatched currencies are never summed together.
              </Text>
            </View>

            {/* ── Action Buttons ─────────────────────────────────────── */}
            <View style={styles.actionsContainer}>
              <Button
                label={isSaving ? 'Saving Budget...' : 'Save Budget'}
                variant="primary"
                onPress={handleSave}
                disabled={isSaving}
                style={styles.saveButton}
              />

              <Button
                label="Cancel"
                variant="outline"
                onPress={handleCancel}
                style={styles.cancelButton}
              />

              {hasExistingBudget && (
                <Pressable
                  onPress={handleClear}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Clear budget"
                >
                  <Text style={styles.clearButtonText}>Remove / Clear Budget</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius.sheet,
    padding: spacing.xl,
    ...shadows.sheet,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleGroup: {
    flex: 1,
  },
  sheetTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  closeIcon: {
    width: 14,
    height: 14,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },

  // ── Error Banner ─────────────────────────────────────────────────────────
  errorBox: {
    backgroundColor: 'rgba(176, 74, 74, 0.10)',
    borderRadius: radius.button,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(176, 74, 74, 0.25)',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },

  // ── Fields ───────────────────────────────────────────────────────────────
  fieldSection: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  currencyPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  currencyPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  currencyPillSymbol: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  currencyPillSymbolActive: {
    color: colors.textOnPrimary,
  },
  currencyPillText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  currencyPillTextActive: {
    color: colors.textOnPrimary,
  },

  // ── Amount Input ─────────────────────────────────────────────────────────
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
  },
  amountInputError: {
    borderColor: colors.error,
    backgroundColor: 'rgba(176, 74, 74, 0.04)',
  },
  amountSymbolPrefix: {
    fontFamily: fontFamily.semiBold,
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    padding: 0,
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },

  // ── Info Banner ──────────────────────────────────────────────────────────
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySurface,
    borderRadius: radius.input,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoBannerIcon: {
    width: 16,
    height: 16,
    marginTop: 2,
  },
  infoBannerText: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  boldText: {
    fontFamily: fontFamily.semiBold,
    fontWeight: '700',
    color: colors.primary,
  },

  // ── Actions ──────────────────────────────────────────────────────────────
  actionsContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  saveButton: {
    width: '100%',
  },
  cancelButton: {
    width: '100%',
  },
  clearButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.destructive,
  },
});
