/**
 * Voyaro Design System — Color Tokens
 *
 * Single source of truth for every color used in the application.
 * Do NOT use raw hex strings in component files; import from here.
 */

// ---------------------------------------------------------------------------
// Raw palette (internal building blocks)
// ---------------------------------------------------------------------------
const palette = {
  teal900: '#1e4241', // Deep Forest
  teal700: '#2c5f5e', // Deep Teal (brand primary)
  teal100: 'rgba(44, 95, 94, 0.10)', // AI badge / tinted surface

  madder500: '#b04a4a', // Soft Madder — warnings / destructive

  white: '#ffffff',
  coolWhite: '#f9f9f9',
  warmGrey: '#f4f3f3',
  softSilk: '#eeeeee',

  jetBlack: '#1a1a1a',
  charcoal: '#4a4a4a',
  steelGrey: '#8e8e8e',

  overlay: 'rgba(0, 0, 0, 0.40)',
  tealShadow: 'rgba(44, 95, 94, 0.15)',
  cardShadow: 'rgba(0, 0, 0, 0.04)',
  sheetShadow: 'rgba(0, 0, 0, 0.08)',
} as const;

// ---------------------------------------------------------------------------
// Semantic tokens (what screens / components consume)
// ---------------------------------------------------------------------------
export const colors = {
  // --- Brand ---
  primary: palette.teal700,
  primaryHover: palette.teal900,
  primarySurface: palette.teal100, // low-opacity teal for AI badges etc.

  // --- Feedback ---
  success: palette.teal700, // shares primary for unified "verified" feel
  warning: palette.madder500,
  error: palette.madder500,
  destructive: palette.madder500,

  // --- Surfaces ---
  background: palette.coolWhite,
  backgroundAlt: palette.warmGrey,
  surface: palette.white,
  overlay: palette.overlay,

  // --- Text ---
  textPrimary: palette.jetBlack,
  textSecondary: palette.charcoal,
  textMuted: palette.steelGrey,
  textOnPrimary: palette.white,

  // --- Borders ---
  border: palette.softSilk,
  borderSelected: palette.teal700, // 1.5 px
  borderFocused: palette.teal700,  // 2 px

  // --- Icon defaults ---
  iconDefault: palette.jetBlack,
  iconBrand: palette.teal700,

  // --- Shadows (for use in shadow style objects) ---
  shadowCard: palette.cardShadow,
  shadowSheet: palette.sheetShadow,
  shadowFloat: palette.tealShadow,

  // --- Transparent ---
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
