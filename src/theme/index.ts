/**
 * Voyaro Design System — Theme Index
 *
 * Single import point for the entire design system.
 *
 * Usage:
 *   import { colors, typography, spacing, radius, shadows, iconSizes } from '@/theme';
 */

export { colors } from './colors';
export type { ColorKey } from './colors';

export { typography, fontFamily } from './typography';
export type { TypographyKey } from './typography';

export { spacing } from './spacing';
export type { SpacingKey } from './spacing';

export { radius } from './radius';
export type { RadiusKey } from './radius';

export { shadows } from './shadows';
export type { ShadowKey } from './shadows';

export { iconSizes, iconStroke, iconColors } from './icons';
export type { IconSizeKey, IconColorKey } from './icons';
