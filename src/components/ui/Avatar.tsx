/**
 * Voyaro UI — Avatar
 *
 * Supports:
 *   - image source (via expo-image)
 *   - initials fallback (auto-generated or explicit)
 *   - sizes: xs | sm | md | lg | xl
 *   - AvatarGroup — overlapping stack of up to N avatars
 */
import React from 'react';
import { Image } from 'expo-image';
import { ImageSource } from 'expo-image';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius } from '@/theme';

// ---------------------------------------------------------------------------
// Size map
// ---------------------------------------------------------------------------
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<AvatarSize, { dim: number; fontSize: number }> = {
  xs: { dim: 24, fontSize: 9 },
  sm: { dim: 32, fontSize: 12 },
  md: { dim: 40, fontSize: 15 },
  lg: { dim: 52, fontSize: 20 },
  xl: { dim: 72, fontSize: 28 },
};

// ---------------------------------------------------------------------------
// Initials helper
// ---------------------------------------------------------------------------
function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic background color from name string
const AVATAR_COLORS = [
  '#2c5f5e', // brand teal
  '#3a7d6e',
  '#4e8a7a',
  '#5b7a8a',
  '#6b5ea8',
  '#8a5e7d',
  '#7a6e4e',
] as const;

function getAvatarColor(name?: string): string {
  if (!name) return AVATAR_COLORS[0];
  const code = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------
export interface AvatarProps {
  /** Display name — used for initials fallback and background color */
  name?: string;
  /** Image source (URL string or expo-image ImageSource) */
  source?: ImageSource | string;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Avatar({
  name,
  source,
  size = 'md',
  style,
  testID,
}: AvatarProps) {
  const { dim, fontSize } = sizeMap[size];
  const bgColor = getAvatarColor(name);
  const initials = getInitials(name);

  const containerStyle: ViewStyle = {
    width: dim,
    height: dim,
    borderRadius: dim / 2,
    backgroundColor: bgColor,
    overflow: 'hidden',
  };

  return (
    <View testID={testID} style={[containerStyle, styles.base, style]}>
      {source ? (
        <Image
          source={typeof source === 'string' ? { uri: source } : source}
          style={{ width: dim, height: dim }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <Text style={[styles.initials, { fontSize, lineHeight: dim }]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// AvatarGroup — horizontally overlapping stack
// ---------------------------------------------------------------------------
export interface AvatarGroupProps {
  avatars: AvatarProps[];
  /** Max number of avatars to show before showing +N overflow */
  max?: number;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = 'sm',
  style,
}: AvatarGroupProps) {
  const { dim } = sizeMap[size];
  const overlap = Math.round(dim * 0.35);
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <View style={[{ flexDirection: 'row' }, style]}>
      {visible.map((av, i) => (
        <View
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -overlap,
            borderWidth: 2,
            borderColor: colors.surface,
            borderRadius: dim / 2,
          }}
        >
          <Avatar {...av} size={size} />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={[
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              marginLeft: -overlap,
              backgroundColor: colors.backgroundAlt,
              borderWidth: 2,
              borderColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Text style={[styles.overflowText, { fontSize: dim * 0.28 }]}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.textOnPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  overflowText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
