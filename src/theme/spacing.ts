/**
 * Voyaro Design System — Spacing Tokens
 *
 * Based on a strict 4px baseline grid.
 * Never use arbitrary numbers in component stylesheets.
 * Always pick the closest token from this scale.
 */

export const spacing = {
  /** 4px — micro gaps, icon padding */
  xs: 4,
  /** 8px — tight element gaps */
  sm: 8,
  /** 12px — compact element gaps */
  md: 12,
  /** 16px — standard component padding */
  lg: 16,
  /** 20px — outer screen margin, component internal padding */
  xl: 20,
  /** 24px — outer screen margin (desktop / larger breakpoint) */
  '2xl': 24,
  /** 32px — vertical section gap */
  '3xl': 32,
  /** 40px — generous section spacing */
  '4xl': 40,
  /** 48px — large breathing room */
  '5xl': 48,
  /** 64px — hero / display spacing */
  '6xl': 64,
} as const;

export type SpacingKey = keyof typeof spacing;
