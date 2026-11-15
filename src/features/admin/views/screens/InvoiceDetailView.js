/**
 * AD23 — Invoice detail and office payment (View). The invoice's facts and
 * the payments recorded on it, then the office payment form (amount, method,
 * reference). Recording asks for a confirm; balance and status update at once.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import StatusBadge from '../components/StatusBadge';
import SelectSheet from '../components/SelectSheet';
import { LoadingView, EmptyState, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { PrimaryButton } from './AdminHomeView';
import { InvoiceDetailPresenter } from '../../presenters/InvoiceDetailPresenter';
import { FinanceModel } from '../../models';
import { colors, typography, spacing, statusTone } from '../theme';

const METHODS = ['Cash', 'Transfer', 'POS'];

export default function InvoiceDetailView({ route, navigation }) {
  const [presenter] = useState(() => new InvoiceDetailPresenter(FinanceModel));
  const [state, setState] = useState(presenter.initialState);
  const [amountText, setAmountText] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [methodSheet, setMethodSheet] = useState(false);
  const invoiceId = route.params?.invoiceId;
  const loadedOnce = useRef(false);

  useEffect(() => {
    presenter.attach(setState, navigation);
    if (invoiceId) presenter.load(invoiceId);
    // Payments can also be recorded from other screens, so re-fetch on every
    // focus after the first.
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current && invoiceId) presenter.load(invoiceId);
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, invoiceId, navigation]);

  const inv = state.invoice;

  const confirmRecord = () => {
    const method = state.method;
    Alert.alert(
      'Record this payment?',
      `${method} · ₦${Number(String(amountText).replace(/[^0-9.]/g, '') || 0).toLocaleString(
        'en-NG',
      )}. The balance and status update immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record',
          onPress: () => {
            presenter.recordPayment({ amount: amountText, method, reference: referenceText });
            setAmountText('');
            setReferenceText('');
          },
        },
      ],
    );
  };

  // Payment validation errors pop up instead of inline text.
  useActionErrorAlert(state.errorText);

  if (!invoiceId) {
    return (
      <AdminScaffold eyebrow="Fees" title="Invoice">
        <EmptyState
          title="No invoice selected"
          hint="Open one from Fees → Student invoices — this page shows one invoice with its payments."
        />
      </AdminScaffold>
    );
  }

  return (
    <AdminScaffold
      eyebrow="Fees"
      title={inv ? inv.number : 'Invoice'}
      subtitle={inv ? `${inv.studentName} · ${inv.planName}` : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading the invoice…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' && inv ? (
        <View>
          <View style={styles.badgeRow}>
            <StatusBadge label={inv.status} tone={statusTone[inv.status] || 'muted'} />
            <Text style={styles.meta}>Due {inv.dueDate}</Text>
          </View>

          <Text style={styles.amount}>{inv.amountLabel}</Text>
          <Text style={styles.balance}>{inv.balanceLabel}</Text>

          <Text style={styles.section}>Payments on this invoice</Text>
          <RecordList
            items={state.payments.map((p) => ({
              id: p.id,
              title: `${p.method} · ${p.amountLabel}`,
              meta: `${p.reference} · ${p.paidAt}`,
            }))}
            emptyText="Nothing recorded yet — record the first payment below."
          />

          <Text style={styles.section}>Record an office payment</Text>
          <Text style={styles.hint}>Cash, transfer or POS paid at the school office.</Text>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}

          <Text style={styles.fieldLabel}>Amount (₦)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 20000"
            placeholderTextColor={colors.muted}
            value={amountText}
            // Pasted text cannot smuggle letters or symbols past the number pad.
            onChangeText={(t) => setAmountText(t.replace(/[^0-9.]/g, ''))}
          />

          <Text style={styles.fieldLabel}>Method</Text>
          <Pressable style={styles.methodBox} onPress={() => setMethodSheet(true)}>
            <Text style={styles.methodText}>{state.method}</Text>
            <Text style={styles.methodCaret}>Change</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>Receipt reference (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. RCP-0142"
            placeholderTextColor={colors.muted}
            value={referenceText}
            onChangeText={setReferenceText}
          />

          <View style={styles.sendBtn}>
            <PrimaryButton
              label={state.saving ? 'Saving…' : 'Record payment'}
              disabled={!amountText.trim() || state.saving}
              onPress={confirmRecord}
            />
          </View>
        </View>
      ) : null}

      <SelectSheet
        visible={methodSheet}
        label="How was it paid?"
        options={METHODS.map((m) => ({ label: m, value: m }))}
        value={state.method}
        onSelect={(v) => presenter.onPickMethod(v)}
        onClose={() => setMethodSheet(false)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  meta: { ...typography.label, color: colors.muted },
  amount: { ...typography.title, marginTop: spacing.md },
  balance: { ...typography.body, color: colors.muted, marginTop: 2 },
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  hint: { ...typography.label, marginBottom: spacing.sm },
  notice: { ...typography.label, color: '#2f6b3a', marginBottom: spacing.sm },
  error: { ...typography.label, color: '#a33a2a', marginBottom: spacing.sm },
  fieldLabel: { ...typography.label, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: {
    ...typography.input,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  methodBox: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodText: { ...typography.body },
  methodCaret: { ...typography.label, color: colors.primary },
  sendBtn: { marginTop: spacing.md, marginBottom: spacing.sm },
});
