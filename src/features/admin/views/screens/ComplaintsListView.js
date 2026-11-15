/**
 * AD31 — Complaints list (View). Search + status filter + the case list;
 * tapping a case opens AD32. The status choices mirror the state machine.
 */
import React, { useEffect, useRef, useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import LabelledField from '../components/LabelledField';
import SelectSheet from '../components/SelectSheet';
import { LoadingView, EmptyState, ErrorState } from '../components/FeedbackViews';
import { ComplaintsListPresenter } from '../../presenters/ComplaintsListPresenter';
import { ComplaintsModel } from '../../models';
import { colors, typography, spacing } from '../theme';

export default function ComplaintsListView({ navigation }) {
  const [presenter] = useState(() => new ComplaintsListPresenter(ComplaintsModel));
  const [state, setState] = useState(presenter.initialState);
  const [sheet, setSheet] = useState(false);
  const loadedOnce = useRef(false);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    // Case statuses change on the detail page, so re-fetch on every focus
    // after the first — the tags here stay current.
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current) presenter.load();
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  const { filters } = state;
  const rows = state.complaints.map((c) => ({
    id: c.id,
    title: `${c.guardianName} · ${c.subject}`,
    meta: `${c.studentName || '—'} (${c.classLabel || '—'}) · ${c.channel} · ${c.openedAt}`,
    status: c.status,
    raw: c,
  }));

  return (
    <AdminScaffold
      eyebrow="More"
      title="Complaints"
      subtitle="Every guardian complaint, in one queue."
    >
      <TextInput
        style={styles.search}
        placeholder="Search by guardian, student or subject"
        placeholderTextColor={colors.muted}
        value={filters.search}
        onChangeText={(text) => presenter.onSearchChange(text)}
      />

      <LabelledField
        label="Status"
        displayValue={filters.status === 'all' ? 'All statuses' : filters.status}
        onPress={() => setSheet(true)}
      />

      {state.status === 'loading' ? <LoadingView label="Loading complaints…" /> : null}
      {state.status === 'empty' ? (
        <EmptyState
          title="No complaints here"
          hint="Change the filter, or enjoy the quiet queue."
        />
      ) : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}
      {state.status === 'content' ? (
        <RecordList
          items={rows}
          onPressItem={(row) => presenter.onOpenCase(row.raw)}
          emptyText="No complaints match."
        />
      ) : null}

      <SelectSheet
        visible={sheet}
        label="Filter by status"
        options={['all', ...state.statuses].map((s) => ({
          label: s === 'all' ? 'All statuses' : s,
          value: s,
        }))}
        value={filters.status}
        onSelect={(v) => presenter.onFilterChange('status', v)}
        onClose={() => setSheet(false)}
      />
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
    minHeight: 44,
    marginBottom: spacing.md,
  },
});
