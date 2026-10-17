/**
 * Voyaro Design System — LocationPickerField (Phase 9 — Step 7)
 *
 * An accessible, type-safe location input & coordinate selector:
 * - Allows typing a place name, hotel address, airport, or station.
 * - Explicit action button to resolve geographic coordinates on-demand.
 * - Never triggers geocoding on keystroke.
 * - Handles single, ambiguous (multiple candidates modal), and zero results gracefully.
 * - Clearly displays attached coordinates with "Pinned on Map" badge.
 * - Allows users to edit address text and clear or update coordinates anytime.
 * - Keeps coordinates optional and preserves existing valid coordinates.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, fontFamily, radius, shadows, spacing, typography } from '@/theme';
import { GeocodeCandidate, searchGeocodeLocations } from '@/utils/geocoding';

export interface LocationPickerFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  coordinates?: { latitude?: number; longitude?: number } | null;
  onSelectLocation?: (location: {
    address: string;
    latitude: number;
    longitude: number;
    displayName?: string;
  }) => void;
  onClearCoordinates?: () => void;
  testID?: string;
}

export function LocationPickerField({
  label,
  value,
  onChangeText,
  placeholder = 'Enter address, landmark, or airport...',
  required = false,
  error,
  helperText,
  coordinates,
  onSelectLocation,
  onClearCoordinates,
  testID = 'location-picker-field',
}: LocationPickerFieldProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const hasCoordinates =
    typeof coordinates?.latitude === 'number' &&
    typeof coordinates?.longitude === 'number' &&
    !isNaN(coordinates.latitude) &&
    !isNaN(coordinates.longitude);

  const handleResolveLocation = async () => {
    if (!value || value.trim().length < 2) {
      setFeedbackMessage('Please enter a place name or address first.');
      return;
    }

    setIsSearching(true);
    setFeedbackMessage(null);

    try {
      const results = await searchGeocodeLocations(value);

      if (results.length === 0) {
        setFeedbackMessage('No coordinates found. You can keep this address as text or refine your search.');
      } else if (results.length === 1) {
        const item = results[0];
        onSelectLocation?.({
          address: value,
          latitude: item.latitude,
          longitude: item.longitude,
          displayName: item.displayName,
        });
        setFeedbackMessage('Location pinned on map!');
      } else {
        // Multiple candidate matches (ambiguous) -> Open candidate selection modal
        setCandidates(results);
        setShowCandidatesModal(true);
      }
    } catch (err) {
      setFeedbackMessage('Unable to resolve location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCandidate = (candidate: GeocodeCandidate) => {
    onSelectLocation?.({
      address: value.trim() ? value : (candidate.address || candidate.displayName),
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      displayName: candidate.displayName,
    });
    setShowCandidatesModal(false);
    setCandidates([]);
    setFeedbackMessage('Location pinned on map!');
  };

  return (
    <View style={styles.container} testID={testID}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required ? <Text style={styles.requiredStar}> *</Text> : null}
          </Text>
        </View>
      ) : null}

      {/* Main Input + Action Button Row */}
      <View style={[styles.inputRow, Boolean(error) && styles.inputRowError]}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            if (feedbackMessage) setFeedbackMessage(null);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="sentences"
          autoCorrect={false}
          accessibilityLabel={label || 'Location input'}
        />

        <Pressable
          onPress={handleResolveLocation}
          disabled={isSearching}
          style={({ pressed }) => [
            styles.locateButton,
            pressed && styles.locateButtonPressed,
            isSearching && styles.locateButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Find location coordinates on map"
        >
          {isSearching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <View style={styles.locateButtonContent}>
              <Image
                source={require('@/assets/images/icons/place.svg')}
                style={styles.locateIcon}
                tintColor={colors.primary}
                contentFit="contain"
              />
              <Text style={styles.locateButtonText}>Locate</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Attached Coordinates Badge */}
      {hasCoordinates && (
        <View style={styles.coordinatesBadge}>
          <View style={styles.coordinatesBadgeLeft}>
            <Image
              source={require('@/assets/images/icons/location-pin.svg')}
              style={styles.pinnedIcon}
              tintColor="#1b6e53"
              contentFit="contain"
            />
            <View>
              <Text style={styles.coordinatesBadgeText}>
                {coordinates!.latitude!.toFixed(4)}°, {coordinates!.longitude!.toFixed(4)}°
              </Text>
              <Text style={styles.coordinatesBadgeSubtext}>Pinned on Trip Map</Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              onClearCoordinates?.();
              setFeedbackMessage(null);
            }}
            style={({ pressed }) => [
              styles.clearCoordsButton,
              pressed && styles.clearCoordsButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Clear coordinates"
          >
            <Text style={styles.clearCoordsText}>Clear ✕</Text>
          </Pressable>
        </View>
      )}

      {/* Inline Feedback / Helper Message */}
      {feedbackMessage && !error ? (
        <Text style={styles.feedbackMessage}>{feedbackMessage}</Text>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {helperText && !error && !feedbackMessage ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      {/* Ambiguous Results Modal */}
      <Modal
        visible={showCandidatesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCandidatesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Location</Text>
              <Pressable
                onPress={() => setShowCandidatesModal(false)}
                style={styles.modalCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Close location selection"
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Multiple matches found for &quot;{value}&quot;. Select the intended destination:
            </Text>

            <ScrollView style={styles.candidatesList} keyboardShouldPersistTaps="handled">
              {candidates.map((candidate) => (
                <Pressable
                  key={candidate.id}
                  onPress={() => handleSelectCandidate(candidate)}
                  style={({ pressed }) => [
                    styles.candidateRow,
                    pressed && styles.candidateRowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${candidate.displayName}`}
                >
                  <View style={styles.candidateIconCircle}>
                    <Image
                      source={require('@/assets/images/icons/place.svg')}
                      style={styles.candidateIcon}
                      tintColor={colors.primary}
                      contentFit="contain"
                    />
                  </View>
                  <View style={styles.candidateTextCol}>
                    <Text style={styles.candidateName} numberOfLines={1}>
                      {candidate.displayName}
                    </Text>
                    {candidate.address ? (
                      <Text style={styles.candidateAddress} numberOfLines={2}>
                        {candidate.address}
                      </Text>
                    ) : null}
                    <Text style={styles.candidateCoords}>
                      {candidate.latitude.toFixed(4)}°, {candidate.longitude.toFixed(4)}°
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.label,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  requiredStar: {
    color: colors.error,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.18)',
    borderRadius: radius.input,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    minHeight: 48,
  },
  inputRowError: {
    borderColor: colors.error,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  locateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.button,
    marginLeft: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.15)',
  },
  locateButtonPressed: {
    opacity: 0.75,
  },
  locateButtonDisabled: {
    opacity: 0.6,
  },
  locateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locateIcon: {
    width: 14,
    height: 14,
  },
  locateButtonText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },

  // --- Attached Coordinates Badge ---
  coordinatesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(27, 110, 83, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(27, 110, 83, 0.22)',
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  coordinatesBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  pinnedIcon: {
    width: 16,
    height: 16,
  },
  coordinatesBadgeText: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: '#1b6e53',
  },
  coordinatesBadgeSubtext: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
  },
  clearCoordsButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.button,
    backgroundColor: 'rgba(27, 110, 83, 0.12)',
  },
  clearCoordsButtonPressed: {
    opacity: 0.7,
  },
  clearCoordsText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: '#1b6e53',
    fontSize: 11,
  },

  feedbackMessage: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // --- Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 46, 45, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(44, 95, 94, 0.12)',
    ...shadows.sheet,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalSubtitle: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  candidatesList: {
    maxHeight: 300,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(44, 95, 94, 0.08)',
    borderRadius: radius.button,
  },
  candidateRowPressed: {
    backgroundColor: colors.primarySurface,
  },
  candidateIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candidateIcon: {
    width: 16,
    height: 16,
  },
  candidateTextCol: {
    flex: 1,
  },
  candidateName: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.textPrimary,
  },
  candidateAddress: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  candidateCoords: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
});
