/**
 * Voyaro Design System — Shadow Tokens
 *
 * React Native shadows require separate iOS/Android style properties.
 * Each token exports a style object that can be spread directly.
 *
 * NOTE: React Native does not support CSS box-shadow shorthand.
 * - iOS: shadowColor / shadowOffset / shadowOpacity / shadowRadius
 * - Android: elevation (approximate mapping)
 */
import { Platform, ViewStyle } from 'react-native';

type ShadowStyle = Pick<
  ViewStyle,
  | 'shadowColor'
  | 'shadowOffset'
  | 'shadowOpacity'
  | 'shadowRadius'
  | 'elevation'
>;

function makeShadow(
  color: string,
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number
): ShadowStyle {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
    default: {},
  }) as ShadowStyle;
}

export const shadows = {
  /**
   * Card shadow — very subtle lift.
   * Spec: 0 4px 20px rgba(0,0,0,0.04)
   */
  card: makeShadow('#000000', 4, 20, 0.04, 2),

  /**
   * Modal / Bottom Sheet shadow.
   * Spec: 0 -10px 40px rgba(0,0,0,0.08)
   */
  sheet: makeShadow('#000000', -10, 40, 0.08, 8),

  /**
   * Floating action button — teal-tinted.
   * Spec: 0 8px 24px rgba(44,95,94,0.15)
   */
  float: makeShadow('#2c5f5e', 8, 24, 0.15, 10),

  /** No shadow */
  none: {} as ShadowStyle,
} as const;

export type ShadowKey = keyof typeof shadows;
