/**
 * AD24 — Payments and money checks (View). Paystack settlements at the top
 * (unmatched ones are tappable to reconcile), the payment ledger under them,
 * and any webhook exceptions at the bottom.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, Alert, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { PaymentsBoardPresenter } from '../../presenters/PaymentsBoardPresenter';
import { FinanceModel } from '../../models';
import { typography, spacing } from '../theme';

export default function PaymentsBoardView({ navigation }) {
  const [presenter] = useState(() => new PaymentsBoardPresenter(FinanceModel));
  const [state, setState] = useState(presenter.initialState);
  const loadedOnce = useRef(false);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    // Settlements and exceptions change as the office acts, so re-fetch on
    // every focus after the first.
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current) presenter.load();
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  const confirmMatch = (settlement) => {
    Alert.alert(
      'Match this settlement?',
      `${settlement.amountLabel} from ${settlement.studentName} to ${settlement.invoiceNumber}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Match', onPress: () => presenter.reconcile(settlement) },
      ],
    );
  };

  const confirmException = (exception) => {
    Alert.alert(`Exception ${exception.reference}`, exception.detail, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Flag refund',
        onPress: () => presenter.resolveException(exception, 'refund-flag'),
      },
      { text: 'Resolved', onPress: () => presenter.resolveException(exception, 'resolve') },
    ]);
  };

  // Match failures and guard refusals pop up.
  useActionErrorAlert(state.errorText);

  return (
    <AdminScaffold
      eyebrow="Fees"
      title="Payments and money checks"
      subtitle="Match Paystack money to the invoices it pays."
    >
      {state.status === 'loading' ? <LoadingView label="Loading payments…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}

          <Text style={styles.section}>Paystack settlements</Text>
          <Text style={styles.hint}>Tap an unmatched settlement to reconcile it to its invoice.</Text>
          <RecordList
            items={state.settlements.map((s) => ({
              id: s.id,
              title: `${s.studentName} · ${s.amountLabel}`,
              meta: `${s.reference} · ${s.invoiceNumber} · paid ${s.paidAt}`,
              status: s.status,
              raw: s,
            }))}
            onPressItem={(row) => {
              if (row.raw.status === 'Unmatched') confirmMatch(row.raw);
              else presenter.onOpenSettlementPayment(row.raw);
            }}
            emptyText="No Paystack settlements yet."
          />

          <Text style={styles.section}>Payment ledger</Text>
          <RecordList
            items={state.payments.map((p) => ({
              id: p.id,
              title: `${p.studentName} · ${p.amountLabel}`,
              meta: `${p.channel} · ${p.reference} · ${p.paidAt}`,
              status: p.status,
              raw: p,
            }))}
            onPressItem={(row) => presenter.onOpenPayment(row.raw)}
            emptyText="No payments recorded yet."
          />

          <Text style={styles.section}>Exceptions</Text>
          <Text style={styles.hint}>Tap an open exception to resolve it or flag it for refund.</Text>
          <RecordList
            items={state.exceptions.map((e) => ({
              id: e.id,
              title: `${e.reference} · ${e.amountLabel}`,
              meta: `${e.detail} · opened ${e.openedAt}`,
              status: e.status,
              raw: e,
            }))}
            onPressItem={(row) => {
              if (row.raw.status === 'Open') confirmException(row.raw);
            }}
            emptyText="No open exceptions — clean money week."
          />
        </>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  hint: { ...typography.label, marginBottom: spacing.sm },
  notice: { ...typography.label, color: '#2f6b3a', marginBottom: spacing.sm },
  error: { ...typography.label, color: '#a33a2a', marginBottom: spacing.sm },
});
