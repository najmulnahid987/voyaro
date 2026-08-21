/**
 * Voyaro Design System — Border Radius Tokens
 *
 * Enforces consistent rounding across all UI elements.
 */

export const radius = {
  /** 8px — Buttons, Inputs */
  button: 8,
  /** 8px — Inputs (same as button) */
  input: 8,
  /** 16px — Cards */
  card: 16,
  /** 24px — Modal / Bottom Sheet top radius */
  sheet: 24,
  /** 9999px — Pills, Badges, Tags */
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
