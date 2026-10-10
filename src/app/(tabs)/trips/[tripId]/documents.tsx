/**
 * Route: /(tabs)/trips/[tripId]/documents — Trip Travel Documents & Passports Vault
 *
 * Centralized repository for all trip documents (Passports, Boarding Passes,
 * Hotel Vouchers, Rail Passes, Insurance) under the persistent TripSubNavHeader.
 */

import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { getTripById } from '@/services/mockData';
import { useShellInsets } from '@/components/navigation';

type DocCategory = 'all' | 'flights' | 'hotels' | 'passports' | 'insurance';

interface TripDoc {
  id: string;
  category: 'flights' | 'hotels' | 'passports' | 'insurance';
  typeLabel: string;
  title: string;
  referenceNumber: string;
  traveler: string;
  validUntil: string;
  status: 'verified' | 'confirmed' | 'pending';
}

const TRIP_DOCUMENTS: TripDoc[] = [
  {
    id: 'doc-flight-nh204',
    category: 'flights',
    typeLabel: 'Boarding Pass',
    title: 'All Nippon Airways · Flight NH 204',
    referenceNumber: 'E-TKT 205-991823741',
    traveler: 'Alex Chen (Seat 14A)',
    validUntil: 'Mar 10, 2026 · Depart 14:20',
    status: 'confirmed',
  },
  {
    id: 'doc-hotel-gracery',
    category: 'hotels',
    typeLabel: 'Hotel Voucher',
    title: 'Hotel Gracery Shinjuku · Tokyo',
    referenceNumber: 'CONF-TYO-99481',
    traveler: '2 Adults · 3 Nights (King)',
    validUntil: 'Check-in: Mar 10, 2026',
    status: 'confirmed',
  },
  {
    id: 'doc-passport-alex',
    category: 'passports',
    typeLabel: 'Passport',
    title: 'United States Passport',
    referenceNumber: 'PASSPORT ***8912',
    traveler: 'Alex Chen',
    validUntil: 'Expires Aug 2031',
    status: 'verified',
  },
  {
    id: 'doc-jr-railpass',
    category: 'flights',
    typeLabel: 'Transit Voucher',
    title: 'Japan Rail Pass · 7-Day Green Car',
    referenceNumber: 'JR-MCO-8812391',
    traveler: 'Alex Chen & Sarah Jenkins',
    validUntil: 'Exchange by Jun 2026',
    status: 'confirmed',
  },
  {
    id: 'doc-insurance-allianz',
    category: 'insurance',
    typeLabel: 'Medical Insurance',
    title: 'Allianz Global Comprehensive Travel Care',
    referenceNumber: 'POL-ALLIANZ-88192',
    traveler: '4 Covered Travelers',
    validUntil: 'Active Mar 10 — Mar 22, 2026',
    status: 'verified',
  },
];

export default function TripDocumentsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const effectiveTripId = tripId || 'japan-adventure';
  const trip = getTripById(effectiveTripId) || getTripById('japan-adventure')!;
  const { contentPaddingBottom } = useShellInsets();

  const [activeCategory, setActiveCategory] = useState<DocCategory>('all');

  const filteredDocs = TRIP_DOCUMENTS.filter((doc) => {
    if (activeCategory === 'all') return true;
    return doc.category === activeCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'flights':
        return require('@/assets/images/icons/flight.svg');
      case 'hotels':
        return require('@/assets/images/icons/hotel.svg');
      case 'passports':
        return require('@/assets/images/onboarding/person.svg');
      case 'insurance':
      default:
        return require('@/assets/images/icons/verified.svg');
    }
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
      >
        <View style={styles.container}>
          {/* ── 1. Document Filter Categories ────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
            style={styles.filterScrollView}
          >
            {(
              [
                { key: 'all', label: 'All (5)' },
                { key: 'flights', label: 'Flights & Rail' },
                { key: 'hotels', label: 'Hotels' },
                { key: 'passports', label: 'Passports' },
                { key: 'insurance', label: 'Insurance' },
              ] as const
            ).map((filter) => {
              const isActive = activeCategory === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setActiveCategory(filter.key)}
                  style={[
                    styles.filterChip,
                    isActive && styles.filterChipActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter ${filter.label}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

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
                  All booking confirmations & documents available offline
                </Text>
              </View>
            </View>
            <View style={styles.syncBadge}>
              <Text style={styles.syncText}>OFFLINE READY</Text>
            </View>
          </View>

          {/* ── 3. Document Cards List ───────────────────────────────────── */}
          <View style={styles.cardsList}>
            {filteredDocs.map((doc) => (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docCardHeader}>
                  <View style={styles.docTypeWrapper}>
                    <View style={styles.docIconCircle}>
                      <Image
                        source={getCategoryIcon(doc.category)}
                        style={styles.docIcon}
                        tintColor={colors.primary}
                        contentFit="contain"
                      />
                    </View>
                    <View>
                      <Text style={styles.docTypeLabel}>{doc.typeLabel}</Text>
                      <Text style={styles.docReferenceNumber}>
                        {doc.referenceNumber}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      {doc.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.docTitle} numberOfLines={2}>
                  {doc.title}
                </Text>

                <View style={styles.docDivider} />

                <View style={styles.docFooterRow}>
                  <Text style={styles.docTravelerText}>{doc.traveler}</Text>
                  <Text style={styles.docValidityText}>{doc.validUntil}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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

  // --- Category Filters ---
  filterScrollView: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  filterScrollContent: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textOnPrimary,
    fontWeight: '600',
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
    width: 22,
    height: 22,
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

  // --- Cards List ---
  cardsList: {
    gap: spacing.md,
  },
  docCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...shadows.card,
  },
  docCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  docTypeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  docIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIcon: {
    width: 16,
    height: 16,
  },
  docTypeLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
  docReferenceNumber: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    backgroundColor: 'rgba(44, 95, 94, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 9,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  docTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  docDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    marginBottom: spacing.sm,
  },
  docFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docTravelerText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  docValidityText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    color: colors.textMuted,
  },
});
