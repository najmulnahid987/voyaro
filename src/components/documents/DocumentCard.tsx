/**
 * Voyaro Document Card Component (Phase 12 — Step 4)
 *
 * Renders an individual travel document item:
 *  - Category icon and badge
 *  - Title and safely truncated filename
 *  - Formatted file size and upload date
 *  - View/Open trigger
 *  - Permission-aware delete action with confirmation dialog
 *  - In-flight deletion spinner and disabled states
 */

import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme';
import { TripDocument, DocumentCategory, DOCUMENT_CATEGORY_META } from '@/types/document';

export interface DocumentCardProps {
  /**
   * Document domain model to display.
   */
  document: TripDocument;
  /**
   * Callback invoked when a user taps to open/view the document.
   */
  onView: (document: TripDocument) => void;
  /**
   * Optional callback invoked when a user confirms document deletion.
   */
  onDelete?: (documentId: string, filePath: string) => void;
  /**
   * Whether the current user's role permits deleting this document. Defaults to false.
   */
  canDelete?: boolean;
  /**
   * Whether this specific document is currently in the process of being deleted.
   */
  isDeleting?: boolean;
  /**
   * Disables all interactive actions.
   */
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function getCategoryIcon(category: DocumentCategory) {
  switch (category) {
    case 'flights':
      return require('@/assets/images/icons/flight.svg');
    case 'accommodation':
      return require('@/assets/images/icons/hotel.svg');
    case 'transport':
      return require('@/assets/images/icons/ticket.svg');
    case 'insurance':
      return require('@/assets/images/icons/verified.svg');
    case 'other':
    default:
      return require('@/assets/images/icons/receipt.svg');
  }
}

export function DocumentCard({
  document,
  onView,
  onDelete,
  canDelete = false,
  isDeleting = false,
  disabled = false,
}: DocumentCardProps) {
  const categoryMeta = DOCUMENT_CATEGORY_META[document.category] || {
    label: 'Document',
    key: document.category,
  };

  const formattedSize = formatFileSize(document.fileSize);
  const formattedDate = formatUploadDate(document.createdAt);
  const isActionDisabled = disabled || isDeleting;

  const handleDeletePress = () => {
    if (!onDelete || isActionDisabled) return;

    const confirmMessage = `Are you sure you want to delete "${document.title}"? This action cannot be undone.`;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const confirmed = window.confirm(confirmMessage);
        if (confirmed) {
          onDelete(document.id, document.filePath);
        }
      } else {
        onDelete(document.id, document.filePath);
      }
    } else {
      Alert.alert(
        'Delete Document',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => onDelete(document.id, document.filePath),
          },
        ],
        { cancelable: true }
      );
    }
  };

  return (
    <View
      style={[
        styles.card,
        isDeleting && styles.cardDeleting,
        isActionDisabled && !isDeleting && styles.cardDisabled,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Document: ${document.title}`}
    >
      {/* ── Top Header Row ─────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <View style={styles.categoryIconCircle}>
            <Image
              source={getCategoryIcon(document.category)}
              style={styles.categoryIcon}
              tintColor={colors.primary}
              contentFit="contain"
            />
          </View>
          <View style={styles.badgeTextWrapper}>
            <View style={styles.categoryTitleRow}>
              <Text style={styles.categoryLabel}>{categoryMeta.label}</Text>
              {document.isForAllTrips && (
                <View style={styles.allTripsBadge}>
                  <Text style={styles.allTripsBadgeText}>*(for all trips)</Text>
                </View>
              )}
            </View>
            {formattedDate ? (
              <Text style={styles.uploadDateText}>{formattedDate}</Text>
            ) : null}
          </View>
        </View>

        {canDelete && onDelete ? (
          <Pressable
            onPress={handleDeletePress}
            disabled={isActionDisabled}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${document.title}`}
            hitSlop={8}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Image
                source={require('@/assets/images/icons/close.svg')}
                style={styles.deleteIcon}
                tintColor={colors.textMuted}
                contentFit="contain"
              />
            )}
          </Pressable>
        ) : null}
      </View>

      {/* ── Document Title ───────────────────────────────────────────── */}
      <Pressable
        onPress={() => onView(document)}
        disabled={isActionDisabled}
        style={({ pressed }) => [
          styles.titlePressable,
          pressed && !isActionDisabled && styles.titlePressed,
        ]}
      >
        <Text style={styles.documentTitle} numberOfLines={2} ellipsizeMode="tail">
          {document.title}
        </Text>
      </Pressable>

      {/* ── File Details Row ─────────────────────────────────────────── */}
      <View style={styles.fileDetailsRow}>
        <View style={styles.fileMetaLeft}>
          <Image
            source={require('@/assets/images/icons/receipt.svg')}
            style={styles.fileIcon}
            tintColor={colors.textSecondary}
            contentFit="contain"
          />
          <Text style={styles.fileNameText} numberOfLines={1} ellipsizeMode="middle">
            {document.fileName}
          </Text>
          <Text style={styles.fileSizeText}>· {formattedSize}</Text>
        </View>

        {/* View / Open Action Button */}
        <Pressable
          onPress={() => onView(document)}
          disabled={isActionDisabled}
          style={({ pressed }) => [
            styles.viewButton,
            pressed && !isActionDisabled && styles.viewButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Open ${document.title}`}
          hitSlop={6}
        >
          <Text style={styles.viewButtonText}>View</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: spacing.xs + 2,
    ...shadows.card,
  },
  cardDeleting: {
    opacity: 0.6,
  },
  cardDisabled: {
    opacity: 0.75,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  categoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    width: 16,
    height: 16,
  },
  badgeTextWrapper: {
    justifyContent: 'center',
    flex: 1,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.primary,
    letterSpacing: 0.2,
  },
  allTripsBadge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.button,
  },
  allTripsBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: colors.primary,
  },
  uploadDateText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  deleteButtonPressed: {
    backgroundColor: 'rgba(176, 74, 74, 0.12)',
  },
  deleteIcon: {
    width: 14,
    height: 14,
  },
  titlePressable: {
    paddingVertical: 2,
  },
  titlePressed: {
    opacity: 0.7,
  },
  documentTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  fileDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
    gap: spacing.sm,
  },
  fileMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  fileIcon: {
    width: 13,
    height: 13,
  },
  fileNameText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  fileSizeText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.button,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonPressed: {
    backgroundColor: colors.primary,
    opacity: 0.8,
  },
  viewButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.primary,
  },
});
