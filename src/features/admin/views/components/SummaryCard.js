/** SummaryCard — the tappable count tiles on AD01 (e.g. "2 Absent students"). */
import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, typography, spacing, touchTarget } from '../theme';

export default function SummaryCard({ value, label, onPress, tone, icon, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        tone ? { backgroundColor: tone } : null,
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={colors.primary} style={styles.icon} /> : null}
      <Text style={styles.value}>{String(value)}</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    ...touchTarget,
  },
  value: { ...typography.title, color: colors.primary },
  label: { ...typography.label, marginTop: 2 },
  icon: { marginBottom: spacing.xs },
});
