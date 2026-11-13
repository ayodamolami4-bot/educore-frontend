import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { openBrowserAsync } from 'expo-web-browser';
import { Button, Card, Notice, ui } from '../../../components/Controls.jsx';
import { Screen } from '../../../components/Screen.jsx';
import { usePresenter } from '../../../core/usePresenter.js';
import { dateTime, naira } from '../../../utils/format.js';
import { checkoutUrl } from '../models/ParentModel.js';
import { PaymentPresenter } from '../presenters/PaymentPresenter.js';
import { PdfButton } from './PdfButton.jsx';

const paymentState = {
  PENDING: 'Awaiting payment verification',
  INIT_UNKNOWN: 'Checkout status unknown',
  CONFIRMED: 'Payment confirmed',
  FAILED: 'Payment failed or was cancelled',
  REQUIRES_REVIEW: 'School review required',
};

const refundState = {
  REQUESTED: 'Awaiting school decision',
  APPROVED: 'Approved, awaiting confirmation',
  PROCESSING: 'Processing',
  UNKNOWN: 'Awaiting confirmation',
  CONFIRMED: 'Refund confirmed',
  REJECTED: 'Declined',
};

export function PaymentScreen({ context, model, navigation, route }) {
  const { invoiceId, intentId, paymentId } = route.params;
  const presenter = useMemo(
    () => new PaymentPresenter(model, { invoiceId, intentId, paymentId }),
    [model, invoiceId, intentId, paymentId],
  );
  const { detail, payment, intent, refunds, refundError, busy, error } = usePresenter(presenter);
  const [browserError, setBrowserError] = useState('');
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void presenter.load({ signal: controller.signal });
      return () => controller.abort();
    }, [presenter]),
  );

  const pending = ['PENDING', 'INIT_UNKNOWN'].includes(intent?.state);
  const url =
    intent?.state === 'PENDING' && intent.testMode === true
      ? checkoutUrl(intent.authorizationUrl)
      : null;
  const invoice = detail?.invoice;
  const canReturnToInvoice = intent?.state === 'FAILED' || !!payment;

  async function openCheckout() {
    setBrowserError('');
    try {
      await openBrowserAsync(url, { windowFeatures: 'noopener,noreferrer' });
    } catch {
      setBrowserError('Paystack could not open. Try opening the same checkout again.');
    }
  }

  return (
    <Screen
      title="Payment status and receipt"
      subtitle={[context.childName, context.schoolName].filter(Boolean).join(' · ')}
      code="PA12"
      back={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('PA01'))}
    >
      <Notice text={error} tone="error" />
      {busy && !detail && <ActivityIndicator accessibilityLabel="Loading payment status" />}
      {detail && (
        <>
          <Card
            title={
              payment
                ? 'Payment confirmed'
                : (paymentState[intent?.state] ?? 'Payment status unavailable')
            }
            subtitle={invoice.description}
          >
            <Text style={ui.text}>Reference {payment?.reference ?? intent?.reference}</Text>
            {payment ? (
              <>
                <Text style={ui.text}>
                  {payment.source === 'PAYSTACK' ? 'Paystack' : 'Recorded by school'} ·{' '}
                  {naira(payment.amountMinor)}
                </Text>
                <Text style={ui.text}>Applied to invoice {naira(payment.allocatedMinor)}</Text>
                <Text style={ui.muted}>Confirmed {dateTime(payment.confirmedAt)}</Text>
                <PdfButton
                  title="Download confirmed receipt"
                  filename={'receipt-' + payment.id + '.pdf'}
                  getDocument={() => model.receipt(payment.id)}
                />
              </>
            ) : (
              <>
                {Number.isSafeInteger(intent?.amountMinor) && (
                  <Text style={ui.text}>Payment amount {naira(intent.amountMinor)}</Text>
                )}
                {url && (
                  <Notice
                    text="Return here after Paystack checkout and check the payment status."
                    tone="warning"
                  />
                )}
                {pending && !url && (
                  <Notice
                    text="Check the existing attempt before starting another payment."
                    tone="warning"
                  />
                )}
                {intent?.state === 'CONFIRMED' && (
                  <Notice text="The receipt is still loading. Refresh to retrieve the confirmed payment record." />
                )}
                {intent?.state === 'REQUIRES_REVIEW' && (
                  <Notice
                    text="Give this reference to the school office for review."
                    tone="warning"
                  />
                )}
              </>
            )}
            <Text style={ui.title}>Invoice balance {naira(invoice.balanceMinor)}</Text>
            {url && (
              <Button
                title="Open Paystack test checkout"
                icon="open-outline"
                onPress={() => void openCheckout()}
              />
            )}
            <Notice text={browserError} tone="error" />
          </Card>
          <Card title="Invoice refunds">
            <Notice text={refundError} tone="warning" />
            {!refunds.length && !refundError && <Text style={ui.muted}>No refund records.</Text>}
            {refunds.map((refund) => (
              <Text key={refund.id} style={ui.text}>
                {naira(refund.amountMinor)} · {refundState[refund.state] ?? refund.state}
              </Text>
            ))}
          </Card>
        </>
      )}
      {intentId && (pending || !!error || intent?.state === 'REQUIRES_REVIEW') && (
        <Button
          title="Check Paystack status"
          loading={busy}
          onPress={() => void presenter.load({ verify: true })}
        />
      )}
      <Button
        title="Refresh status"
        variant="secondary"
        loading={busy}
        onPress={() => void presenter.load()}
      />
      {invoice && canReturnToInvoice && (
        <Button
          title={intent?.state === 'FAILED' ? 'Return to invoice to try again' : 'View invoice'}
          variant="quiet"
          onPress={() => {
            model.clearFinishedAttempt(invoice.id, intent?.id);
            navigation.popTo('PA11', { invoiceId: invoice.id });
          }}
        />
      )}
    </Screen>
  );
}
