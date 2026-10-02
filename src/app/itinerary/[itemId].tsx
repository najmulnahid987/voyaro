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

import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { deleteItem, updateItem, useItineraryItem } from '@/services/itineraryStore';
import {
  ActivityMetadata,
  ConcreteItineraryItem,
  FlightMetadata,
  HotelMetadata,
  TransportationMetadata,
} from '@/types/itinerary';
import {
  formatDateRange,
  formatItineraryDate,
  formatItineraryTime,
} from '@/utils/itineraryDateUtils';
import { Button, Card } from '@/components/ui';

export default function ItineraryItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const insets = useSafeAreaInsets();

  // 1. Reactive item state from in-memory store
  const { item, exists } = useItineraryItem(itemId);

  // 2. Modals state for Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ---------------------------------------------------------------------------
  // Navigation Handlers
  // ---------------------------------------------------------------------------
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/trips');
    }
  };

  const handleEditPress = () => {
    if (!item) return;
    router.push({
      pathname: `/add/${item.type}` as any,
      params: { itemId: item.id, tripId: item.tripId },
    });
  };

  const handleDeletePress = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (!itemId) return;
    deleteItem(itemId);
    setShowDeleteConfirm(false);
    handleBack();
  };

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
              {item.location || 'Location details in confirmation'}
            </Text>
          </View>
        </View>
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



  // Type-specific edit fields
  const [seat, setSeat] = useState(
    (item.metadata as FlightMetadata | TransportationMetadata)?.seat || ''
  );
  const [room, setRoom] = useState((item.metadata as HotelMetadata)?.room || '');
  const [guestName, setGuestName] = useState(
    (item.metadata as HotelMetadata)?.guestName || ''
  );
  const [gate, setGate] = useState((item.metadata as FlightMetadata)?.gate || '');
  const [terminal, setTerminal] = useState(
    (item.metadata as FlightMetadata)?.terminal || ''
  );

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please provide a title for this item.');
      return;
    }

    // Build changes payload
    const updatedMetadata = {
      ...(item.metadata as any),
      ...(item.type === 'flight'
        ? {
            seat: seat.trim() || undefined,
            gate: gate.trim() || undefined,
            terminal: terminal.trim() || undefined,
          }
        : {}),
      ...(item.type === 'hotel'
        ? {
            room: room.trim() || undefined,
            guestName: guestName.trim() || undefined,
          }
        : {}),
      ...(item.type === 'transportation'
        ? {
            seat: seat.trim() || undefined,
          }
        : {}),
    };

    updateItem(item.id, {
      title: title.trim(),
      location: location.trim() || undefined,
      confirmationNumber: confirmationNumber.trim().toUpperCase() || undefined,
      notes: notes.trim() || undefined,
      metadata: updatedMetadata,
    });

    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalScreen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Modal Top Bar */}
        <View
          style={[
            styles.modalHeader,
            {
              paddingTop: Math.max(insets.top, 16),
            },
          ]}
        >
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.modalCloseButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </Pressable>

          <Text style={styles.modalHeaderTitle}>Edit Reservation</Text>

          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.modalSaveButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.modalSaveText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={[
            styles.modalContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title input */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Title *</Text>
            <TextInput
              style={styles.formInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Reservation title"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Location input */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Location / Route</Text>
            <TextInput
              style={styles.formInput}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Kyoto Station, Tokyo"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Confirmation Number */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Confirmation / Reference Code</Text>
            <TextInput
              style={[styles.formInput, styles.uppercaseInput]}
              value={confirmationNumber}
              onChangeText={setConfirmationNumber}
              placeholder="e.g. EK-982134"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />
          </View>

          {/* Type-specific inputs */}
          {item.type === 'flight' && (
            <View style={styles.twoColumnRow}>
              <View style={styles.flexColumn}>
                <Text style={styles.formLabel}>Seat</Text>
                <TextInput
                  style={styles.formInput}
                  value={seat}
                  onChangeText={setSeat}
                  placeholder="e.g. 14A"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.flexColumn}>
                <Text style={styles.formLabel}>Gate</Text>
                <TextInput
                  style={styles.formInput}
                  value={gate}
                  onChangeText={setGate}
                  placeholder="e.g. 12"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          )}

          {item.type === 'hotel' && (
            <View style={styles.twoColumnRow}>
              <View style={styles.flexColumn}>
                <Text style={styles.formLabel}>Room / Suite</Text>
                <TextInput
                  style={styles.formInput}
                  value={room}
                  onChangeText={setRoom}
                  placeholder="e.g. Suite 408"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.flexColumn}>
                <Text style={styles.formLabel}>Guest Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder="e.g. Alex & Sarah"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          )}

          {item.type === 'transportation' && (
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Seat / Car</Text>
              <TextInput
                style={styles.formInput}
                value={seat}
                onChangeText={setSeat}
                placeholder="e.g. Car 5, Seat 12E"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          )}

          {/* Notes multiline input */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Notes</Text>
            <TextInput
              style={[styles.formInput, styles.multilineInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add special requests, instructions or reminders..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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

          <Text style={styles.dialogTitle}>Delete Reservation</Text>
          <Text style={styles.dialogSubtitle}>
            Are you sure you want to remove &ldquo;{itemTitle}&rdquo; from your
            itinerary? This action cannot be undone.
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  // ── Top Bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  topBarTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topBarSpacer: {
    width: 40,
  },
  iconCircleButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  deleteCircleButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(176, 74, 74, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(176, 74, 74, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    width: 16,
    height: 16,
  },
  backArrow: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  editIconText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },

  // ── Hero Summary Card ───────────────────────────────────────────────────
  heroCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    gap: 6,
  },
  categoryBadgeIcon: {
    width: 14,
    height: 14,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  confirmationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.button,
    gap: 4,
  },
  confirmationPillIcon: {
    width: 12,
    height: 12,
  },
  confirmationPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  heroTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  heroLocationIcon: {
    width: 14,
    height: 14,
  },
  heroLocationText: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  heroDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm + 2,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  heroClockIcon: {
    width: 15,
    height: 15,
  },
  heroDateTimeText: {
    ...typography.bodySecondary,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Sections & Grids ────────────────────────────────────────────────────
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  detailCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },

  // ── Flight Details ──────────────────────────────────────────────────────
  routeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  airportBlock: {
    flex: 1,
  },
  airportBlockRight: {
    alignItems: 'flex-end',
  },
  airportCode: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  cityName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 6,
  },
  scheduleDate: {
    fontSize: 12,
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
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  flightPathPlaneIcon: {
    width: 16,
    height: 16,
  },

  // ── Info Grid ───────────────────────────────────────────────────────────
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  gridTile: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridTileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridTileLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  gridTileIcon: {
    width: 13,
    height: 13,
  },
  gridTileValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },

  // ── Hotel Details ───────────────────────────────────────────────────────
  hotelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  hotelIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.input,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotelHeaderIcon: {
    width: 22,
    height: 22,
  },
  hotelTitleBlock: {
    flex: 1,
  },
  hotelPropertyTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  hotelAddressText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  twoColumnCardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  halfCard: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkDateLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  checkDateValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  checkTimeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkSubDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 100,
  },
  extraInfoValue: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  linkText: {
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
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  transportNodeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  transportNodeTime: {
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

  // ── Modals & Dialogs ────────────────────────────────────────────────────
  modalScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalHeaderTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  modalCloseButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  modalCancelText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  modalSaveButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  modalBody: {
    flex: 1,
  },
  modalContent: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  uppercaseInput: {
    textTransform: 'uppercase',
  },
  multilineInput: {
    minHeight: 100,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  flexColumn: {
    flex: 1,
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
});
