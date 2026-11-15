/**
 * RecordList — simple labelled rows for the student list screens
 * (assignments, notices, reports, materials). One row per record: title,
 * meta line, optional status badge, optional chevron when the row opens a
 * detail screen. Mirrors the admin RecordList so the two apps read the same.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

// A small status pill. Tone is derived from the status text so the same list
// can show Open / Submitted / Graded / Published without a separate mapping.
function toneFor(status) {
  const s = String(status || '').toLowerCase();
  if (['graded', 'published', 'approved'].includes(s)) return colors.positive;
  if (['submitted', 'ready', 'in progress'].includes(s)) return colors.attention;
  if (['overdue', 'absent', 'returned'].includes(s)) return colors.error;
  return colors.border;
}

export default function RecordList({ items, onPressItem, emptyText = 'No records found.' }) {
  if (!items || items.length === 0) {
    return <Text style={styles.empty}>{emptyText}</Text>;
  }
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Pressable
          key={String(item.id)}
          onPress={onPressItem ? () => onPressItem(item) : null}
          disabled={!onPressItem}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.positive }]}
        >
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.meta ? (
              <Text style={styles.rowMeta} numberOfLines={2}>
                {item.meta}
              </Text>
            ) : null}
          </View>
          {item.status ? (
            <View style={[styles.badge, { backgroundColor: toneFor(item.status) }]}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          ) : null}
          {onPressItem ? <Text style={styles.chevron}>›</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowMain: { flex: 1 },
  rowTitle: { ...typography.body, fontWeight: '600' },
  rowMeta: { ...typography.label, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { ...typography.label, color: colors.text, fontWeight: '700' },
  chevron: { ...typography.title, color: colors.muted },
  empty: { ...typography.body, color: colors.muted, textAlign: 'center', padding: spacing.xl },
});
