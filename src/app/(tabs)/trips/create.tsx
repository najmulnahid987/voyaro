/**
 * Route: /(tabs)/trips/create — Create & Edit Trip Screen
 *
 * Compact, responsive travel-planning form adhering to Voyaro design tokens.
 * Features:
 *   - Unified top sub-navigation bar with circular back button
 *   - Card-grouped form layout with normalized 12px borders and clean spacing
 *   - 42px standard input wrappers and native DateTimePickerField
 *   - Compact travelers stepper and trip style pill selector
 *   - 44px standard CTA button and persistent tab bar inset clearance
 */

import React, { useEffect, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { createTrip, updateTrip, fetchTripById } from '@/services/trip';
import { CurrencyCode } from '@/types/expense';
import { useShellInsets } from '@/components/navigation';
import { DateTimePickerField } from '@/components/ui';

function toIsoDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return new Date().toISOString().split('T')[0];
}

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

export default function CreateTripScreen() {
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();

  // Route params for Edit mode
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const isEditing = Boolean(tripId);

  // Form State
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [startDateObj, setStartDateObj] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [endDateObj, setEndDateObj] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d;
  });
  const [travelers, setTravelers] = useState(2);
  const [selectedStyle, setSelectedStyle] = useState<TripStyleType>('couple');
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [budget, setBudget] = useState('');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  // Validation & Submission State
  const [errors, setErrors] = useState<{
    tripName?: string;
    destination?: string;
    dates?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Role state for editing permissions
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);

  // Load existing trip data if editing
  useEffect(() => {
    let isMounted = true;
    if (tripId) {
      fetchTripById(tripId)
        .then((existing) => {
          if (!isMounted) return;
          if (existing) {
            const role = existing.userRole || (existing.isOwner ? 'owner' : null);
            setUserRole(role);
            if (existing.isOwner === false || (existing.userRole && existing.userRole !== 'owner')) {
              setSubmitError('Only the trip owner can edit trip details and settings.');
            }
            setTripName(existing.title || '');
            setDestination(existing.destination || '');
            setStops(existing.cities || []);

            if (existing.startDate) {
              const parsedStart = new Date(existing.startDate);
              if (!isNaN(parsedStart.getTime())) setStartDateObj(parsedStart);
            }
            if (existing.endDate) {
              const parsedEnd = new Date(existing.endDate);
              if (!isNaN(parsedEnd.getTime())) setEndDateObj(parsedEnd);
            }

            setTravelers(existing.travelerCount || 1);
            if (existing.spending?.budget) {
              setBudget(existing.spending.budget.toString());
            }
          }
        })
        .catch((err) => {
          console.warn('[Voyaro] Failed to load trip for editing:', err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [tripId]);

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
    const trimmed = destination.trim();
    if (trimmed && !stops.includes(trimmed)) {
      setStops((prev) => [...prev, trimmed]);
      setDestination('');
    }
  };

  const handleRemoveStop = (stopToRemove: string) => {
    setStops((prev) => prev.filter((s) => s !== stopToRemove));
  };

  // Validation & Submission
  const handleCreateTrip = async () => {
    if (isSubmitting) return;
    const newErrors: { tripName?: string; destination?: string; dates?: string } = {};

    if (!tripName.trim()) {
      newErrors.tripName = 'Trip name is required.';
    }
    if (!destination.trim() && stops.length === 0) {
      newErrors.destination = 'Destination is required.';
    }

    const startDateIso = startDateObj.toISOString().split('T')[0];
    const endDateIso = endDateObj.toISOString().split('T')[0];

    if (endDateIso < startDateIso) {
      newErrors.dates = 'End date must be on or after start date.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);

    if (isEditing && tripId && userRole && userRole !== 'owner') {
      setSubmitError('Permission denied: Only the trip owner can modify trip details.');
      return;
    }

    setIsSubmitting(true);

    const parsedBudget = parseFloat(budget.replace(/[^0-9.]/g, '')) || 0;
    const allDestinations = stops.length > 0
      ? (destination.trim() && !stops.includes(destination.trim()) ? [...stops, destination.trim()] : stops)
      : [destination.trim()];

    try {
      if (isEditing && tripId) {
        const updated = await updateTrip(tripId, {
          title: tripName.trim(),
          destination: allDestinations.join(' · '),
          cities: allDestinations,
          startDate: startDateIso,
          endDate: endDateIso,
          travelerCount: travelers,
          budgetAmount: parsedBudget,
          budgetCurrency: selectedCurrency.code as CurrencyCode,
        });
        setIsSubmitting(false);
        router.replace(`/(tabs)/trips/${updated.id}`);
      } else {
        const created = await createTrip({
          title: tripName.trim(),
          destination: allDestinations.join(' · '),
          cities: allDestinations,
          startDate: startDateIso,
          endDate: endDateIso,
          travelerCount: travelers,
          status: 'upcoming',
          budgetAmount: parsedBudget,
          budgetCurrency: selectedCurrency.code as CurrencyCode,
        });
        setIsSubmitting(false);
        router.replace(`/(tabs)/trips/${created.id}`);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save trip. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const isOwnerBlocked = isEditing && userRole !== null && userRole !== 'owner';

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: contentPaddingTop,
              paddingBottom: contentPaddingBottom + spacing.xl,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* ── 1. Top Sub-Navigation Bar ──────────────────────────────── */}
            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.iconCircleButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={8}
              >
                <Text style={styles.backArrow}>←</Text>
              </Pressable>

              <Text style={styles.topBarTitle}>
                {isEditing ? 'Edit Trip' : 'Create Trip'}
              </Text>

              <View style={styles.topBarSpacer} />
            </View>

            {/* Subtitle */}
            <View style={styles.headerSubtitleSection}>
              <Text style={styles.headerSubtitle}>
                {isEditing
                  ? 'Update your trip details and itinerary settings.'
                  : 'Where will your next story begin?'}
              </Text>
            </View>

            {/* Error Banner */}
            {submitError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{submitError}</Text>
              </View>
            ) : null}

            {errors.dates ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errors.dates}</Text>
              </View>
            ) : null}

            {/* ── 2. Trip General Info Card ─────────────────────────────── */}
            <View style={styles.cardContainer}>
              <Text style={styles.sectionTitle}>TRIP DETAILS</Text>

              {/* Trip Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Trip Name *</Text>
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
                  <View style={styles.inputIconBox}>
                    <View style={styles.pencilShape} />
                  </View>
                </View>
                {errors.tripName ? (
                  <Text style={styles.errorText}>{errors.tripName}</Text>
                ) : null}
              </View>

              {/* Destinations */}
              <View style={[styles.fieldGroup, styles.fieldSpacingTop]}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.inputLabel}>Destination *</Text>
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
                {errors.destination ? (
                  <Text style={styles.errorText}>{errors.destination}</Text>
                ) : null}

                {/* Added Destination Chips */}
                {stops.length > 0 ? (
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
                ) : null}
              </View>

              {/* Dates Grid (Start Date & End Date) */}
              <View style={[styles.datesGrid, styles.fieldSpacingTop]}>
                {/* Start Date */}
                <View style={styles.dateCol}>
                  <Text style={styles.inputLabel}>Start Date *</Text>
                  <DateTimePickerField
                    mode="date"
                    value={startDateObj}
                    onChange={(newDate) => {
                      setStartDateObj(newDate);
                      if (errors.dates) {
                        setErrors((prev) => ({ ...prev, dates: undefined }));
                      }
                    }}
                  />
                </View>

                {/* End Date */}
                <View style={styles.dateCol}>
                  <Text style={styles.inputLabel}>End Date *</Text>
                  <DateTimePickerField
                    mode="date"
                    value={endDateObj}
                    onChange={(newDate) => {
                      setEndDateObj(newDate);
                      if (errors.dates) {
                        setErrors((prev) => ({ ...prev, dates: undefined }));
                      }
                    }}
                  />
                </View>
              </View>
            </View>

            {/* ── 3. Travel Preferences & Group Card ────────────────────── */}
            <View style={styles.cardContainer}>
              <Text style={styles.sectionTitle}>TRAVELERS & STYLE</Text>

              {/* Travelers Stepper */}
              <View style={styles.travelersRow}>
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
                      styles.stepperButton,
                      travelers <= 1 && styles.stepperButtonDisabled,
                      pressed && styles.buttonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease travelers"
                    hitSlop={6}
                  >
                    <Text style={styles.stepperMinusText}>−</Text>
                  </Pressable>

                  <Text style={styles.travelersCount}>{travelers}</Text>

                  <Pressable
                    onPress={handleIncrementTravelers}
                    style={({ pressed }) => [
                      styles.stepperButton,
                      styles.stepperButtonPlus,
                      pressed && styles.buttonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Increase travelers"
                    hitSlop={6}
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
              <View style={[styles.fieldGroup, styles.fieldSpacingTop]}>
                <Text style={styles.inputLabel}>Trip Style</Text>
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
              <View style={[styles.fieldGroup, styles.fieldSpacingTop]}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.inputLabel}>Estimated Budget</Text>
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
                    {isCurrencyDropdownOpen ? (
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
                    ) : null}
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

            {/* ── 4. Action Buttons ─────────────────────────────────────── */}
            <View style={styles.actionsSection}>
              <Pressable
                onPress={handleCreateTrip}
                disabled={isSubmitting || isOwnerBlocked}
                style={({ pressed }) => [
                  styles.createTripButton,
                  isOwnerBlocked && styles.createTripButtonDisabled,
                  pressed && !isOwnerBlocked && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={isEditing ? 'Save Changes' : 'Create Trip'}
              >
                <Text
                  style={[
                    styles.createTripButtonText,
                    isOwnerBlocked && styles.createTripButtonTextDisabled,
                  ]}
                >
                  {isSubmitting
                    ? isEditing
                      ? 'Saving...'
                      : 'Creating...'
                    : isOwnerBlocked
                    ? 'Owner Only'
                    : isEditing
                    ? 'Save Changes'
                    : 'Create Trip'}
                </Text>
                {!isOwnerBlocked ? (
                  <Image
                    source={require('@/assets/images/onboarding/arrow-right.svg')}
                    style={styles.createTripButtonIcon}
                    contentFit="contain"
                  />
                ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
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
    paddingHorizontal: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    gap: spacing.md,
  },

  // ── Top Navigation Bar ───────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: 2,
  },
  topBarTitle: {
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  topBarSpacer: {
    width: 32,
  },
  iconCircleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  backArrow: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },

  // ── Header Subtitle ──────────────────────────────────────────────────────
  headerSubtitleSection: {
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  // ── Card Container ───────────────────────────────────────────────────────
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 8,
  },

  // ── Fields ───────────────────────────────────────────────────────────────
  fieldGroup: {
    flexDirection: 'column',
  },
  fieldSpacingTop: {
    marginTop: spacing.md,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  inputLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 3,
  },
  optionalText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },

  // ── Input Wrapper ────────────────────────────────────────────────────────
  inputWrapper: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
  },
  inputWrapperError: {
    borderColor: colors.error,
  },
  textInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13.5,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  textInputWithLeftIcon: {
    paddingLeft: spacing.xs + 2,
  },
  inputIconBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pencilShape: {
    width: 12,
    height: 2.5,
    backgroundColor: colors.textMuted,
    transform: [{ rotate: '-45deg' }],
    borderRadius: 1,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 11.5,
    color: colors.error,
    marginTop: 2,
    marginLeft: 2,
  },

  // ── Location Pin Icon ────────────────────────────────────────────────────
  locationIconWrapper: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPinOuter: {
    width: 12,
    height: 14,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPinInner: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },

  // ── Add Stop ─────────────────────────────────────────────────────────────
  addStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  addStopIcon: {
    width: 13,
    height: 13,
    tintColor: colors.primary,
  },
  addStopText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Stop Chips ───────────────────────────────────────────────────────────
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs + 2,
  },
  stopChip: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopChipText: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  stopChipRemove: {
    padding: 1,
  },
  stopChipRemoveText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },

  // ── Dates Grid ───────────────────────────────────────────────────────────
  datesGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateCol: {
    flex: 1,
  },

  // ── Travelers Stepper ────────────────────────────────────────────────────
  travelersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  travelersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  travelersIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelersIcon: {
    width: 16,
    height: 16,
    tintColor: colors.primary,
  },
  travelersTextGroup: {
    gap: 1,
  },
  travelersTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  travelersSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonPlus: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  stepperMinusText: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepperButtonDisabled: {
    opacity: 0.35,
  },
  travelersCount: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    minWidth: 18,
    textAlign: 'center',
  },
  stepperPlusIcon: {
    width: 13,
    height: 13,
    tintColor: colors.primary,
  },

  // ── Trip Style Chips ─────────────────────────────────────────────────────
  stylesScrollContent: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  styleChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  styleChipSelected: {
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  styleChipUnselected: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  styleChipIcon: {
    width: 14,
    height: 14,
  },
  styleChipIconSelected: {
    tintColor: colors.textOnPrimary,
  },
  styleChipIconUnselected: {
    tintColor: colors.textSecondary,
  },
  styleChipText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    fontWeight: '500',
  },
  styleChipTextSelected: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  styleChipTextUnselected: {
    color: colors.textSecondary,
  },

  // ── Budget Section ───────────────────────────────────────────────────────
  budgetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  currencyWrapper: {
    width: 100,
    position: 'relative',
    zIndex: 10,
  },
  currencyTrigger: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  currencyCode: {
    fontFamily: fontFamily.medium,
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  currencyArrow: {
    fontSize: 8,
    color: colors.textSecondary,
  },
  currencyDropdown: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sheet,
    overflow: 'hidden',
    zIndex: 30,
  },
  currencyOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currencyOptionActive: {
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
  },
  currencyOptionText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textPrimary,
  },
  currencyOptionTextActive: {
    fontFamily: fontFamily.semiBold,
    fontWeight: '600',
    color: colors.primary,
  },
  budgetInputWrapper: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm + 2,
  },
  budgetTextInput: {
    fontFamily: fontFamily.regular,
    fontSize: 13.5,
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  // ── Actions Section ──────────────────────────────────────────────────────
  actionsSection: {
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  createTripButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    ...shadows.card,
  },
  createTripButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.65,
  },
  createTripButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  createTripButtonTextDisabled: {
    color: colors.textSecondary,
  },
  createTripButtonIcon: {
    width: 14,
    height: 14,
    tintColor: colors.textOnPrimary,
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  cancelButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  cancelButtonPressed: {
    opacity: 0.6,
  },

  // ── Error Banner ─────────────────────────────────────────────────────────
  errorBanner: {
    backgroundColor: 'rgba(176, 74, 74, 0.08)',
    borderRadius: radius.input,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorBannerText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
    textAlign: 'center',
  },
});

