/**
 * Route: /add/hotel — Add Hotel Screen (Phase 5)
 *
 * Visual Source of Truth: Google Stitch hotel.png & hotel.html
 *
 * Features:
 *   - Header with title, subtitle, and close action
 *   - Section 1: Hotel Basics (Hotel Name *, Address)
 *   - Section 2: Dates (Check-in Date * & Time *, Check-out Date * & Time *)
 *   - Section 3: Stay Details (Confirmation Number, Room / Room Type, Guest Name)
 *   - Section 4: Notes (Special requests, check-in instructions, reminders)
 *   - Section 5: Live Interactive Preview Card (Updates dynamically as user types, with nights count & stay badge)
 *   - Validation with field-level error messages for required fields
 *   - Seamless submission into centralized in-memory itinerary state and automatic return to timeline
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { addItem, getItem, updateItem } from '@/services/itineraryStore';
import { ConcreteItineraryItem, HotelMetadata } from '@/types/itinerary';
import { formatItineraryDate } from '@/utils/itineraryDateUtils';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';

// ---------------------------------------------------------------------------
// Helpers for Date & Time Formatting and Nights Calculation
// ---------------------------------------------------------------------------

function calculateNights(inDateStr: string, outDateStr: string): number {
  try {
    const d1 = new Date(inDateStr);
    const d2 = new Date(outDateStr);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
    const diffMs = d2.getTime() - d1.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  } catch {
    return 1;
  }
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmt12h(d: Date): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export default function AddHotelScreen() {
  const { tripId, itemId } = useLocalSearchParams<{ tripId?: string; itemId?: string }>();
  const effectiveTripId = tripId || 'japan-adventure';
  const insets = useSafeAreaInsets();

  const existingItem = useMemo(() => {
    return itemId ? getItem(itemId) : undefined;
  }, [itemId]);

  const isEditMode = Boolean(existingItem && existingItem.type === 'hotel');
  const hotelMeta = isEditMode ? (existingItem?.metadata as HotelMetadata) : undefined;

  // -------------------------------------------------------------------------
  // Form State
  // -------------------------------------------------------------------------
  const [hotelName, setHotelName] = useState(
    () => hotelMeta?.hotelName || existingItem?.title || (isEditMode ? '' : 'The Ritz-Carlton, Tokyo')
  );
  const [address, setAddress] = useState(
    () => hotelMeta?.address || existingItem?.location || (isEditMode ? '' : 'Tokyo Midtown, 9-7-1 Akasaka, Minato-ku, Tokyo')
  );

  const [checkInObj, setCheckInObj] = useState<Date>(
    () => (existingItem?.startDateTime ? new Date(existingItem.startDateTime) : new Date('2028-03-11T15:00:00.000Z'))
  );
  const [checkOutObj, setCheckOutObj] = useState<Date>(
    () => (existingItem?.endDateTime ? new Date(existingItem.endDateTime) : new Date('2028-03-14T11:00:00.000Z'))
  );

  const [confirmationNumber, setConfirmationNumber] = useState(
    () => existingItem?.confirmationNumber || (isEditMode ? '' : 'RC-TYO-8841')
  );
  const [room, setRoom] = useState(
    () => hotelMeta?.room || hotelMeta?.roomType || (isEditMode ? '' : 'Club Deluxe King Room')
  );
  const [guestName, setGuestName] = useState(
    () => hotelMeta?.guestName || (isEditMode ? '' : 'Alex & Sarah Johnson')
  );
  const [notes, setNotes] = useState(
    () => existingItem?.notes || (isEditMode ? '' : 'High floor requested with Mount Fuji view. Early check-in noted.')
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!hotelName.trim()) newErrors.hotelName = 'Hotel name is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      // 1. Construct ISO Date-Time strings
      const checkInDateStr = toDateStr(checkInObj);
      const checkOutDateStr = toDateStr(checkOutObj);
      const startIso = `${checkInDateStr}T${toTimeStr(checkInObj)}:00.000Z`;
      const endIso = `${checkOutDateStr}T${toTimeStr(checkOutObj)}:00.000Z`;
      const nightsCount = calculateNights(checkInDateStr, checkOutDateStr);

      // 2. Add or Update in In-Memory Store
      if (isEditMode && itemId) {
        updateItem(itemId, {
          title: hotelName.trim(),
          startDateTime: startIso,
          endDateTime: endIso,
          location: address.trim() || hotelName.trim(),
          confirmationNumber: confirmationNumber.trim().toUpperCase() || undefined,
          notes: notes.trim() || undefined,
          metadata: {
            ...hotelMeta,
            hotelName: hotelName.trim(),
            address: address.trim(),
            checkIn: fmt12h(checkInObj),
            checkOut: fmt12h(checkOutObj),
            room: room.trim() || undefined,
            guestName: guestName.trim() || undefined,
            roomType: room.trim() || undefined,
            nightsCount,
          },
        });
      } else {
        const newHotel: ConcreteItineraryItem = {
          id: `itin-hotel-${Date.now()}`,
          tripId: effectiveTripId,
          type: 'hotel',
          title: hotelName.trim(),
          startDateTime: startIso,
          endDateTime: endIso,
          location: address.trim() || hotelName.trim(),
          confirmationNumber: confirmationNumber.trim().toUpperCase() || undefined,
          notes: notes.trim() || undefined,
          metadata: {
            hotelName: hotelName.trim(),
            address: address.trim(),
            checkIn: fmt12h(checkInObj),
            checkOut: fmt12h(checkOutObj),
            room: room.trim() || undefined,
            guestName: guestName.trim() || undefined,
            roomType: room.trim() || undefined,
            nightsCount,
          },
        };
        addItem(newHotel);
      }

      // 3. Return to previous screen
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push(`/(tabs)/trips/${effectiveTripId}/itinerary` as any);
      }
    } catch (e) {
      console.warn('Error saving hotel:', e);
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Live Formatted Preview Computations
  // -------------------------------------------------------------------------

  const nightsCount = useMemo(() => {
    return calculateNights(toDateStr(checkInObj), toDateStr(checkOutObj));
  }, [checkInObj, checkOutObj]);

  const previewCheckInDate = useMemo(() => {
    return formatItineraryDate(toDateStr(checkInObj), 'medium') || toDateStr(checkInObj);
  }, [checkInObj]);

  const previewCheckInTime = useMemo(() => {
    return fmt12h(checkInObj);
  }, [checkInObj]);

  const previewCheckOutDate = useMemo(() => {
    return formatItineraryDate(toDateStr(checkOutObj), 'medium') || toDateStr(checkOutObj);
  }, [checkOutObj]);

  const previewCheckOutTime = useMemo(() => {
    return fmt12h(checkOutObj);
  }, [checkOutObj]);

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
              <Text style={styles.headerTitle}>Add hotel</Text>
              <Text style={styles.headerSubtitle}>
                Enter reservation details manually or review your stay.
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

          {/* ── 2. Hotel Basics Section ──────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hotel Basics</Text>

            <View style={styles.cardContainer}>
              {/* Hotel Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Hotel Name *</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    errors.hotelName ? styles.inputWrapperError : null,
                  ]}
                >
                  <View style={styles.inputIconBox}>
                    <Image
                      source={require('@/assets/images/icons/hotel.svg')}
                      style={styles.inputIcon}
                      tintColor={colors.textSecondary}
                      contentFit="contain"
                    />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={hotelName}
                    onChangeText={(t) => {
                      setHotelName(t);
                      if (errors.hotelName) setErrors((prev) => ({ ...prev, hotelName: '' }));
                    }}
                    placeholder="e.g. Tokyo Central Hotel"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                {errors.hotelName ? (
                  <Text style={styles.errorText}>{errors.hotelName}</Text>
                ) : null}
              </View>

              {/* Address */}
              <View style={[styles.fieldGroup, styles.fieldDivider]}>
                <Text style={styles.inputLabel}>Address</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIconBox}>
                    <Image
                      source={require('@/assets/images/icons/location-pin.svg')}
                      style={styles.inputIcon}
                      tintColor={colors.textSecondary}
                      contentFit="contain"
                    />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="e.g. 1-1-1 Marunouchi, Chiyoda-ku, Tokyo"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── 3. Dates Section ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dates</Text>

            <View style={styles.cardContainer}>
              <View style={styles.twoColumnRow}>
                {/* Check-in */}
                <View style={styles.flexColumn}>
                  <Text style={styles.inputLabel}>Check-in *</Text>
                  <DateTimePickerField
                    mode="date"
                    value={checkInObj}
                    onChange={setCheckInObj}
                  />
                  <View style={{ marginTop: spacing.sm }}>
                    <DateTimePickerField
                      mode="time"
                      value={checkInObj}
                      onChange={setCheckInObj}
                    />
                  </View>
                </View>

                {/* Check-out */}
                <View style={styles.flexColumn}>
                  <Text style={styles.inputLabel}>Check-out *</Text>
                  <DateTimePickerField
                    mode="date"
                    value={checkOutObj}
                    onChange={setCheckOutObj}
                  />
                  <View style={{ marginTop: spacing.sm }}>
                    <DateTimePickerField
                      mode="time"
                      value={checkOutObj}
                      onChange={setCheckOutObj}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ── 4. Stay Details Section ──────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stay Details</Text>

            <View style={styles.cardContainer}>
              <View style={styles.twoColumnRow}>
                {/* Confirmation Number */}
                <View style={styles.flexColumn}>
                  <Text style={styles.inputLabel}>Confirmation Number</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.textInput, styles.uppercaseInput]}
                      value={confirmationNumber}
                      onChangeText={setConfirmationNumber}
                      placeholder="e.g. #ABC12345"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                {/* Room */}
                <View style={styles.flexColumn}>
                  <Text style={styles.inputLabel}>Room</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      value={room}
                      onChangeText={setRoom}
                      placeholder="e.g. Deluxe King"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* Guest Name */}
              <View style={[styles.fieldGroup, styles.fieldDivider]}>
                <Text style={styles.inputLabel}>Guest Name</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIconBox}>
                    <Image
                      source={require('@/assets/images/onboarding/person.svg')}
                      style={styles.inputIcon}
                      tintColor={colors.textSecondary}
                      contentFit="contain"
                    />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={guestName}
                    onChangeText={setGuestName}
                    placeholder="e.g. Alex Johnson"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── 5. Notes Section ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.cardContainer}>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any special requests, check-in instructions, or reminders here..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ── 6. Preview Section ───────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preview</Text>

            <View style={styles.previewCard}>
              {/* Left Primary Accent Stripe */}
              <View style={styles.previewStripe} />

              <View style={styles.previewContent}>
                {/* Header: Hotel Name + Stay Badge */}
                <View style={styles.previewHeaderRow}>
                  <View style={styles.previewTitleGroup}>
                    <Text style={styles.previewHotelTitle} numberOfLines={1}>
                      {hotelName.trim() || 'Tokyo Central Hotel'}
                    </Text>
                    <View style={styles.previewLocationRow}>
                      <Text style={styles.previewLocationIcon}>📍</Text>
                      <Text style={styles.previewLocationText} numberOfLines={1}>
                        {address.trim() || 'Chiyoda, Tokyo'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stayBadge}>
                    <Image
                      source={require('@/assets/images/icons/hotel.svg')}
                      style={styles.stayBadgeIcon}
                      tintColor={colors.primary}
                      contentFit="contain"
                    />
                    <Text style={styles.stayBadgeText}>Stay</Text>
                  </View>
                </View>

                {/* Dates & Nights Grid */}
                <View style={styles.previewDatesRow}>
                  {/* Check-in */}
                  <View style={styles.previewDateCol}>
                    <Text style={styles.previewDateTag}>CHECK-IN</Text>
                    <Text style={styles.previewDateMain}>{previewCheckInDate}</Text>
                    <Text style={styles.previewTimeSub}>{previewCheckInTime}</Text>
                  </View>

                  {/* Nights Connector */}
                  <View style={styles.nightsConnector}>
                    <View style={styles.connectorLine} />
                    <View style={styles.nightsBadge}>
                      <Text style={styles.nightsBadgeText}>
                        {nightsCount} {nightsCount === 1 ? 'Night' : 'Nights'}
                      </Text>
                    </View>
                    <View style={styles.connectorLine} />
                  </View>

                  {/* Check-out */}
                  <View style={styles.previewDateCol}>
                    <Text style={styles.previewDateTag}>CHECK-OUT</Text>
                    <Text style={styles.previewDateMain}>{previewCheckOutDate}</Text>
                    <Text style={styles.previewTimeSub}>{previewCheckOutTime}</Text>
                  </View>
                </View>

                {/* Room / Confirmation details if present */}
                {(room || confirmationNumber) && (
                  <View style={styles.previewFooterRow}>
                    {room ? (
                      <Text style={styles.previewRoomText} numberOfLines={1}>
                        Room: {room}
                      </Text>
                    ) : null}
                    {confirmationNumber ? (
                      <Text style={styles.previewConfText} numberOfLines={1}>
                        #{confirmationNumber}
                      </Text>
                    ) : null}
                  </View>
                )}
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
              accessibilityLabel="Add Hotel to Itinerary"
            >
              <Text style={styles.primarySubmitButtonText}>
                {isSubmitting ? 'Adding Hotel...' : 'Add Hotel to Itinerary'}
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
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
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

  // --- Section Common ---
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },

  // --- Fields ---
  fieldGroup: {
    flexDirection: 'column',
  },
  fieldDivider: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundAlt,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flexColumn: {
    flex: 1,
  },
  inputLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.transparent,
  },
  inputWrapperError: {
    borderColor: colors.error,
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
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },


  // --- Notes ---
  notesInput: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    minHeight: 80,
    padding: 0,
  },

  // --- Preview Card ---
  previewCard: {
    position: 'relative',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
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
    width: 4,
    backgroundColor: colors.primary,
  },
  previewContent: {
    padding: spacing.lg,
    paddingLeft: spacing.lg + 4,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  previewTitleGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  previewHotelTitle: {
    fontFamily: typography.cardTitle.fontFamily,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  previewLocationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  previewLocationText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  stayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySurface,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  stayBadgeIcon: {
    width: 14,
    height: 14,
  },
  stayBadgeText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  previewDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.input,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  previewDateCol: {
    flex: 1,
  },
  previewDateTag: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.textMuted,
    marginBottom: 2,
  },
  previewDateMain: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewTimeSub: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  nightsConnector: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  connectorLine: {
    width: 24,
    height: 1,
    backgroundColor: colors.border,
  },
  nightsBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginVertical: 2,
  },
  nightsBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  previewFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundAlt,
  },
  previewRoomText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.caption.fontFamily,
  },
  previewConfText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },

  // --- Actions ---
  actionsSection: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  primarySubmitButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.float,
  },
  primarySubmitButtonText: {
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
