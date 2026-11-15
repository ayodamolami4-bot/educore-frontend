/**
 * StatusBadge — statuses use words as well as colour (accessibility rule
 * from the design handoff's completion checklist).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

const toneBackground = {
  positive: colors.positive,
  attention: colors.attention,
  error: colors.error,
  info: colors.positive,
  muted: colors.border,
};

export default function StatusBadge({ label, tone = 'muted', style }) {
  return (
    <View
      style={[styles.badge, { backgroundColor: toneBackground[tone] || colors.border }, style]}
    >
      <Text style={styles.label}>{String(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: { ...typography.label, color: colors.text },
});
