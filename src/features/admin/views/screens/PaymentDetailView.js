/**
 * AD25 — Payment detail and fee-adjustment refund review.
 * This view requests, approves/rejects and confirms a refund already processed
 * by the provider; it does not pretend the backend can execute refunds itself.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import StatusBadge from '../components/StatusBadge';
import {
  LoadingView,
  EmptyState,
  ErrorState,
  Notice,
  useActionErrorAlert,
} from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { PaymentDetailPresenter } from '../../presenters/PaymentDetailPresenter';
import { FinanceModel } from '../../models';
import { colors, typography, spacing, statusTone } from '../theme';

export default function PaymentDetailView({ route, navigation }) {
  const [presenter] = useState(() => new PaymentDetailPresenter(FinanceModel));
  const [state, setState] = useState(presenter.initialState);
  const [requestReason, setRequestReason] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [refundReference, setRefundReference] = useState('');
  const [verificationReference, setVerificationReference] = useState('');
  const paymentId = route.params?.paymentId;
  const loadedOnce = useRef(false);

  useEffect(() => {
    presenter.attach(setState, navigation);
    if (paymentId) presenter.load(paymentId);
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current && paymentId) presenter.load(paymentId);
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, paymentId, navigation]);

  const payment = state.payment;
  useActionErrorAlert(state.errorText, 'Payment / refund');

  if (!paymentId) {
    return (
      <AdminScaffold eyebrow="Fees" title="Payment detail">
        <EmptyState
          title="No payment selected"
          hint="Open a confirmed payment from the payment ledger."
        />
      </AdminScaffold>
    );
  }

  return (
    <AdminScaffold
      eyebrow="Fees"
      title="Payment detail"
      subtitle={payment ? [payment.studentName, payment.reference].filter(Boolean).join(' · ') : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading payment and refund records…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}
      {state.notice ? <Notice text={state.notice} /> : null}

      {state.status === 'content' && payment ? (
        <View>
          <View style={styles.badgeRow}>
            <StatusBadge label={payment.status} tone={statusTone[payment.status] || 'muted'} />
            <Text style={styles.meta}>{payment.paidAt}</Text>
          </View>

          <Text style={styles.amount}>{payment.amountLabel}</Text>
          <Text style={styles.meta}>
            {payment.channel} · {payment.reference}
          </Text>
          <Text style={styles.meta}>Invoice ID: {payment.invoiceId}</Text>

          <Text style={styles.section}>Refund adjustment requests</Text>
          {state.refunds.length === 0 ? (
            <Text style={styles.muted}>No refund requests have been raised for this payment.</Text>
          ) : (
            state.refunds.map((refund) => (
              <View key={refund.id} style={styles.refundCard}>
                <View style={styles.refundHead}>
                  <Text style={styles.refundTitle}>{refund.amountLabel}</Text>
                  <StatusBadge label={refund.status} tone={statusTone[refund.status] || 'muted'} />
                </View>
                <Text style={styles.refundReason}>{refund.reason}</Text>
                <Text style={styles.refundMeta}>
                  Raised {refund.createdAt ?? 'date unavailable'} · {refund.evidenceReference || 'No evidence reference'}
                </Text>

                {refund.status === 'Pending' ? (
                  <View style={styles.refundActions}>
                    <Text style={styles.hint}>Principal decision reason (required for approval or rejection)</Text>
                    <TextInput
                      style={styles.input}
                      value={decisionReason}
                      onChangeText={setDecisionReason}
                      placeholder="Explain the decision"
                      placeholderTextColor={colors.muted}
                      maxLength={500}
                    />
                    <SecondaryButton
                      label={state.saving === 'decide:' + refund.id ? 'Saving…' : 'Approve refund'}
                      disabled={Boolean(state.saving) || decisionReason.trim().length < 5}
                      onPress={async () => {
                        const saved = await presenter.onDecision(refund, 'approve', decisionReason);
                        if (saved) setDecisionReason('');
                      }}
                    />
                    <SecondaryButton
                      label={state.saving === 'decide:' + refund.id ? 'Saving…' : 'Reject request'}
                      disabled={Boolean(state.saving) || decisionReason.trim().length < 5}
                      onPress={async () => {
                        const saved = await presenter.onDecision(refund, 'reject', decisionReason);
                        if (saved) setDecisionReason('');
                      }}
                    />
                  </View>
                ) : null}

                {refund.status === 'Approved' ? (
                  <View style={styles.refundActions}>
                    <Text style={styles.hint}>
                      Process the refund with the payment provider first. This step verifies and records that provider refund; it does not initiate the transfer.
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={refundReference}
                      onChangeText={setRefundReference}
                      placeholder="Provider refund reference"
                      placeholderTextColor={colors.muted}
                    />
                    <TextInput
                      style={styles.input}
                      value={verificationReference}
                      onChangeText={setVerificationReference}
                      placeholder="Independent verification evidence"
                      placeholderTextColor={colors.muted}
                    />
                    <SecondaryButton
                      label={state.saving === 'confirm:' + refund.id ? 'Verifying…' : 'Verify and confirm refund'}
                      disabled={Boolean(state.saving) || refundReference.trim().length < 3 || verificationReference.trim().length < 5}
                      onPress={async () => {
                        const saved = await presenter.onConfirmRefund(
                          refund,
                          refundReference,
                          verificationReference,
                        );
                        if (saved) {
                          setRefundReference('');
                          setVerificationReference('');
                        }
                      }}
                    />
                  </View>
                ) : null}
              </View>
            ))
          )}

          <Text style={styles.section}>Request a full refund</Text>
          <Text style={styles.hint}>
            The request uses this payment’s actual invoice and allocated payment amount. A Principal must review it independently.
          </Text>
          <TextInput
            style={styles.input}
            multiline
            placeholder="Why should this payment be refunded? (at least 5 characters)"
            placeholderTextColor={colors.muted}
            value={requestReason}
            onChangeText={setRequestReason}
          />
          <View style={styles.sendBtn}>
            <PrimaryButton
              label={state.saving === 'request' ? 'Submitting…' : 'Request refund review'}
              disabled={!requestReason.trim() || requestReason.trim().length < 5 || Boolean(state.saving)}
              onPress={async () => {
                const saved = await presenter.onRequestRefund(requestReason);
                if (saved) setRequestReason('');
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
  hint: { ...typography.label, color: colors.muted, marginBottom: spacing.sm },
  refundCard: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  refundHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refundTitle: { ...typography.body, fontWeight: '700' },
  refundReason: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  refundMeta: { ...typography.label, color: colors.muted, marginTop: spacing.xs },
  refundActions: { gap: spacing.sm, marginTop: spacing.md },
  input: {
    ...typography.input,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    marginTop: spacing.xs,
  },
  sendBtn: { marginTop: spacing.md, marginBottom: spacing.sm },
});
