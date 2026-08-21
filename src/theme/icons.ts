/**
 * Voyaro Design System — Icon Tokens
 *
 * Centralises icon sizing, stroke widths, and color aliases.
 * Voyaro uses expo-symbols (SF Symbols on iOS) + a custom monoline icon set.
 *
 * Usage example:
 *   import { iconSizes, iconColors } from '@/theme/icons';
 *   <SymbolView name="airplane" size={iconSizes.md} tintColor={iconColors.brand} />
 */

// ---------------------------------------------------------------------------
// Sizes — all icons use a square bounding box
// ---------------------------------------------------------------------------
export const iconSizes = {
  /** 16px — inline / caption icons */
  sm: 16,
  /** 20px — compact UI icons */
  md: 20,
  /** 24px — standard bounding box (spec default) */
  lg: 24,
  /** 32px — large / featured icons */
  xl: 32,
} as const;

// ---------------------------------------------------------------------------
// Stroke widths
// ---------------------------------------------------------------------------
export const iconStroke = {
  /** Lightweight — use in dense contexts */
  thin: 1.5,
  /** Standard — most UI icons */
  regular: 2,
} as const;

// ---------------------------------------------------------------------------
// Color shortcuts (mirrors colors.ts for convenience)
// ---------------------------------------------------------------------------
export const iconColors = {
  default: '#1a1a1a',
  brand: '#2c5f5e',
  muted: '#8e8e8e',
  onPrimary: '#ffffff',
  error: '#b04a4a',
} as const;

export type IconSizeKey = keyof typeof iconSizes;
export type IconColorKey = keyof typeof iconColors;
