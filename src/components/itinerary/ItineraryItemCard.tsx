/**
 * Voyaro UI — ItineraryItemCard (Phase 5)
 *
 * Reusable card system for displaying itinerary items across the application.
 *
 * Features:
 *   - Shared layout structure: Type label, time, title, type-specific meta row, and optional badges.
 *   - Modular presentation layer for Flight, Hotel, Activity, and Transportation.
 *   - Fully reusable with zero code duplication.
 *   - Interactive press animations built using Voyaro design tokens.
 */

import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { formatItineraryTime } from '@/utils/itineraryDateUtils';
import {
  ActivityMetadata,
  ConcreteItineraryItem,
  FlightMetadata,
  HotelMetadata,
  TransportationMetadata,
} from '@/types/itinerary';

// ---------------------------------------------------------------------------
// Props Interface
// ---------------------------------------------------------------------------

export interface ItineraryItemCardProps {
  /** The concrete itinerary item (Flight, Hotel, Activity, Transportation) */
  item: ConcreteItineraryItem;
  /** Optional click/tap handler */
  onPress?: (item: ConcreteItineraryItem) => void;
  /** Whether to show confirmation code badge if available */
  showConfirmation?: boolean;
  /** Custom container style override */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Type-Specific Presentation Helpers
// ---------------------------------------------------------------------------

interface TypePresentation {
  categoryLabel: string;
  icon: any;
  primaryDetail: string;
  secondaryDetail?: string;
}

function getTypePresentation(item: ConcreteItineraryItem): TypePresentation {
  switch (item.type) {
    case 'flight': {
      const meta = item.metadata as FlightMetadata;
      const airlineInfo =
        meta?.airline && meta?.flightNumber
          ? `${meta.airline} · ${meta.flightNumber}`
          : meta?.airline || meta?.flightNumber || 'Flight';

      const seatInfo = [
        meta?.terminal ? `T${meta.terminal}` : null,
        meta?.gate ? `Gate ${meta.gate}` : null,
        meta?.seat ? `Seat ${meta.seat}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      return {
        categoryLabel: 'Flight',
        icon: require('@/assets/images/icons/flight.svg'),
        primaryDetail: airlineInfo,
        secondaryDetail: seatInfo || item.location,
      };
    }

    case 'hotel': {
      const meta = item.metadata as HotelMetadata;
      const roomOrType = meta?.roomType || meta?.room || 'Reserved Room';
      const addressOrCity = meta?.address || item.location || 'Lodging';

      return {
        categoryLabel: 'Hotel Check-in',
        icon: require('@/assets/images/icons/hotel.svg'),
        primaryDetail: addressOrCity,
        secondaryDetail: roomOrType,
      };
    }

    case 'activity': {
      const meta = item.metadata as ActivityMetadata;
      const category = meta?.category || 'Explore';
      const detail = meta?.meetingPoint || meta?.duration || item.location || 'Activity';

      return {
        categoryLabel: category,
        icon: require('@/assets/images/icons/landscape.svg'),
        primaryDetail: item.location || detail,
        secondaryDetail: meta?.ticketInformation,
      };
    }

    case 'transportation': {
      const meta = item.metadata as TransportationMetadata;
      let transLabel = 'Transportation';
      if (meta?.transportationType === 'train') transLabel = 'Train';
      else if (meta?.transportationType === 'rental_car') transLabel = 'Rental Car';
      else if (meta?.transportationType === 'ferry') transLabel = 'Ferry';
      else if (meta?.transportationType === 'bus') transLabel = 'Bus';

      const route =
        meta?.from && meta?.to
          ? `${meta.from} → ${meta.to}`
          : meta?.provider || item.location || 'Transit';

      const seatOrPlatform = [meta?.platform, meta?.seat]
        .filter(Boolean)
        .join(' · ');

      return {
        categoryLabel: transLabel,
        icon: require('@/assets/images/onboarding/flight-takeoff.svg'),
        primaryDetail: route,
        secondaryDetail: seatOrPlatform,
      };
    }

    default:
      return {
        categoryLabel: 'Event',
        icon: require('@/assets/images/icons/list-alt.svg'),
        primaryDetail: '',
      };
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ItineraryItemCard({
  item,
  onPress,
  showConfirmation = false,
  style,
  testID,
}: ItineraryItemCardProps) {
  const presentation = getTypePresentation(item);
  const timeString = formatItineraryTime(item.startDateTime);

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    }
  };

  return (
    <Pressable
      testID={testID}
      onPress={onPress ? handlePress : undefined}
      style={({ pressed }) => [
        styles.cardContainer,
        pressed && onPress && styles.cardPressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${presentation.categoryLabel}: ${item.title}`}
    >
      {/* Top Header Row: Category Badge + Start Time */}
      <View style={styles.headerRow}>
        <Text style={styles.categoryLabel} numberOfLines={1}>
          {presentation.categoryLabel}
        </Text>
        <Text style={styles.timeLabel}>{timeString}</Text>
      </View>

      {/* Main Title */}
      <Text style={styles.titleText} numberOfLines={2}>
        {item.title}
      </Text>

      {/* Primary Detail Row with Type-Specific Icon */}
      {presentation.primaryDetail ? (
        <View style={styles.metaRow}>
          <Image
            source={presentation.icon}
            style={styles.metaIcon}
            contentFit="contain"
            tintColor={colors.textSecondary}
          />
          <Text style={styles.primaryDetailText} numberOfLines={1}>
            {presentation.primaryDetail}
          </Text>
        </View>
      ) : null}

      {/* Secondary Meta Row / Optional Badges */}
      {(presentation.secondaryDetail || (showConfirmation && item.confirmationNumber)) && (
        <View style={styles.footerRow}>
          {presentation.secondaryDetail ? (
            <Text style={styles.secondaryDetailText} numberOfLines={1}>
              {presentation.secondaryDetail}
            </Text>
          ) : <View style={styles.flexSpacer} />}

          {showConfirmation && item.confirmationNumber ? (
            <View style={styles.confirmationBadge}>
              <Text style={styles.confirmationBadgeText}>
                #{item.confirmationNumber}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  timeLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  titleText: {
    fontFamily: typography.cardTitle.fontFamily,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: 2,
  },
  metaIcon: {
    width: 14,
    height: 14,
  },
  primaryDetailText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundAlt,
  },
  secondaryDetailText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  flexSpacer: {
    flex: 1,
  },
  confirmationBadge: {
    backgroundColor: colors.primarySurface,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  confirmationBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.3,
  },
});

export default ItineraryItemCard;
