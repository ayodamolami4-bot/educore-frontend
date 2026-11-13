import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Notice,
  Select,
  ui,
} from '../../../components/Controls.jsx';
import { Screen } from '../../../components/Screen.jsx';
import { useServices } from '../../../core/ServicesContext.jsx';
import { usePresenter } from '../../../core/usePresenter.js';
import { naira } from '../../../utils/format.js';
import { canPay } from '../models/ParentModel.js';
import { PaymentPresenter } from '../presenters/PaymentPresenter.js';
import { PdfButton } from './PdfButton.jsx';

export function InvoiceScreen({ context, model, navigation, route }) {
  const { config, session } = useServices();
  const account = usePresenter(session).account;
  const { invoiceId } = route.params;
  const presenter = useMemo(() => new PaymentPresenter(model, { invoiceId }), [invoiceId, model]);
  const state = usePresenter(presenter);
  const [choice, setChoice] = useState('full');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState(account?.verifiedEmail ?? '');
  const allowed = canPay(context);
  useFocusEffect(
    useCallback(() => {
      if (allowed) void presenter.load();
    }, [allowed, presenter]),
  );
  const invoice = state.detail?.invoice;
  const attempt = model.attempt(invoiceId);

  async function beginCheckout() {
    const intent = await presenter.checkout(
      invoice?.partialAllowed ? choice : 'full',
      amount,
      email,
    );
    if (intent && navigation.isFocused())
      navigation.navigate('PA12', { invoiceId, intentId: intent.id });
  }

  return (
    <Screen
      title="Invoice and payment"
      subtitle={[context.childName, context.schoolName].filter(Boolean).join(' · ')}
      code="PA11"
      back={() => navigation.goBack()}
    >
      <Notice text={state.error} tone="error" />
      {!allowed && <EmptyState title="Fee access is unavailable" icon="lock-closed-outline" />}
      {state.busy && !invoice && <ActivityIndicator accessibilityLabel="Loading invoice" />}
      {!invoice && allowed && state.error && (
        <Button title="Reload invoice" variant="secondary" onPress={() => void presenter.load()} />
      )}
      {invoice && (
        <>
          <Card title={invoice.description} subtitle={'Due ' + invoice.dueOn}>
            {invoice.lines.map((item, index) => (
              <View key={index} style={ui.row}>
                <Text style={[ui.text, { flex: 1 }]}>
                  {item.description} × {item.quantity}
                </Text>
                <Text style={ui.muted}>{naira(item.amountMinor * item.quantity)}</Text>
              </View>
            ))}
            <View style={ui.divider} />
            <Text style={ui.text}>Invoice total {naira(invoice.totalMinor)}</Text>
            {invoice.creditMinor > 0 && (
              <Text style={ui.text}>Credits {naira(invoice.creditMinor)}</Text>
            )}
            <Text style={ui.text}>Confirmed paid {naira(invoice.paidMinor)}</Text>
            <Text style={ui.title}>Balance {naira(invoice.balanceMinor)}</Text>
            <PdfButton
              title="Download invoice PDF"
              filename={'invoice-' + invoice.id + '.pdf'}
              getDocument={() => model.invoicePdf(invoice.id)}
            />
          </Card>
          {state.detail.confirmedPayments.length > 0 && (
            <Card title="Confirmed payments">
              {state.detail.confirmedPayments.map((payment) => (
                <Button
                  key={payment.id}
                  title={naira(payment.amountMinor) + ' receipt'}
                  variant="secondary"
                  onPress={() => navigation.navigate('PA12', { invoiceId, paymentId: payment.id })}
                />
              ))}
            </Card>
          )}
          {!config.demo && (invoice.balanceMinor > 0 || attempt) && (
            <Card title="Paystack test payment">
              {attempt?.intent ? (
                <Button
                  title="View existing payment attempt"
                  onPress={() =>
                    navigation.navigate('PA12', { invoiceId, intentId: attempt.intent.id })
                  }
                />
              ) : attempt ? (
                <>
                  <Notice
                    text="The last request could still have created a checkout. Retry with the same amount and email."
                    tone="warning"
                  />
                  <Button
                    title="Recover existing checkout"
                    loading={state.busy}
                    onPress={() => void beginCheckout()}
                  />
                </>
              ) : (
                <>
                  {invoice.partialAllowed && (
                    <Select
                      label="Payment amount"
                      value={choice}
                      options={[
                        { value: 'full', label: 'Full balance' },
                        { value: 'partial', label: 'Part payment' },
                      ]}
                      onChange={setChoice}
                      disabled={state.busy}
                    />
                  )}
                  {choice === 'partial' && invoice.partialAllowed && (
                    <Field
                      label="Amount in naira"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      editable={!state.busy}
                    />
                  )}
                  <Field
                    label="Payer email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    editable={!state.busy}
                    autoComplete="email"
                  />
                  <Text style={ui.muted}>
                    Enter card or bank details on Paystack. School Accounts records cash or verified
                    bank payments.
                  </Text>
                  <Button
                    title="Review Paystack checkout"
                    icon="wallet-outline"
                    loading={state.busy}
                    onPress={() => void beginCheckout()}
                  />
                </>
              )}
            </Card>
          )}
          {config.demo && (
            <Notice text="These invoices are fictional. Connect to the Java backend to test checkout and PDF downloads." />
          )}
        </>
      )}
    </Screen>
  );
}
