/**
 * AD22 — Student invoices (View). List + search + status filter, wired to
 * InvoiceListPresenter. Invoice amounts come from the backend — never
 * calculated on the phone.
 */
import React, { useEffect, useRef, useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import LabelledField from '../components/LabelledField';
import SelectSheet from '../components/SelectSheet';
import { LoadingView, EmptyState, ErrorState } from '../components/FeedbackViews';
import { InvoiceListPresenter } from '../../presenters/InvoiceListPresenter';
import { FinanceModel } from '../../models';
import { colors, typography, spacing } from '../theme';

const STATUSES = ['Paid', 'PartiallyPaid', 'Overdue', 'Draft']
  .map((s) => ({ label: s === 'PartiallyPaid' ? 'Partially paid' : s, value: s }))
  .concat([{ label: 'All statuses', value: 'all' }]);

export default function InvoiceListView({ navigation }) {
  const [presenter] = useState(() => new InvoiceListPresenter(FinanceModel));
  const [state, setState] = useState(presenter.initialState);
  const [sheetVisible, setSheetVisible] = useState(false);
  const loadedOnce = useRef(false);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    // Invoice statuses change on the payment screens, so re-fetch on every
    // focus after the first.
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current) presenter.load();
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  const rows = state.invoices.map((inv) => ({
    id: inv.id,
    title: inv.studentName || `Invoice ${inv.number || inv.id}`,
    meta: `${inv.planName || 'Fees'} · ${inv.amountLabel || ''} · ${inv.balanceLabel || ''}`,
    status: inv.status,
  }));

  return (
    <AdminScaffold
      eyebrow="Fees"
      title="Student invoices"
      subtitle="Every bill issued for this school."
    >
      <TextInput
        style={styles.search}
        placeholder="Search by student or invoice number"
        placeholderTextColor={colors.muted}
        value={state.filters.search}
        onChangeText={(t) => presenter.onSearchChange(t)}
      />
      <LabelledField
        label="Status"
        displayValue={state.filters.status === 'all' ? 'All statuses' : state.filters.status}
        onPress={() => setSheetVisible(true)}
      />

      {state.status === 'loading' ? <LoadingView label="Loading invoices…" /> : null}
      {state.status === 'empty' ? <EmptyState title="No invoices match" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onPullToRefresh()} />
      ) : null}
      {state.status === 'content' ? (
        <RecordList items={rows} onPressItem={(row) => presenter.onOpenInvoice(row)} />
      ) : null}

      <SelectSheet
        visible={sheetVisible}
        label="Invoice status"
        options={STATUSES}
        value={state.filters.status}
        onSelect={(v) => presenter.onFilterChange('status', v)}
        onClose={() => setSheetVisible(false)}
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
