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
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
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

function isUrl(str?: string | null): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.includes('maps.app.goo.gl') ||
    trimmed.includes('google.com/maps')
  );
}

function cleanLocationText(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (isUrl(trimmed)) {
    return 'Location on map';
  }
  return trimmed;
}

function getTypePresentation(item: ConcreteItineraryItem): TypePresentation {
  switch (item.type) {
    case 'flight': {
      const meta = item.metadata as FlightMetadata;
      // Primary detail: airline and flight number
      const airlineInfo =
        meta?.airline && meta?.flightNumber
          ? `${meta.airline} · ${meta.flightNumber}`
          : meta?.airline ||
            (meta?.flightNumber ? `Flight ${meta.flightNumber}` : '') ||
            (meta?.departureAirport && meta?.arrivalAirport
              ? `${meta.departureAirport} → ${meta.arrivalAirport}`
              : cleanLocationText(item.location) || 'Flight');

      // Secondary detail: Terminal, Gate, Seat
      const seatInfo = [
        meta?.terminal ? `T${meta.terminal}` : null,
        meta?.gate ? `Gate ${meta.gate}` : null,
        meta?.seat ? `Seat ${meta.seat}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      // Fallback secondary detail if seat/gate/terminal are missing:
      // Show route or cabin class if available
      const fallbackSecondary =
        meta?.departureAirport && meta?.arrivalAirport && airlineInfo.includes(meta?.airline || '')
          ? `${meta.departureAirport} → ${meta.arrivalAirport}`
          : meta?.cabinClass
          ? `${meta.cabinClass.charAt(0).toUpperCase() + meta.cabinClass.slice(1)} Class`
          : cleanLocationText(item.location);

      return {
        categoryLabel: 'Flight',
        icon: require('@/assets/images/icons/flight.svg'),
        primaryDetail: airlineInfo,
        secondaryDetail: seatInfo || fallbackSecondary,
      };
    }

    case 'hotel': {
      const meta = item.metadata as HotelMetadata;

      // Clean address / location so long addresses and raw URLs never dominate the card
      let addressOrCity = '';
      if (meta?.address && !isUrl(meta.address)) {
        addressOrCity = meta.address.trim();
      } else if (item.location && !isUrl(item.location)) {
        addressOrCity = item.location.trim();
      } else if (meta?.address || item.location) {
        addressOrCity = 'Location on map';
      } else {
        addressOrCity = 'Lodging';
      }

      // Room & stay information
      const roomParts: string[] = [];
      if (meta?.roomType) {
        roomParts.push(meta.roomType);
      }
      if (
        meta?.room &&
        (!meta.roomType || !meta.roomType.toLowerCase().includes(meta.room.toLowerCase()))
      ) {
        roomParts.push(meta.room);
      }
      if (meta?.nightsCount && meta.nightsCount > 0) {
        roomParts.push(
          `${meta.nightsCount} ${meta.nightsCount === 1 ? 'night' : 'nights'}`
        );
      }
      const roomOrType = roomParts.length > 0 ? roomParts.join(' · ') : 'Reserved Room';

      return {
        categoryLabel: 'Hotel',
        icon: require('@/assets/images/icons/hotel.svg'),
        primaryDetail: addressOrCity,
        secondaryDetail: roomOrType,
      };
    }

    case 'activity': {
      const meta = item.metadata as ActivityMetadata;
      const category = meta?.category || 'Activity';

      // Primary detail: Meeting point or clean location
      const locationDetail =
        meta?.meetingPoint?.trim() ||
        cleanLocationText(item.location) ||
        'Explore';

      // Secondary detail: Duration & ticket info
      const activityMeta = [
        meta?.duration?.trim(),
        meta?.ticketInformation?.trim(),
      ]
        .filter(Boolean)
        .join(' · ');

      return {
        categoryLabel: category,
        icon: require('@/assets/images/icons/landscape.svg'),
        primaryDetail: locationDetail,
        secondaryDetail:
          activityMeta || (meta?.guideName ? `Guide: ${meta.guideName}` : undefined),
      };
    }

    case 'transportation': {
      const meta = item.metadata as TransportationMetadata;
      let transLabel = 'Transit';
      let icon = require('@/assets/images/icons/train.svg');
      if (meta?.transportationType === 'train') {
        transLabel = 'Train';
        icon = require('@/assets/images/icons/train.svg');
      } else if (meta?.transportationType === 'rental_car') {
        transLabel = 'Rental Car';
        icon = require('@/assets/images/icons/car.svg');
      } else if (meta?.transportationType === 'ferry') {
        transLabel = 'Ferry';
        icon = require('@/assets/images/icons/compass.svg');
      } else if (meta?.transportationType === 'bus') {
        transLabel = 'Bus';
        icon = require('@/assets/images/icons/bus.svg');
      } else if (meta?.transportationType === 'taxi') {
        transLabel = 'Taxi';
        icon = require('@/assets/images/icons/taxi.svg');
      } else {
        icon = require('@/assets/images/icons/compass.svg');
      }

      const route =
        meta?.from && meta?.to
          ? `${meta.from} → ${meta.to}`
          : meta?.provider || cleanLocationText(item.location) || 'Transit Route';

      const seatOrPlatform = [
        meta?.platform
          ? meta.platform.toLowerCase().startsWith('platform')
            ? meta.platform
            : `Platform ${meta.platform}`
          : null,
        meta?.seat
          ? meta.seat.toLowerCase().startsWith('seat') ||
            meta.seat.toLowerCase().startsWith('car')
            ? meta.seat
            : `Seat ${meta.seat}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ');

      return {
        categoryLabel: transLabel,
        icon,
        primaryDetail: route,
        secondaryDetail:
          seatOrPlatform ||
          (meta?.provider && meta?.from ? meta.provider : undefined),
      };
    }

    default:
      return {
        categoryLabel: 'Event',
        icon: require('@/assets/images/icons/list-alt.svg'),
        primaryDetail: cleanLocationText((item as any)?.location) || '',
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
  const confirmationCode =
    item.confirmationNumber || (item.metadata as any)?.bookingNumber;
  const displayConfirmation = confirmationCode
    ? confirmationCode.startsWith('#')
      ? confirmationCode
      : `#${confirmationCode}`
    : null;

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    }
  };

  const accessibleLabelParts = [
    presentation.categoryLabel,
    item.title,
    timeString ? `at ${timeString}` : null,
    presentation.primaryDetail ? presentation.primaryDetail : null,
    presentation.secondaryDetail ? presentation.secondaryDetail : null,
    showConfirmation && displayConfirmation
      ? `confirmation ${displayConfirmation}`
      : null,
  ].filter(Boolean);
  const accessibilityLabelText = accessibleLabelParts.join(', ');

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
      accessibilityLabel={accessibilityLabelText}
      accessibilityHint={
        onPress ? 'Double tap to view details or edit this reservation' : undefined
      }
      hitSlop={6}
    >
      {/* Top Header Row: Category Badge + Start Time */}
      <View style={styles.headerRow}>
        <View style={styles.categoryBadgeContainer}>
          <Text style={styles.categoryLabel} numberOfLines={1}>
            {presentation.categoryLabel}
          </Text>
        </View>
        <Text style={styles.timeLabel} numberOfLines={1}>
          {timeString}
        </Text>
      </View>

      {/* Main Title: Generous space, up to 2 lines, resilient to long titles */}
      <Text style={styles.titleText} numberOfLines={2} ellipsizeMode="tail">
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
            accessibilityElementsHidden={true}
            importantForAccessibility="no"
          />
          <Text
            style={styles.primaryDetailText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {presentation.primaryDetail}
          </Text>
        </View>
      ) : null}

      {/* Secondary Meta Row / Optional Badges */}
      {Boolean(presentation.secondaryDetail || (showConfirmation && displayConfirmation)) ? (
        <View style={styles.footerRow}>
          {presentation.secondaryDetail ? (
            <Text
              style={styles.secondaryDetailText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {presentation.secondaryDetail}
            </Text>
          ) : (
            <View style={styles.flexSpacer} />
          )}

          {showConfirmation && displayConfirmation ? (
            <View style={styles.confirmationBadge}>
              <Text
                style={styles.confirmationBadgeText}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {displayConfirmation}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
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
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 0,
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
    minWidth: 0,
  },
  categoryBadgeContainer: {
    flex: 1,
    marginRight: spacing.xs,
  },
  categoryLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 9.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.primary,
  },
  timeLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
    flexShrink: 0,
  },
  titleText: {
    fontFamily: typography.cardTitle.fontFamily,
    fontSize: 14.5,
    lineHeight: 19.5,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
    minWidth: 0,
  },
  metaIcon: {
    width: 13,
    height: 13,
    flexShrink: 0,
  },
  primaryDetailText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.textSecondary,
    flex: 1,
    minWidth: 0,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundAlt,
    minWidth: 0,
  },
  secondaryDetailText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.textMuted,
    flex: 1,
    minWidth: 0,
  },
  flexSpacer: {
    flex: 1,
  },
  confirmationBadge: {
    backgroundColor: colors.primarySurface,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    marginLeft: spacing.xs,
    flexShrink: 0,
    maxWidth: '45%',
  },
  confirmationBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 9,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.3,
  },
});

export default ItineraryItemCard;
