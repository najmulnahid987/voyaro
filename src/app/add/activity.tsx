/**
 * Route: /add/activity — Add Activity Screen (Phase 5)
 *
 * Visual Source of Truth: Google Stitch activity.png & activity.html
 *
 * Features:
 *   - Header with title, subtitle, and close action
 *   - Section 1: Activity Details (Activity Name *, Location, Category Pills selector)
 *   - Section 2: Timing (Date *, Start Time *, End Time)
 *   - Section 3: Extra Details (Website optional, Ticket Information optional, Notes)
 *   - Section 4: Live Itinerary Timeline Preview with connected contextual milestone items
 *   - Categories: Culture, Food, Nature, Adventure, Relaxation, Shopping, Entertainment, Other
 *   - Field-level validation for required inputs (Activity Name, Date, Start Time)
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { addItem, getItem, updateItem } from '@/services/itineraryStore';
import { ActivityMetadata, ConcreteItineraryItem } from '@/types/itinerary';
import { DateTimePickerField } from '@/components/ui/DateTimePickerField';
import { parseDate } from '@/utils/itineraryDateUtils';

// ---------------------------------------------------------------------------
// Category Definitions & Icon Mapping
// ---------------------------------------------------------------------------

const CATEGORIES = [
  'Culture',
  'Food',
  'Nature',
  'Adventure',
  'Relaxation',
  'Shopping',
  'Entertainment',
  'Other',
] as const;

type ActivityCategory = (typeof CATEGORIES)[number];

function getCategoryIcon(cat: ActivityCategory) {
  switch (cat) {
    case 'Food':
      return require('@/assets/images/onboarding/restaurant.svg');
    case 'Culture':
      return require('@/assets/images/onboarding/museum.svg');
    case 'Nature':
      return require('@/assets/images/onboarding/forest.svg');
    case 'Adventure':
      return require('@/assets/images/onboarding/hiking.svg');
    case 'Relaxation':
      return require('@/assets/images/onboarding/spa.svg');
    case 'Shopping':
      return require('@/assets/images/onboarding/shopping.svg');
    case 'Entertainment':
      return require('@/assets/images/onboarding/nightlife.svg');
    case 'Other':
    default:
      return require('@/assets/images/icons/landscape.svg');
  }
}

function formatTimeString(date: Date): string {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function toTimeKey(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function AddActivityScreen() {
  const { tripId, itemId } = useLocalSearchParams<{ tripId?: string; itemId?: string }>();
  const effectiveTripId = tripId || 'japan-adventure';
  const insets = useSafeAreaInsets();

  const existingItem = useMemo(() => {
    return itemId ? getItem(itemId) : undefined;
  }, [itemId]);

  const isEditMode = Boolean(existingItem && existingItem.type === 'activity');
  const activityMeta = isEditMode ? (existingItem?.metadata as ActivityMetadata) : undefined;

  // -------------------------------------------------------------------------
  // Form State
  // -------------------------------------------------------------------------
  const [activityName, setActivityName] = useState(
    () => existingItem?.title || (isEditMode ? '' : 'Shibuya Crossing & Hachiko Tour')
  );
  const [location, setLocation] = useState(
    () => existingItem?.location || (isEditMode ? '' : 'Shibuya, Tokyo')
  );
  const [category, setCategory] = useState<ActivityCategory>(
    () => (activityMeta?.category as ActivityCategory) || 'Culture'
  );

  const [date, setDate] = useState<Date>(
    () => (existingItem?.startDateTime ? parseDate(existingItem.startDateTime) || new Date() : new Date('2028-03-12T14:00:00'))
  );
  const [startTime, setStartTime] = useState<Date>(
    () => (existingItem?.startDateTime ? parseDate(existingItem.startDateTime) || new Date() : new Date('2028-03-12T14:00:00'))
  );
  const [endTime, setEndTime] = useState<Date | null>(
    () => (existingItem?.endDateTime ? parseDate(existingItem.endDateTime) : isEditMode ? null : new Date('2028-03-12T16:00:00'))
  );

  const [website, setWebsite] = useState(
    () => activityMeta?.website || (isEditMode ? '' : 'https://tokyowalkingtours.jp')
  );
  const [ticketInfo, setTicketInfo] = useState(
    () => activityMeta?.ticketInformation || (isEditMode ? '' : 'Mobile QR Voucher (2 Adults)')
  );
  const [notes, setNotes] = useState(
    () => existingItem?.notes || (isEditMode ? '' : 'Meet local guide near Hachiko Statue exit. Comfortable walking shoes recommended.')
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

    if (!activityName.trim()) {
      newErrors.activityName = 'Activity name is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      // 1. Construct ISO Date-Time strings
      const dateStr = toDateKey(date);
      const startTimeStr = toTimeKey(startTime);
      const startIso = `${dateStr}T${startTimeStr}:00.000Z`;
      const endIso = endTime ? `${dateStr}T${toTimeKey(endTime)}:00.000Z` : undefined;

      // 2. Add or Update in In-Memory Store
      if (isEditMode && itemId) {
        updateItem(itemId, {
          title: activityName.trim(),
          startDateTime: startIso,
          endDateTime: endIso,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
          metadata: {
            ...activityMeta,
            category: category,
            website: website.trim() || undefined,
            ticketInformation: ticketInfo.trim() || undefined,
            duration: endTime ? `${startTimeStr} - ${toTimeKey(endTime)}` : activityMeta?.duration,
            meetingPoint: location.trim() || undefined,
          },
        });
      } else {
        const newActivity: ConcreteItineraryItem = {
          id: `itin-act-${Date.now()}`,
          tripId: effectiveTripId,
          type: 'activity',
          title: activityName.trim(),
          startDateTime: startIso,
          endDateTime: endIso,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
          confirmationNumber: undefined,
          metadata: {
            category: category,
            website: website.trim() || undefined,
            ticketInformation: ticketInfo.trim() || undefined,
            duration: endTime ? `${startTimeStr} - ${toTimeKey(endTime)}` : undefined,
            meetingPoint: location.trim() || undefined,
          },
        };

        addItem(newActivity);
      }

      // 3. Return to previous screen (Details or Timeline)
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push(`/(tabs)/trips/${effectiveTripId}/itinerary` as any);
      }
    } catch (e) {
      console.warn('Error saving activity:', e);
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Live Formatted Preview Computations
  // -------------------------------------------------------------------------

  const previewTimeRange = useMemo(() => {
    const startFmt = formatTimeString(startTime);
    if (!endTime) return startFmt;
    const endFmt = formatTimeString(endTime);
    return `${startFmt} – ${endFmt}`;
  }, [startTime, endTime]);

  const categoryIconSource = useMemo(() => {
    return getCategoryIcon(category);
  }, [category]);

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
                {isEditMode ? 'Edit activity' : 'Add activity'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isEditMode
                  ? 'Update details, schedule, or notes.'
                  : 'Enter details manually or plan your exploration.'}
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

          {/* ── 2. Activity Details Section ──────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity Details</Text>

            <View style={styles.cardContainer}>
              {/* Activity Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Activity Name *</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    errors.activityName ? styles.inputWrapperError : null,
                  ]}
                >
                  <TextInput
                    style={styles.textInput}
                    value={activityName}
                    onChangeText={(t) => {
                      setActivityName(t);
                      if (errors.activityName) setErrors((prev) => ({ ...prev, activityName: '' }));
                    }}
                    placeholder="e.g., Shibuya Crossing"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                {errors.activityName ? (
                  <Text style={styles.errorText}>{errors.activityName}</Text>
                ) : null}
              </View>

              {/* Location */}
              <View style={[styles.fieldGroup, styles.fieldDivider]}>
                <Text style={styles.inputLabel}>Location</Text>
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
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Where is this?"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Category Pill Selector */}
              <View style={[styles.fieldGroup, styles.fieldDivider]}>
                <Text style={styles.inputLabel}>Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScrollContent}
                  style={styles.categoryScrollView}
                >
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => setCategory(cat)}
                        style={({ pressed }) => [
                          styles.categoryPill,
                          isSelected && styles.categoryPillActive,
                          pressed && styles.categoryPillPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            isSelected && styles.categoryPillTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* ── 3. Timing Section ────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timing</Text>

            <View style={styles.cardContainer}>
              {/* Date */}
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Date *</Text>
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

              {/* Start & End Times */}
              <View style={[styles.twoColumnRow, styles.fieldDivider]}>
                {/* Start Time */}
                <View style={styles.flexColumn}>
                  <Text style={styles.inputLabel}>Start Time *</Text>
                  <DateTimePickerField
                    mode="time"
                    value={startTime}
                    onChange={setStartTime}
                    hasError={Boolean(errors.startTime)}
                  />
                  {errors.startTime ? (
                    <Text style={styles.errorText}>{errors.startTime}</Text>
                  ) : null}
                </View>

                {/* End Time */}
                <View style={styles.flexColumn}>
                  <Text style={styles.inputLabel}>End Time</Text>
                  <DateTimePickerField
                    mode="time"
                    value={endTime ?? startTime}
                    onChange={setEndTime}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── 4. Extra Details Section ─────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extra Details</Text>

            <View style={styles.cardContainer}>
              {/* Website */}
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>
                  Website <Text style={styles.optionalLabel}>(Optional)</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIconBox}>
                    <Image
                      source={require('@/assets/images/icons/link.svg')}
                      style={styles.inputIcon}
                      tintColor={colors.textSecondary}
                      contentFit="contain"
                    />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={website}
                    onChangeText={setWebsite}
                    placeholder="https://"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>

              {/* Ticket Information */}
              <View style={[styles.fieldGroup, styles.fieldDivider]}>
                <Text style={styles.inputLabel}>
                  Ticket Information <Text style={styles.optionalLabel}>(Optional)</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIconBox}>
                    <Image
                      source={require('@/assets/images/icons/ticket.svg')}
                      style={styles.inputIcon}
                      tintColor={colors.textSecondary}
                      contentFit="contain"
                    />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={ticketInfo}
                    onChangeText={setTicketInfo}
                    placeholder="e.g. Mobile QR Voucher (2 Adults)"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Notes */}
              <View style={[styles.fieldGroup, styles.fieldDivider]}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Confirmation numbers, meeting points, reminders..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* ── 5. Itinerary Preview Section ─────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.previewSectionHeader}>ITINERARY PREVIEW</Text>

            <View style={styles.timelinePreviewWrapper}>
              {/* Continuous vertical timeline line */}
              <View style={styles.timelinePreviewLine} />

              {/* Mock Previous Milestone */}
              <View style={styles.timelineMockRow}>
                <View style={styles.timelineMockDot} />
                <View style={styles.timelineMockContent}>
                  <Text style={styles.timelineMockTime}>10:00 AM</Text>
                  <Text style={styles.timelineMockTitle}>Breakfast at Hotel</Text>
                </View>
              </View>

              {/* Active Preview Card Row */}
              <View style={styles.timelineActiveRow}>
                <View style={styles.timelineActiveDot} />

                <View style={styles.previewCard}>
                  <View style={styles.previewCardHeader}>
                    <View style={styles.previewCardInfo}>
                      <Text style={styles.previewTimeText}>
                        {previewTimeRange}
                      </Text>
                      <Text style={styles.previewTitleText} numberOfLines={2}>
                        {activityName.trim() || 'Shibuya Crossing'}
                      </Text>
                      <View style={styles.previewLocationRow}>
                        <Image
                          source={require('@/assets/images/icons/location-pin.svg')}
                          style={styles.previewLocationIcon}
                          tintColor={colors.textSecondary}
                          contentFit="contain"
                        />
                        <Text style={styles.previewLocationText} numberOfLines={1}>
                          {location.trim() || 'Where is this?'}
                        </Text>
                      </View>
                    </View>

                    {/* Category Icon Box */}
                    <View style={styles.previewIconBox}>
                      <Image
                        source={categoryIconSource}
                        style={styles.previewCategoryIcon}
                        tintColor={colors.primary}
                        contentFit="contain"
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Mock Next Milestone */}
              <View style={styles.timelineMockRow}>
                <View style={styles.timelineMockDot} />
                <View style={styles.timelineMockContent}>
                  <Text style={styles.timelineMockTime}>18:00</Text>
                  <Text style={styles.timelineMockTitle}>Local Izakaya</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── 6. Action Buttons ────────────────────────────────────────── */}
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
              accessibilityLabel={isEditMode ? 'Save Changes' : 'Add to itinerary'}
            >
              <Text style={styles.primarySubmitButtonText}>
                {isSubmitting
                  ? isEditMode
                    ? 'Saving Changes...'
                    : 'Adding Activity...'
                  : isEditMode
                  ? 'Save Changes'
                  : 'Add to itinerary'}
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
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  optionalLabel: {
    fontFamily: fontFamily.regular,
    fontWeight: '400',
    color: colors.textMuted,
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
    alignItems: 'center',
    justifyContent: 'center',
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
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },

  // --- Category Pills ---
  categoryScrollView: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  categoryScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
  categoryPill: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.transparent,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.card,
  },
  categoryPillPressed: {
    opacity: 0.85,
  },
  categoryPillText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  categoryPillTextActive: {
    fontFamily: fontFamily.semiBold,
    color: colors.textOnPrimary,
    fontWeight: '600',
  },

  // --- Notes ---
  notesInput: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.input,
    padding: spacing.md,
    minHeight: 80,
  },

  // --- Itinerary Preview ---
  previewSectionHeader: {
    fontFamily: typography.label.fontFamily,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  timelinePreviewWrapper: {
    position: 'relative',
    paddingLeft: spacing.xl + 4,
    paddingVertical: spacing.xs,
  },
  timelinePreviewLine: {
    position: 'absolute',
    left: 11,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: colors.border,
  },
  timelineMockRow: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  timelineMockDot: {
    position: 'absolute',
    left: -(spacing.xl + 4) + 6,
    top: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.background,
  },
  timelineMockContent: {
    paddingLeft: spacing.sm,
  },
  timelineMockTime: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  timelineMockTitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 1,
  },
  timelineActiveRow: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  timelineActiveDot: {
    position: 'absolute',
    left: -(spacing.xl + 4) + 4,
    top: 20,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    zIndex: 10,
    ...shadows.card,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  previewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewCardInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  previewTimeText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  previewTitleText: {
    fontFamily: typography.cardTitle.fontFamily,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  previewLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  previewLocationIcon: {
    width: 12,
    height: 12,
  },
  previewLocationText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
  },
  previewIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.input,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCategoryIcon: {
    width: 22,
    height: 22,
  },

  // --- Actions ---
  actionsSection: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginTop: spacing.md,
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
