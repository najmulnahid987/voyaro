/**
 * DateTimePickerField — Shared reusable component
 *
 * Renders a tappable row that opens the native OS date or time picker.
 * Uses @react-native-community/datetimepicker under the hood.
 *
 * Props:
 *  - mode: 'date' | 'time'
 *  - value: Date  (current selected date/time)
 *  - onChange: (date: Date) => void
 *  - label: string (e.g. "Check-in Date")
 *  - hasError?: boolean
 *  - minimumDate?: Date
 *  - maximumDate?: Date
 */

import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { colors, radius, shadows, spacing, typography } from '@/theme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDisplayDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayTime(date: Date): string {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DateTimePickerFieldProps {
  mode: 'date' | 'time';
  value: Date;
  onChange: (date: Date) => void;
  hasError?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DateTimePickerField({
  mode,
  value,
  onChange,
  hasError = false,
  minimumDate,
  maximumDate,
}: DateTimePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  // On Android we need a temp state to confirm
  const [tempDate, setTempDate] = useState<Date>(value);

  const displayText =
    mode === 'date' ? formatDisplayDate(value) : formatDisplayTime(value);

  const iconSource =
    mode === 'date'
      ? require('@/assets/images/icons/calendar.svg')
      : require('@/assets/images/icons/clock.svg');

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (selectedDate) {
        onChange(selectedDate);
      }
    } else {
      // iOS: update temp without confirming yet
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirmIOS = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  const handleCancelIOS = () => {
    setTempDate(value);
    setShowPicker(false);
  };

  return (
    <>
      {/* Tappable Field Row */}
      <Pressable
        onPress={() => {
          setTempDate(value);
          setShowPicker(true);
        }}
        style={({ pressed }) => [
          styles.fieldRow,
          hasError && styles.fieldRowError,
          pressed && styles.fieldRowPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Select ${mode === 'date' ? 'date' : 'time'}: ${displayText}`}
      >
        <View style={styles.iconBox}>
          <Image
            source={iconSource}
            style={styles.icon}
            tintColor={colors.textSecondary}
            contentFit="contain"
          />
        </View>
        <Text style={[styles.displayText, !displayText && styles.placeholder]}>
          {displayText || (mode === 'date' ? 'Select date' : 'Select time')}
        </Text>
        <Image
          source={require('@/assets/images/icons/calendar.svg')}
          style={styles.chevronIcon}
          tintColor={colors.textMuted}
          contentFit="contain"
        />
      </Pressable>

      {/* Android: inline picker shown directly */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {/* iOS: modal wrapper for spinner */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleCancelIOS}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              {/* Sheet header */}
              <View style={styles.sheetHeader}>
                <Pressable onPress={handleCancelIOS} style={styles.sheetAction}>
                  <Text style={styles.sheetCancelText}>Cancel</Text>
                </Pressable>
                <Text style={styles.sheetTitle}>
                  {mode === 'date' ? 'Select Date' : 'Select Time'}
                </Text>
                <Pressable onPress={handleConfirmIOS} style={styles.sheetAction}>
                  <Text style={styles.sheetDoneText}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempDate}
                mode={mode}
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Web fallback */}
      {Platform.OS === 'web' && showPicker && (
        <DateTimePicker
          value={value}
          mode={mode}
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fieldRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.transparent,
  },
  fieldRowError: {
    borderColor: colors.error,
  },
  fieldRowPressed: {
    opacity: 0.8,
  },
  iconBox: {
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 16,
    height: 16,
  },
  displayText: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: 15,
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.textMuted,
  },
  chevronIcon: {
    width: 14,
    height: 14,
    opacity: 0.5,
  },

  // iOS Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingBottom: 32,
    ...shadows.sheet,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetAction: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  sheetTitle: {
    fontFamily: typography.label.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sheetCancelText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 15,
    color: colors.textSecondary,
  },
  sheetDoneText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  iosPicker: {
    height: 216,
  },
});
