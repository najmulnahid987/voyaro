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
  /** 14px — Cards */
  card: 14,
  /** 20px — Modal / Bottom Sheet top radius */
  sheet: 20,
  /** 9999px — Pills, Badges, Tags */
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
