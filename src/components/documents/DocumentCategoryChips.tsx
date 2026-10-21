/**
 * Voyaro Document Category Filter Chips (Phase 12 — Step 4)
 *
 * Horizontal scrollable category selector for filtering travel documents:
 *  - All
 *  - Flights
 *  - Accommodation
 *  - Transport
 *  - Insurance
 *  - Other
 *
 * Presentation-only component with zero data fetching or state ownership.
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { colors, fontFamily, radius, spacing } from '@/theme';
import { DocumentCategory } from '@/types/document';

export type DocumentFilterCategory = 'all' | DocumentCategory;

export interface FilterOption {
  key: DocumentFilterCategory;
  label: string;
}

export const DOCUMENT_FILTER_OPTIONS: FilterOption[] = [
  { key: 'all', label: 'All' },
  { key: 'flights', label: 'Flights' },
  { key: 'accommodation', label: 'Accommodation' },
  { key: 'transport', label: 'Transport' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'other', label: 'Other' },
];

export interface DocumentCategoryChipsProps {
  /**
   * The currently selected category key ('all' or a valid DocumentCategory).
   */
  selectedCategory: DocumentFilterCategory;
  /**
   * Callback invoked when a user taps a category chip.
   */
  onSelectCategory: (category: DocumentFilterCategory) => void;
  /**
   * Optional document counts per category to display in the chip label.
   */
  counts?: Partial<Record<DocumentFilterCategory, number>>;
  /**
   * Optional custom style override for the outer scroll container.
   */
  style?: ViewStyle;
}

export function DocumentCategoryChips({
  selectedCategory,
  onSelectCategory,
  counts,
  style,
}: DocumentCategoryChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={[styles.scrollView, style]}
    >
      {DOCUMENT_FILTER_OPTIONS.map((filter) => {
        const isSelected = selectedCategory === filter.key;
        const count = counts?.[filter.key];
        const displayLabel = typeof count === 'number' ? `${filter.label} (${count})` : filter.label;

        return (
          <Pressable
            key={filter.key}
            onPress={() => onSelectCategory(filter.key)}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipSelected,
              pressed && !isSelected && styles.chipPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Filter by ${filter.label}`}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Text
              style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
              ]}
              numberOfLines={1}
            >
              {displayLabel}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    backgroundColor: colors.backgroundAlt,
    opacity: 0.85,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
});
