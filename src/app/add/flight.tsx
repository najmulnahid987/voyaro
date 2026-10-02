/**
 * Route: /add/flight — Add Flight Screen (Phase 5)
 *
 * Visual Source of Truth: Google Stitch flight.png & flight.html
 *
 * Features:
 *   - Header with back/close and scan booking action
 *   - Section 1: Flight Basics (Airline, Flight Number)
 *   - Section 2: Route (Departure Airport & IATA code, Swap button, Arrival Airport & IATA code)
 *   - Section 3: Schedule (Departure Date/Time, Arrival Date/Time with multi-day support)
 *   - Section 4: Boarding Details (Terminal, Gate, Seat, Cabin Class selector, Confirmation / PNR)
 *   - Section 5: Notes (Optional multiline notes)
 *   - Live Interactive Preview Card (Updating dynamically as user types)
 *   - Validation with clear field-level error messages
 *   - Seamless submission into in-memory itinerary state and automatic return to timeline
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
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { addItem, getItem, updateItem } from '@/services/itineraryStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConcreteItineraryItem, FlightMetadata } from '@/types/itinerary';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';

// ---------------------------------------------------------------------------
// Mock Airport Lookup Helper
// ---------------------------------------------------------------------------

const AIRPORT_IATA_MAP: Record<string, string> = {
  dhaka: 'DAC',
  dubai: 'DXB',
  tokyo: 'NRT',
  narita: 'NRT',
  haneda: 'HND',
  london: 'LHR',
  heathrow: 'LHR',
  paris: 'CDG',
  singapore: 'SIN',
  changi: 'SIN',
  newyork: 'JFK',
  jfk: 'JFK',
  losangeles: 'LAX',
  kyoto: 'KIX',
  osaka: 'KIX',
  bangkok: 'BKK',
  doha: 'DOH',
};

function inferAirportCode(name: string, fallback: string = 'APT'): string {
  if (!name) return fallback;
  const clean = name.trim().toUpperCase();
  if (clean.length === 3) return clean;

  const lower = name.toLowerCase().replace(/[^a-z]/g, '');
  for (const [key, code] of Object.entries(AIRPORT_IATA_MAP)) {
    if (lower.includes(key)) return code;
  }

  // Extract capital letters if any (e.g. "DAC Airport" -> "DAC")
  const words = name.trim().split(/\s+/);
  for (const w of words) {
    if (w.length === 3 && w === w.toUpperCase()) return w;
  }

  return clean.substring(0, 3).toUpperCase() || fallback;
}

const CABIN_CLASSES = ['Economy', 'Premium', 'Business', 'First'] as const;
type CabinClass = (typeof CABIN_CLASSES)[number];

export default function AddFlightScreen() {
  const { tripId, itemId } = useLocalSearchParams<{ tripId?: string; itemId?: string }>();
  const effectiveTripId = tripId || 'japan-adventure';
  const insets = useSafeAreaInsets();

  const existingItem = useMemo(() => {
    return itemId ? getItem(itemId) : undefined;
  }, [itemId]);

  const isEditMode = Boolean(existingItem && existingItem.type === 'flight');
  const flightMeta = isEditMode ? (existingItem?.metadata as FlightMetadata) : undefined;

  // -------------------------------------------------------------------------
  // Form State
  // -------------------------------------------------------------------------
  const [airline, setAirline] = useState(() => flightMeta?.airline || 'Emirates');
  const [flightNumber, setFlightNumber] = useState(() => flightMeta?.flightNumber || 'EK585');
  const [departureAirport, setDepartureAirport] = useState(
    () => flightMeta?.departureCity || flightMeta?.departureAirport || 'Dhaka, Bangladesh'
  );
  const [departureCode, setDepartureCode] = useState(() => flightMeta?.departureAirport || 'DAC');
  const [arrivalAirport, setArrivalAirport] = useState(
    () => flightMeta?.arrivalCity || flightMeta?.arrivalAirport || 'Tokyo, Japan'
  );
  const [arrivalCode, setArrivalCode] = useState(() => flightMeta?.arrivalAirport || 'NRT');

  const [departureDateObj, setDepartureDateObj] = useState<Date>(
    () => (existingItem?.startDateTime ? new Date(existingItem.startDateTime) : new Date('2028-03-10T20:30:00.000Z'))
  );
  const [arrivalDateObj, setArrivalDateObj] = useState<Date>(
    () => (existingItem?.endDateTime ? new Date(existingItem.endDateTime) : new Date('2028-03-11T11:15:00.000Z'))
  );

  const [terminal, setTerminal] = useState(() => flightMeta?.terminal || (isEditMode ? '' : '1'));
  const [gate, setGate] = useState(() => flightMeta?.gate || (isEditMode ? '' : '12'));
  const [seat, setSeat] = useState(() => flightMeta?.seat || (isEditMode ? '' : '14A'));
  const [cabinClass, setCabinClass] = useState<CabinClass>(() => {
    if (flightMeta?.cabinClass) {
      const cap = flightMeta.cabinClass.charAt(0).toUpperCase() + flightMeta.cabinClass.slice(1);
      return cap as CabinClass;
    }
    return 'Economy';
  });
  const [confirmationNumber, setConfirmationNumber] = useState(
    () => existingItem?.confirmationNumber || (isEditMode ? '' : 'EK-982134')
  );
  const [notes, setNotes] = useState(
    () => existingItem?.notes || (isEditMode ? '' : 'Window seats requested. 23kg checked bag included.')
  );

  const [isClassPickerOpen, setIsClassPickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleSwapRoute = () => {
    const tempAirport = departureAirport;
    const tempCode = departureCode;
    setDepartureAirport(arrivalAirport);
    setDepartureCode(arrivalCode);
    setArrivalAirport(tempAirport);
    setArrivalCode(tempCode);
  };

  const handleDepartureChange = (text: string) => {
    setDepartureAirport(text);
    setDepartureCode(inferAirportCode(text, 'DAC'));
    if (errors.departureAirport) {
      setErrors((prev) => ({ ...prev, departureAirport: '' }));
    }
  };

  const handleArrivalChange = (text: string) => {
    setArrivalAirport(text);
    setArrivalCode(inferAirportCode(text, 'NRT'));
    if (errors.arrivalAirport) {
      setErrors((prev) => ({ ...prev, arrivalAirport: '' }));
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push(`/(tabs)/trips/${effectiveTripId}/itinerary` as any);
    }
  };

  // -------------------------------------------------------------------------
  // Validation & Submission
  // -------------------------------------------------------------------------

  const toDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const toTimeStr = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const fmt12h = (d: Date) => {
    let h = d.getHours();
    const min = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${min} ${ampm}`;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!airline.trim()) newErrors.airline = 'Airline name is required.';
    if (!flightNumber.trim()) newErrors.flightNumber = 'Flight number is required.';
    if (!departureAirport.trim()) newErrors.departureAirport = 'Departure airport is required.';
    if (!arrivalAirport.trim()) newErrors.arrivalAirport = 'Arrival airport is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      // 1. Construct ISO Date-Time strings
      const depDateStr = toDateStr(departureDateObj);
      const depTimeStr = toTimeStr(departureDateObj);
      const arrDateStr = toDateStr(arrivalDateObj);
      const arrTimeStr = toTimeStr(arrivalDateObj);
      const startIso = `${depDateStr}T${depTimeStr}:00.000Z`;
      const endIso = `${arrDateStr}T${arrTimeStr}:00.000Z`;

      // 2. Add or Update in In-Memory Store
      if (isEditMode && itemId) {
        updateItem(itemId, {
          title: `Flight to ${arrivalCode || arrivalAirport} (${flightNumber.toUpperCase()})`,
          startDateTime: startIso,
          endDateTime: endIso,
          location: `${departureAirport} (${departureCode}) → ${arrivalAirport} (${arrivalCode})`,
          confirmationNumber: confirmationNumber.trim().toUpperCase() || undefined,
          notes: notes.trim() || undefined,
          metadata: {
            ...flightMeta,
            airline: airline.trim(),
            flightNumber: flightNumber.trim().toUpperCase(),
            departureAirport: departureCode || departureAirport.trim(),
            arrivalAirport: arrivalCode || arrivalAirport.trim(),
            terminal: terminal.trim() || undefined,
            gate: gate.trim() || undefined,
            seat: seat.trim() || undefined,
            departureCity: departureAirport.split(',')[0].trim(),
            arrivalCity: arrivalAirport.split(',')[0].trim(),
            cabinClass: cabinClass.toLowerCase() as any,
          },
        });
      } else {
        const newFlight: ConcreteItineraryItem = {
          id: `itin-flight-${Date.now()}`,
          tripId: effectiveTripId,
          type: 'flight',
          title: `Flight to ${arrivalCode || arrivalAirport} (${flightNumber.toUpperCase()})`,
          startDateTime: startIso,
          endDateTime: endIso,
          location: `${departureAirport} (${departureCode}) → ${arrivalAirport} (${arrivalCode})`,
          confirmationNumber: confirmationNumber.trim().toUpperCase() || undefined,
          notes: notes.trim() || undefined,
          metadata: {
            airline: airline.trim(),
            flightNumber: flightNumber.trim().toUpperCase(),
            departureAirport: departureCode || departureAirport.trim(),
            arrivalAirport: arrivalCode || arrivalAirport.trim(),
            terminal: terminal.trim() || undefined,
            gate: gate.trim() || undefined,
            seat: seat.trim() || undefined,
            departureCity: departureAirport.split(',')[0].trim(),
            arrivalCity: arrivalAirport.split(',')[0].trim(),
            cabinClass: cabinClass.toLowerCase() as any,
          },
        };
        addItem(newFlight);
      }

      // 3. Navigate back to previous screen
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push(`/(tabs)/trips/${effectiveTripId}/itinerary` as any);
      }
    } catch (e) {
      console.warn('Error saving flight:', e);
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Live Formatted Time Strings for Preview
  // -------------------------------------------------------------------------
  const previewDepartureTime = useMemo(() => {
    let h = departureDateObj.getHours();
    const m = String(departureDateObj.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }, [departureDateObj]);

  const previewArrivalTime = useMemo(() => {
    let h = arrivalDateObj.getHours();
    const m = String(arrivalDateObj.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }, [arrivalDateObj]);

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
          {/* ── 1. Top Header ────────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>
                {isEditMode ? 'Edit Flight' : 'Add flight'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isEditMode
                  ? 'Update flight reservation details and times.'
                  : 'Enter details manually or review your booking.'}
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
              <Image
                source={require('@/assets/images/icons/close.svg')}
                style={styles.closeButtonIcon}
                tintColor={colors.textSecondary}
                contentFit="contain"
              />
            </Pressable>
          </View>

          {/* ── 2. Flight Basics Section ─────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Flight Basics</Text>

            <View style={styles.twoColumnRow}>
              {/* Airline */}
              <View style={styles.flexColumn}>
                <Text style={styles.inputLabel}>Airline *</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    errors.airline ? styles.inputWrapperError : null,
                  ]}
                >
                  <View style={styles.inputIconBox}>
                    <Image
                      source={require('@/assets/images/icons/flight.svg')}
                      style={styles.inputIcon}
                      tintColor={colors.textSecondary}
                      contentFit="contain"
                    />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={airline}
                    onChangeText={(t) => {
                      setAirline(t);
                      if (errors.airline) setErrors((prev) => ({ ...prev, airline: '' }));
                    }}
                    placeholder="e.g. Emirates"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                {errors.airline ? (
                  <Text style={styles.errorText}>{errors.airline}</Text>
                ) : null}
              </View>

              {/* Flight Number */}
              <View style={styles.flexColumn}>
                <Text style={styles.inputLabel}>Flight Number *</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    errors.flightNumber ? styles.inputWrapperError : null,
                  ]}
                >
                  <View style={styles.inputIconBox}>
                    <Image
                      source={require('@/assets/images/icons/hash.svg')}
                      style={styles.inputIcon}
                      tintColor={colors.textMuted}
                      contentFit="contain"
                    />
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.uppercaseInput]}
                    value={flightNumber}
                    onChangeText={(t) => {
                      setFlightNumber(t);
                      if (errors.flightNumber)
                        setErrors((prev) => ({ ...prev, flightNumber: '' }));
                    }}
                    placeholder="e.g. EK585"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                  />
                </View>
                {errors.flightNumber ? (
                  <Text style={styles.errorText}>{errors.flightNumber}</Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* ── 3. Route Section ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Route</Text>

            <View style={styles.routeContainer}>
              {/* Departure */}
              <View style={styles.routeCard}>
                <Text style={styles.routeTagLabel}>DEPARTURE *</Text>
                <View style={styles.routeInputRow}>
                  <View style={styles.airportIconCircle}>
                    <Image
                      source={require('@/assets/images/onboarding/flight-takeoff.svg')}
                      style={styles.routeIcon}
                      tintColor={colors.textSecondary}
                      contentFit="contain"
                    />
                  </View>
                  <TextInput
                    style={styles.routeTextInput}
                    value={departureAirport}
                    onChangeText={handleDepartureChange}
                    placeholder="Origin City / Airport"
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={styles.iataBadge}>
                    <Text style={styles.iataBadgeText}>{departureCode}</Text>
                  </View>
                </View>
                {errors.departureAirport ? (
                  <Text style={styles.errorText}>{errors.departureAirport}</Text>
                ) : null}
              </View>

              {/* Route Swap Button */}
              <View style={styles.swapButtonWrapper}>
                <Pressable
                  onPress={handleSwapRoute}
                  style={({ pressed }) => [
                    styles.swapButtonCircle,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Swap departure and arrival"
                >
                  <Image
                    source={require('@/assets/images/icons/swap-vert.svg')}
                    style={styles.swapIcon}
                    tintColor={colors.primary}
                    contentFit="contain"
                  />
                </Pressable>
              </View>

              {/* Arrival */}
              <View style={styles.routeCard}>
                <Text style={styles.routeTagLabel}>ARRIVAL *</Text>
                <View style={styles.routeInputRow}>
                  <View style={styles.airportIconCircle}>
                    <Image
                      source={require('@/assets/images/icons/flight.svg')}
                      style={styles.routeIcon}
                      tintColor={colors.textSecondary}
                      contentFit="contain"
                    />
                  </View>
                  <TextInput
                    style={styles.routeTextInput}
                    value={arrivalAirport}
                    onChangeText={handleArrivalChange}
                    placeholder="Destination City / Airport"
                    placeholderTextColor={colors.textMuted}
                  />
                  <View style={styles.iataBadge}>
                    <Text style={styles.iataBadgeText}>{arrivalCode}</Text>
                  </View>
                </View>
                {errors.arrivalAirport ? (
                  <Text style={styles.errorText}>{errors.arrivalAirport}</Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* ── 4. Schedule Section ──────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>

            <View style={styles.scheduleCard}>
              {/* Departs Column */}
              <View style={styles.scheduleColumn}>
                <View style={styles.scheduleHeaderRow}>
                  <Image
                    source={require('@/assets/images/icons/calendar.svg')}
                    style={styles.scheduleHeaderIcon}
                    tintColor={colors.primary}
                    contentFit="contain"
                  />
                  <Text style={styles.scheduleHeaderLabel}>DEPARTS</Text>
                </View>
                <DateTimePickerField
                  mode="date"
                  value={departureDateObj}
                  onChange={setDepartureDateObj}
                />
                <View style={{ marginTop: spacing.sm }}>
                  <DateTimePickerField
                    mode="time"
                    value={departureDateObj}
                    onChange={setDepartureDateObj}
                  />
                </View>
              </View>

              {/* Vertical Divider */}
              <View style={styles.scheduleDivider} />

              {/* Arrives Column */}
              <View style={styles.scheduleColumn}>
                <View style={styles.scheduleHeaderRow}>
                  <Image
                    source={require('@/assets/images/icons/clock.svg')}
                    style={styles.scheduleHeaderIcon}
                    tintColor={colors.primary}
                    contentFit="contain"
                  />
                  <Text style={styles.scheduleHeaderLabel}>ARRIVES</Text>
                </View>
                <DateTimePickerField
                  mode="date"
                  value={arrivalDateObj}
                  onChange={setArrivalDateObj}
                />
                <View style={{ marginTop: spacing.sm }}>
                  <DateTimePickerField
                    mode="time"
                    value={arrivalDateObj}
                    onChange={setArrivalDateObj}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── 5. Boarding Details Section ──────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Boarding Details</Text>

            <View style={styles.fourGridRow}>
              {/* Terminal */}
              <View style={styles.gridCell}>
                <Text style={styles.gridLabel}>Terminal</Text>
                <TextInput
                  style={styles.gridInput}
                  value={terminal}
                  onChangeText={setTerminal}
                  placeholder="-"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Gate */}
              <View style={styles.gridCell}>
                <Text style={styles.gridLabel}>Gate</Text>
                <TextInput
                  style={[styles.gridInput, styles.uppercaseInput]}
                  value={gate}
                  onChangeText={setGate}
                  placeholder="-"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                />
              </View>

              {/* Seat */}
              <View style={styles.gridCell}>
                <Text style={styles.gridLabel}>Seat</Text>
                <TextInput
                  style={[styles.gridInput, styles.uppercaseInput]}
                  value={seat}
                  onChangeText={setSeat}
                  placeholder="-"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                />
              </View>

              {/* Class */}
              <View style={styles.gridCell}>
                <Text style={styles.gridLabel}>Class</Text>
                <Pressable
                  onPress={() => setIsClassPickerOpen(!isClassPickerOpen)}
                  style={styles.classSelectButton}
                >
                  <Text style={styles.classSelectText} numberOfLines={1}>
                    {cabinClass}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Class Dropdown options */}
            {isClassPickerOpen && (
              <View style={styles.classPickerContainer}>
                {CABIN_CLASSES.map((cls) => (
                  <Pressable
                    key={cls}
                    onPress={() => {
                      setCabinClass(cls);
                      setIsClassPickerOpen(false);
                    }}
                    style={[
                      styles.classOptionItem,
                      cabinClass === cls && styles.classOptionItemSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.classOptionText,
                        cabinClass === cls && styles.classOptionTextSelected,
                      ]}
                    >
                      {cls}
                    </Text>
                    {cabinClass === cls && (
                      <Image
                        source={require('@/assets/images/icons/checkmark.svg')}
                        style={styles.classOptionCheck}
                        tintColor={colors.primary}
                        contentFit="contain"
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {/* Confirmation / PNR */}
            <View style={[styles.flexColumn, { marginTop: spacing.md }]}>
              <Text style={styles.inputLabel}>Confirmation / PNR</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.textInput, styles.uppercaseInput]}
                  value={confirmationNumber}
                  onChangeText={setConfirmationNumber}
                  placeholder="e.g. A9B8C7"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </View>

          {/* ── 6. Notes Section ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any baggage details, booking references, or reminders here..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ── 7. Live Flight Preview Card ──────────────────────────────── */}
          <View style={styles.previewSection}>
            <View style={styles.previewCard}>
              {/* Header */}
              <View style={styles.previewHeaderRow}>
                <View>
                  <Text style={styles.previewBadgeText}>PREVIEW</Text>
                  <Text style={styles.previewFlightTitle}>
                    {airline || 'Airline'} {flightNumber || ''}
                  </Text>
                  <Text style={styles.previewFlightDate}>
                    {`${departureDateObj.getFullYear()}-${String(departureDateObj.getMonth()+1).padStart(2,'0')}-${String(departureDateObj.getDate()).padStart(2,'0')}`} · {cabinClass}
                  </Text>
                </View>
                <View style={styles.previewAirlineLogoCircle}>
                  <Image
                    source={require('@/assets/images/icons/flight.svg')}
                    style={styles.previewPlaneIcon}
                    tintColor={colors.primary}
                    contentFit="contain"
                  />
                </View>
              </View>

              {/* Flight Route & Timing Line */}
              <View style={styles.previewRouteRow}>
                <View style={styles.previewAirportCol}>
                  <Text style={styles.previewAirportCode}>{departureCode}</Text>
                  <Text style={styles.previewAirportTime}>
                    {previewDepartureTime}
                  </Text>
                </View>

                <View style={styles.previewRouteLineWrapper}>
                  <Text style={styles.previewDurationText}>Flight</Text>
                  <View style={styles.previewLineBar}>
                    <View style={styles.previewLineDot} />
                    <View style={styles.previewLineDashed} />
                    <Image
                      source={require('@/assets/images/icons/flight.svg')}
                      style={styles.previewSmallPlane}
                      tintColor={colors.primary}
                      contentFit="contain"
                    />
                    <View style={styles.previewLineDashed} />
                    <View style={styles.previewLineDot} />
                  </View>
                  <Text style={styles.previewNonstopText}>Confirmed</Text>
                </View>

                <View style={[styles.previewAirportCol, styles.previewAirportColRight]}>
                  <Text style={styles.previewAirportCode}>{arrivalCode}</Text>
                  <Text style={styles.previewAirportTime}>{previewArrivalTime}</Text>
                </View>
              </View>

              {/* Preview Meta Bar */}
              <View style={styles.previewMetaBar}>
                <View style={styles.previewMetaItem}>
                  <Text style={styles.previewMetaLabel}>Terminal</Text>
                  <Text style={styles.previewMetaValue}>{terminal || '-'}</Text>
                </View>
                <View style={styles.previewMetaDivider} />
                <View style={styles.previewMetaItem}>
                  <Text style={styles.previewMetaLabel}>Gate</Text>
                  <Text style={styles.previewMetaValue}>{gate || '-'}</Text>
                </View>
                <View style={styles.previewMetaDivider} />
                <View style={styles.previewMetaItem}>
                  <Text style={styles.previewMetaLabel}>Seat</Text>
                  <Text style={styles.previewMetaValue}>{seat || '-'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── 8. Action Buttons ────────────────────────────────────────── */}
          <View style={styles.actionsSection}>
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isEditMode ? 'Save Changes' : 'Add Flight to Itinerary'}
            >
              <Image
                source={
                  isEditMode
                    ? require('@/assets/images/icons/checkmark.svg')
                    : require('@/assets/images/icons/plus.svg')
                }
                style={styles.submitButtonIcon}
                tintColor={colors.textOnPrimary}
                contentFit="contain"
              />
              <Text style={styles.submitButtonText}>
                {isSubmitting
                  ? isEditMode
                    ? 'Saving Changes...'
                    : 'Adding Flight...'
                  : isEditMode
                  ? 'Save Changes'
                  : 'Add Flight to Itinerary'}
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
// Stylesheet
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
    paddingRight: spacing.md,
  },
  headerTitle: {
    fontFamily: typography.screenTitle.fontFamily,
    fontSize: 28,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.textMuted,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonIcon: {
    width: 14,
    height: 14,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },

  // --- Section Common ---
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: colors.destructive,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flexColumn: {
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 50,
    ...shadows.card,
  },
  inputWrapperError: {
    borderColor: colors.destructive,
  },
  inputIconBox: {
    marginRight: spacing.sm,
  },
  inputIcon: {
    width: 16,
    height: 16,
  },

  textInput: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  uppercaseInput: {
    textTransform: 'uppercase',
  },

  // --- Route Section ---
  routeContainer: {
    position: 'relative',
    gap: spacing.sm,
  },
  routeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  routeTagLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  routeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  airportIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeIcon: {
    width: 18,
    height: 18,
  },
  routeTextInput: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iataBadge: {
    backgroundColor: colors.backgroundAlt,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.input,
  },
  iataBadgeText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  swapButtonWrapper: {
    alignItems: 'center',
    marginVertical: -16,
    zIndex: 10,
  },
  swapButtonCircle: {
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
  swapIcon: {
    width: 18,
    height: 18,
  },

  // --- Schedule Section ---
  scheduleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    ...shadows.card,
  },
  scheduleColumn: {
    flex: 1,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  scheduleHeaderIcon: {
    width: 14,
    height: 14,
  },
  scheduleHeaderLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.primary,
  },
  scheduleInputWrapper: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    height: 44,
    justifyContent: 'center',
  },
  scheduleInput: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  scheduleDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },

  // --- Boarding Details ---
  fourGridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gridCell: {
    flex: 1,
  },
  gridLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  gridInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    textAlign: 'center',
    fontFamily: typography.cardTitle.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingVertical: 0,
    ...shadows.card,
  },
  classSelectButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    ...shadows.card,
  },
  classSelectText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  classPickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    overflow: 'hidden',
    ...shadows.card,
  },
  classOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundAlt,
  },
  classOptionItemSelected: {
    backgroundColor: colors.primarySurface,
  },
  classOptionText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.textPrimary,
  },
  classOptionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  classOptionCheck: {
    width: 16,
    height: 16,
  },

  // --- Notes Section ---
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 80,
    ...shadows.card,
  },

  // --- Live Preview Card ---
  previewSection: {
    marginBottom: spacing.xl,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card + 4,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sheet,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 2,
  },
  previewFlightTitle: {
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewFlightDate: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewAirlineLogoCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaneIcon: {
    width: 20,
    height: 20,
  },
  previewRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.backgroundAlt,
  },
  previewAirportCol: {
    alignItems: 'flex-start',
  },
  previewAirportColRight: {
    alignItems: 'flex-end',
  },
  previewAirportCode: {
    fontFamily: typography.display.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  previewAirportTime: {
    fontFamily: typography.label.fontFamily,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewRouteLineWrapper: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  previewDurationText: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 4,
  },
  previewLineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  previewLineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
  },
  previewLineDashed: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  previewSmallPlane: {
    width: 14,
    height: 14,
    marginHorizontal: 4,
  },
  previewNonstopText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  previewMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.input,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  previewMetaItem: {
    alignItems: 'center',
    flex: 1,
  },
  previewMetaLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: 2,
  },
  previewMetaValue: {
    fontFamily: typography.label.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewMetaDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  // --- Actions ---
  actionsSection: {
    flexDirection: 'column',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.card,
    ...shadows.float,
  },
  submitButtonIcon: {
    width: 18,
    height: 18,
    marginRight: spacing.xs,
  },

  submitButtonText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.card,
  },
  cancelButtonText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});
