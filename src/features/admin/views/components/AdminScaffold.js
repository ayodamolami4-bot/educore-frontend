/**
 * AdminScaffold — the shared page frame from the design system:
 * header (school + session context), screen title/subtitle, scrollable body,
 * optional bottom action area. Every admin screen wraps itself in this.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing } from '../theme';
import useSchoolContext from './useSchoolContext';

export default function AdminScaffold({
  // The banner reads the LIVE school name from settings by default, so a name
  // change in AD10 follows onto every screen. A screen may still override
  // (e.g. a cross-school context) by passing these props explicitly.
  contextTop,
  contextBottom,
  eyebrow,
  title,
  subtitle,
  actions = null,
  insetBottom = true, // false for screens inside the tab bar (it owns the bottom inset)
  /** Screens with an in-page detail state (a draft, a report card…) pass
      their "close the detail" action here, so Back first returns to the last
      thing on this screen and only then leaves the screen. */
  onBack,
  children,
}) {
  const navigation = useNavigation();
  const schoolContext = useSchoolContext();
  const bannerTop = contextTop !== undefined ? contextTop : schoolContext.schoolName;
  const bannerBottom = contextBottom !== undefined ? contextBottom : schoolContext.contextBottom;
  // Sub-pages show a back arrow; tab roots have nowhere to go back to.
  const canGoBack = navigation.canGoBack() || Boolean(onBack);

  return (
    <SafeAreaView style={styles.safe} edges={insetBottom ? ['top', 'bottom'] : ['top']}>
      {canGoBack ? (
        <Pressable
          style={styles.backRow}
          onPress={() => (onBack ? onBack() : navigation.goBack())}
          hitSlop={12}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      ) : null}
      <View style={styles.context}>
        <Text style={styles.contextTop} numberOfLines={1} ellipsizeMode="tail">
          {bannerTop}
        </Text>
        <Text style={styles.contextBottom} numberOfLines={1} ellipsizeMode="tail">
          {bannerBottom}
        </Text>
      </View>

      <View style={styles.header}>
        {eyebrow ? (
          <Text style={styles.eyebrow} numberOfLines={1} ellipsizeMode="tail">
            {eyebrow}
          </Text>
        ) : null}
        {title ? (
          <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2} ellipsizeMode="tail">
            {subtitle}
          </Text>
        ) : null}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  backRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  backText: { ...typography.body, color: colors.primary },
  context: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contextTop: { ...typography.label, color: colors.text },
  contextBottom: { ...typography.label },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  eyebrow: {
    ...typography.label,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  title: { ...typography.title, marginBottom: 2 },
  subtitle: { ...typography.body, color: colors.muted },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
});
