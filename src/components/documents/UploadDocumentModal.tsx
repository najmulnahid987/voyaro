/**
 * Voyaro Upload Document Modal Component (Phase 12 — Step 4)
 *
 * Reusable modal for choosing and uploading travel documents:
 *  - File selection via expo-document-picker
 *  - Enforces PDF, JPEG, PNG, WebP, HEIC and 20 MB size limit
 *  - Document title input with auto-population from filename
 *  - Category selection: Flights, Accommodation, Transport, Insurance, Other
 *  - Duplicate submission guard and dismissal protection during upload
 *  - Retains modal open on failure for retry
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import { colors, fontFamily, radius, spacing } from '@/theme';
import {
  DocumentCategory,
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_META,
  TripDocument,
} from '@/types/document';
import {
  DocumentFileInput,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
} from '@/services/documentService';

export interface UploadDocumentModalProps {
  /**
   * Controls modal visibility.
   */
  visible: boolean;
  /**
   * Callback invoked to dismiss the modal.
   */
  onClose: () => void;
  /**
   * Callback invoked to process the upload.
   */
  onUpload: (
    file: DocumentFileInput,
    title: string,
    category: DocumentCategory,
    isForAllTrips?: boolean
  ) => Promise<TripDocument | void>;
  /**
   * Whether an upload is actively in progress.
   */
  isUploading?: boolean;
  /**
   * Optional initial category to pre-select. Defaults to 'flights'.
   */
  initialCategory?: DocumentCategory;
  /**
   * Whether the document should default to applying to all trips.
   */
  initialIsForAllTrips?: boolean;
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

function inferMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
    case 'heif':
      return 'image/heic';
    default:
      return 'application/octet-stream';
  }
}

function deriveTitleFromFileName(fileName: string): string {
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
  const cleaned = nameWithoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Document';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function UploadDocumentModal({
  visible,
  onClose,
  onUpload,
  isUploading: propIsUploading = false,
  initialCategory = 'flights',
  initialIsForAllTrips = false,
}: UploadDocumentModalProps) {
  const [selectedFile, setSelectedFile] = useState<DocumentFileInput | null>(null);
  const [title, setTitle] = useState<string>('');
  const [hasUserEditedTitle, setHasUserEditedTitle] = useState<boolean>(false);
  const [category, setCategory] = useState<DocumentCategory>(initialCategory);
  const [isForAllTrips, setIsForAllTrips] = useState<boolean>(Boolean(initialIsForAllTrips));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    if (visible) {
      setIsForAllTrips(Boolean(initialIsForAllTrips));
    }
  }, [visible, initialIsForAllTrips]);

  const activeLoading = isSubmitting || propIsUploading;

  const handleTitleChange = (text: string) => {
    setTitle(text);
    setHasUserEditedTitle(true);
    if (error) setError(null);
  };

  const handlePickDocument = async () => {
    if (activeLoading) return;
    setError(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/heic',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        // User cancelled picker: do nothing, no error shown
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        return;
      }

      const rawMime = asset.mimeType || inferMimeType(asset.name);
      const mimeType = rawMime.toLowerCase();

      // Validate MIME type against allowed storage bucket types
      if (!(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType)) {
        setError('Unsupported file type. Please select a PDF or image (JPEG, PNG, WebP, HEIC).');
        return;
      }

      const fileSize = asset.size ?? (asset.file?.size || 0);

      // Validate 20 MB size limit
      if (fileSize > MAX_DOCUMENT_FILE_SIZE_BYTES) {
        const mb = (fileSize / (1024 * 1024)).toFixed(1);
        setError(`File size (${mb} MB) exceeds the 20 MB limit. Please select a smaller file.`);
        return;
      }

      const fileInput: DocumentFileInput = {
        name: asset.name,
        mimeType,
        size: fileSize,
        uri: asset.uri,
        file: asset.file,
      };

      setSelectedFile(fileInput);

      // Auto-populate title if the user has not edited it yet
      if (!hasUserEditedTitle || !title.trim()) {
        setTitle(deriveTitleFromFileName(asset.name));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to select document: ${msg}`);
    }
  };

  const handleSubmit = async () => {
    if (activeLoading) return;

    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please enter a document title.');
      return;
    }

    if (trimmedTitle.length > 200) {
      setError('Document title must be 200 characters or fewer.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isForAllTrips) {
        await onUpload(selectedFile, trimmedTitle, category, true);
      } else {
        await onUpload(selectedFile, trimmedTitle, category);
      }
      // Reset form state on successful upload and dismiss
      setSelectedFile(null);
      setTitle('');
      setHasUserEditedTitle(false);
      setIsForAllTrips(Boolean(initialIsForAllTrips));
      setError(null);
      onClose();
    } catch (err: unknown) {
      // Keep modal open after failure so the user can inspect/retry
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to upload document. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (activeLoading) return; // Prevent dismissal during active upload
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable
          style={styles.backdrop}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel="Dismiss modal backdrop"
        />

        <View style={styles.sheetCard}>
          {/* ── Modal Header ─────────────────────────────────────────── */}
          <View style={styles.sheetHeader}>
            <View style={styles.titleGroup}>
              <Text style={styles.sheetTitle}>Upload Document</Text>
              <Text style={styles.sheetSubtitle}>
                Add a boarding pass, voucher, or policy to your vault
              </Text>
            </View>

            <Pressable
              onPress={handleCancel}
              disabled={activeLoading}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && !activeLoading && styles.buttonPressed,
                activeLoading && styles.buttonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Close upload modal"
              hitSlop={8}
            >
              <Image
                source={require('@/assets/images/icons/close.svg')}
                style={styles.closeIcon}
                tintColor={colors.textSecondary}
                contentFit="contain"
              />
            </Pressable>
          </View>

          {/* ── Error Banner ─────────────────────────────────────────── */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── File Selection Section ─────────────────────────────── */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>DOCUMENT FILE</Text>

              {selectedFile ? (
                <View style={styles.fileSelectedBox}>
                  <View style={styles.fileSelectedIconCircle}>
                    <Image
                      source={require('@/assets/images/icons/receipt.svg')}
                      style={styles.fileSelectedIcon}
                      tintColor={colors.primary}
                      contentFit="contain"
                    />
                  </View>
                  <View style={styles.fileSelectedMeta}>
                    <Text style={styles.fileSelectedName} numberOfLines={1} ellipsizeMode="middle">
                      {selectedFile.name}
                    </Text>
                    <Text style={styles.fileSelectedSize}>
                      {formatFileSize(selectedFile.size)} · {selectedFile.mimeType}
                    </Text>
                  </View>

                  <Pressable
                    onPress={handlePickDocument}
                    disabled={activeLoading}
                    style={styles.changeFileButton}
                    accessibilityRole="button"
                    accessibilityLabel="Change selected file"
                  >
                    <Text style={styles.changeFileButtonText}>Change</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handlePickDocument}
                  disabled={activeLoading}
                  style={({ pressed }) => [
                    styles.filePickerBox,
                    pressed && !activeLoading && styles.filePickerBoxPressed,
                    activeLoading && styles.buttonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Choose document file"
                >
                  <Image
                    source={require('@/assets/images/icons/plus.svg')}
                    style={styles.pickerPlusIcon}
                    tintColor={colors.primary}
                    contentFit="contain"
                  />
                  <Text style={styles.pickerMainText}>Select PDF or Image</Text>
                  <Text style={styles.pickerSubText}>
                    Supports PDF, JPEG, PNG, WebP, HEIC up to 20 MB
                  </Text>
                </Pressable>
              )}
            </View>

            {/* ── Document Title Input ───────────────────────────────── */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>DOCUMENT TITLE</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={handleTitleChange}
                placeholder="e.g. Flight NH 204 Boarding Pass"
                placeholderTextColor={colors.textMuted}
                editable={!activeLoading}
                maxLength={200}
                returnKeyType="done"
              />
            </View>

            {/* ── Category Selector ──────────────────────────────────── */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <View style={styles.categoriesRow}>
                {DOCUMENT_CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  const meta = DOCUMENT_CATEGORY_META[cat];
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => {
                        if (!activeLoading) setCategory(cat);
                      }}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`Category ${meta.label}`}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected && styles.categoryChipTextSelected,
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── Universal Document Toggle (for all trips) ──────────── */}
            <View style={styles.fieldSection}>
              <Pressable
                style={styles.allTripsToggleCard}
                onPress={() => {
                  if (!activeLoading) setIsForAllTrips((prev) => !prev);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isForAllTrips }}
                accessibilityLabel="Set for all trips"
              >
                <View
                  style={[
                    styles.checkboxBox,
                    isForAllTrips && styles.checkboxBoxChecked,
                  ]}
                >
                  {isForAllTrips && <Text style={styles.checkmarkText}>✓</Text>}
                </View>
                <View style={styles.allTripsTextContainer}>
                  <View style={styles.allTripsHeaderRow}>
                    <Text style={styles.allTripsTitle}>Set for all trips</Text>
                    <View style={styles.allTripsBadge}>
                      <Text style={styles.allTripsBadgeText}>*(for all trips)</Text>
                    </View>
                  </View>
                  <Text style={styles.allTripsDescription}>
                    Make this document accessible in every trip (e.g. Passport, Insurance, ID)
                  </Text>
                </View>
              </Pressable>
            </View>
          </ScrollView>

          {/* ── Footer Actions ───────────────────────────────────────── */}
          <View style={styles.footerRow}>
            <Pressable
              onPress={handleCancel}
              disabled={activeLoading}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && !activeLoading && styles.buttonPressed,
                activeLoading && styles.buttonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel upload"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={activeLoading || !selectedFile || !title.trim()}
              style={({ pressed }) => [
                styles.submitButton,
                (activeLoading || !selectedFile || !title.trim()) && styles.submitButtonDisabled,
                pressed && !activeLoading && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Upload Document"
            >
              {activeLoading ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.submitButtonText}>Upload Document</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    gap: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
  },
  sheetTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    marginLeft: spacing.sm,
  },
  closeIcon: {
    width: 14,
    height: 14,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorBox: {
    backgroundColor: 'rgba(176, 74, 74, 0.10)',
    padding: spacing.sm + 2,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: 'rgba(176, 74, 74, 0.25)',
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.error,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  fieldSection: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  textInput: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  filePickerBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.card,
    backgroundColor: colors.primarySurface,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  filePickerBoxPressed: {
    opacity: 0.8,
  },
  pickerPlusIcon: {
    width: 20,
    height: 20,
    marginBottom: 2,
  },
  pickerMainText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
  pickerSubText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  fileSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radius.card,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.15)',
    gap: spacing.sm,
  },
  fileSelectedIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileSelectedIcon: {
    width: 16,
    height: 16,
  },
  fileSelectedMeta: {
    flex: 1,
  },
  fileSelectedName: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  fileSelectedSize: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  changeFileButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
  },
  changeFileButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.primary,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
  },
  cancelButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textOnPrimary,
  },
  allTripsToggleCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmarkText: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  allTripsTextContainer: {
    flex: 1,
  },
  allTripsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  allTripsTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  allTripsBadge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.button,
  },
  allTripsBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: colors.primary,
  },
  allTripsDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 15,
  },
});
