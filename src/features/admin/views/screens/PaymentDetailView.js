/**
 * AD25 — Payment detail and refund review (View). The payment's facts at the
 * top, the refund requests with their state-machine buttons under them, and
 * the "request refund" form at the bottom. Closing asks twice where needed.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import StatusBadge from '../components/StatusBadge';
import { LoadingView, EmptyState, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { PaymentDetailPresenter } from '../../presenters/PaymentDetailPresenter';
import { FinanceModel } from '../../models';
import { colors, typography, spacing, statusTone } from '../theme';

export default function PaymentDetailView({ route, navigation }) {
  const [presenter] = useState(() => new PaymentDetailPresenter(FinanceModel));
  const [state, setState] = useState(presenter.initialState);
  const [reasonText, setReasonText] = useState('');
  const paymentId = route.params?.paymentId;
  const loadedOnce = useRef(false);

  useEffect(() => {
    presenter.attach(setState, navigation);
    if (paymentId) presenter.load(paymentId);
    // Refund statuses change as the office acts, so re-fetch on every focus
    // after the first.
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current && paymentId) presenter.load(paymentId);
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, paymentId, navigation]);

  const p = state.payment;

  const confirmDecision = (refund, action) => {
    Alert.alert(
      action === 'approve' ? 'Approve this refund?' : 'Reject this refund request?',
      `${refund.studentName} · ${refund.amountLabel} · ${refund.reference}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: () => presenter.onDecision(refund, action),
        },
      ],
    );
  };

  const confirmExecute = (refund) => {
    Alert.alert(
      'Execute this refund through Paystack?',
      `${refund.studentName} · ${refund.amountLabel} · ${refund.reference}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Execute', onPress: () => presenter.onExecute(refund) },
      ],
    );
  };

  // Refund guard refusals pop up instead of inline text.
  useActionErrorAlert(state.errorText);

  if (!paymentId) {
    return (
      <AdminScaffold eyebrow="Fees" title="Payment detail">
        <EmptyState
          title="No payment selected"
          hint="Open one from the payment ledger on Payments and money checks."
        />
      </AdminScaffold>
    );
  }

  return (
    <AdminScaffold
      eyebrow="Fees"
      title="Payment detail"
      subtitle={p ? `${p.studentName} · ${p.reference}` : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading the payment…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' && p ? (
        <View>
          <View style={styles.badgeRow}>
            <StatusBadge label={p.status} tone={statusTone[p.status] || 'muted'} />
            <Text style={styles.meta}>{p.paidAt}</Text>
          </View>

          <Text style={styles.amount}>{p.amountLabel}</Text>
          <Text style={styles.meta}>
            {p.channel} · {p.reference}
            {p.invoiceNumber ? ` · ${p.invoiceNumber}` : ''}
          </Text>

          <Text style={styles.section}>Refund requests on this payment</Text>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
          {state.refunds.length === 0 ? (
            <Text style={styles.muted}>No refund requests yet.</Text>
          ) : (
            state.refunds.map((r) => (
              <View key={r.id} style={styles.refundCard}>
                <View style={styles.refundHead}>
                  <Text style={styles.refundTitle}>
                    {r.studentName} · {r.amountLabel}
                  </Text>
                  <StatusBadge label={r.status} tone={statusTone[r.status] || 'muted'} />
                </View>
                <Text style={styles.refundReason}>{r.reason}</Text>
                <Text style={styles.refundMeta}>Raised {r.createdAt} · {r.reference}</Text>
                {r.status === 'Pending' ? (
                  <View style={styles.refundActions}>
                    <SecondaryButton
                      label={state.saving === `decide:${r.id}` ? 'Saving…' : 'Approve refund'}
                      disabled={Boolean(state.saving)}
                      onPress={() => confirmDecision(r, 'approve')}
                    />
                    <SecondaryButton
                      label={state.saving === `decide:${r.id}` ? 'Saving…' : 'Reject'}
                      disabled={Boolean(state.saving)}
                      onPress={() => confirmDecision(r, 'reject')}
                    />
                  </View>
                ) : null}
                {r.status === 'Approved' ? (
                  <View style={styles.refundActions}>
                    <SecondaryButton
                      label={state.saving === `execute:${r.id}` ? 'Working…' : 'Execute via Paystack'}
                      disabled={Boolean(state.saving)}
                      onPress={() => confirmExecute(r)}
                    />
                    <SecondaryButton
                      label={state.saving === `confirm:${r.id}` ? 'Saving…' : 'Mark refunded (manual)'}
                      disabled={Boolean(state.saving)}
                      onPress={() => presenter.onConfirmManual(r)}
                    />
                  </View>
                ) : null}
              </View>
            ))
          )}

          <Text style={styles.section}>Raise a refund request</Text>
          <Text style={styles.hint}>
            For full refunds of this payment — the amount and reference are taken from it.
          </Text>
          <TextInput
            style={styles.input}
            multiline
            placeholder="Why should this payment be refunded?"
            placeholderTextColor={colors.muted}
            value={reasonText}
            onChangeText={setReasonText}
          />
          <View style={styles.sendBtn}>
            <PrimaryButton
              label={state.saving === 'request' ? 'Saving…' : 'Request refund'}
              disabled={!reasonText.trim() || Boolean(state.saving)}
              onPress={() => {
                presenter.onRequestRefund(reasonText);
                setReasonText('');
              }}
            />
          </View>
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  meta: { ...typography.label, color: colors.muted, marginTop: 2 },
  amount: { ...typography.title, marginTop: spacing.md },
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  muted: { ...typography.body, color: colors.muted },
  hint: { ...typography.label, marginBottom: spacing.sm },
  notice: { ...typography.label, color: '#2f6b3a', marginBottom: spacing.sm },
  error: { ...typography.label, color: '#a33a2a', marginBottom: spacing.sm },
  refundCard: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  refundHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refundTitle: { ...typography.body },
  refundReason: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  refundMeta: { ...typography.label, color: colors.muted, marginTop: spacing.xs },
  refundActions: { gap: spacing.sm, marginTop: spacing.sm },
  input: {
    ...typography.input,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
    marginTop: spacing.xs,
  },
  sendBtn: { marginTop: spacing.md, marginBottom: spacing.sm },
});
