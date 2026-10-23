/**
 * Route: /(tabs)/trips/[tripId]/documents — Trip Travel Documents & Passports Vault
 *
 * Real Supabase-backed documents management under the persistent TripSubNavHeader:
 *  - Live document listing via useTripDocuments hook
 *  - Category filtering (All, Flights, Accommodation, Transport, Insurance, Other)
 *  - Secure viewing via short-lived signed URLs with WebBrowser / window.open
 *  - Role-based upload and deletion permissions (Owner / Editor / Viewer)
 *  - Contextual upload modal wired to header plus button
 *  - Pull-to-refresh and comprehensive loading, empty, and error states
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme';
import { Trip } from '@/services/mockData';
import {
  fetchTripById,
  getActiveTripId,
  getCachedTrips,
  setActiveTripId,
  subscribeToTrips,
} from '@/services/trip';
import { getCurrentUser } from '@/services/auth';
import {
  TripDocument,
  DocumentCategory,
} from '@/types/document';
import {
  DocumentFileInput,
  getTripDocumentSignedUrl,
  getUserDocumentCount,
  MAX_FREE_ACCOUNT_DOCUMENTS,
} from '@/services/documentService';
import { useTripDocuments } from '@/hooks/useTripDocuments';
import {
  DocumentCard,
  DocumentCategoryChips,
  DocumentFilterCategory,
  UploadDocumentModal,
  subscribeToDocumentUploadRequest,
} from '@/components/documents';
import { useShellInsets } from '@/components/navigation';

export default function TripDocumentsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const effectiveTripId = tripId || getActiveTripId() || '';
  const { contentPaddingBottom } = useShellInsets();

  // ── 1. Trip & Role Resolution ──────────────────────────────────────────────
  const [trip, setTrip] = useState<Trip | null>(() => {
    return effectiveTripId
      ? getCachedTrips()?.find((t) => t.id === effectiveTripId) || null
      : null;
  });

  useEffect(() => {
    let isMounted = true;
    if (effectiveTripId) {
      setActiveTripId(effectiveTripId);
      fetchTripById(effectiveTripId).then((fetched) => {
        if (isMounted && fetched) {
          setTrip(fetched);
        }
      });
    }

    const unsubscribe = subscribeToTrips((trips) => {
      if (!isMounted) return;
      const match = trips.find((t) => t.id === effectiveTripId);
      if (match) {
        setTrip(match);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [effectiveTripId]);

  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id;
  const userRole = trip?.userRole || (trip?.isOwner ? 'owner' : 'viewer');
  const isOwner = Boolean(trip?.isOwner || userRole === 'owner');
  const canUpload = userRole === 'owner' || userRole === 'editor';

  // ── 2. Live Documents Hook ─────────────────────────────────────────────────
  const {
    documents,
    isLoading,
    error,
    isUploading,
    deletingId,
    uploadDocument,
    deleteDocument,
    refetch,
    clearError,
  } = useTripDocuments(effectiveTripId);

  // ── 3. Category Filter State ───────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] =
    useState<DocumentFilterCategory>('all');

  const filteredDocuments = useMemo(() => {
    if (selectedCategory === 'all') return documents;
    return documents.filter((doc) => doc.category === selectedCategory);
  }, [documents, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<DocumentFilterCategory, number>> = {
      all: documents.length,
      flights: 0,
      accommodation: 0,
      transport: 0,
      insurance: 0,
      other: 0,
    };
    for (const doc of documents) {
      if (counts[doc.category] !== undefined) {
        counts[doc.category] = (counts[doc.category] || 0) + 1;
      }
    }
    return counts;
  }, [documents]);

  // ── 4. Upload Modal State & Event Subscription ─────────────────────────────
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToDocumentUploadRequest(async (targetTripId) => {
      if (targetTripId && targetTripId !== effectiveTripId) return;
      if (canUpload) {
        try {
          const count = await getUserDocumentCount();
          if (count >= MAX_FREE_ACCOUNT_DOCUMENTS) {
            Alert.alert(
              'Document Limit Reached',
              `Free accounts can store up to ${MAX_FREE_ACCOUNT_DOCUMENTS} documents. Upgrade to Voyaro Pro for unlimited documents and premium features.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'View Plans',
                  onPress: () => router.push('/(tabs)/profile/subscription'),
                },
              ]
            );
            return;
          }
        } catch {
          // Ignore count error and let upload proceed
        }
        setIsUploadModalOpen(true);
      } else {
        Alert.alert(
          'Permission Required',
          'Only trip organizers and editors can upload documents.'
        );
      }
    });
    return unsubscribe;
  }, [effectiveTripId, canUpload]);

  const handleUpload = async (
    file: DocumentFileInput,
    title: string,
    category: DocumentCategory,
    isForAllTrips?: boolean
  ) => {
    await uploadDocument(file, title, category, isForAllTrips);
  };

  // ── 5. Secure Document Viewing ─────────────────────────────────────────────
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  const handleViewDocument = async (doc: TripDocument) => {
    if (doc.tripId !== effectiveTripId && !doc.isForAllTrips) {
      Alert.alert(
        'Access Denied',
        'This document does not belong to the active trip.'
      );
      return;
    }

    setViewingDocId(doc.id);
    try {
      const signedUrl = await getTripDocumentSignedUrl(doc.filePath, {
        tripId: doc.tripId,
        expiresIn: 3600,
      });

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.open(signedUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        await WebBrowser.openBrowserAsync(signedUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          controlsColor: colors.primary,
          toolbarColor: colors.surface,
        });
      }
    } catch (viewErr) {
      const message =
        viewErr instanceof Error ? viewErr.message : 'Unable to open document.';
      Alert.alert('Error Opening Document', message);
    } finally {
      setViewingDocId(null);
    }
  };

  // ── 6. Secure Document Deletion ────────────────────────────────────────────
  const handleDeleteDocument = async (docId: string, filePath: string) => {
    try {
      await deleteDocument(docId, filePath);
    } catch (delErr) {
      const message =
        delErr instanceof Error ? delErr.message : 'Failed to delete document.';
      Alert.alert('Deletion Error', message);
    }
  };

  // ── 7. Pull-to-Refresh ─────────────────────────────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    clearError();
    try {
      await refetch();
    } catch {
      // Handled in hook
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, clearError]);

  // ── 8. Render State Blocks ─────────────────────────────────────────────────
  const renderContent = () => {
    if (!effectiveTripId) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Trip Unavailable</Text>
          <Text style={styles.stateSubtitle}>
            Please select an active trip to view travel documents.
          </Text>
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/trips')}
          >
            <Text style={styles.actionButtonText}>Back to My Trips</Text>
          </Pressable>
        </View>
      );
    }

    if (isLoading && documents.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Opening travel vault...</Text>
        </View>
      );
    }

    if (error && documents.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <View style={styles.errorIconCircle}>
            <Image
              source={require('@/assets/images/icons/verified.svg')}
              style={styles.errorIcon}
              tintColor={colors.error}
              contentFit="contain"
            />
          </View>
          <Text style={styles.stateTitle}>Unable to Load Documents</Text>
          <Text style={styles.stateSubtitle}>{error}</Text>
          <Pressable style={styles.actionButton} onPress={() => refetch()}>
            <Text style={styles.actionButtonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    if (documents.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <View style={styles.emptyIconCircle}>
            <Image
              source={require('@/assets/images/icons/verified.svg')}
              style={styles.emptyIcon}
              tintColor={colors.primary}
              contentFit="contain"
            />
          </View>
          <Text style={styles.stateTitle}>No travel documents yet</Text>
          <Text style={styles.stateSubtitle}>
            Keep your boarding passes, hotel vouchers, insurance policies, and
            rail tickets safely organized in this trip vault.
          </Text>
          {canUpload && (
            <Pressable
              style={styles.actionButton}
              onPress={() => setIsUploadModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Upload your first document"
            >
              <Text style={styles.actionButtonText}>Upload First Document</Text>
            </Pressable>
          )}
        </View>
      );
    }

    if (filteredDocuments.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>No documents in this category</Text>
          <Text style={styles.stateSubtitle}>
            {`There are no documents categorized under "${selectedCategory}".`}
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={styles.secondaryButtonText}>View All Documents</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.cardsList}>
        {filteredDocuments.map((doc) => {
          const canDeleteDoc =
            isOwner ||
            (userRole === 'editor' &&
              Boolean(currentUserId && doc.userId === currentUserId));

          return (
            <DocumentCard
              key={doc.id}
              document={doc}
              onView={handleViewDocument}
              onDelete={handleDeleteDocument}
              canDelete={canDeleteDoc}
              isDeleting={deletingId === doc.id}
              disabled={viewingDocId === doc.id}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: spacing.xs, paddingBottom: contentPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.container}>
          {/* ── 1. Document Filter Categories ────────────────────────────── */}
          <DocumentCategoryChips
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            counts={categoryCounts}
          />

          {/* ── 2. Vault Security Banner ─────────────────────────────────── */}
          <View style={styles.vaultBanner}>
            <View style={styles.vaultBannerLeft}>
              <Image
                source={require('@/assets/images/icons/verified.svg')}
                style={styles.vaultIcon}
                tintColor={colors.primary}
                contentFit="contain"
              />
              <View>
                <Text style={styles.vaultBannerTitle}>Encrypted Travel Vault</Text>
                <Text style={styles.vaultBannerSubtitle}>
                  Protected with Supabase Row-Level Security
                </Text>
              </View>
            </View>
            <View style={styles.syncBadge}>
              <Text style={styles.syncText}>ENCRYPTED</Text>
            </View>
          </View>

          {/* ── 3. Error Banner (when cached list exists) ─────────────────── */}
          {error && documents.length > 0 && (
            <View style={styles.inlineErrorBanner}>
              <Text style={styles.inlineErrorText}>{error}</Text>
              <Pressable onPress={() => clearError()} hitSlop={8}>
                <Text style={styles.inlineErrorDismiss}>Dismiss</Text>
              </Pressable>
            </View>
          )}

          {/* ── 4. Main Documents Content ─────────────────────────────────── */}
          {renderContent()}
        </View>
      </ScrollView>

      {/* ── 5. Upload Document Modal ─────────────────────────────────────── */}
      <UploadDocumentModal
        visible={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        isUploading={isUploading}
        initialCategory={
          selectedCategory === 'all' ? 'flights' : selectedCategory
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    gap: spacing.md,
  },

  // --- Vault Banner ---
  vaultBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.15)',
  },
  vaultBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  vaultIcon: {
    width: 20,
    height: 20,
  },
  vaultBannerTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
  vaultBannerSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  syncBadge: {
    backgroundColor: 'rgba(44, 95, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.button,
  },
  syncText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.5,
  },

  // --- Inline Error Banner ---
  inlineErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(176, 74, 74, 0.10)',
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(176, 74, 74, 0.25)',
  },
  inlineErrorText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.error,
    flex: 1,
    marginRight: spacing.sm,
  },
  inlineErrorDismiss: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.error,
  },

  // --- Cards List ---
  cardsList: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },

  // --- Loading State ---
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // --- Empty & Error States ---
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...shadows.card,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyIcon: {
    width: 28,
    height: 28,
  },
  errorIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(176, 74, 74, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  errorIcon: {
    width: 28,
    height: 28,
  },
  stateTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  stateSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: spacing.lg,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.button,
    ...shadows.card,
  },
  actionButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: colors.textOnPrimary,
  },
  secondaryButton: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
  },
  secondaryButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
