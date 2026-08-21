/**
 * Voyaro Design System — Typography Tokens
 *
 * All text styles are derived from Inter (loaded via expo-font).
 * Import these objects and spread them into StyleSheet text styles.
 */
import { TextStyle } from 'react-native';

// ---------------------------------------------------------------------------
// Font family
// ---------------------------------------------------------------------------
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
} as const;

// ---------------------------------------------------------------------------
// Named text style tokens
// ---------------------------------------------------------------------------

// Using RN-compatible values:
//   letterSpacing in RN is in pt, not em. Conversions below are approximate
//   for a ~16pt base size (1em ≈ 16pt, 0.01em ≈ 0.16pt).

export const typography = {
  display: {
    fontFamily: fontFamily.semiBold,
    fontSize: 32,
    lineHeight: 38,        // 32 * 1.2
    letterSpacing: -0.64,  // -0.02em * 32
  } satisfies TextStyle,

  screenTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 24,
    lineHeight: 31,        // 24 * 1.3
    letterSpacing: -0.24,  // -0.01em * 24
  } satisfies TextStyle,

  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    lineHeight: 25,        // 18 * 1.4
    letterSpacing: 0,
  } satisfies TextStyle,

  cardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    lineHeight: 24,        // 16 * 1.5
    letterSpacing: 0,
  } satisfies TextStyle,

  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 24,        // 15 * 1.6
    letterSpacing: 0,
  } satisfies TextStyle,

  bodySecondary: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,        // 14 * 1.5
    letterSpacing: 0,
  } satisfies TextStyle,

  label: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 14,        // 14 * 1.0
    letterSpacing: 0.28,   // 0.02em * 14
  } satisfies TextStyle,

  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,        // 12 * 1.4
    letterSpacing: 0.12,   // 0.01em * 12
  } satisfies TextStyle,

  stat: {
    fontFamily: fontFamily.semiBold,
    fontSize: 20,
    lineHeight: 24,        // 20 * 1.2
    letterSpacing: -0.2,   // -0.01em * 20
  } satisfies TextStyle,
} as const;

export type TypographyKey = keyof typeof typography;
