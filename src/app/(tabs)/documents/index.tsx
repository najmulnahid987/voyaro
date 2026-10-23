/**
 * Route: /(tabs)/documents — Main Documents Tab
 *
 * Top-level tab entry for the travel document vault.
 * Allows switching between trips while reusing the existing
 * document components, hooks, and services.
 *
 * Features:
 *  - Trip selector dropdown for multi-trip navigation
 *  - Category filtering (All, Flights, Accommodation, Transport, Insurance, Other)
 *  - Secure viewing via short-lived signed URLs
 *  - Role-based upload and deletion permissions
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
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme';
import { Trip } from '@/services/mockData';
import {
  getActiveTripId,
  getCachedTrips,
  listTrips,
  setActiveTripId as setGlobalActiveTripId,
  subscribeToTrips,
} from '@/services/trip';
import { getCurrentUser } from '@/services/auth';
import { TripDocument, DocumentCategory } from '@/types/document';
import {
  DocumentFileInput,
  getTripDocumentSignedUrl,
  getUserDocumentCount,
  MAX_FREE_ACCOUNT_DOCUMENTS,
} from '@/services/documentService';
import { useTripDocuments, ALL_TRIPS_SCOPE_ID } from '@/hooks/useTripDocuments';
import {
  DocumentCard,
  DocumentCategoryChips,
  DocumentFilterCategory,
  UploadDocumentModal,
} from '@/components/documents';
import { useShellInsets } from '@/components/navigation';

export default function DocumentsTabScreen() {
  const { contentPaddingTop, contentPaddingBottom } = useShellInsets();

  // ── 1. Trip List & Selector ──────────────────────────────────────────────
  const [userTrips, setUserTrips] = useState<Trip[]>(() => getCachedTrips() || []);

  useEffect(() => {
    let isMounted = true;
    const unsub = subscribeToTrips((updated) => {
      if (isMounted) setUserTrips(updated);
    });
    listTrips()
      .then((fetched) => {
        if (isMounted) setUserTrips(fetched);
      })
      .catch((err) => {
        console.warn('[DocumentsTab] listTrips error:', err);
      });
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const effectiveAllTrips = useMemo(() => {
    if (userTrips.length > 0) return userTrips;
    const cached = getCachedTrips();
    if (cached && cached.length > 0) return cached;
    return [];
  }, [userTrips]);

  const [activeTripId, setActiveTripId] = useState<string>(() => {
    const globalActive = getActiveTripId();
    if (globalActive) return globalActive;
    const cached = getCachedTrips();
    return cached && cached.length > 0 ? cached[0].id : '';
  });

  const [showTripMenu, setShowTripMenu] = useState(false);

  const isAllTripsActive = activeTripId === ALL_TRIPS_SCOPE_ID;
  const currentTripId = activeTripId;

  useEffect(() => {
    if (!activeTripId && effectiveAllTrips.length > 0) {
      const globalActive = getActiveTripId();
      const match = globalActive && effectiveAllTrips.some((t) => t.id === globalActive);
      setActiveTripId(match ? globalActive : effectiveAllTrips[0].id);
    }
  }, [effectiveAllTrips, activeTripId]);

  useEffect(() => {
    if (currentTripId && currentTripId !== ALL_TRIPS_SCOPE_ID) {
      setGlobalActiveTripId(currentTripId);
    }
  }, [currentTripId]);

  const trip = useMemo(() => {
    if (isAllTripsActive) return null;
    if (!currentTripId) return effectiveAllTrips[0] || null;
    return (
      effectiveAllTrips.find((t) => t.id === currentTripId) ||
      effectiveAllTrips[0] ||
      null
    );
  }, [currentTripId, effectiveAllTrips, isAllTripsActive]);

  const currentUser = getCurrentUser();
  const userRole = trip?.userRole || (trip?.isOwner ? 'owner' : 'viewer');
  const isOwner = isAllTripsActive ? true : Boolean(trip?.isOwner || userRole === 'owner');
  const canUpload = isAllTripsActive
    ? effectiveAllTrips.length > 0
    : userRole === 'owner' || userRole === 'editor';

  // ── 2. Account Document Quota Tracking ─────────────────────────────────
  const [userDocCount, setUserDocCount] = useState<number>(0);

  const refreshUserDocCount = useCallback(async () => {
    try {
      const count = await getUserDocumentCount();
      setUserDocCount(count);
    } catch {
      // Ignore count fetch errors
    }
  }, []);

  useEffect(() => {
    refreshUserDocCount();
  }, [refreshUserDocCount]);

  // ── 3. Live Documents Hook ─────────────────────────────────────────────
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
  } = useTripDocuments(activeTripId, effectiveAllTrips[0]?.id);

  // ── 4. Category Filter State ───────────────────────────────────────────
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

  // ── 5. Upload Modal State ──────────────────────────────────────────────
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const handlePressAdd = () => {
    if (userDocCount >= MAX_FREE_ACCOUNT_DOCUMENTS) {
      Alert.alert(
        'Document Limit Reached',
        `Free accounts can store up to ${MAX_FREE_ACCOUNT_DOCUMENTS} documents. Upgrade to Voyaro Pro for unlimited documents and premium travel benefits.`,
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
    setIsUploadModalOpen(true);
  };

  const handleUpload = async (
    file: DocumentFileInput,
    title: string,
    category: DocumentCategory,
    isForAllTrips?: boolean
  ) => {
    await uploadDocument(file, title, category, isForAllTrips);
    await refreshUserDocCount();
  };

  // ── 5. Secure Document Viewing ─────────────────────────────────────────
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  const handleViewDocument = async (doc: TripDocument) => {
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

  // ── 6. Secure Document Deletion ────────────────────────────────────────
  const handleDeleteDocument = async (docId: string, filePath: string) => {
    try {
      await deleteDocument(docId, filePath);
      await refreshUserDocCount();
    } catch (delErr) {
      const message =
        delErr instanceof Error ? delErr.message : 'Failed to delete document.';
      Alert.alert('Deletion Error', message);
    }
  };

  // ── 7. Pull-to-Refresh ─────────────────────────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    clearError();
    try {
      await Promise.all([refetch(), refreshUserDocCount()]);
    } catch {
      // Handled in hook
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, clearError, refreshUserDocCount]);

  // ── 8. Render State Blocks ─────────────────────────────────────────────
  const renderContent = () => {
    if (!currentTripId && effectiveAllTrips.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <View style={styles.emptyIconCircle}>
            <Image
              source={require('@/assets/images/icons/document.svg')}
              style={styles.emptyIcon}
              tintColor={colors.primary}
              contentFit="contain"
            />
          </View>
          <Text style={styles.stateTitle}>No trips yet</Text>
          <Text style={styles.stateSubtitle}>
            Create your first trip to start organizing your travel documents.
          </Text>
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/trips')}
          >
            <Text style={styles.actionButtonText}>Create a Trip</Text>
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
              source={require('@/assets/images/icons/document.svg')}
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
              Boolean(currentUser?.id && doc.userId === currentUser.id));

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
          {
            paddingTop: contentPaddingTop,
            paddingBottom: contentPaddingBottom,
          },
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
          {/* ── 1. Header: Screen Tag + Upload Button ──────────────────── */}
          <View style={styles.headerSection}>
            <View style={styles.topBarRow}>
              <View style={styles.screenTagBadge}>
                <Image
                  source={require('@/assets/images/icons/document.svg')}
                  style={styles.screenTagIcon}
                  tintColor={colors.primary}
                  contentFit="contain"
                />
                <Text style={styles.screenTagText}>DOCUMENTS</Text>
              </View>

              {canUpload && (isAllTripsActive || currentTripId) ? (
                <Pressable
                  onPress={handlePressAdd}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.addIconButton,
                    pressed && styles.buttonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Upload Document"
                >
                  <Image
                    source={require('@/assets/images/icons/plus.svg')}
                    style={styles.plusIcon}
                    tintColor={colors.textOnPrimary}
                    contentFit="contain"
                  />
                </Pressable>
              ) : null}
            </View>

            {/* Trip Selector */}
            <View style={styles.tripSelectorContainer}>
              <Pressable
                onPress={() => setShowTripMenu((prev) => !prev)}
                style={styles.tripSelectorTrigger}
                accessibilityRole="button"
                accessibilityLabel="Switch trip"
              >
                <Text style={styles.tripTitle} numberOfLines={1}>
                  {isAllTripsActive
                    ? '*(for all trips)'
                    : trip?.title || 'Trip Documents'}
                </Text>
                <Text style={styles.tripSelectorArrow}>▼</Text>
              </Pressable>

              {showTripMenu && (
                <View style={styles.tripDropdown}>
                  {/* Option: *(for all trips) */}
                  <Pressable
                    onPress={() => {
                      setActiveTripId(ALL_TRIPS_SCOPE_ID);
                      setShowTripMenu(false);
                      setSelectedCategory('all');
                    }}
                    style={[
                      styles.tripDropdownItem,
                      isAllTripsActive && styles.tripDropdownItemActive,
                    ]}
                  >
                    <View style={styles.dropdownAllTripsRow}>
                      <Text
                        style={[
                          styles.tripDropdownText,
                          isAllTripsActive && styles.tripDropdownTextActive,
                        ]}
                      >
                        *(for all trips)
                      </Text>
                      <View style={styles.allTripsPill}>
                        <Text style={styles.allTripsPillText}>ALL</Text>
                      </View>
                    </View>
                    <Text style={styles.tripDropdownDates}>
                      Universal documents across all trips
                    </Text>
                  </Pressable>

                  {/* Specific Trips */}
                  {effectiveAllTrips.map((t) => (
                    <Pressable
                      key={t.id}
                      onPress={() => {
                        setActiveTripId(t.id);
                        setShowTripMenu(false);
                        setSelectedCategory('all');
                      }}
                      style={[
                        styles.tripDropdownItem,
                        !isAllTripsActive &&
                          t.id === currentTripId &&
                          styles.tripDropdownItemActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tripDropdownText,
                          !isAllTripsActive &&
                            t.id === currentTripId &&
                            styles.tripDropdownTextActive,
                        ]}
                      >
                        {t.title}
                      </Text>
                      <Text style={styles.tripDropdownDates}>{t.dates}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* ── 2. Document Filter Categories ──────────────────────────── */}
          <DocumentCategoryChips
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            counts={categoryCounts}
          />

          {/* ── 3. Vault Security Banner & Quota ────────────────────────── */}
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
            <Pressable
              style={[
                styles.quotaBadge,
                userDocCount >= MAX_FREE_ACCOUNT_DOCUMENTS && styles.quotaBadgeLimit,
              ]}
              onPress={() => router.push('/(tabs)/profile/subscription')}
              accessibilityRole="button"
              accessibilityLabel="View Voyaro Pro subscription"
            >
              <Text
                style={[
                  styles.quotaText,
                  userDocCount >= MAX_FREE_ACCOUNT_DOCUMENTS && styles.quotaTextLimit,
                ]}
              >
                {userDocCount >= MAX_FREE_ACCOUNT_DOCUMENTS
                  ? `Limit (5/5) · Pro`
                  : `${userDocCount}/5 Docs`}
              </Text>
            </Pressable>
          </View>

          {/* ── 4. Error Banner (when cached list exists) ──────────────── */}
          {error && documents.length > 0 && (
            <View style={styles.inlineErrorBanner}>
              <Text style={styles.inlineErrorText}>{error}</Text>
              <Pressable onPress={() => clearError()} hitSlop={8}>
                <Text style={styles.inlineErrorDismiss}>Dismiss</Text>
              </Pressable>
            </View>
          )}

          {/* ── 5. Main Documents Content ──────────────────────────────── */}
          {renderContent()}
        </View>
      </ScrollView>

      {/* ── 6. Upload Document Modal ────────────────────────────────────── */}
      <UploadDocumentModal
        visible={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        isUploading={isUploading}
        initialCategory={
          selectedCategory === 'all' ? 'flights' : selectedCategory
        }
        initialIsForAllTrips={isAllTripsActive}
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

  // --- Header Section ---
  headerSection: {
    gap: spacing.xs,
  },
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.button,
  },
  screenTagIcon: {
    width: 14,
    height: 14,
  },
  screenTagText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  addIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  plusIcon: {
    width: 16,
    height: 16,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },

  // --- Trip Selector ---
  tripTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  tripSelectorContainer: {
    position: 'relative',
    zIndex: 20,
  },
  tripSelectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripSelectorArrow: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 1,
  },
  tripDropdown: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    ...shadows.card,
    paddingVertical: 4,
    zIndex: 30,
  },
  tripDropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tripDropdownItemActive: {
    backgroundColor: colors.primarySurface,
  },
  dropdownAllTripsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allTripsPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.button,
  },
  allTripsPillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 9,
    color: colors.textOnPrimary,
    letterSpacing: 0.5,
  },
  tripDropdownText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  tripDropdownTextActive: {
    color: colors.primary,
    fontFamily: fontFamily.semiBold,
  },
  tripDropdownDates: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
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
  quotaBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  quotaBadgeLimit: {
    backgroundColor: 'rgba(176, 74, 74, 0.1)',
    borderColor: 'rgba(176, 74, 74, 0.3)',
  },
  quotaText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.primary,
  },
  quotaTextLimit: {
    color: colors.error,
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
