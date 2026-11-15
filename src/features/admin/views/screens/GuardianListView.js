/**
 * AD05 — Parents and guardians list (View). Search box plus account-status
 * filter chips; every row opens the guardian's profile. Re-fetches on focus.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import { LoadingView, ErrorState } from '../components/FeedbackViews';
import { GuardianListPresenter } from '../../presenters/GuardianListPresenter';
import { GuardianModel } from '../../models';
import { colors, typography, spacing } from '../theme';

const STATUSES = ['all', 'Active', 'Invited'];

export default function GuardianListView({ navigation }) {
  const [presenter] = useState(() => new GuardianListPresenter(GuardianModel));
  const [state, setState] = useState(presenter.initialState);
  const loadedOnce = useRef(false);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    // Links change as the office invites or revokes accounts, so re-fetch on
    // every focus after the first.
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current) presenter.load({ showLoading: false });
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  const rows = state.rows.map((g) => ({
    id: g.id,
    title: g.name,
    meta: `${g.phone} · ${g.email}${
      g.childrenCount ? ` · ${g.childrenCount} child${g.childrenCount > 1 ? 'ren' : ''}` : ''
    }`,
    status: g.status,
    raw: g,
  }));

  return (
    <AdminScaffold
      eyebrow="People"
      title="Parents and guardians"
      subtitle="Who can see which child in the Parent app"
    >
      {state.status === 'loading' ? <LoadingView label="Loading the guardians…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <View>
          <TextInput
            style={styles.search}
            placeholder="Search name, phone, email or child"
            placeholderTextColor={colors.muted}
            value={state.query.q}
            onChangeText={(t) => presenter.onSearch(t)}
          />
          <View style={styles.chipRow}>
            {STATUSES.map((s) => (
              <Pressable
                key={s}
                style={[styles.chip, state.query.status === s && styles.chipOn]}
                onPress={() => presenter.onFilterStatus(s)}
              >
                <Text
                  style={[
                    styles.chipText,
                    state.query.status === s && styles.chipTextOn,
                  ]}
                >
                  {s === 'all' ? 'All' : s}
                </Text>
              </Pressable>
            ))}
          </View>
          <RecordList
            items={rows}
            onPressItem={(row) => presenter.onOpenGuardian(row.raw)}
            emptyText="No guardians match — try clearing the search or filter."
          />
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  search: {
    ...typography.input,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 46,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
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
