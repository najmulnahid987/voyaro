/**
 * Voyaro — Design System Demo
 *
 * DEV-ONLY visual catalogue of every design token and UI component.
 * Not linked from production navigation.
 *
 * Access during development:
 *   router.push('/(dev)/design-system-demo') — or run standalone.
 *
 * To keep it out of production, this file lives under src/app/(dev)/ which
 * is intentionally excluded from the production tab navigator.
 */
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Theme ---
import { colors, spacing, typography, radius, shadows } from '@/theme';

// --- UI Components ---
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Card,
  Divider,
  IconButton,
  Input,
  Pill,
  ProgressBar,
  SearchInput,
  SectionHeader,
  Select,
} from '@/components/ui';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={demoStyles.section}>
      <Text style={demoStyles.sectionTitle}>{title}</Text>
      <Divider style={{ marginBottom: spacing.lg }} />
      {children}
    </View>
  );
}

function Row({ children, wrap = false }: { children: React.ReactNode; wrap?: boolean }) {
  return (
    <View style={[demoStyles.row, wrap && demoStyles.rowWrap]}>
      {children}
    </View>
  );
}

function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  return (
    <View style={demoStyles.swatchWrapper}>
      <View style={[demoStyles.swatch, { backgroundColor: hex }]} />
      <Text style={demoStyles.swatchName}>{name}</Text>
      <Text style={demoStyles.swatchHex}>{hex}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function DesignSystemDemo() {
  const [inputValue, setInputValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [selectedPill, setSelectedPill] = useState<string | null>('Flights');

  return (
    <SafeAreaView style={demoStyles.safe} edges={['top', 'bottom']}>
      <ScrollView
        style={demoStyles.scroll}
        contentContainerStyle={demoStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={demoStyles.header}>
          <Text style={demoStyles.headerTitle}>Voyaro Design System</Text>
          <Text style={demoStyles.headerSub}>Phase 1 — Visual Catalogue</Text>
        </View>

        {/* ─── COLORS ─────────────────────────────────────────────────────── */}
        <Section title="🎨 Color Tokens">
          <Row wrap>
            <ColorSwatch name="primary" hex={colors.primary} />
            <ColorSwatch name="primaryHover" hex={colors.primaryHover} />
            <ColorSwatch name="success" hex={colors.success} />
            <ColorSwatch name="warning" hex={colors.warning} />
            <ColorSwatch name="error" hex={colors.error} />
          </Row>
          <Row wrap>
            <ColorSwatch name="background" hex={colors.background} />
            <ColorSwatch name="backgroundAlt" hex={colors.backgroundAlt} />
            <ColorSwatch name="surface" hex={colors.surface} />
            <ColorSwatch name="border" hex={colors.border} />
          </Row>
          <Row wrap>
            <ColorSwatch name="textPrimary" hex={colors.textPrimary} />
            <ColorSwatch name="textSecondary" hex={colors.textSecondary} />
            <ColorSwatch name="textMuted" hex={colors.textMuted} />
          </Row>
        </Section>

        {/* ─── TYPOGRAPHY ─────────────────────────────────────────────────── */}
        <Section title="🔤 Typography Scale">
          {(
            [
              ['display', 'Display — 32 / 600'],
              ['screenTitle', 'Screen Title — 24 / 600'],
              ['sectionTitle', 'Section Title — 18 / 600'],
              ['cardTitle', 'Card Title — 16 / 600'],
              ['body', 'Body — 15 / 400'],
              ['bodySecondary', 'Secondary Body — 14 / 400'],
              ['label', 'Label / Button — 14 / 500'],
              ['caption', 'Caption — 12 / 400'],
              ['stat', 'Numeric / Stat — 20 / 600'],
            ] as const
          ).map(([key, sample]) => (
            <Text
              key={key}
              style={[typography[key], { color: colors.textPrimary, marginBottom: spacing.sm }]}
            >
              {sample}
            </Text>
          ))}
        </Section>

        {/* ─── BUTTONS ────────────────────────────────────────────────────── */}
        <Section title="🔘 Buttons">
          <View style={{ gap: spacing.md }}>
            <Button variant="primary" label="Primary Button" fullWidth />
            <Button variant="secondary" label="Secondary Button" fullWidth />
            <Button variant="outline" label="Outline Button" fullWidth />
            <Button variant="ghost" label="Ghost Button" fullWidth />
            <Button variant="destructive" label="Destructive Button" fullWidth />
            <Button variant="primary" label="Loading…" loading fullWidth />
            <Button variant="primary" label="Disabled" disabled fullWidth />
          </View>
          <View style={{ height: spacing.lg }} />
          <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.sm }]}>
            Icon Buttons
          </Text>
          <Row>
            <IconButton
              variant="filled"
              icon={<Text style={{ color: '#fff', fontSize: 16 }}>✈</Text>}
              accessibilityLabel="Flights"
            />
            <IconButton
              variant="default"
              icon={<Text style={{ fontSize: 16 }}>🗺</Text>}
              accessibilityLabel="Map"
            />
            <IconButton
              variant="outline"
              icon={<Text style={{ fontSize: 16 }}>＋</Text>}
              accessibilityLabel="Add"
            />
          </Row>
        </Section>

        {/* ─── CARDS ──────────────────────────────────────────────────────── */}
        <Section title="🃏 Cards">
          <View style={{ gap: spacing.md }}>
            <Card variant="standard">
              <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                Standard Card
              </Text>
              <Text style={[typography.bodySecondary, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                1px border, no shadow. Used for flat content lists.
              </Text>
            </Card>

            <Card variant="elevated">
              <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                Elevated Card
              </Text>
              <Text style={[typography.bodySecondary, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Subtle shadow at 4% opacity. Default trip cards.
              </Text>
            </Card>

            <Card
              variant="interactive"
              onPress={() => {}}
            >
              <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                Interactive Card
              </Text>
              <Text style={[typography.bodySecondary, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                Tap me — scales to 0.98 on press.
              </Text>
            </Card>
          </View>
        </Section>

        {/* ─── INPUTS ─────────────────────────────────────────────────────── */}
        <Section title="✏️ Inputs">
          <View style={{ gap: spacing.md }}>
            <Input
              label="Destination"
              placeholder="Where are you going?"
              value={inputValue}
              onChangeText={setInputValue}
            />
            <Input
              label="With Error"
              placeholder="Enter value"
              error="This field is required"
              value=""
            />
            <Input
              label="With Helper"
              placeholder="Enter date"
              helperText="Format: DD / MM / YYYY"
              value=""
            />
            <SearchInput
              placeholder="Search trips, places…"
              value={searchValue}
              onChangeText={setSearchValue}
            />
            <Select
              label="Trip Type"
              placeholder="Select a category"
              value={undefined}
            />
          </View>
        </Section>

        {/* ─── PILLS & BADGES ─────────────────────────────────────────────── */}
        <Section title="💊 Pills">
          <Row wrap>
            {(['Flights', 'Hotels', 'Activities', 'Transport'] as const).map(
              (cat) => (
                <Pill
                  key={cat}
                  label={cat}
                  variant={selectedPill === cat ? 'selected' : 'default'}
                  onPress={() => setSelectedPill(cat)}
                />
              )
            )}
          </Row>
          <View style={{ height: spacing.md }} />
          <Row wrap>
            <Pill label="AI Suggested" variant="ai" />
            <Pill label="Confirmed" variant="success" />
            <Pill label="Warning" variant="warning" />
            <Pill label="Cancelled" variant="error" />
          </Row>
        </Section>

        <Section title="🏷 Badges">
          <Row wrap>
            <Badge label="Default" variant="default" />
            <Badge label="Selected" variant="selected" />
            <Badge label="Success" variant="success" />
            <Badge label="Warning" variant="warning" />
            <Badge label="Error" variant="error" />
            <Badge label="✦ AI" variant="ai" />
          </Row>
        </Section>

        {/* ─── AVATARS ────────────────────────────────────────────────────── */}
        <Section title="👤 Avatars">
          <Row>
            <Avatar name="Alice Johnson" size="xs" />
            <Avatar name="Bob Smith" size="sm" />
            <Avatar name="Carol White" size="md" />
            <Avatar name="David Brown" size="lg" />
          </Row>
          <View style={{ height: spacing.lg }} />
          <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.sm }]}>
            Avatar Group
          </Text>
          <AvatarGroup
            size="sm"
            avatars={[
              { name: 'Alice Johnson' },
              { name: 'Bob Smith' },
              { name: 'Carol White' },
              { name: 'David Brown' },
              { name: 'Eve Davis' },
              { name: 'Frank Miller' },
            ]}
            max={4}
          />
        </Section>

        {/* ─── PROGRESS BARS ──────────────────────────────────────────────── */}
        <Section title="📊 Progress Bars">
          <View style={{ gap: spacing.lg }}>
            <ProgressBar value={0.72} label="Trip Planning" valueLabel="72%" />
            <ProgressBar value={0.45} variant="warning" label="Budget" valueLabel="$4,500 / $10k" />
            <ProgressBar value={0.95} variant="success" label="Bookings" valueLabel="95%" />
            <ProgressBar value={0.2} variant="error" label="Documents" valueLabel="20%" />
            <ProgressBar value={0.6} compact label="Compact mode" />
          </View>
        </Section>

        {/* ─── SECTION HEADERS ────────────────────────────────────────────── */}
        <Section title="📌 Section Headers">
          <View style={{ gap: spacing.lg }}>
            <SectionHeader title="Upcoming Trips" actionLabel="See all" />
            <SectionHeader
              title="Your Itinerary"
              subtitle="3 items this week"
              actionLabel="Edit"
            />
            <SectionHeader title="No Action" />
          </View>
        </Section>

        {/* ─── DIVIDERS ───────────────────────────────────────────────────── */}
        <Section title="─ Dividers">
          <Divider />
          <View style={{ height: spacing.lg }} />
          <Divider label="or" />
          <View style={{ height: spacing.lg }} />
          <Divider label="Today" />
        </Section>

        {/* Bottom padding */}
        <View style={{ height: spacing['5xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Demo-specific styles (not part of the design system)
// ---------------------------------------------------------------------------
const demoStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
  },

  header: {
    marginBottom: spacing['3xl'],
  },
  headerTitle: {
    ...typography.display,
    color: colors.textPrimary,
  },
  headerSub: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  section: {
    marginBottom: spacing['3xl'],
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowWrap: {
    flexWrap: 'wrap',
  },

  swatchWrapper: {
    alignItems: 'center',
    width: 70,
    marginBottom: spacing.md,
  },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  swatchName: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  swatchHex: {
    fontSize: 8,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
