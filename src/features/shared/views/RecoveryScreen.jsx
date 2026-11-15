import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../../components/Screen';
import { Button, Chip, Field, Notice, ui } from '../../../components/Controls';
import { useServices } from '../../../core/ServicesContext';
import { usePresenter } from '../../../core/usePresenter';
import { AuthPresenter } from '../presenters/AuthPresenter';
import { DEMO } from '../../../api/demoTransport';
export function RecoveryScreen({ navigation, route }) {
  const services = useServices(),
    [method, setMethod] = useState('email');
  const presenter = useMemo(
    () => new AuthPresenter(services.shared, services.session, services.installationId),
    [services],
  );
  const state = usePresenter(presenter),
    token = route.params?.token;
  const reviewLink = (proof) => {
    void presenter.reviewEmailRecovery(proof).then((flow) => {
      if (flow) navigation.navigate('Password', { flow });
    });
  };
  return (
    <Screen
      title="Recover your account"
      subtitle="Choose a recovery method you already set up."
      auth
      code="SH04"
      back={() => navigation.goBack()}
    >
      <Notice text={state.error} tone="error" />
      <Notice text={state.notice} tone="success" />
      {token ? (
        <>
          <Notice text="A password-reset link was received. Verify the link before setting a new password." />
          <Button
            title="Verify reset link"
            loading={state.busy}
            onPress={() => reviewLink(token)}
          />
        </>
      ) : (
        <>
          <View style={[ui.row, { flexWrap: 'wrap' }]}>
            <Chip
              label="Verified email"
              selected={method === 'email'}
              onPress={() => setMethod('email')}
            />
            <Chip
              label="Saved recovery code"
              selected={method === 'code'}
              onPress={() => setMethod('code')}
            />
          </View>
          <Field
            label={method === 'email' ? 'EduCore ID or verified email' : 'EduCore login ID'}
            value={state.values.identifier}
            placeholder="Your school-issued login ID"
            onChangeText={(v) => presenter.field('identifier', v)}
          />
          {method === 'code' && (
            <Field
              label="Saved personal recovery code"
              password
              value={state.values.code}
              onChangeText={(v) => presenter.field('code', v)}
              hint="Use your private saved code, not the school activation code."
            />
          )}
          <Button
            title={method === 'email' ? 'Request password reset' : 'Verify recovery code'}
            loading={state.busy}
            onPress={() => {
              if (method === 'email') void presenter.requestEmailRecovery();
              else
                void presenter.savedCodeRecovery().then((flow) => {
                  if (flow) navigation.navigate('Password', { flow });
                });
            }}
          />
          {services.config.demo && (
            <>
              <Button
                title={
                  method === 'email' ? 'Fill demo login ID' : 'Fill initial demo recovery code'
                }
                variant="secondary"
                onPress={() => {
                  presenter.field('identifier', DEMO.loginId);
                  presenter.field('code', DEMO.recoveryCode);
                }}
              />
              {method === 'email' && state.notice && (
                <Button
                  title="Open the demo reset link"
                  variant="secondary"
                  onPress={() => reviewLink(DEMO.resetToken)}
                />
              )}
            </>
          )}
        </>
      )}
      <Text style={ui.muted}>
        A reset link is temporary and single-use. After choosing a new password, return to the
        normal sign-in page.
      </Text>
      <Button
        title="I cannot use either method"
        variant="quiet"
        onPress={() => navigation.navigate('AccessHelp')}
      />
    </Screen>
  );
}
