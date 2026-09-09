/**
 * Route: /add/transportation — Add Transportation Screen (Phase 5)
 *
 * Visual Source of Truth: Google Stitch transportation.png & transportation.html
 *
 * Features:
 *   - Sticky navigation header with back button and cancel link
 *   - Section 1: Transportation Type selector (Train, Bus, Car, Taxi, Other)
 *   - Section 2: Route card with connected FROM / TO inputs and Swap button
 *   - Section 3: Schedule & Timing (Date, Departure Time, Arrival Time, Overnight journey toggle, live duration calculation)
 *   - Section 4: Booking Information (Booking / Ref #, Seat / Car)
 *   - Section 5: Notes multiline input
 *   - Sticky safe-area compliant footer with "Add Transportation" CTA and Discard link
 *   - Direct integration into in-memory itineraryStore (addItem)
 *   - Chronologically sorted and immediately reactive in the itinerary timeline
 */

import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { addItem } from '@/services/itineraryStore';
import { ConcreteItineraryItem, TransportationType } from '@/types/itinerary';

// ---------------------------------------------------------------------------
// 1. Types and Option Definitions
// ---------------------------------------------------------------------------

interface TransportModeOption {
  id: TransportationType;
  label: string;
  subLabel: string;
  emoji: string;
}

const TRANSPORT_MODES: TransportModeOption[] = [
  { id: 'train', label: 'Train', subLabel: 'Train selected', emoji: '🚆' },
  { id: 'bus', label: 'Bus', subLabel: 'Bus selected', emoji: '🚌' },
  { id: 'rental_car', label: 'Car', subLabel: 'Car selected', emoji: '🚗' },
  { id: 'taxi', label: 'Taxi', subLabel: 'Taxi selected', emoji: '🚕' },
  { id: 'other', label: 'Other', subLabel: 'Other transport selected', emoji: '🧭' },
];

// ---------------------------------------------------------------------------
// 2. Helper Functions
// ---------------------------------------------------------------------------

function calculateDuration(
  departureTime: string,
  arrivalTime: string,
  isOvernight: boolean
): string {
  try {
    const [depH, depM] = departureTime.split(':').map((v) => parseInt(v, 10));
    const [arrH, arrM] = arrivalTime.split(':').map((v) => parseInt(v, 10));

    if (isNaN(depH) || isNaN(depM) || isNaN(arrH) || isNaN(arrM)) {
      return '';
    }

    let depMinutes = depH * 60 + depM;
    let arrMinutes = arrH * 60 + arrM;

    if (isOvernight || arrMinutes < depMinutes) {
      arrMinutes += 24 * 60;
    }

    const diffMinutes = arrMinutes - depMinutes;
    if (diffMinutes < 0) return '';

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// 3. Screen Component
// ---------------------------------------------------------------------------

export default function AddTransportationScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const effectiveTripId = tripId || 'japan-adventure';
  const insets = useSafeAreaInsets();

  // -------------------------------------------------------------------------
  // Form State
  // -------------------------------------------------------------------------
  const [selectedType, setSelectedType] = useState<TransportationType>('train');
  const [fromLocation, setFromLocation] = useState('Tokyo Station');
  const [toLocation, setToLocation] = useState('Kyoto Station');
  const [providerRoute, setProviderRoute] = useState('Tokaido Shinkansen');

  const [date, setDate] = useState('2028-03-12');
  const [departureTime, setDepartureTime] = useState('09:00');
  const [arrivalTime, setArrivalTime] = useState('11:20');
  const [isOvernight, setIsOvernight] = useState(false);

  const [bookingNumber, setBookingNumber] = useState('JR-784920');
  const [seat, setSeat] = useState('Car 5, Seat 12-A');
  const [notes, setNotes] = useState(
    'Mount Fuji view on the right side of the train (seats D/E). Luggage area reserved behind row 12.'
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Computed Properties
  // -------------------------------------------------------------------------
  const activeMode = useMemo(
    () => TRANSPORT_MODES.find((m) => m.id === selectedType) || TRANSPORT_MODES[0],
    [selectedType]
  );

  const durationText = useMemo(
    () => calculateDuration(departureTime, arrivalTime, isOvernight),
    [departureTime, arrivalTime, isOvernight]
  );

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(`/(tabs)/trips/${effectiveTripId}/itinerary` as any);
    }
  };

  const handleSwapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fromLocation.trim()) {
      newErrors.fromLocation = 'Departure location is required.';
    }
    if (!toLocation.trim()) {
      newErrors.toLocation = 'Arrival destination is required.';
    }
    if (!date.trim()) {
      newErrors.date = 'Travel date is required.';
    }
    if (!departureTime.trim()) {
      newErrors.departureTime = 'Departure time is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      // 1. Compute Start and End ISO strings
      const startIso = `${date}T${departureTime}:00.000Z`;

      let endIso: string | undefined;
      if (arrivalTime.trim()) {
        if (isOvernight) {
          const startDateObj = new Date(date);
          startDateObj.setDate(startDateObj.getDate() + 1);
          const nextDateStr = startDateObj.toISOString().split('T')[0];
          endIso = `${nextDateStr}T${arrivalTime}:00.000Z`;
        } else {
          endIso = `${date}T${arrivalTime}:00.000Z`;
        }
      }

      // 2. Build Item Title
      const modeLabel = activeMode.label;
      const title = providerRoute.trim()
        ? `${modeLabel}: ${providerRoute.trim()}`
        : `${modeLabel} (${fromLocation.trim()} → ${toLocation.trim()})`;

      // 3. Create Typed Concrete Transportation Item
      const newTransportItem: ConcreteItineraryItem = {
        id: `itin-trans-${Date.now()}`,
        tripId: effectiveTripId,
        type: 'transportation',
        title,
        startDateTime: startIso,
        endDateTime: endIso,
        location: `${fromLocation.trim()} → ${toLocation.trim()}`,
        notes: notes.trim() || undefined,
        confirmationNumber: bookingNumber.trim() || undefined,
        metadata: {
          transportationType: selectedType,
          from: fromLocation.trim(),
          to: toLocation.trim(),
          bookingNumber: bookingNumber.trim() || undefined,
          seat: seat.trim() || undefined,
          provider: providerRoute.trim() || undefined,
          pickupTime: departureTime.trim() || undefined,
          dropoffTime: arrivalTime.trim() || undefined,
        },
      };

      // 4. Add to Central In-Memory Itinerary Store
      addItem(newTransportItem);

      // 5. Navigate back to Itinerary Timeline
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push(`/(tabs)/trips/${effectiveTripId}/itinerary` as any);
      }
    } catch (e) {
      console.warn('Error adding transportation item:', e);
      setIsSubmitting(false);
    }
  };

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
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 24 : 16) + 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* ── Top Header ────────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>Add transportation</Text>
              <Text style={styles.headerSubtitle}>
                Enter details for a train, bus, car, or transfer segment.
              </Text>
            </View>

            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          {/* ── Section 1: Transportation Type Selector ──────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>TRANSPORTATION TYPE</Text>
              <Text style={styles.sectionActiveLabel}>{activeMode.subLabel}</Text>
            </View>

            <View style={styles.modeGrid}>
              {TRANSPORT_MODES.map((mode) => {
                const isSelected = selectedType === mode.id;
                return (
                  <Pressable
                    key={mode.id}
                    onPress={() => setSelectedType(mode.id)}
                    style={({ pressed }) => [
                      styles.modeButton,
                      isSelected && styles.modeButtonSelected,
                      pressed && styles.modeButtonPressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.modeIconContainer}>
                      <Text style={[styles.modeEmoji, isSelected && styles.modeEmojiSelected]}>
                        {mode.emoji}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.modeLabel,
                        isSelected && styles.modeLabelSelected,
                      ]}
                    >
                      {mode.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Section 2: Route (Connected FROM / TO) ───────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>ROUTE</Text>
              <TextInput
                value={providerRoute}
                onChangeText={setProviderRoute}
                placeholder="Route name (e.g. Tokaido Shinkansen)"
                placeholderTextColor={colors.textMuted}
                style={styles.providerInputInline}
              />
            </View>

            <View style={styles.card}>
              {/* Visual Dashed Connector Line */}
              <View style={styles.dashedConnector} />

              {/* FROM Location */}
              <View style={styles.routeRow}>
                <View style={styles.fromPin}>
                  <View style={styles.fromPinDot} />
                </View>
                <View style={styles.routeInputContainer}>
                  <View style={styles.routeInputHeaderRow}>
                    <Text style={styles.routeFromTag}>FROM</Text>
                    <Text style={styles.routeHelpText}>Departure location</Text>
                  </View>
                  <TextInput
                    value={fromLocation}
                    onChangeText={(t) => {
                      setFromLocation(t);
                      if (errors.fromLocation) {
                        setErrors((prev) => ({ ...prev, fromLocation: '' }));
                      }
                    }}
                    placeholder="City, station or address"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.inputField,
                      Boolean(errors.fromLocation) && styles.inputFieldError,
                    ]}
                  />
                  {errors.fromLocation ? (
                    <Text style={styles.errorText}>{errors.fromLocation}</Text>
                  ) : null}
                </View>
              </View>

              {/* Swap Button */}
              <View style={styles.swapRow}>
                <Pressable
                  onPress={handleSwapLocations}
                  style={({ pressed }) => [
                    styles.swapButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Swap departure and arrival"
                >
                  <Text style={styles.swapIconText}>⇅</Text>
                </Pressable>
              </View>

              {/* TO Location */}
              <View style={styles.routeRow}>
                <View style={styles.toPin}>
                  <Text style={styles.toPinIcon}>📍</Text>
                </View>
                <View style={styles.routeInputContainer}>
                  <View style={styles.routeInputHeaderRow}>
                    <Text style={styles.routeToTag}>TO</Text>
                    <Text style={styles.routeHelpText}>Arrival destination</Text>
                  </View>
                  <TextInput
                    value={toLocation}
                    onChangeText={(t) => {
                      setToLocation(t);
                      if (errors.toLocation) {
                        setErrors((prev) => ({ ...prev, toLocation: '' }));
                      }
                    }}
                    placeholder="City, station or address"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.inputField,
                      Boolean(errors.toLocation) && styles.inputFieldError,
                    ]}
                  />
                  {errors.toLocation ? (
                    <Text style={styles.errorText}>{errors.toLocation}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          {/* ── Section 3: Schedule & Timing ─────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>SCHEDULE & TIMING</Text>
              <Pressable
                onPress={() => setIsOvernight((prev) => !prev)}
                style={styles.overnightRow}
              >
                <View
                  style={[
                    styles.checkbox,
                    isOvernight && styles.checkboxSelected,
                  ]}
                >
                  {isOvernight && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.overnightLabel}>Overnight journey</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              {/* Date Input */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>TRAVEL DATE</Text>
                <View style={styles.inputWithIconContainer}>
                  <Text style={styles.inputLeadingEmoji}>📅</Text>
                  <TextInput
                    value={date}
                    onChangeText={(t) => {
                      setDate(t);
                      if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
                    }}
                    placeholder="YYYY-MM-DD (e.g. 2028-03-12)"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.inputField,
                      styles.inputFieldWithIcon,
                      Boolean(errors.date) && styles.inputFieldError,
                    ]}
                  />
                </View>
                {errors.date ? (
                  <Text style={styles.errorText}>{errors.date}</Text>
                ) : null}
              </View>

              {/* Time Inputs (Departure & Arrival) */}
              <View style={styles.timeGrid}>
                <View style={styles.timeCol}>
                  <Text style={styles.fieldLabel}>DEPARTURE</Text>
                  <View style={styles.inputWithIconContainer}>
                    <Text style={styles.inputLeadingEmoji}>🕒</Text>
                    <TextInput
                      value={departureTime}
                      onChangeText={(t) => {
                        setDepartureTime(t);
                        if (errors.departureTime) {
                          setErrors((prev) => ({ ...prev, departureTime: '' }));
                        }
                      }}
                      placeholder="HH:MM (e.g. 09:00)"
                      placeholderTextColor={colors.textMuted}
                      style={[
                        styles.inputField,
                        styles.inputFieldWithIcon,
                        Boolean(errors.departureTime) && styles.inputFieldError,
                      ]}
                    />
                  </View>
                  {errors.departureTime ? (
                    <Text style={styles.errorText}>{errors.departureTime}</Text>
                  ) : null}
                </View>

                <View style={styles.timeCol}>
                  <Text style={styles.fieldLabel}>ARRIVAL</Text>
                  <View style={styles.inputWithIconContainer}>
                    <Text style={styles.inputLeadingEmoji}>🕒</Text>
                    <TextInput
                      value={arrivalTime}
                      onChangeText={setArrivalTime}
                      placeholder="HH:MM (e.g. 11:20)"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.inputField, styles.inputFieldWithIcon]}
                    />
                  </View>
                </View>
              </View>

              {/* Live Duration Summary */}
              {durationText ? (
                <View style={styles.durationRow}>
                  <View style={styles.directBadge}>
                    <Text style={styles.directCheckIcon}>✓</Text>
                    <Text style={styles.directText}>Direct journey</Text>
                  </View>
                  <Text style={styles.durationValue}>
                    Duration: <Text style={styles.durationHighlight}>{durationText}</Text>
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Section 4: Booking Information (Optional) ────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>BOOKING INFORMATION</Text>
              <Text style={styles.sectionOptionalLabel}>Optional</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.timeGrid}>
                <View style={styles.timeCol}>
                  <Text style={styles.fieldLabel}>BOOKING / REF #</Text>
                  <TextInput
                    value={bookingNumber}
                    onChangeText={setBookingNumber}
                    placeholder="e.g. JR-784920"
                    placeholderTextColor={colors.textMuted}
                    style={styles.inputField}
                  />
                </View>

                <View style={styles.timeCol}>
                  <Text style={styles.fieldLabel}>SEAT / CAR</Text>
                  <TextInput
                    value={seat}
                    onChangeText={setSeat}
                    placeholder="e.g. Car 5, Seat 12-A"
                    placeholderTextColor={colors.textMuted}
                    style={styles.inputField}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── Section 5: Notes (Optional) ──────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>NOTES</Text>
              <Text style={styles.sectionOptionalLabel}>Optional</Text>
            </View>

            <View style={styles.card}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any useful travel notes (e.g. Mount Fuji view on right side, luggage reservation)..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={styles.notesTextArea}
              />
            </View>
          </View>

          {/* ── Action Buttons ─────────────────────────────────────────── */}
          <View style={styles.actionsSection}>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.buttonPressed,
                isSubmitting && styles.buttonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Add Transportation to Itinerary"
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Adding Transportation...' : 'Add Transportation to Itinerary'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// 4. Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },

  // --- Header ---
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  headerTitle: {
    fontFamily: typography.screenTitle.fontFamily,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    letterSpacing: -0.28,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // --- Sections ---
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  sectionActiveLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: typography.caption.fontFamily,
  },
  sectionOptionalLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    fontFamily: typography.caption.fontFamily,
  },
  providerInputInline: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    maxWidth: 180,
  },

  // --- Transport Mode Grid ---
  modeGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  modeButtonSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  modeButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  modeIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  modeEmoji: {
    fontSize: 18,
    opacity: 0.65,
  },
  modeEmojiSelected: {
    opacity: 1,
  },
  modeLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  modeLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },

  // --- Card ---
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
    position: 'relative',
  },

  // --- Route ---
  dashedConnector: {
    position: 'absolute',
    left: 28,
    top: 42,
    bottom: 42,
    width: 1.5,
    borderLeftWidth: 1.5,
    borderLeftColor: colors.primary,
    borderStyle: 'dashed',
    opacity: 0.35,
    zIndex: 0,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    zIndex: 1,
  },
  fromPin: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  fromPinDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  toPin: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    ...shadows.card,
  },
  toPinIcon: {
    fontSize: 12,
  },
  routeInputContainer: {
    flex: 1,
  },
  routeInputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  routeFromTag: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.primary,
  },
  routeToTag: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.textPrimary,
  },
  routeHelpText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    color: colors.textMuted,
  },
  swapRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: -8,
    paddingRight: 4,
    zIndex: 2,
  },
  swapButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  swapIconText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // --- Inputs ---
  inputField: {
    height: 44,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  inputFieldError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
  formGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  inputWithIconContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputLeadingEmoji: {
    position: 'absolute',
    left: 10,
    zIndex: 2,
    fontSize: 14,
  },
  inputFieldWithIcon: {
    paddingLeft: 34,
  },

  // --- Overnight Toggle ---
  overnightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    fontSize: 11,
    color: colors.textOnPrimary,
    fontWeight: '700',
  },
  overnightLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    color: colors.textSecondary,
  },

  // --- Time grid ---
  timeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  timeCol: {
    flex: 1,
    gap: 4,
  },

  // --- Duration ---
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  directBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  directCheckIcon: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  directText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.textMuted,
  },
  durationValue: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
  },
  durationHighlight: {
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // --- Notes ---
  notesTextArea: {
    minHeight: 76,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: spacing.sm,
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },

  // --- Actions ---
  actionsSection: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  submitButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.float,
  },
  submitButtonText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  cancelButton: {
    height: 48,
    backgroundColor: colors.transparent,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
