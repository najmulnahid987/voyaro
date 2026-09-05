import React, { useState } from 'react';
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
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { createMockTrip, Trip } from '@/services/mockData';
import { useShellInsets } from '@/components/navigation';

// ---------------------------------------------------------------------------
// Trip Style Types & Data
// ---------------------------------------------------------------------------
type TripStyleType = 'couple' | 'solo' | 'family' | 'friends' | 'business';

interface TripStyleOption {
  id: TripStyleType;
  label: string;
  icon: any;
}

const TRIP_STYLES: TripStyleOption[] = [
  {
    id: 'couple',
    label: 'Couple',
    icon: require('@/assets/images/onboarding/heart.svg'),
  },
  {
    id: 'solo',
    label: 'Solo',
    icon: require('@/assets/images/onboarding/person.svg'),
  },
  {
    id: 'family',
    label: 'Family',
    icon: require('@/assets/images/onboarding/family.svg'),
  },
  {
    id: 'friends',
    label: 'Friends',
    icon: require('@/assets/images/onboarding/groups.svg'),
  },
  {
    id: 'business',
    label: 'Business',
    icon: require('@/assets/images/onboarding/briefcase.svg'),
  },
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD $' },
  { code: 'EUR', symbol: '€', label: 'EUR €' },
  { code: 'GBP', symbol: '£', label: 'GBP £' },
  { code: 'JPY', symbol: '¥', label: 'JPY ¥' },
];

/**
 * Route: /(tabs)/trips/create — Create Trip Screen (Phase 4)
 *
 * Visual Source of Truth: Google Stitch Create Trip design (create-trip.png & create-trip.html)
 * Features:
 *   - Trip Name with edit icon
 *   - Destinations with "+ Add Stop" action and location icon
 *   - 2-Column Start Date & End Date pickers
 *   - Travelers Stepper (Adults & Children)
 *   - Trip Style Pill Selector (Couple, Solo, Family, Friends, Business)
 *   - Estimated Budget with Currency Dropdown & Numeric input
 *   - Create Trip CTA & Cancel button
 */
export default function CreateTripScreen() {
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();

  // Form State
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('Oct 12, 2028');
  const [endDate, setEndDate] = useState('Oct 26, 2028');
  const [travelers, setTravelers] = useState(2);
  const [selectedStyle, setSelectedStyle] = useState<TripStyleType>('couple');
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [budget, setBudget] = useState('');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  // Validation State
  const [errors, setErrors] = useState<{
    tripName?: string;
    destination?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Date Picker State
  const [activeDateModal, setActiveDateModal] = useState<'start' | 'end' | null>(null);

  // Stepper handlers
  const handleDecrementTravelers = () => {
    if (travelers > 1) {
      setTravelers((prev) => prev - 1);
    }
  };

  const handleIncrementTravelers = () => {
    setTravelers((prev) => prev + 1);
  };

  // Add stop handler
  const handleAddStop = () => {
    if (destination.trim() && !stops.includes(destination.trim())) {
      setStops((prev) => [...prev, destination.trim()]);
    }
  };

  const handleRemoveStop = (stopToRemove: string) => {
    setStops((prev) => prev.filter((s) => s !== stopToRemove));
  };

  // Validation & Submission
  const handleCreateTrip = () => {
    const newErrors: { tripName?: string; destination?: string } = {};

    if (!tripName.trim()) {
      newErrors.tripName = 'Trip name is required.';
    }
    if (!destination.trim() && stops.length === 0) {
      newErrors.destination = 'Destination is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const parsedBudget = parseFloat(budget.replace(/[^0-9.]/g, '')) || 2000;
    const allDestinations = stops.length > 0 ? stops : [destination.trim()];

    const createdTrip = createMockTrip({
      title: tripName.trim(),
      destination: allDestinations.join(' · '),
      cities: allDestinations,
      dates: `${startDate} - ${endDate}`,
      startDate: '2028-10-12',
      endDate: '2028-10-26',
      status: 'upcoming',
      travelerCount: travelers,
      itineraryCount: 0,
      spending: {
        spent: 0,
        budget: parsedBudget,
        currency: selectedCurrency.symbol,
        percentUsed: 0,
        spentFormatted: '0',
        budgetFormatted: parsedBudget.toLocaleString(),
        isOverBudget: false,
      },
    });

    setIsSubmitting(false);
    // Navigate directly to the newly created trip overview
    router.replace(`/(tabs)/trips/${createdTrip.id}`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: contentPaddingTop, paddingBottom: contentPaddingBottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* ── 1. Hero / Destination Preview Header ───────────────────── */}
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Create a new trip</Text>
              <Text style={styles.heroSubtitle}>
                Where will your next story begin?
              </Text>
            </View>

            {/* ── 2. General Info Section ─────────────────────────────────── */}
            <View style={styles.section}>
              {/* Trip Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Trip Name</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    errors.tripName ? styles.inputWrapperError : null,
                  ]}
                >
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Autumn in Kyoto"
                    placeholderTextColor={colors.textMuted}
                    value={tripName}
                    onChangeText={(val) => {
                      setTripName(val);
                      if (errors.tripName) {
                        setErrors((prev) => ({ ...prev, tripName: undefined }));
                      }
                    }}
                    accessibilityLabel="Trip Name"
                  />
                  {/* Pencil Edit Icon */}
                  <View style={styles.editIconWrapper}>
                    <View style={styles.pencilShape} />
                  </View>
                </View>
                {errors.tripName && (
                  <Text style={styles.errorText}>{errors.tripName}</Text>
                )}
              </View>

              {/* Destinations */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Destinations</Text>
                  <Pressable
                    onPress={handleAddStop}
                    hitSlop={8}
                    style={styles.addStopButton}
                    accessibilityRole="button"
                    accessibilityLabel="Add Stop"
                  >
                    <Image
                      source={require('@/assets/images/icons/plus.svg')}
                      style={styles.addStopIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.addStopText}>Add Stop</Text>
                  </Pressable>
                </View>
                <View
                  style={[
                    styles.inputWrapper,
                    errors.destination ? styles.inputWrapperError : null,
                  ]}
                >
                  {/* Location Pin Icon */}
                  <View style={styles.locationIconWrapper}>
                    <View style={styles.locationPinOuter}>
                      <View style={styles.locationPinInner} />
                    </View>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.textInputWithLeftIcon]}
                    placeholder="Where are you going?"
                    placeholderTextColor={colors.textMuted}
                    value={destination}
                    onChangeText={(val) => {
                      setDestination(val);
                      if (errors.destination) {
                        setErrors((prev) => ({ ...prev, destination: undefined }));
                      }
                    }}
                    accessibilityLabel="Destinations"
                  />
                </View>
                {errors.destination && (
                  <Text style={styles.errorText}>{errors.destination}</Text>
                )}

                {/* Added Destination Chips */}
                {stops.length > 0 && (
                  <View style={styles.chipsContainer}>
                    {stops.map((stop) => (
                      <View key={stop} style={styles.stopChip}>
                        <Text style={styles.stopChipText}>{stop}</Text>
                        <Pressable
                          onPress={() => handleRemoveStop(stop)}
                          hitSlop={6}
                          style={styles.stopChipRemove}
                        >
                          <Text style={styles.stopChipRemoveText}>✕</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Dates Grid (Start Date & End Date) */}
              <View style={styles.datesGrid}>
                {/* Start Date */}
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>Start Date</Text>
                  <Pressable
                    onPress={() => setActiveDateModal('start')}
                    style={styles.datePickerTrigger}
                    accessibilityRole="button"
                    accessibilityLabel="Select Start Date"
                  >
                    <View style={styles.calendarIconWrapper}>
                      <View style={styles.calendarBox}>
                        <View style={styles.calendarTopBar} />
                      </View>
                    </View>
                    <Text style={styles.datePickerText}>{startDate}</Text>
                  </Pressable>
                </View>

                {/* End Date */}
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>End Date</Text>
                  <Pressable
                    onPress={() => setActiveDateModal('end')}
                    style={styles.datePickerTrigger}
                    accessibilityRole="button"
                    accessibilityLabel="Select End Date"
                  >
                    <View style={styles.calendarIconWrapper}>
                      <View style={styles.calendarBox}>
                        <View style={styles.calendarTopBar} />
                      </View>
                    </View>
                    <Text style={styles.datePickerText}>{endDate}</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* ── 3. Section Divider ──────────────────────────────────────── */}
            <View style={styles.sectionDivider} />

            {/* ── 4. Details Section ──────────────────────────────────────── */}
            <View style={styles.section}>
              {/* Travelers Stepper */}
              <View style={styles.travelersCard}>
                <View style={styles.travelersLeft}>
                  <View style={styles.travelersIconCircle}>
                    <Image
                      source={require('@/assets/images/icons/group.svg')}
                      style={styles.travelersIcon}
                      contentFit="contain"
                    />
                  </View>
                  <View style={styles.travelersTextGroup}>
                    <Text style={styles.travelersTitle}>Travelers</Text>
                    <Text style={styles.travelersSubtitle}>
                      Adults & Children
                    </Text>
                  </View>
                </View>

                {/* Stepper Controls */}
                <View style={styles.stepperControls}>
                  <Pressable
                    onPress={handleDecrementTravelers}
                    disabled={travelers <= 1}
                    style={({ pressed }) => [
                      styles.stepperButtonMinus,
                      travelers <= 1 && styles.stepperButtonDisabled,
                      pressed && styles.stepperButtonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease travelers"
                  >
                    <Text style={styles.stepperMinusText}>−</Text>
                  </Pressable>

                  <Text style={styles.travelersCount}>{travelers}</Text>

                  <Pressable
                    onPress={handleIncrementTravelers}
                    style={({ pressed }) => [
                      styles.stepperButtonPlus,
                      pressed && styles.stepperButtonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Increase travelers"
                  >
                    <Image
                      source={require('@/assets/images/icons/plus.svg')}
                      style={styles.stepperPlusIcon}
                      contentFit="contain"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Trip Style Chips */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Trip Style</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.stylesScrollContent}
                >
                  {TRIP_STYLES.map((styleOpt) => {
                    const isSelected = selectedStyle === styleOpt.id;
                    return (
                      <Pressable
                        key={styleOpt.id}
                        onPress={() => setSelectedStyle(styleOpt.id)}
                        style={[
                          styles.styleChip,
                          isSelected
                            ? styles.styleChipSelected
                            : styles.styleChipUnselected,
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={styleOpt.label}
                      >
                        <Image
                          source={styleOpt.icon}
                          style={[
                            styles.styleChipIcon,
                            isSelected
                              ? styles.styleChipIconSelected
                              : styles.styleChipIconUnselected,
                          ]}
                          contentFit="contain"
                        />
                        <Text
                          style={[
                            styles.styleChipText,
                            isSelected
                              ? styles.styleChipTextSelected
                              : styles.styleChipTextUnselected,
                          ]}
                        >
                          {styleOpt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Estimated Budget (Optional) */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Estimated Budget</Text>
                  <Text style={styles.optionalText}>Optional</Text>
                </View>

                <View style={styles.budgetRow}>
                  {/* Currency Selector */}
                  <View style={styles.currencyWrapper}>
                    <Pressable
                      onPress={() => setIsCurrencyDropdownOpen((prev) => !prev)}
                      style={styles.currencyTrigger}
                      accessibilityRole="combobox"
                      accessibilityLabel="Select Currency"
                    >
                      <Text style={styles.currencyCode}>
                        {selectedCurrency.label}
                      </Text>
                      <Text style={styles.currencyArrow}>▼</Text>
                    </Pressable>

                    {/* Currency Dropdown Menu */}
                    {isCurrencyDropdownOpen && (
                      <View style={styles.currencyDropdown}>
                        {CURRENCIES.map((curr) => (
                          <Pressable
                            key={curr.code}
                            onPress={() => {
                              setSelectedCurrency(curr);
                              setIsCurrencyDropdownOpen(false);
                            }}
                            style={[
                              styles.currencyOption,
                              selectedCurrency.code === curr.code &&
                                styles.currencyOptionActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.currencyOptionText,
                                selectedCurrency.code === curr.code &&
                                  styles.currencyOptionTextActive,
                              ]}
                            >
                              {curr.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Budget Amount Input */}
                  <View style={styles.budgetInputWrapper}>
                    <TextInput
                      style={styles.budgetTextInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      value={budget}
                      onChangeText={setBudget}
                      keyboardType="numeric"
                      accessibilityLabel="Budget Amount"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* ── 5. Actions Area ─────────────────────────────────────────── */}
            <View style={styles.actionsSection}>
              <Pressable
                onPress={handleCreateTrip}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.createTripButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create Trip"
              >
                <Text style={styles.createTripButtonText}>Create Trip</Text>
                <Image
                  source={require('@/assets/images/onboarding/arrow-right.svg')}
                  style={styles.createTripButtonIcon}
                  contentFit="contain"
                />
              </Pressable>

              <Pressable
                onPress={handleCancel}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.cancelButtonPressed,
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

      {/* ── Quick Date Picker Modal (Presets for testing) ─────────────── */}
      {activeDateModal && (
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActiveDateModal(null)}
        >
          <View style={styles.dateModalCard}>
            <Text style={styles.dateModalTitle}>
              Select {activeDateModal === 'start' ? 'Start Date' : 'End Date'}
            </Text>
            <View style={styles.datePresetsList}>
              {[
                'Oct 12, 2028',
                'Oct 18, 2028',
                'Oct 26, 2028',
                'Nov 05, 2028',
                'Dec 20, 2028',
                'Jan 15, 2029',
              ].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => {
                    if (activeDateModal === 'start') {
                      setStartDate(d);
                    } else {
                      setEndDate(d);
                    }
                    setActiveDateModal(null);
                  }}
                  style={styles.datePresetItem}
                >
                  <Text style={styles.datePresetText}>{d}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => setActiveDateModal(null)}
              style={styles.dateModalCloseBtn}
            >
              <Text style={styles.dateModalCloseText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  container: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    gap: spacing.xl,
  },

  // ── Hero Section ───────────────────────────────────────────────────────────
  heroSection: {
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  heroTitle: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.28,
  },
  heroSubtitle: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },

  // ── Section & Field Styles ─────────────────────────────────────────────────
  section: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  optionalText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textMuted,
  },

  // Input wrapper
  inputWrapper: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  inputWrapperError: {
    borderColor: colors.error,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  textInputWithLeftIcon: {
    paddingLeft: spacing.sm,
  },
  editIconWrapper: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pencilShape: {
    width: 14,
    height: 3,
    backgroundColor: 'rgba(64, 72, 72, 0.40)',
    transform: [{ rotate: '-45deg' }],
    borderRadius: 1,
  },
  errorText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.error,
    marginTop: 2,
    marginLeft: 4,
  },

  // Location Icon
  locationIconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPinOuter: {
    width: 14,
    height: 16,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPinInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },

  // Add Stop Button
  addStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addStopIcon: {
    width: 14,
    height: 14,
    tintColor: colors.primary,
  },
  addStopText: {
    ...typography.label,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  // Stop Chips
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  stopChip: {
    backgroundColor: '#eeeeee',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopChipText: {
    ...typography.label,
    fontSize: 13,
    color: colors.textSecondary,
  },
  stopChipRemove: {
    padding: 2,
  },
  stopChipRemoveText: {
    fontSize: 11,
    color: colors.textMuted,
  },

  // Dates Grid
  datesGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateCol: {
    flex: 1,
    gap: spacing.sm,
  },
  datePickerTrigger: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  calendarIconWrapper: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarBox: {
    width: 15,
    height: 15,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(64, 72, 72, 0.60)',
    overflow: 'hidden',
  },
  calendarTopBar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(64, 72, 72, 0.60)',
  },
  datePickerText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
  },

  // Section Divider
  sectionDivider: {
    height: 1,
    backgroundColor: '#e2e2e2',
    width: '100%',
  },

  // ── Travelers Card ─────────────────────────────────────────────────────────
  travelersCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  travelersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  travelersIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(44, 95, 94, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelersIcon: {
    width: 20,
    height: 20,
    tintColor: colors.primary,
  },
  travelersTextGroup: {
    gap: 2,
  },
  travelersTitle: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  travelersSubtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Stepper Controls
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButtonMinus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eeeeee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperMinusText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  travelersCount: {
    ...typography.screenTitle,
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  stepperButtonPlus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(44, 95, 94, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPlusIcon: {
    width: 16,
    height: 16,
    tintColor: colors.primary,
  },
  stepperButtonPressed: {
    transform: [{ scale: 0.94 }],
  },

  // ── Trip Style Chips ───────────────────────────────────────────────────────
  stylesScrollContent: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  styleChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  styleChipSelected: {
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  styleChipUnselected: {
    backgroundColor: '#eeeeee',
  },
  styleChipIcon: {
    width: 18,
    height: 18,
  },
  styleChipIconSelected: {
    tintColor: colors.textOnPrimary,
  },
  styleChipIconUnselected: {
    tintColor: colors.textSecondary,
  },
  styleChipText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '500',
  },
  styleChipTextSelected: {
    color: colors.textOnPrimary,
  },
  styleChipTextUnselected: {
    color: colors.textSecondary,
  },

  // ── Budget Section ─────────────────────────────────────────────────────────
  budgetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  currencyWrapper: {
    width: 105,
    position: 'relative',
    zIndex: 10,
  },
  currencyTrigger: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  currencyCode: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  currencyArrow: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  currencyDropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    ...shadows.sheet,
    overflow: 'hidden',
    zIndex: 20,
  },
  currencyOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currencyOptionActive: {
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
  },
  currencyOptionText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textPrimary,
  },
  currencyOptionTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  budgetInputWrapper: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  budgetTextInput: {
    ...typography.body,
    fontSize: 16,
    color: colors.textPrimary,
  },

  // ── Actions Section ────────────────────────────────────────────────────────
  actionsSection: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  createTripButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.card,
  },
  createTripButtonText: {
    ...typography.label,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  createTripButtonIcon: {
    width: 18,
    height: 18,
    tintColor: colors.textOnPrimary,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  cancelButtonText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  cancelButtonPressed: {
    opacity: 0.6,
  },

  // ── Date Modal Overlay ─────────────────────────────────────────────────────
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 100,
  },
  dateModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sheet,
  },
  dateModalTitle: {
    ...typography.screenTitle,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  datePresetsList: {
    gap: spacing.sm,
  },
  datePresetItem: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e2e2',
  },
  datePresetText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  dateModalCloseBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  dateModalCloseText: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
});
