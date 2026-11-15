/**
 * AD34 — School change history (View). Filter chips for the categories;
 * every row shows the day, the actor, the action and the exact detail.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import { LoadingView, ErrorState } from '../components/FeedbackViews';
import { AuditTrailPresenter, AUDIT_CATEGORIES } from '../../presenters/AuditTrailPresenter';
import { AuditTrailModel } from '../../models';
import { colors, typography, spacing } from '../theme';

export default function AuditTrailView({ navigation }) {
  const [presenter] = useState(() => new AuditTrailPresenter(AuditTrailModel));
  const [state, setState] = useState(presenter.initialState);
  const loadedOnce = useRef(false);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    // New entries land whenever anything is saved anywhere, so re-read on focus.
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current) presenter.load({ showLoading: false });
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  return (
    <AdminScaffold
      eyebrow="More"
      title="School change history"
      subtitle="Every change, who made it, and when — newest first."
    >
      {state.status === 'loading' ? <LoadingView label="Loading the history…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <View>
          <View style={styles.chipRow}>
            {AUDIT_CATEGORIES.map((c) => (
              <Pressable
                key={c}
                style={[styles.chip, state.category === c && styles.chipOn]}
                onPress={() => presenter.onFilterCategory(c)}
              >
                <Text style={[styles.chipText, state.category === c && styles.chipTextOn]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <RecordList
            items={state.rows.map((e) => ({
              id: e.id,
              title: e.action,
              meta: `${e.at} · ${e.actor} · ${e.detail}`,
              status: e.category,
              raw: e,
            }))}
            // Tapping an entry pops up everything about it — the change, the
            // day, who made it — instead of pretending to open another page.
            onPressItem={(row) =>
              Alert.alert(
                row.raw.action,
                `${row.raw.at} · ${row.raw.actor} · ${row.raw.category}\n\n${row.raw.detail}`,
              )
            }
            emptyText="Nothing recorded in this category yet."
          />
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.label, color: colors.muted },
  chipTextOn: { color: colors.white },
});
