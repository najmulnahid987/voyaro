import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TOP_BAR_HEIGHT = 56;
export const BOTTOM_BAR_HEIGHT = 64;

/**
 * Responsive shell insets hook for Voyaro navigation shell.
 * Provides consistent spacing and padding for the floating top bar,
 * floating bottom tab bar, and screen scroll content.
 */
export function useShellInsets() {
  const insets = useSafeAreaInsets();

  // Floating top bar position
  const topOffset = Math.max(insets.top, Platform.OS === 'web' ? 16 : 10) + (Platform.OS === 'ios' ? 6 : 8);

  // Floating bottom tab bar position
  const bottomOffset = Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 12);

  // Screen content insets so content scrolls underneath without initial collision
  const contentPaddingTop = topOffset + TOP_BAR_HEIGHT + 14;
  const contentPaddingBottom = bottomOffset + BOTTOM_BAR_HEIGHT + 24;

  return {
    insets,
    topOffset,
    bottomOffset,
    headerHeight: TOP_BAR_HEIGHT,
    tabBarHeight: BOTTOM_BAR_HEIGHT,
    contentPaddingTop,
    contentPaddingBottom,
  };
}
