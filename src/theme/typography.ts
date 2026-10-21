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
    fontSize: 26,
    lineHeight: 32,        // 26 * 1.23
    letterSpacing: -0.4,
  } satisfies TextStyle,

  screenTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 20,
    lineHeight: 26,        // 20 * 1.3
    letterSpacing: -0.2,
  } satisfies TextStyle,

  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
    lineHeight: 22,        // 17 * 1.29
    letterSpacing: -0.1,
  } satisfies TextStyle,

  cardTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14.5,
    lineHeight: 19,        // 14.5 * 1.31
    letterSpacing: 0,
  } satisfies TextStyle,

  body: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 19,        // 14 * 1.36
    letterSpacing: 0,
  } satisfies TextStyle,

  bodySecondary: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    lineHeight: 17,        // 12.5 * 1.36
    letterSpacing: 0,
  } satisfies TextStyle,

  label: {
    fontFamily: fontFamily.medium,
    fontSize: 12.5,
    lineHeight: 16,        // 12.5 * 1.28
    letterSpacing: 0.2,
  } satisfies TextStyle,

  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 14,        // 11 * 1.27
    letterSpacing: 0.1,
  } satisfies TextStyle,

  stat: {
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
    lineHeight: 21,        // 17 * 1.24
    letterSpacing: -0.15,
  } satisfies TextStyle,
} as const;

export type TypographyKey = keyof typeof typography;
