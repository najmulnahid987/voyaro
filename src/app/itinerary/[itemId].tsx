/**
 * Route: /itinerary/[itemId] — Itinerary Item Details Screen (Phase 5)
 *
 * Requirements:
 *  - Use itemId to retrieve item from centralized in-memory itinerary state (useItineraryItem).
 *  - Render a type-aware detail view across:
 *      * FLIGHT: airline, flight number, departure, arrival, airport codes/names, terminal, gate, seat, confirmation, notes
 *      * HOTEL: hotel, address, check-in, check-out, room, guest, confirmation, notes
 *      * ACTIVITY: activity, location, date, time, category, duration, website, ticket information, notes
 *      * TRANSPORTATION: type, from, to, date, departure, arrival, booking number, seat, notes
 *  - Actions: Edit, Delete (with confirmation and immediate reactive update)
 *  - Safe-area aware, responsive, uses existing Phase 1 Voyaro tokens and components.
 *  - No backend, no maps, no external APIs.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { deleteItem, useItineraryItem } from '@/services/itineraryStore';
import {
  ActivityMetadata,
  ConcreteItineraryItem,
  FlightMetadata,
  HotelMetadata,
  TransportationMetadata,
} from '@/types/itinerary';
import {
  formatItineraryDate,
  formatItineraryTime,
} from '@/utils/itineraryDateUtils';
import { Button, Card } from '@/components/ui';
import { fetchUserTripRole } from '@/services/collaboration';
import { canGetDirections, openDestinationDirections } from '@/utils/mapDirections';

export default function ItineraryItemDetailScreen() {
  const { itemId, tripId } = useLocalSearchParams<{ itemId: string; tripId?: string }>();
  const insets = useSafeAreaInsets();

  // 1. Reactive item state from store
  const { item, exists, loading } = useItineraryItem(itemId);

  // 2. Modals state for Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);

  const effectiveTripId = item?.tripId || tripId;

  useEffect(() => {
    if (effectiveTripId) {
      fetchUserTripRole(effectiveTripId).then((r) => setUserRole(r));
    }
  }, [effectiveTripId]);

  // ---------------------------------------------------------------------------
  // Navigation Handlers
  // ---------------------------------------------------------------------------
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (effectiveTripId) {
      router.push(`/(tabs)/trips/${effectiveTripId}/map` as any);
    } else {
      router.push('/(tabs)/trips');
    }
  };

  const handleEditPress = () => {
    if (!item) return;
    router.push({
      pathname: `/add/${item.type}` as any,
      params: { itemId: item.id, tripId: effectiveTripId },
    });
  };

  const handleDeletePress = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!item || !itemId || isDeleting) return;
    const targetTripId = effectiveTripId;
    setIsDeleting(true);
    try {
      await deleteItem(itemId);
      setShowDeleteConfirm(false);
      if (targetTripId) {
        router.replace(`/(tabs)/trips/${targetTripId}/itinerary` as any);
      } else {
        router.replace('/(tabs)/trips' as any);
      }
    } catch (err: any) {
      console.error('Failed to delete itinerary item:', err);
      setIsDeleting(false);
      Alert.alert('Error', err?.message || 'Failed to delete reservation. Please try again.');
    }
  };

  // ---------------------------------------------------------------------------
  // Initial Loading State
  // ---------------------------------------------------------------------------
  if (loading && !item) {
    return (
      <View
        style={[
          styles.screen,
          {
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.textSecondary, ...typography.body }}>
          Loading reservation details...
        </Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty / Not Found State
  // ---------------------------------------------------------------------------
  if (!exists || !item) {
    return (
      <View
        style={[
          styles.screen,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.iconCircleButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityLabel="Back"
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>Reservation</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIconCircle}>
            <Image
              source={require('@/assets/images/icons/list-alt.svg')}
              style={styles.notFoundIcon}
              contentFit="contain"
              tintColor={colors.primary}
            />
          </View>
          <Text style={styles.notFoundTitle}>Reservation Not Found</Text>
          <Text style={styles.notFoundSubtitle}>
            This itinerary item may have been deleted or does not exist in your current trip.
          </Text>
          <Button
            label="Back to Itinerary"
            variant="primary"
            onPress={handleBack}
            style={styles.notFoundButton}
          />
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Main Type-Specific Render Helpers
  // ---------------------------------------------------------------------------
  return (
    <View style={styles.screen}>
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 16 : 12) + 6,
          },
        ]}
      >
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.iconCircleButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityLabel="Back"
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <Text style={styles.topBarTitle}>Reservation Details</Text>

        <View style={styles.topBarActions}>
          {userRole !== 'viewer' && (
            <>
              <Pressable
                onPress={handleEditPress}
                style={({ pressed }) => [
                  styles.iconCircleButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityLabel="Edit reservation"
              >
                <Text style={styles.editIconText}>✎</Text>
              </Pressable>

              <Pressable
                onPress={handleDeletePress}
                style={({ pressed }) => [
                  styles.deleteCircleButton,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityLabel="Delete reservation"
              >
                <Image
                  source={require('@/assets/images/icons/close.svg')}
                  style={styles.deleteIcon}
                  tintColor={colors.destructive}
                  contentFit="contain"
                />
              </Pressable>
            </>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 24) + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Hero Summary Card ─────────────────────────────────────── */}
        <HeroSummaryCard item={item} onEdit={handleEditPress} />

        {/* ── 2. Type-Specific Details ─────────────────────────────────── */}
        {item.type === 'flight' && (
          <FlightDetailView item={item as ConcreteItineraryItem & { metadata: FlightMetadata }} />
        )}
        {item.type === 'hotel' && (
          <HotelDetailView item={item as ConcreteItineraryItem & { metadata: HotelMetadata }} />
        )}
        {item.type === 'activity' && (
          <ActivityDetailView item={item as ConcreteItineraryItem & { metadata: ActivityMetadata }} />
        )}
        {item.type === 'transportation' && (
          <TransportationDetailView
            item={item as ConcreteItineraryItem & { metadata: TransportationMetadata }}
          />
        )}

        {/* ── 3. Notes Section (All Types) ─────────────────────────────── */}
        {item.notes ? (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Notes & Reminders</Text>
            <Card style={styles.notesCard} variant="standard">
              <Text style={styles.notesText}>{item.notes}</Text>
            </Card>
          </View>
        ) : null}

        {/* ── 4. Bottom Actions ────────────────────────────────────────── */}
        {userRole !== 'viewer' && (
          <View style={styles.actionRowContainer}>
            <Button
              label="Edit Reservation"
              variant="outline"
              onPress={handleEditPress}
              style={styles.actionButton}
            />
            <Button
              label="Delete"
              variant="destructive"
              onPress={handleDeletePress}
              style={styles.actionButton}
            />
          </View>
        )}
      </ScrollView>

      {/* ── 5. Delete Confirmation Dialog ──────────────────────────────── */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          visible={showDeleteConfirm}
          itemTitle={item.title}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </View>
  );
}

// ===========================================================================
// SUB-COMPONENT: Hero Summary Card
// ===========================================================================

function HeroSummaryCard({
  item,
}: {
  item: ConcreteItineraryItem;
  onEdit: () => void;
}) {
  const typeConfig = useMemo(() => {
    switch (item.type) {
      case 'flight':
        return {
          label: 'Flight',
          icon: require('@/assets/images/icons/flight.svg'),
        };
      case 'hotel':
        return {
          label: 'Hotel Reservation',
          icon: require('@/assets/images/icons/hotel.svg'),
        };
      case 'activity':
        return {
          label: (item.metadata as ActivityMetadata)?.category || 'Activity',
          icon: require('@/assets/images/icons/landscape.svg'),
        };
      case 'transportation':
        return {
          label: 'Transportation',
          icon: require('@/assets/images/icons/swap-vert.svg'),
        };
      default:
        return {
          label: 'Reservation',
          icon: require('@/assets/images/icons/ticket.svg'),
        };
    }
  }, [item]);

  const dateDisplay = useMemo(() => {
    const startDay = formatItineraryDate(item.startDateTime, 'full');
    const startTime = formatItineraryTime(item.startDateTime);
    if (!item.endDateTime) {
      return `${startDay} · ${startTime}`;
    }
    const endTime = formatItineraryTime(item.endDateTime);
    const endDay = formatItineraryDate(item.endDateTime, 'short');
    return `${startDay} · ${startTime} – ${endDay !== formatItineraryDate(item.startDateTime, 'short') ? `${endDay}, ` : ''}${endTime}`;
  }, [item.startDateTime, item.endDateTime]);

  return (
    <Card style={styles.heroCard} variant="elevated">
      {/* Category Pill & Status Row */}
      <View style={styles.heroTopRow}>
        <View style={styles.categoryBadgeContainer}>
          <Image
            source={typeConfig.icon}
            style={styles.categoryBadgeIcon}
            tintColor={colors.primary}
            contentFit="contain"
          />
          <Text style={styles.categoryBadgeText}>{typeConfig.label.toUpperCase()}</Text>
        </View>

        {item.confirmationNumber ? (
          <View style={styles.confirmationPill}>
            <Image
              source={require('@/assets/images/icons/ticket.svg')}
              style={styles.confirmationPillIcon}
              tintColor={colors.textSecondary}
              contentFit="contain"
            />
            <Text style={styles.confirmationPillText}>
              {item.confirmationNumber}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Main Title */}
      <Text style={styles.heroTitle}>{item.title}</Text>

      {/* Location / Route Subtitle */}
      {item.location ? (
        <View style={styles.heroLocationRow}>
          <Image
            source={require('@/assets/images/icons/location-pin.svg')}
            style={styles.heroLocationIcon}
            tintColor={colors.textMuted}
            contentFit="contain"
          />
          <Text style={styles.heroLocationText} numberOfLines={2}>
            {item.location}
          </Text>
        </View>
      ) : null}

      {/* Date & Time Highlight */}
      <View style={styles.heroDateTimeRow}>
        <Image
          source={require('@/assets/images/icons/clock.svg')}
          style={styles.heroClockIcon}
          tintColor={colors.primary}
          contentFit="contain"
        />
        <Text style={styles.heroDateTimeText}>{dateDisplay}</Text>
      </View>

      {/* External Destination Directions Action */}
      {canGetDirections({
        latitude: item.latitude,
        longitude: item.longitude,
        address: item.location,
      }) ? (
        <View style={styles.heroDirectionsRow}>
          <Pressable
            onPress={() =>
              openDestinationDirections({
                latitude: item.latitude,
                longitude: item.longitude,
                address: item.location,
                label: item.title,
              })
            }
            style={({ pressed }) => [
              styles.heroDirectionsButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Get directions to ${item.title} in external maps`}
          >
            <Image
              source={require('@/assets/images/icons/location-pin.svg')}
              style={styles.heroDirectionsIcon}
              tintColor={colors.primary}
              contentFit="contain"
            />
            <Text style={styles.heroDirectionsText}>Get Directions in Maps ↗</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

// ===========================================================================
// SUB-COMPONENT: Flight Details View
// ===========================================================================

function FlightDetailView({
  item,
}: {
  item: ConcreteItineraryItem & { metadata: FlightMetadata };
}) {
  const meta = item.metadata || {};
  const depTime = formatItineraryTime(item.startDateTime);
  const arrTime = formatItineraryTime(item.endDateTime);
  const depDate = formatItineraryDate(item.startDateTime, 'short');
  const arrDate = formatItineraryDate(item.endDateTime, 'short');

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeading}>Flight Information</Text>

      {/* Route & Airport Card */}
      <Card style={styles.detailCard} variant="standard">
        <View style={styles.routeHeaderRow}>
          {/* Departure */}
          <View style={styles.airportBlock}>
            <Text style={styles.airportCode}>
              {meta.departureAirport || 'DEP'}
            </Text>
            <Text style={styles.cityName}>
              {meta.departureCity || 'Departure'}
            </Text>
            <Text style={styles.scheduleTime}>{depTime}</Text>
            <Text style={styles.scheduleDate}>{depDate}</Text>
          </View>

          {/* Route Line with Plane */}
          <View style={styles.flightPathMiddle}>
            <View style={styles.flightPathDottedLine} />
            <View style={styles.flightIconCircle}>
              <Image
                source={require('@/assets/images/icons/flight.svg')}
                style={styles.flightPathPlaneIcon}
                tintColor={colors.primary}
                contentFit="contain"
              />
            </View>
            <View style={styles.flightPathDottedLine} />
          </View>

          {/* Arrival */}
          <View style={[styles.airportBlock, styles.airportBlockRight]}>
            <Text style={styles.airportCode}>
              {meta.arrivalAirport || 'ARR'}
            </Text>
            <Text style={styles.cityName}>
              {meta.arrivalCity || 'Arrival'}
            </Text>
            <Text style={styles.scheduleTime}>{arrTime || '—'}</Text>
            <Text style={styles.scheduleDate}>{arrDate || depDate}</Text>
          </View>
        </View>

        {/* Airport External Directions Actions */}
        {(canGetDirections({
          latitude: item.latitude,
          longitude: item.longitude,
          address: meta.departureAirport ? `${meta.departureAirport} Airport` : meta.departureCity,
        }) ||
          canGetDirections({
            latitude: item.endLatitude,
            longitude: item.endLongitude,
            address: meta.arrivalAirport ? `${meta.arrivalAirport} Airport` : meta.arrivalCity,
          })) && (
          <View style={styles.transportRouteActionsRow}>
            {canGetDirections({
              latitude: item.latitude,
              longitude: item.longitude,
              address: meta.departureAirport ? `${meta.departureAirport} Airport` : meta.departureCity,
            }) && (
              <Pressable
                onPress={() =>
                  openDestinationDirections({
                    latitude: item.latitude,
                    longitude: item.longitude,
                    address: meta.departureAirport ? `${meta.departureAirport} Airport` : meta.departureCity,
                    label: meta.departureAirport || 'Departure Airport',
                  })
                }
                style={({ pressed }) => [
                  styles.transportDirectionPill,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Get directions to departure airport in maps"
              >
                <Image
                  source={require('@/assets/images/icons/location-pin.svg')}
                  style={styles.transportDirectionPillIcon}
                  tintColor={colors.primary}
                  contentFit="contain"
                />
                <Text style={styles.transportDirectionPillText}>Directions to Departure Airport ↗</Text>
              </Pressable>
            )}

            {canGetDirections({
              latitude: item.endLatitude,
              longitude: item.endLongitude,
              address: meta.arrivalAirport ? `${meta.arrivalAirport} Airport` : meta.arrivalCity,
            }) && (
              <Pressable
                onPress={() =>
                  openDestinationDirections({
                    latitude: item.endLatitude,
                    longitude: item.endLongitude,
                    address: meta.arrivalAirport ? `${meta.arrivalAirport} Airport` : meta.arrivalCity,
                    label: meta.arrivalAirport || 'Arrival Airport',
                  })
                }
                style={({ pressed }) => [
                  styles.transportDirectionPill,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Get directions to arrival airport in maps"
              >
                <Image
                  source={require('@/assets/images/icons/location-pin.svg')}
                  style={styles.transportDirectionPillIcon}
                  tintColor={colors.primary}
                  contentFit="contain"
                />
                <Text style={styles.transportDirectionPillText}>Directions to Arrival Airport ↗</Text>
              </Pressable>
            )}
          </View>
        )}
      </Card>

      {/* Flight Specs Grid */}
      <View style={styles.infoGrid}>
        <DetailGridTile
          label="Airline"
          value={meta.airline || '—'}
          icon={require('@/assets/images/icons/flight.svg')}
        />
        <DetailGridTile
          label="Flight Number"
          value={meta.flightNumber || '—'}
          icon={require('@/assets/images/icons/hash.svg')}
        />
        <DetailGridTile
          label="Terminal"
          value={meta.terminal ? `Terminal ${meta.terminal}` : '—'}
          icon={require('@/assets/images/icons/location-pin.svg')}
        />
        <DetailGridTile
          label="Gate"
          value={meta.gate ? `Gate ${meta.gate}` : '—'}
          icon={require('@/assets/images/icons/location-pin.svg')}
        />
        <DetailGridTile
          label="Seat"
          value={meta.seat ? `Seat ${meta.seat}` : '—'}
          icon={require('@/assets/images/icons/ticket.svg')}
        />
        <DetailGridTile
          label="Cabin Class"
          value={
            meta.cabinClass
              ? meta.cabinClass.charAt(0).toUpperCase() + meta.cabinClass.slice(1)
              : 'Economy'
          }
          icon={require('@/assets/images/icons/sparkles.svg')}
        />
      </View>
    </View>
  );
}

// ===========================================================================
// SUB-COMPONENT: Hotel Details View
// ===========================================================================

function HotelDetailView({
  item,
}: {
  item: ConcreteItineraryItem & { metadata: HotelMetadata };
}) {
  const meta = item.metadata || {};
  const checkInDateStr = formatItineraryDate(item.startDateTime, 'full');
  const checkOutDateStr = formatItineraryDate(item.endDateTime, 'full');
  const checkInTimeStr = meta.checkIn || formatItineraryTime(item.startDateTime) || '3:00 PM';
  const checkOutTimeStr = meta.checkOut || formatItineraryTime(item.endDateTime) || '11:00 AM';

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeading}>Hotel & Stay Details</Text>

      {/* Property & Address Card */}
      <Card style={styles.detailCard} variant="standard">
        <View style={styles.hotelHeaderRow}>
          <View style={styles.hotelIconCircle}>
            <Image
              source={require('@/assets/images/icons/hotel.svg')}
              style={styles.hotelHeaderIcon}
              tintColor={colors.primary}
              contentFit="contain"
            />
          </View>
          <View style={styles.hotelTitleBlock}>
            <Text style={styles.hotelPropertyTitle}>
              {meta.hotelName || item.title}
            </Text>
            <Text style={styles.hotelAddressText}>
              {meta.address || item.location || 'Address on booking'}
            </Text>
          </View>
        </View>

        {canGetDirections({
          latitude: item.latitude,
          longitude: item.longitude,
          address: meta.address || item.location,
        }) && (
          <Pressable
            onPress={() =>
              openDestinationDirections({
                latitude: item.latitude,
                longitude: item.longitude,
                address: meta.address || item.location,
                label: meta.hotelName || item.title,
              })
            }
            style={({ pressed }) => [
              styles.sectionDirectionsButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Get directions to ${meta.hotelName || item.title} in maps`}
          >
            <Image
              source={require('@/assets/images/icons/location-pin.svg')}
              style={styles.sectionDirectionsIcon}
              tintColor={colors.primary}
              contentFit="contain"
            />
            <Text style={styles.sectionDirectionsText}>Get Directions to Hotel ↗</Text>
          </Pressable>
        )}
      </Card>

      {/* Check-In / Check-Out Grid */}
      <View style={styles.twoColumnCardRow}>
        <Card style={styles.halfCard} variant="standard">
          <Text style={styles.checkDateLabel}>CHECK-IN</Text>
          <Text style={styles.checkDateValue}>
            {formatItineraryDate(item.startDateTime, 'short')}
          </Text>
          <Text style={styles.checkTimeValue}>{checkInTimeStr}</Text>
          <Text style={styles.checkSubDate}>{checkInDateStr.split(',')[0]}</Text>
        </Card>

        <Card style={styles.halfCard} variant="standard">
          <Text style={styles.checkDateLabel}>CHECK-OUT</Text>
          <Text style={styles.checkDateValue}>
            {formatItineraryDate(item.endDateTime, 'short')}
          </Text>
          <Text style={styles.checkTimeValue}>{checkOutTimeStr}</Text>
          <Text style={styles.checkSubDate}>
            {checkOutDateStr ? checkOutDateStr.split(',')[0] : '—'}
          </Text>
        </Card>
      </View>

      {/* Stay Specs Grid */}
      <View style={styles.infoGrid}>
        <DetailGridTile
          label="Room"
          value={meta.room || meta.roomType || 'Reserved'}
          icon={require('@/assets/images/icons/hotel.svg')}
        />
        <DetailGridTile
          label="Room Type"
          value={meta.roomType || meta.room || 'Standard'}
          icon={require('@/assets/images/icons/sparkles.svg')}
        />
        <DetailGridTile
          label="Guest Name"
          value={meta.guestName || 'Primary Traveler'}
          icon={require('@/assets/images/icons/group.svg')}
        />
        <DetailGridTile
          label="Nights"
          value={meta.nightsCount ? `${meta.nightsCount} Nights` : 'Scheduled Stay'}
          icon={require('@/assets/images/icons/calendar.svg')}
        />
      </View>
    </View>
  );
}

// ===========================================================================
// SUB-COMPONENT: Activity Details View
// ===========================================================================

function ActivityDetailView({
  item,
}: {
  item: ConcreteItineraryItem & { metadata: ActivityMetadata };
}) {
  const meta = item.metadata || {};

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeading}>Activity Schedule & Info</Text>

      {/* Activity Overview Card */}
      <Card style={styles.detailCard} variant="standard">
        <View style={styles.activityHeaderRow}>
          <View style={styles.activityIconCircle}>
            <Image
              source={require('@/assets/images/icons/landscape.svg')}
              style={styles.activityHeaderIcon}
              tintColor={colors.primary}
              contentFit="contain"
            />
          </View>
          <View style={styles.activityTitleBlock}>
            <Text style={styles.activityNameText}>{item.title}</Text>
            <Text style={styles.activityLocationText}>
              {meta.meetingPoint || item.location || 'Location details in confirmation'}
            </Text>
          </View>
        </View>

        {canGetDirections({
          latitude: item.latitude,
          longitude: item.longitude,
          address: meta.meetingPoint || item.location,
        }) && (
          <Pressable
            onPress={() =>
              openDestinationDirections({
                latitude: item.latitude,
                longitude: item.longitude,
                address: meta.meetingPoint || item.location,
                label: item.title,
              })
            }
            style={({ pressed }) => [
              styles.sectionDirectionsButton,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Get directions to ${item.title} in maps`}
          >
            <Image
              source={require('@/assets/images/icons/location-pin.svg')}
              style={styles.sectionDirectionsIcon}
              tintColor={colors.primary}
              contentFit="contain"
            />
            <Text style={styles.sectionDirectionsText}>Get Directions to Activity ↗</Text>
          </Pressable>
        )}
      </Card>

      {/* Info Specs Grid */}
      <View style={styles.infoGrid}>
        <DetailGridTile
          label="Date"
          value={formatItineraryDate(item.startDateTime, 'medium')}
          icon={require('@/assets/images/icons/calendar.svg')}
        />
        <DetailGridTile
          label="Time"
          value={formatItineraryTime(item.startDateTime) || 'Scheduled'}
          icon={require('@/assets/images/icons/clock.svg')}
        />
        <DetailGridTile
          label="Category"
          value={meta.category || 'Sightseeing'}
          icon={require('@/assets/images/icons/landscape.svg')}
        />
        <DetailGridTile
          label="Duration"
          value={meta.duration || 'Flexible'}
          icon={require('@/assets/images/icons/clock.svg')}
        />
      </View>

      {/* Ticket & Booking info card */}
      {(meta.ticketInformation || meta.website || meta.meetingPoint) ? (
        <Card style={styles.extraInfoCard} variant="standard">
          {meta.meetingPoint ? (
            <View style={styles.extraInfoRow}>
              <Text style={styles.extraInfoLabel}>Meeting Point:</Text>
              <Text style={styles.extraInfoValue}>{meta.meetingPoint}</Text>
            </View>
          ) : null}

          {meta.ticketInformation ? (
            <View style={styles.extraInfoRow}>
              <Text style={styles.extraInfoLabel}>Ticket Info:</Text>
              <Text style={styles.extraInfoValue}>{meta.ticketInformation}</Text>
            </View>
          ) : null}

          {meta.website ? (
            <View style={styles.extraInfoRow}>
              <Text style={styles.extraInfoLabel}>Website:</Text>
              <Text style={[styles.extraInfoValue, styles.linkText]}>
                {meta.website}
              </Text>
            </View>
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}

// ===========================================================================
// SUB-COMPONENT: Transportation Details View
// ===========================================================================

function TransportationDetailView({
  item,
}: {
  item: ConcreteItineraryItem & { metadata: TransportationMetadata };
}) {
  const meta = item.metadata || { transportationType: 'train', from: '', to: '' };
  const typeLabel =
    meta.transportationType === 'train'
      ? 'Train'
      : meta.transportationType === 'rental_car'
      ? 'Rental Car'
      : meta.transportationType === 'ferry'
      ? 'Ferry'
      : meta.transportationType === 'bus'
      ? 'Bus'
      : meta.transportationType === 'taxi'
      ? 'Taxi / Cab'
      : 'Ground Transport';

  const dateStr = formatItineraryDate(item.startDateTime, 'medium');
  const depTime = formatItineraryTime(item.startDateTime);
  const arrTime = formatItineraryTime(item.endDateTime);

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeading}>Journey Details</Text>

      {/* Route Card: From -> To */}
      <Card style={styles.detailCard} variant="standard">
        <View style={styles.transportRouteContainer}>
          {/* Origin */}
          <View style={styles.transportNodeRow}>
            <View style={styles.transportDotOrigin} />
            <View style={styles.transportNodeTextGroup}>
              <Text style={styles.transportNodeLabel}>FROM</Text>
              <Text style={styles.transportNodeValue}>
                {meta.from || item.location?.split('→')[0]?.trim() || 'Origin'}
              </Text>
              <Text style={styles.transportNodeTime}>{depTime}</Text>
            </View>
          </View>

          {/* Connecting vertical line */}
          <View style={styles.transportConnectorLine} />

          {/* Destination */}
          <View style={styles.transportNodeRow}>
            <View style={styles.transportDotDest} />
            <View style={styles.transportNodeTextGroup}>
              <Text style={styles.transportNodeLabel}>TO</Text>
              <Text style={styles.transportNodeValue}>
                {meta.to || item.location?.split('→')[1]?.trim() || 'Destination'}
              </Text>
              <Text style={styles.transportNodeTime}>{arrTime || 'Arrival'}</Text>
            </View>
          </View>
        </View>

        {/* External Directions for Departure and Arrival Stations */}
        {(canGetDirections({
          latitude: item.latitude,
          longitude: item.longitude,
          address: meta.from || item.location?.split('→')[0]?.trim(),
        }) ||
          canGetDirections({
            latitude: item.endLatitude,
            longitude: item.endLongitude,
            address: meta.to || item.location?.split('→')[1]?.trim(),
          })) && (
          <View style={styles.transportRouteActionsRow}>
            {canGetDirections({
              latitude: item.latitude,
              longitude: item.longitude,
              address: meta.from || item.location?.split('→')[0]?.trim(),
            }) && (
              <Pressable
                onPress={() =>
                  openDestinationDirections({
                    latitude: item.latitude,
                    longitude: item.longitude,
                    address: meta.from || item.location?.split('→')[0]?.trim(),
                    label: meta.from ? `${meta.from} (Departure)` : `${item.title} Departure`,
                  })
                }
                style={({ pressed }) => [
                  styles.transportDirectionPill,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Get directions to departure station in maps"
              >
                <Image
                  source={require('@/assets/images/icons/location-pin.svg')}
                  style={styles.transportDirectionPillIcon}
                  tintColor={colors.primary}
                  contentFit="contain"
                />
                <Text style={styles.transportDirectionPillText}>Directions to Departure ↗</Text>
              </Pressable>
            )}

            {canGetDirections({
              latitude: item.endLatitude,
              longitude: item.endLongitude,
              address: meta.to || item.location?.split('→')[1]?.trim(),
            }) && (
              <Pressable
                onPress={() =>
                  openDestinationDirections({
                    latitude: item.endLatitude,
                    longitude: item.endLongitude,
                    address: meta.to || item.location?.split('→')[1]?.trim(),
                    label: meta.to ? `${meta.to} (Arrival)` : `${item.title} Arrival`,
                  })
                }
                style={({ pressed }) => [
                  styles.transportDirectionPill,
                  pressed && styles.buttonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Get directions to arrival station in maps"
              >
                <Image
                  source={require('@/assets/images/icons/location-pin.svg')}
                  style={styles.transportDirectionPillIcon}
                  tintColor={colors.primary}
                  contentFit="contain"
                />
                <Text style={styles.transportDirectionPillText}>Directions to Arrival ↗</Text>
              </Pressable>
            )}
          </View>
        )}
      </Card>

      {/* Transport Specs Grid */}
      <View style={styles.infoGrid}>
        <DetailGridTile
          label="Transport Type"
          value={typeLabel}
          icon={require('@/assets/images/icons/swap-vert.svg')}
        />
        <DetailGridTile
          label="Date"
          value={dateStr}
          icon={require('@/assets/images/icons/calendar.svg')}
        />
        <DetailGridTile
          label="Seat / Platform"
          value={meta.seat || meta.platform || 'General'}
          icon={require('@/assets/images/icons/ticket.svg')}
        />
        <DetailGridTile
          label="Booking Number"
          value={meta.bookingNumber || item.confirmationNumber || '—'}
          icon={require('@/assets/images/icons/hash.svg')}
        />
        {meta.provider ? (
          <DetailGridTile
            label="Carrier / Provider"
            value={meta.provider}
            icon={require('@/assets/images/icons/checkmark.svg')}
          />
        ) : null}
      </View>
    </View>
  );
}

// ===========================================================================
// SUB-COMPONENT: Reusable Detail Tile
// ===========================================================================

function DetailGridTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: any;
}) {
  return (
    <Card style={styles.gridTile} variant="standard">
      <View style={styles.gridTileTopRow}>
        <Text style={styles.gridTileLabel}>{label.toUpperCase()}</Text>
        {icon ? (
          <Image
            source={icon}
            style={styles.gridTileIcon}
            tintColor={colors.textMuted}
            contentFit="contain"
          />
        ) : null}
      </View>
      <Text style={styles.gridTileValue} numberOfLines={2}>
        {value}
      </Text>
    </Card>
  );
}



// ===========================================================================
// MODAL: Delete Confirmation
// ===========================================================================

function DeleteConfirmModal({
  visible,
  itemTitle,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  itemTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.dialogOverlay}>
        <View style={styles.dialogCard}>
          <View style={styles.dialogIconCircle}>
            <Image
              source={require('@/assets/images/icons/close.svg')}
              style={styles.dialogIcon}
              tintColor={colors.destructive}
              contentFit="contain"
            />
          </View>

          <Text style={styles.dialogTitle}>Delete this itinerary item?</Text>
          <Text style={styles.dialogSubtitle}>
            Are you sure? &ldquo;{itemTitle}&rdquo; will be permanently removed
            from your itinerary.
          </Text>

          <View style={styles.dialogButtonRow}>
            <Button
              label="Cancel"
              variant="outline"
              onPress={onClose}
              style={styles.dialogCancelButton}
            />
            <Button
              label="Delete"
              variant="destructive"
              onPress={onConfirm}
              style={styles.dialogConfirmButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ===========================================================================
// STYLESHEET
// ===========================================================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },

  // ── Top Bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  topBarTitle: {
    ...typography.cardTitle,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  topBarSpacer: {
    width: 32,
  },
  iconCircleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  deleteCircleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(176, 74, 74, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(176, 74, 74, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    width: 14,
    height: 14,
  },
  backArrow: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  editIconText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },

  // ── Hero Summary Card ───────────────────────────────────────────────────
  heroCard: {
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  categoryBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    gap: 5,
  },
  categoryBadgeIcon: {
    width: 13,
    height: 13,
  },
  categoryBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  confirmationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: radius.full,
    gap: 4,
  },
  confirmationPillIcon: {
    width: 11,
    height: 11,
  },
  confirmationPillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5,
  },
  heroLocationIcon: {
    width: 13,
    height: 13,
  },
  heroLocationText: {
    ...typography.bodySecondary,
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  heroDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  heroClockIcon: {
    width: 13,
    height: 13,
  },
  heroDateTimeText: {
    ...typography.bodySecondary,
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Sections & Grids ────────────────────────────────────────────────────
  sectionContainer: {
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.1,
    marginBottom: spacing.xs,
  },
  detailCard: {
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs + 2,
  },

  // ── Flight Details ──────────────────────────────────────────────────────
  routeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
  },
  airportBlock: {
    flex: 1,
  },
  airportBlockRight: {
    alignItems: 'flex-end',
  },
  airportCode: {
    fontFamily: fontFamily.semiBold,
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  cityName: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  scheduleTime: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  scheduleDate: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  flightPathMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    flex: 1,
    justifyContent: 'center',
  },
  flightPathDottedLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  flightIconCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  flightPathPlaneIcon: {
    width: 14,
    height: 14,
  },

  // ── Info Grid ───────────────────────────────────────────────────────────
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: 2,
  },
  gridTile: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridTileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  gridTileLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  gridTileIcon: {
    width: 12,
    height: 12,
  },
  gridTileValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 1,
  },

  // ── Hotel Details ───────────────────────────────────────────────────────
  hotelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hotelIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.input,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotelHeaderIcon: {
    width: 18,
    height: 18,
  },
  hotelTitleBlock: {
    flex: 1,
  },
  hotelPropertyTitle: {
    ...typography.cardTitle,
    fontSize: 14,
    color: colors.textPrimary,
  },
  hotelAddressText: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
    lineHeight: 16,
  },
  twoColumnCardRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
  },
  halfCard: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkDateLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  checkDateValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  checkTimeValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkSubDate: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },

  // ── Activity Details ────────────────────────────────────────────────────
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.input,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityHeaderIcon: {
    width: 22,
    height: 22,
  },
  activityTitleBlock: {
    flex: 1,
  },
  activityNameText: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  activityLocationText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  extraInfoCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  extraInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  extraInfoLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 100,
  },
  extraInfoValue: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  linkText: {
    fontFamily: fontFamily.medium,
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  // ── Transportation Details ──────────────────────────────────────────────
  transportRouteContainer: {
    paddingVertical: spacing.xs,
  },
  transportNodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  transportDotOrigin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    marginTop: 4,
  },
  transportDotDest: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  transportConnectorLine: {
    width: 2,
    height: 28,
    backgroundColor: colors.border,
    marginLeft: 6,
    marginVertical: 2,
  },
  transportNodeTextGroup: {
    flex: 1,
  },
  transportNodeLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  transportNodeValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  transportNodeTime: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },

  // ── Notes Card ──────────────────────────────────────────────────────────
  notesCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  // ── Bottom Action Row ───────────────────────────────────────────────────
  actionRowContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },

  // ── Empty / Not Found ───────────────────────────────────────────────────
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  notFoundIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  notFoundIcon: {
    width: 36,
    height: 36,
  },
  notFoundTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  notFoundSubtitle: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  notFoundButton: {
    minWidth: 180,
  },



  // Delete Confirm Dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.sheet,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sheet,
  },
  dialogIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(176, 74, 74, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  dialogIcon: {
    width: 24,
    height: 24,
  },
  dialogTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  dialogSubtitle: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dialogButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  dialogCancelButton: {
    flex: 1,
  },
  dialogConfirmButton: {
    flex: 1,
  },

  // ── Destination Directions Styles ───────────────────────────────────────
  heroDirectionsRow: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(44, 95, 94, 0.08)',
  },
  heroDirectionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySurface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
  },
  heroDirectionsIcon: {
    width: 14,
    height: 14,
  },
  heroDirectionsText: {
    ...typography.label,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontSize: 13,
  },
  sectionDirectionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  sectionDirectionsIcon: {
    width: 13,
    height: 13,
  },
  sectionDirectionsText: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
    fontSize: 12,
  },
  transportRouteActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(44, 95, 94, 0.08)',
  },
  transportDirectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  transportDirectionPillIcon: {
    width: 11,
    height: 11,
  },
  transportDirectionPillText: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.primary,
  },
});
