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

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { Image } from 'expo-image';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { addItem, fetchItineraryItemById, getItem, updateItem } from '@/services/itineraryStore';
import { fetchUserTripRole } from '@/services/collaboration';
import { getActiveTripId, getCachedTrips, listTrips } from '@/services/trip';
import { Trip } from '@/services/mockData';
import { ConcreteItineraryItem, TransportationMetadata, TransportationType } from '@/types/itinerary';
import { DateTimePickerField, LocationPickerField } from '@/components/ui';
import { isMultiDayItem, parseDate } from '@/utils/itineraryDateUtils';

// ---------------------------------------------------------------------------
// 1. Types and Option Definitions
// ---------------------------------------------------------------------------

interface TransportModeOption {
  id: TransportationType;
  label: string;
  subLabel: string;
  icon: any;
}

const TRANSPORT_MODES: TransportModeOption[] = [
  {
    id: 'train',
    label: 'Train',
    subLabel: 'Train selected',
    icon: require('@/assets/images/icons/train.svg'),
  },
  {
    id: 'bus',
    label: 'Bus',
    subLabel: 'Bus selected',
    icon: require('@/assets/images/icons/bus.svg'),
  },
  {
    id: 'rental_car',
    label: 'Car',
    subLabel: 'Car selected',
    icon: require('@/assets/images/icons/car.svg'),
  },
  {
    id: 'taxi',
    label: 'Taxi',
    subLabel: 'Taxi selected',
    icon: require('@/assets/images/icons/taxi.svg'),
  },
  {
    id: 'other',
    label: 'Other',
    subLabel: 'Other transport selected',
    icon: require('@/assets/images/icons/compass.svg'),
  },
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

function formatTime12h(time24: string): string {
  if (!time24) return '';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// ---------------------------------------------------------------------------
// 3. Screen Component
// ---------------------------------------------------------------------------

export default function AddTransportationScreen() {
  const { tripId, itemId } = useLocalSearchParams<{ tripId?: string; itemId?: string }>();
  const insets = useSafeAreaInsets();

  const [existingItem, setExistingItem] = useState<ConcreteItineraryItem | undefined>(() => {
    return itemId ? getItem(itemId) : undefined;
  });

  const [userTrips, setUserTrips] = useState<Trip[]>(() => getCachedTrips() || []);
  const [selectedTripId, setSelectedTripId] = useState<string>(() => {
    if (existingItem?.tripId) return existingItem.tripId;
    if (tripId) return tripId;
    const globalActive = getActiveTripId();
    if (globalActive) return globalActive;
    const cached = getCachedTrips();
    return cached && cached.length > 0 ? cached[0].id : '';
  });

  // Asynchronously load item for edit mode if not already in cache
  useEffect(() => {
    let isMounted = true;
    if (itemId) {
      const cached = getItem(itemId);
      if (cached) {
        setExistingItem(cached);
      } else {
        fetchItineraryItemById(itemId)
          .then((fetched) => {
            if (isMounted && fetched && fetched.type === 'transportation') {
              setExistingItem(fetched);
            }
          })
          .catch((err) => {
            console.warn('[AddTransportation] Error loading item for editing:', err);
          });
      }
    }
    return () => {
      isMounted = false;
    };
  }, [itemId]);

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
        console.warn('[AddTransportation] Error loading trips:', err);
      }
    }
    loadTrips();
    return () => {
      isMounted = false;
    };
  }, [tripId, selectedTripId]);

  const isEditMode = Boolean(existingItem && existingItem.type === 'transportation');
  const transMeta = isEditMode ? (existingItem?.metadata as TransportationMetadata) : undefined;

  // -------------------------------------------------------------------------
  // Form State
  // -------------------------------------------------------------------------
  const [selectedType, setSelectedType] = useState<TransportationType>(
    () => transMeta?.transportationType || 'train'
  );
  const [fromLocation, setFromLocation] = useState(
    () => transMeta?.from || ''
  );
  const [toLocation, setToLocation] = useState(
    () => transMeta?.to || ''
  );
  const [fromLat, setFromLat] = useState<number | undefined>(
    () => (typeof existingItem?.latitude === 'number' ? existingItem.latitude : undefined)
  );
  const [fromLng, setFromLng] = useState<number | undefined>(
    () => (typeof existingItem?.longitude === 'number' ? existingItem.longitude : undefined)
  );
  const [toLat, setToLat] = useState<number | undefined>(
    () => (typeof existingItem?.endLatitude === 'number' ? existingItem.endLatitude : undefined)
  );
  const [toLng, setToLng] = useState<number | undefined>(
    () => (typeof existingItem?.endLongitude === 'number' ? existingItem.endLongitude : undefined)
  );
  const [providerRoute, setProviderRoute] = useState(
    () => transMeta?.provider || ''
  );

  const [dateObj, setDateObj] = useState<Date>(
    () => existingItem?.startDateTime ? parseDate(existingItem.startDateTime) || new Date() : new Date()
  );
  const [departureTimeObj, setDepartureTimeObj] = useState<Date>(
    () => existingItem?.startDateTime ? parseDate(existingItem.startDateTime) || new Date() : new Date()
  );
  const [arrivalTimeObj, setArrivalTimeObj] = useState<Date>(
    () => existingItem?.endDateTime ? parseDate(existingItem.endDateTime) || new Date() : new Date(Date.now() + 2 * 3600 * 1000)
  );
  const [isOvernight, setIsOvernight] = useState(() => {
    if (existingItem?.startDateTime && existingItem?.endDateTime) {
      return isMultiDayItem(existingItem.startDateTime, existingItem.endDateTime);
    }
    return false;
  });

  const [bookingNumber, setBookingNumber] = useState(
    () => transMeta?.bookingNumber || existingItem?.confirmationNumber || ''
  );
  const [seat, setSeat] = useState(
    () => transMeta?.seat || ''
  );
  const [notes, setNotes] = useState(
    () => existingItem?.notes || ''
  );

  // Synchronize form state when existing item loads
  useEffect(() => {
    if (existingItem && existingItem.type === 'transportation') {
      const meta = existingItem.metadata as TransportationMetadata;
      if (meta?.transportationType) setSelectedType(meta.transportationType);
      if (meta?.from) setFromLocation(meta.from);
      if (meta?.to) setToLocation(meta.to);
      if (typeof existingItem.latitude === 'number') setFromLat(existingItem.latitude);
      if (typeof existingItem.longitude === 'number') setFromLng(existingItem.longitude);
      if (typeof existingItem.endLatitude === 'number') setToLat(existingItem.endLatitude);
      if (typeof existingItem.endLongitude === 'number') setToLng(existingItem.endLongitude);
      if (meta?.provider) setProviderRoute(meta.provider);
      if (existingItem.startDateTime) {
        const d = parseDate(existingItem.startDateTime);
        if (d) {
          setDateObj(d);
          setDepartureTimeObj(d);
        }
      }
      if (existingItem.endDateTime) {
        const d = parseDate(existingItem.endDateTime);
        if (d) setArrivalTimeObj(d);
      }
      if (existingItem.startDateTime && existingItem.endDateTime) {
        setIsOvernight(isMultiDayItem(existingItem.startDateTime, existingItem.endDateTime));
      }
      if (meta?.bookingNumber || existingItem.confirmationNumber) {
        setBookingNumber(meta?.bookingNumber || existingItem.confirmationNumber || '');
      }
      if (meta?.seat) setSeat(meta.seat);
      if (existingItem.notes) setNotes(existingItem.notes);
      if (existingItem.tripId) setSelectedTripId(existingItem.tripId);
    }
  }, [existingItem]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Computed Properties
  // -------------------------------------------------------------------------
  const activeMode = useMemo(
    () => TRANSPORT_MODES.find((m) => m.id === selectedType) || TRANSPORT_MODES[0],
    [selectedType]
  );

  const toTimeStr = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const durationText = useMemo(
    () => calculateDuration(toTimeStr(departureTimeObj), toTimeStr(arrivalTimeObj), isOvernight),
    [departureTimeObj, arrivalTimeObj, isOvernight]
  );

  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (selectedTripId) {
      fetchUserTripRole(selectedTripId).then((r) => {
        if (isMounted) setUserRole(r);
      });
    } else {
      setUserRole(null);
    }
    return () => {
      isMounted = false;
    };
  }, [selectedTripId]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (selectedTripId) {
      router.push(`/(tabs)/trips/${selectedTripId}/itinerary` as any);
    } else {
      router.push('/(tabs)/trips');
    }
  };

  const handleSwapLocations = () => {
    const tempLoc = fromLocation;
    const tempLat = fromLat;
    const tempLng = fromLng;

    setFromLocation(toLocation);
    setFromLat(toLat);
    setFromLng(toLng);

    setToLocation(tempLoc);
    setToLat(tempLat);
    setToLng(tempLng);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fromLocation.trim()) {
      newErrors.fromLocation = 'Departure location is required.';
    }
    if (!toLocation.trim()) {
      newErrors.toLocation = 'Arrival destination is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (userRole === 'viewer') {
      Alert.alert('Permission Denied', 'Viewers have read-only access and cannot create or modify transportation bookings.');
      return;
    }

    if (!selectedTripId) {
      Alert.alert('No Trip Selected', 'Please select or create a trip first.');
      setErrors((prev) => ({ ...prev, submit: 'Please select or create a trip first.' }));
      return;
    }

    if (!validate()) return;
    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: '' }));

    try {
      // 1. Compute Start and End ISO strings
      const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
      const depTimeStr = toTimeStr(departureTimeObj);
      const arrTimeStr = toTimeStr(arrivalTimeObj);
      const startIso = `${dateStr}T${depTimeStr}:00.000Z`;

      let endIso: string | undefined;
      if (arrivalTimeObj) {
        if (isOvernight) {
          const nextDay = new Date(dateObj);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDateStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth()+1).padStart(2,'0')}-${String(nextDay.getDate()).padStart(2,'0')}`;
          endIso = `${nextDateStr}T${arrTimeStr}:00.000Z`;
        } else {
          endIso = `${dateStr}T${arrTimeStr}:00.000Z`;
        }
      }

      // 2. Build Item Title
      const modeLabel = activeMode.label;
      const title = providerRoute.trim()
        ? `${modeLabel}: ${providerRoute.trim()}`
        : `${modeLabel} (${fromLocation.trim()} → ${toLocation.trim()})`;

      // 3. Add or Update in Supabase Store
      if (isEditMode && itemId) {
        await updateItem(itemId, {
          title,
          startDateTime: startIso,
          endDateTime: endIso,
          location: `${fromLocation.trim()} → ${toLocation.trim()}`,
          notes: notes.trim() || undefined,
          confirmationNumber: bookingNumber.trim() || undefined,
          latitude: typeof fromLat === 'number' ? fromLat : null,
          longitude: typeof fromLng === 'number' ? fromLng : null,
          endLatitude: typeof toLat === 'number' ? toLat : null,
          endLongitude: typeof toLng === 'number' ? toLng : null,
          metadata: {
            ...transMeta,
            transportationType: selectedType,
            from: fromLocation.trim(),
            to: toLocation.trim(),
            bookingNumber: bookingNumber.trim() || undefined,
            seat: seat.trim() || undefined,
            provider: providerRoute.trim() || undefined,
            pickupTime: depTimeStr || undefined,
            dropoffTime: arrTimeStr || undefined,
          },
        });
      } else {
        await addItem({
          tripId: selectedTripId,
          type: 'transportation',
          title,
          startDateTime: startIso,
          endDateTime: endIso,
          location: `${fromLocation.trim()} → ${toLocation.trim()}`,
          notes: notes.trim() || undefined,
          confirmationNumber: bookingNumber.trim() || undefined,
          latitude: typeof fromLat === 'number' ? fromLat : undefined,
          longitude: typeof fromLng === 'number' ? fromLng : undefined,
          endLatitude: typeof toLat === 'number' ? toLat : undefined,
          endLongitude: typeof toLng === 'number' ? toLng : undefined,
          metadata: {
            transportationType: selectedType,
            from: fromLocation.trim(),
            to: toLocation.trim(),
            bookingNumber: bookingNumber.trim() || undefined,
            seat: seat.trim() || undefined,
            provider: providerRoute.trim() || undefined,
            pickupTime: depTimeStr || undefined,
            dropoffTime: arrTimeStr || undefined,
          },
        });
      }

      // 4. Return to previous screen (Details or Timeline)
      if (router.canGoBack()) {
        router.back();
      } else if (selectedTripId) {
        router.push(`/(tabs)/trips/${selectedTripId}/itinerary` as any);
      } else {
        router.push('/(tabs)/trips');
      }
    } catch (e: any) {
      console.warn('Error adding transportation item:', e);
      setIsSubmitting(false);
      setErrors((prev) => ({
        ...prev,
        submit: e.message || 'Failed to save transportation. Please check the details and try again.',
      }));
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
              <Text style={styles.headerTitle}>
                {isEditMode ? 'Edit Ground Transport' : 'Add Ground Transport'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isEditMode
                  ? 'Update route, schedule, or booking details.'
                  : 'Manage trains, buses, car rentals, transfers, or ferries.'}
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

          {errors.submit ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.submit}</Text>
            </View>
          ) : null}

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
                    <View
                      style={[
                        styles.modeIconContainer,
                        isSelected && styles.modeIconContainerSelected,
                      ]}
                    >
                      <Image
                        source={mode.icon}
                        style={[
                          styles.modeIcon,
                          isSelected && styles.modeIconSelected,
                        ]}
                        tintColor={isSelected ? colors.primary : colors.textSecondary}
                        contentFit="contain"
                      />
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
                placeholder="Route name (e.g. Express Line 101)"
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
                  <LocationPickerField
                    value={fromLocation}
                    onChangeText={(t) => {
                      setFromLocation(t);
                      if (errors.fromLocation) {
                        setErrors((prev) => ({ ...prev, fromLocation: '' }));
                      }
                    }}
                    placeholder="Pin departure on map"
                    coordinates={typeof fromLat === 'number' && typeof fromLng === 'number' ? { latitude: fromLat, longitude: fromLng } : null}
                    onSelectLocation={({ latitude: lat, longitude: lng }) => {
                      setFromLat(lat);
                      setFromLng(lng);
                    }}
                    onClearCoordinates={() => {
                      setFromLat(undefined);
                      setFromLng(undefined);
                    }}
                    testID="trans-from-location-picker"
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
                  <Image
                    source={require('@/assets/images/icons/swap-vert.svg')}
                    style={styles.swapIcon}
                    tintColor={colors.primary}
                    contentFit="contain"
                  />
                </Pressable>
              </View>

              {/* TO Location */}
              <View style={styles.routeRow}>
                <View style={styles.toPin}>
                  <Image
                    source={require('@/assets/images/icons/location-pin.svg')}
                    style={styles.toPinIcon}
                    tintColor={colors.primary}
                    contentFit="contain"
                  />
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
                  <LocationPickerField
                    value={toLocation}
                    onChangeText={(t) => {
                      setToLocation(t);
                      if (errors.toLocation) {
                        setErrors((prev) => ({ ...prev, toLocation: '' }));
                      }
                    }}
                    placeholder="Pin arrival on map"
                    coordinates={typeof toLat === 'number' && typeof toLng === 'number' ? { latitude: toLat, longitude: toLng } : null}
                    onSelectLocation={({ latitude: lat, longitude: lng }) => {
                      setToLat(lat);
                      setToLng(lng);
                    }}
                    onClearCoordinates={() => {
                      setToLat(undefined);
                      setToLng(undefined);
                    }}
                    testID="trans-to-location-picker"
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
                <DateTimePickerField
                  mode="date"
                  value={dateObj}
                  onChange={setDateObj}
                />
              </View>

              {/* Time Inputs (Departure & Arrival) */}
              <View style={styles.timeGrid}>
                <View style={styles.timeCol}>
                  <Text style={styles.fieldLabel}>DEPARTURE</Text>
                  <DateTimePickerField
                    mode="time"
                    value={departureTimeObj}
                    onChange={setDepartureTimeObj}
                  />
                </View>

                <View style={styles.timeCol}>
                  <Text style={styles.fieldLabel}>ARRIVAL</Text>
                  <DateTimePickerField
                    mode="time"
                    value={arrivalTimeObj}
                    onChange={setArrivalTimeObj}
                  />
                </View>
              </View>

              {/* Live Duration Summary */}
              {durationText ? (
                <View style={styles.durationRow}>
                  <View style={styles.directBadge}>
                    <Image
                      source={require('@/assets/images/icons/checkmark.svg')}
                      style={styles.directCheckIcon}
                      tintColor={colors.primary}
                      contentFit="contain"
                    />
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
                    placeholder="e.g. TRN-784920"
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
                placeholder="Add any useful travel notes, platform numbers, or baggage reminders..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={styles.notesTextArea}
              />
            </View>
          </View>

          {/* ── Section 6: Review / Preview ──────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>REVIEW</Text>
              <Text style={styles.previewLiveLabel}>Live Preview</Text>
            </View>

            <View style={styles.previewCard}>
              {/* Left accent stripe */}
              <View style={styles.previewStripe} />

              <View style={styles.previewBody}>
                {/* Header: Mode badge + title */}
                <View style={styles.previewHeaderRow}>
                  <View style={styles.previewModeBadge}>
                    <Image
                      source={activeMode.icon}
                      style={styles.previewModeIcon}
                      tintColor={colors.primary}
                      contentFit="contain"
                    />
                    <Text style={styles.previewModeLabel}>{activeMode.label}</Text>
                  </View>
                  <View style={styles.previewConfirmedBadge}>
                    <Text style={styles.previewConfirmedText}>Confirmed</Text>
                  </View>
                </View>

                {/* Route: From → To */}
                <View style={styles.previewRouteRow}>
                  <View style={styles.previewRouteCol}>
                    <Text style={styles.previewRouteTag}>FROM</Text>
                    <Text style={styles.previewRouteMain} numberOfLines={1}>
                      {fromLocation.trim() || 'Departure'}
                    </Text>
                  </View>

                  <View style={styles.previewRouteArrowCol}>
                    <View style={styles.previewArrowLine} />
                    <Text style={styles.previewArrowIcon}>›</Text>
                    {durationText ? (
                      <Text style={styles.previewDurationBadge}>{durationText}</Text>
                    ) : null}
                  </View>

                  <View style={[styles.previewRouteCol, styles.previewRouteColRight]}>
                    <Text style={styles.previewRouteTag}>TO</Text>
                    <Text style={styles.previewRouteMain} numberOfLines={1}>
                      {toLocation.trim() || 'Destination'}
                    </Text>
                  </View>
                </View>

                {/* Date & Times bar */}
                <View style={styles.previewTimesBar}>
                  <View style={styles.previewTimeItem}>
                    <Text style={styles.previewTimeTag}>DATE</Text>
                    <Text style={styles.previewTimeValue}>{`${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}` || '—'}</Text>
                  </View>
                  <View style={styles.previewTimeDivider} />
                  <View style={styles.previewTimeItem}>
                    <Text style={styles.previewTimeTag}>DEPARTS</Text>
                    <Text style={styles.previewTimeValue}>
                      {formatTime12h(toTimeStr(departureTimeObj))}
                    </Text>
                  </View>
                  <View style={styles.previewTimeDivider} />
                  <View style={styles.previewTimeItem}>
                    <Text style={styles.previewTimeTag}>ARRIVES</Text>
                    <Text style={styles.previewTimeValue}>
                      {formatTime12h(toTimeStr(arrivalTimeObj))}
                      {isOvernight ? (
                        <Text style={styles.previewOvernightTag}> +1</Text>
                      ) : null}
                    </Text>
                  </View>
                </View>

                {/* Footer: Route name, Booking ref, Seat */}
                {(providerRoute.trim() || bookingNumber.trim() || seat.trim()) ? (
                  <View style={styles.previewFooterRow}>
                    {providerRoute.trim() ? (
                      <Text style={styles.previewProviderText} numberOfLines={1}>
                        {providerRoute.trim()}
                      </Text>
                    ) : null}
                    <View style={styles.previewFooterRight}>
                      {bookingNumber.trim() ? (
                        <Text style={styles.previewRefText}>#{bookingNumber.trim()}</Text>
                      ) : null}
                      {seat.trim() ? (
                        <Text style={styles.previewSeatText}>{seat.trim()}</Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>
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
              accessibilityLabel={isEditMode ? 'Save Changes' : 'Add Transportation to Itinerary'}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting
                  ? isEditMode
                    ? 'Saving Changes...'
                    : 'Adding Transportation...'
                  : isEditMode
                  ? 'Save Changes'
                  : 'Add Transportation to Itinerary'}
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },

  // --- Header ---
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: typography.body.fontFamily,
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
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // --- Sections ---
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  sectionActiveLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: typography.caption.fontFamily,
  },
  sectionOptionalLabel: {
    fontSize: 10.5,
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
    paddingVertical: 8,
    paddingHorizontal: 2,
    backgroundColor: colors.surface,
    borderRadius: 10,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: colors.backgroundAlt,
  },
  modeIconContainerSelected: {
    backgroundColor: colors.primarySurface,
  },
  modeIcon: {
    width: 16,
    height: 16,
  },
  modeIconSelected: {
    tintColor: colors.primary,
  },
  modeLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  modeLabelSelected: {
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontWeight: '600',
  },

  // --- Card ---
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    ...shadows.card,
    position: 'relative',
  },

  // --- Route ---
  dashedConnector: {
    position: 'absolute',
    left: 28,
    top: 36,
    bottom: 36,
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
    marginTop: 18,
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
    marginTop: 18,
    ...shadows.card,
  },
  toPinIcon: {
    width: 14,
    height: 14,
  },
  routeInputContainer: {
    flex: 1,
  },
  routeInputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  routeFromTag: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.primary,
  },
  routeToTag: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.textPrimary,
  },
  routeHelpText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  swapRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: -6,
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
  swapIcon: {
    width: 15,
    height: 15,
  },

  // --- Inputs ---
  inputField: {
    height: 40,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.sm,
    fontFamily: typography.body.fontFamily,
    fontSize: 13.5,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  inputFieldError: {
    borderColor: colors.error,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.error,
    marginTop: 2,
  },
  formGroup: {
    gap: 3,
  },
  fieldLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.textSecondary,
    marginBottom: 2,
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
    marginTop: 3,
  },
  timeCol: {
    flex: 1,
    gap: 3,
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
    width: 12,
    height: 12,
  },
  directText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  durationValue: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  durationHighlight: {
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // --- Notes ---
  notesTextArea: {
    minHeight: 70,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: spacing.sm,
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },

  // --- Preview / Review Card ---
  previewLiveLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.primary,
    fontFamily: typography.caption.fontFamily,
    fontStyle: 'italic',
  },
  previewCard: {
    position: 'relative',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  previewStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: colors.primary,
  },
  previewBody: {
    padding: 12,
    paddingLeft: 16,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
  },
  previewModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySurface,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: radius.full,
  },
  previewModeIcon: {
    width: 14,
    height: 14,
  },
  previewModeLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.primary,
  },
  previewConfirmedBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewConfirmedText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10.5,
    color: colors.textMuted,
    fontWeight: '500',
  },
  previewRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.input,
    padding: 10,
    marginBottom: spacing.xs,
  },
  previewRouteCol: {
    flex: 1,
  },
  previewRouteColRight: {
    alignItems: 'flex-end',
  },
  previewRouteTag: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.textMuted,
    marginBottom: 2,
  },
  previewRouteMain: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewRouteArrowCol: {
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  previewArrowLine: {
    width: 24,
    height: 1,
    backgroundColor: colors.border,
  },
  previewArrowIcon: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
  },
  previewDurationBadge: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: typography.caption.fontFamily,
  },
  previewTimesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.input,
    padding: 6,
    marginBottom: spacing.xs,
  },
  previewTimeItem: {
    flex: 1,
    alignItems: 'center',
  },
  previewTimeTag: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: 2,
  },
  previewTimeValue: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewTimeDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  previewOvernightTag: {
    fontSize: 10.5,
    color: colors.primary,
    fontWeight: '600',
  },
  previewFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundAlt,
  },
  previewProviderText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11.5,
    color: colors.textSecondary,
    flex: 1,
  },
  previewFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewRefText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  previewSeatText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10.5,
    color: colors.textSecondary,
  },

  // --- Actions ---
  actionsSection: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  submitButton: {
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.float,
  },
  submitButtonText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  cancelButton: {
    height: 40,
    backgroundColor: colors.transparent,
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
  errorBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(176, 74, 74, 0.10)',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(176, 74, 74, 0.30)',
  },
  errorBannerText: {
    ...typography.body,
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
  },
});
