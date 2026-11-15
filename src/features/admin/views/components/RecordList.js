/**
 * RecordList — the shared record rows used across list screens (AD02 students,
 * AD05 guardians, AD07 teachers, AD22 invoices...). Rows are 44pt+ touch
 * targets and show name, meta line and an optional status badge.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import StatusBadge from './StatusBadge';
import { colors, typography, spacing, statusTone } from '../theme';

export function RecordRow({ title, meta, status, onPress, showChevron = true }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.positive }]}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.rowMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {/* alignSelf center overrides the badge's flex-start so the tag sits
          in the vertical middle of the row instead of hugging the top. */}
      {status ? (
        <StatusBadge
          label={status}
          tone={statusTone[status] || 'muted'}
          style={styles.statusBadge}
        />
      ) : null}
      {/* The chevron means "this opens something". Rows that are informational
          (or whose tap is handled inside the screen) set showChevron=false —
          no arrows that lead nowhere. */}
      {showChevron ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );
}

export default function RecordList({ items, onPressItem, emptyText = 'No records found.' }) {
  if (!items || items.length === 0) {
    return <Text style={styles.empty}>{emptyText}</Text>;
  }
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <RecordRow
          key={String(item.id)}
          title={item.title}
          meta={item.meta}
          status={item.status}
          onPress={onPressItem ? () => onPressItem(item) : null}
          // A row can opt out of the arrow (item.static) while keeping its tap.
          showChevron={Boolean(onPressItem) && !item.static}
        />
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
  statusBadge: { alignSelf: 'center' },
  rowTitle: { ...typography.body, fontWeight: '600' },
  rowMeta: { ...typography.label, marginTop: 2 },
  chevron: { ...typography.title, color: colors.muted },
  empty: { ...typography.body, color: colors.muted, textAlign: 'center', padding: spacing.xl },
});
