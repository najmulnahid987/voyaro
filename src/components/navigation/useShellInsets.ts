import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TOP_BAR_HEIGHT = 42;
export const BOTTOM_BAR_HEIGHT = 46;

/**
 * Responsive shell insets hook for Voyaro navigation shell.
 * Provides compact, consistent spacing and padding for the floating top bar,
 * floating bottom tab bar, and screen scroll content across Android, iOS, and Web.
 */
export function useShellInsets() {
  const insets = useSafeAreaInsets();

  // Floating top bar position: sits cleanly below the device status bar / notch
  const topOffset = Math.max(insets.top, Platform.OS === 'web' ? 10 : 4) + (Platform.OS === 'ios' ? 4 : 2);

  // Floating bottom tab bar position: placed safely above device system navigation
  const bottomOffset = Math.max(insets.bottom, Platform.OS === 'web' ? 10 : 6);

  // Screen content insets so content scrolls underneath without initial collision or excessive gaps
  const contentPaddingTop = topOffset + TOP_BAR_HEIGHT + 6;
  const contentPaddingBottom = bottomOffset + BOTTOM_BAR_HEIGHT + 12;

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
