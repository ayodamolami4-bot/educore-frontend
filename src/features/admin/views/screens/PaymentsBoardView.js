/**
 * AD24 — Payment ledger, imported/synchronised reconciliation batches and
 * provider verification exceptions, shown using the backend's real records.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import { LoadingView, EmptyState, ErrorState, Notice } from '../components/FeedbackViews';
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
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current) presenter.load();
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  return (
    <AdminScaffold
      eyebrow="Fees"
      title="Payments and reconciliation"
      subtitle="Confirmed invoice payments, statement batches and provider verification exceptions."
    >
      {state.status === 'loading' ? <LoadingView label="Loading finance records…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}
      {state.notice ? <Notice text={state.notice} /> : null}

      {state.status === 'content' ? (
        <>
          <Text style={styles.section}>Reconciliation batches</Text>
          {state.settlements.length === 0 ? (
            <EmptyState
              title="No settlement batches"
              description="Imported bank statements and Paystack sync batches will appear here."
            />
          ) : (
            state.settlements.map((batch) => (
              <View key={batch.id} style={styles.batch}>
                <Text style={styles.batchTitle}>
                  {batch.source} · {batch.reference} · {batch.state}
                </Text>
                <Text style={styles.hint}>{batch.createdAt}</Text>
                <RecordList
                items={(batch.rows ?? []).map((row) => ({
                  id: row.id,
                  title: row.reference + ' · ' + row.amountLabel,
                  meta: [
                    'Fee ' + row.feeLabel,
                    'Net ' + row.netLabel,
                    row.issue ?? '',
                    row.resolution ?? '',
                  ].filter(Boolean).join(' · '),
                  status: row.reviewState,
                  raw: row,
                }))}
                onPressItem={(item) => presenter.onOpenSettlementRow(item.raw)}
                emptyText="This batch contains no settlement rows."
                />
              </View>
            ))
          )}

          <Text style={styles.section}>Confirmed payment ledger</Text>
          <RecordList
            items={state.payments.map((payment) => ({
              id: payment.id,
              title: payment.studentName + ' · ' + payment.amountLabel,
              meta: [
                payment.channel,
                payment.reference,
                payment.paidAt,
                payment.invoiceId ? 'Invoice ' + payment.invoiceId : '',
              ].filter(Boolean).join(' · '),
              status: payment.status,
              raw: payment,
            }))}
            onPressItem={(row) => presenter.onOpenPayment(row.raw)}
            emptyText="No confirmed payments recorded yet."
          />

          <Text style={styles.section}>Provider verification exceptions</Text>
          <Text style={styles.hint}>
            These are immutable verification exception records. The current API exposes them for review but does not provide a direct resolve or refund-flag action.
          </Text>
          <RecordList
            items={state.exceptions.map((exception) => ({
              id: exception.id,
              title: exception.reference + ' · ' + exception.code,
              meta: exception.createdAt ?? '',
              status: exception.stateLabel,
              raw: exception,
            }))}
            emptyText="No provider verification exceptions."
          />
        </>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  batch: { marginBottom: spacing.md },
  batchTitle: { ...typography.body, fontWeight: '700', marginBottom: spacing.xs },
  hint: { ...typography.label, color: '#65727a', marginBottom: spacing.sm },
});
