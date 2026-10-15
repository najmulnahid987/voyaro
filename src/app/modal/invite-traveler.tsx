import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme';
import { Button, Input } from '@/components/ui';
import { sendTripInvitation } from '@/services/collaboration';
import { listTrips } from '@/services/trip';
import { Trip } from '@/services/mockData';

/**
 * Route: /modal/invite-traveler
 * Modal for inviting a travel companion to a trip via email with role selection.
 */
export default function InviteTravelerModal() {
  const { tripId: initialTripId } = useLocalSearchParams<{ tripId?: string }>();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>(initialTripId || '');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadOwnedTrips() {
      setLoadingTrips(true);
      try {
        const allTrips = await listTrips();
        if (!isMounted) return;
        // Filter to trips where the user is the owner (only owners can invite)
        const owned = allTrips.filter((t) => t.isOwner !== false);
        setTrips(owned);
        if (!selectedTripId && owned.length > 0) {
          setSelectedTripId(owned[0].id);
        }
      } catch (err) {
        console.warn('[InviteTraveler] Error loading trips:', err);
      } finally {
        if (isMounted) setLoadingTrips(false);
      }
    }
    loadOwnedTrips();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/trips');
    }
  };

  const handleSend = async () => {
    setEmailError(null);
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail) {
      setEmailError('Please enter an email address.');
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (!selectedTripId) {
      Alert.alert('Selection Error', 'Please select a trip to invite to.');
      return;
    }

    setSubmitting(true);
    try {
      await sendTripInvitation(selectedTripId, cleanEmail, role);
      Alert.alert(
        'Invitation Sent',
        `An invitation to collaborate as ${role === 'editor' ? 'an Editor' : 'a Viewer'} has been sent to ${cleanEmail}.`,
        [{ text: 'Done', onPress: handleClose }]
      );
    } catch (err: any) {
      Alert.alert('Invitation Failed', err.message || 'Could not send invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Invite Traveler</Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Trip Selection (if multiple trips or none preselected) */}
          {trips.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Select Trip</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tripsScroll}
              >
                {trips.map((t) => {
                  const isSelected = t.id === selectedTripId;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setSelectedTripId(t.id)}
                      style={[
                        styles.tripPill,
                        isSelected && styles.tripPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tripPillText,
                          isSelected && styles.tripPillTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.section}>
            <Input
              label="Traveler's Email"
              placeholder="e.g. friend@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError(null);
              }}
              error={emailError ?? undefined}
            />
          </View>

          {/* Role Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Role & Permissions</Text>

            <Pressable
              onPress={() => setRole('editor')}
              style={[
                styles.roleCard,
                role === 'editor' && styles.roleCardActive,
              ]}
            >
              <View style={styles.roleRadio}>
                {role === 'editor' && <View style={styles.roleRadioInner} />}
              </View>
              <View style={styles.roleTextGroup}>
                <Text style={styles.roleTitle}>Editor (Recommended)</Text>
                <Text style={styles.roleSubtitle}>
                  Can add and edit itinerary items, add expenses, and view the trip budget. Cannot delete the trip.
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setRole('viewer')}
              style={[
                styles.roleCard,
                role === 'viewer' && styles.roleCardActive,
              ]}
            >
              <View style={styles.roleRadio}>
                {role === 'viewer' && <View style={styles.roleRadioInner} />}
              </View>
              <View style={styles.roleTextGroup}>
                <Text style={styles.roleTitle}>Viewer</Text>
                <Text style={styles.roleSubtitle}>
                  Can view the itinerary, map, and expenses in read-only mode. Cannot make any changes.
                </Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Send Invitation"
            variant="primary"
            fullWidth
            onPress={handleSend}
            loading={submitting}
            disabled={submitting || !email.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
    color: colors.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tripsScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tripPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripPillActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  tripPillText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tripPillTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  roleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  roleRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  roleTextGroup: {
    flex: 1,
    gap: 4,
  },
  roleTitle: {
    ...typography.cardTitle,
    fontSize: 15,
    color: colors.textPrimary,
  },
  roleSubtitle: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
