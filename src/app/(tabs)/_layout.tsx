import { Tabs, router } from 'expo-router';
import { ColorValue, Pressable, StyleSheet, View, Platform } from 'react-native';
import { colors, spacing, shadows } from '@/theme';

// ---------------------------------------------------------------------------
// Inline SVG-like icon shapes (avoids external icon library dependency)
// Each function returns a React Native View that mimics the Voyaro monoline
// icon style (1.5–2px stroke, round cap, 24px bounding box).
// Phase 3 will replace these with the real icon library.
// ---------------------------------------------------------------------------

function IconHome({ color }: { color: ColorValue }) {
  return (
    <View style={[iconStyles.box]}>
      {/* Roof */}
      <View style={[iconStyles.roofLeft, { borderBottomColor: color }]} />
      <View style={[iconStyles.roofRight, { borderBottomColor: color }]} />
      {/* Door */}
      <View style={[iconStyles.door, { borderColor: color }]} />
    </View>
  );
}

function IconSuitcase({ color }: { color: ColorValue }) {
  return (
    <View style={iconStyles.box}>
      <View style={[iconStyles.suitcaseBody, { borderColor: color }]} />
      <View style={[iconStyles.suitcaseHandle, { borderColor: color }]} />
    </View>
  );
}

function IconWallet({ color }: { color: ColorValue }) {
  return (
    <View style={iconStyles.box}>
      <View style={[iconStyles.walletBody, { borderColor: color }]} />
      <View style={[iconStyles.walletFlap, { borderColor: color, backgroundColor: color }]} />
    </View>
  );
}

function IconUser({ color }: { color: ColorValue }) {
  return (
    <View style={iconStyles.box}>
      <View style={[iconStyles.userHead, { borderColor: color }]} />
      <View style={[iconStyles.userShoulder, { borderColor: color }]} />
    </View>
  );
}

function IconPlus({ color }: { color: ColorValue }) {
  return (
    <View style={iconStyles.box}>
      <View style={[iconStyles.plusH, { backgroundColor: color }]} />
      <View style={[iconStyles.plusV, { backgroundColor: color }]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Center Add Button — a custom tabBarButton for the Add action.
// Renders above the tab bar with a floating style.
// ---------------------------------------------------------------------------
function AddTabButton() {
  return (
    <Pressable
      onPress={() => router.push('/add')}
      accessibilityLabel="Add"
      accessibilityRole="button"
      style={({ pressed }) => [addButtonStyles.wrapper, pressed && addButtonStyles.pressed]}
    >
      <View style={addButtonStyles.circle}>
        <IconPlus color={colors.textOnPrimary} />
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Tabs Layout
// ---------------------------------------------------------------------------

/**
 * Main tab bar layout — Voyaro
 *
 * Tabs: Home · Trips · [Add] · Expenses · Profile
 *
 * The centre slot is a non-navigating placeholder that renders AddTabButton.
 * Tapping Add pushes /add onto the root stack (full-screen modal flow).
 *
 * NOTE: Do not put any business logic here.
 * Tab icon active states use colors.primary (#2c5f5e).
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: tabBarStyles.bar,
        tabBarLabelStyle: tabBarStyles.label,
      }}
    >
      {/* ── Home ─────────────────────────────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconHome color={color} />,
        }}
      />

      {/* ── Trips ────────────────────────────────────────────────────────── */}
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color }) => <IconSuitcase color={color} />,
        }}
      />

      {/* ── Add (centre FAB) ─────────────────────────────────────────────── */}
      {/* This screen does not exist as a tab — it's just a nav trigger.
          tabBarButton renders AddTabButton; the route is hidden from the bar. */}
      <Tabs.Screen
        name="add-placeholder"
        options={{
          title: '',
          tabBarButton: () => <AddTabButton />,
          // Prevent Expo Router from trying to resolve this as a real route
          href: null,
        }}
      />

      {/* ── Expenses ─────────────────────────────────────────────────────── */}
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color }) => <IconWallet color={color} />,
        }}
      />

      {/* ── Profile ──────────────────────────────────────────────────────── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconUser color={color} />,
        }}
      />
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;

const tabBarStyles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: TAB_BAR_HEIGHT,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: spacing.sm,
    ...shadows.card,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

const addButtonStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Lift the button above the tab bar
    marginTop: -24,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.float,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});

// ---------------------------------------------------------------------------
// Icon geometry (monoline, ~24px bounding box)
// ---------------------------------------------------------------------------
const STROKE = 2;
const ICON_DIM = 22;

const iconStyles = StyleSheet.create({
  box: {
    width: ICON_DIM,
    height: ICON_DIM,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Home icon
  roofLeft: {
    position: 'absolute',
    top: 2,
    left: 3,
    width: 9,
    height: 9,
    borderBottomWidth: STROKE,
    borderRightWidth: STROKE,
    borderColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
  roofRight: {
    position: 'absolute',
    top: 2,
    right: 3,
    width: 9,
    height: 9,
    borderBottomWidth: STROKE,
    borderLeftWidth: STROKE,
    borderColor: 'transparent',
    transform: [{ rotate: '45deg' }],
  },
  door: {
    position: 'absolute',
    bottom: 0,
    width: 7,
    height: 9,
    borderWidth: STROKE,
    borderBottomWidth: 0,
    borderRadius: 1,
  },

  // Suitcase icon
  suitcaseBody: {
    position: 'absolute',
    top: 5,
    left: 2,
    right: 2,
    bottom: 2,
    borderWidth: STROKE,
    borderRadius: 3,
  },
  suitcaseHandle: {
    position: 'absolute',
    top: 1,
    left: 7,
    right: 7,
    height: 5,
    borderWidth: STROKE,
    borderBottomWidth: 0,
    borderRadius: 2,
  },

  // Wallet icon
  walletBody: {
    position: 'absolute',
    top: 4,
    left: 1,
    right: 1,
    bottom: 2,
    borderWidth: STROKE,
    borderRadius: 3,
  },
  walletFlap: {
    position: 'absolute',
    right: 3,
    top: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: STROKE,
  },

  // User icon
  userHead: {
    position: 'absolute',
    top: 2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: STROKE,
  },
  userShoulder: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    height: 7,
    borderWidth: STROKE,
    borderBottomWidth: 0,
    borderRadius: 5,
  },

  // Plus icon
  plusH: {
    position: 'absolute',
    width: 14,
    height: STROKE,
    borderRadius: 1,
  },
  plusV: {
    position: 'absolute',
    width: STROKE,
    height: 14,
    borderRadius: 1,
  },
});
