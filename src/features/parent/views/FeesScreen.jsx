import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, EmptyState, Notice, Select, ui } from '../../../components/Controls.jsx';
import { Screen } from '../../../components/Screen.jsx';
import { usePresenter } from '../../../core/usePresenter.js';
import { dateTime, naira } from '../../../utils/format.js';
import { canPay } from '../models/ParentModel.js';
import { FeesPresenter } from '../presenters/FeesPresenter.js';

const invoiceStates = { UNPAID: 'Unpaid', PART_PAID: 'Part-paid', PAID: 'Paid' };

function PageActions({ page, name, onLoad }) {
  return (
    <>
      <Notice text={page.error} tone="error" />
      {page.loading && !page.items.length && (
        <ActivityIndicator accessibilityLabel={'Loading ' + name} />
      )}
      {page.error && (
        <Button
          title={'Retry ' + name}
          variant="secondary"
          onPress={() => onLoad(page.items.length > 0)}
        />
      )}
      {page.more && !page.error && (
        <Button
          title={'Load more ' + name}
          variant="secondary"
          loading={page.loading}
          onPress={() => onLoad(true)}
        />
      )}
    </>
  );
}

export function FeesScreen({ context, model, navigation }) {
  const presenter = useMemo(() => new FeesPresenter(model), [model]);
  const state = usePresenter(presenter);
  const [status, setStatus] = useState('');
  const [term, setTerm] = useState('');
  const allowed = canPay(context);
  useFocusEffect(
    useCallback(() => {
      if (!allowed) return;
      void presenter.load('invoices');
      void presenter.load('payments');
      void presenter.loadTerms();
    }, [allowed, presenter]),
  );

  const invoices = state.invoices.items.filter(
    (item) => (!status || item.status === status) && (!term || item.termId === term),
  );
  return (
    <Screen
      title="Child fees and payment history"
      subtitle={[context.childName, context.schoolName].filter(Boolean).join(' · ')}
      code="PA10"
      back={() => navigation.goBack()}
    >
      {!allowed ? (
        <EmptyState
          title="Fee access is unavailable"
          description="Ask the school office to check your payer permission."
          icon="lock-closed-outline"
        />
      ) : (
        <>
          <Card title="Child invoices">
            {state.terms.length > 0 && (
              <Select
                label="Term"
                value={term}
                options={[
                  { value: '', label: 'All terms' },
                  ...state.terms.map((item) => ({
                    value: item.id,
                    label:
                      ['First term', 'Second term', 'Third term'][item.number - 1] ?? 'School term',
                    description: item.startsOn + ' – ' + item.endsOn,
                  })),
                ]}
                onChange={setTerm}
              />
            )}
            <Notice text={state.termError} tone="warning" />
            <Select
              label="Invoice status"
              value={status}
              options={[
                { value: '', label: 'All statuses' },
                ...Object.entries(invoiceStates).map(([value, label]) => ({ value, label })),
              ]}
              onChange={setStatus}
            />
            {invoices.map((item) => (
              <View key={item.id} style={ui.gap}>
                <Text style={ui.text}>{item.description}</Text>
                <Text style={ui.muted}>
                  {invoiceStates[item.status]} · {naira(item.balanceMinor)} due · {item.dueOn}
                </Text>
                <Button
                  title={'Open ' + item.description}
                  variant="secondary"
                  onPress={() => navigation.navigate('PA11', { invoiceId: item.id })}
                />
              </View>
            ))}
            {!invoices.length && !state.invoices.loading && !state.invoices.error && (
              <EmptyState
                title={
                  state.invoices.more ? 'No matches in the invoices loaded' : 'No invoices match'
                }
              />
            )}
            <PageActions
              page={state.invoices}
              name="invoices"
              onLoad={(append) => void presenter.load('invoices', append)}
            />
          </Card>
          <Card title="Confirmed payment history">
            {state.payments.items.map((item) => (
              <View key={item.id} style={ui.gap}>
                <Text style={ui.text}>
                  {naira(item.amountMinor)} · {item.reference}
                </Text>
                <Text style={ui.muted}>
                  {item.source === 'PAYSTACK' ? 'Paystack' : 'Recorded by school'} ·{' '}
                  {dateTime(item.confirmedAt)}
                </Text>
                <Button
                  title={'View receipt for ' + item.reference}
                  variant="secondary"
                  onPress={() =>
                    navigation.navigate('PA12', { invoiceId: item.invoiceId, paymentId: item.id })
                  }
                />
              </View>
            ))}
            {!state.payments.items.length && !state.payments.loading && !state.payments.error && (
              <EmptyState title="No confirmed payments yet" />
            )}
            <PageActions
              page={state.payments}
              name="payments"
              onLoad={(append) => void presenter.load('payments', append)}
            />
          </Card>
        </>
      )}
    </Screen>
  );
}
