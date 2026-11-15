/**
 * StudentScaffold — the shared page frame for every student screen. Header
 * with the student's name + class, a screen title/subtitle, scrollable body,
 * and a back row on sub-pages. Mirrors the admin AdminScaffold so the student
 * and admin apps share one visual language.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing } from '../theme';

export default function StudentScaffold({
  bannerTop,
  bannerBottom,
  eyebrow,
  title,
  subtitle,
  children,
  scrollable = true,
}) {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {canGoBack ? (
        <Pressable style={styles.backRow} onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
      ) : null}
      {(bannerTop || bannerBottom) && (
        <View style={styles.context}>
          {bannerTop ? (
            <Text style={styles.contextTop} numberOfLines={1} ellipsizeMode="tail">
              {bannerTop}
            </Text>
          ) : null}
          {bannerBottom ? (
            <Text style={styles.contextBottom} numberOfLines={1} ellipsizeMode="tail">
              {bannerBottom}
            </Text>
          ) : null}
        </View>
      )}
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
          <Text style={styles.subtitle} numberOfLines={3} ellipsizeMode="tail">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {scrollable ? (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  backRow: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  backText: { ...typography.label, color: colors.primary },
  context: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  contextTop: { ...typography.label, color: colors.text },
  contextBottom: { ...typography.label, color: colors.muted, marginTop: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  eyebrow: { ...typography.label, color: colors.primary, textTransform: 'uppercase' },
  title: { ...typography.title, marginTop: 2 },
  subtitle: { ...typography.body, color: colors.muted, marginTop: 4 },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
});
