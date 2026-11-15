import React, { useMemo } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../../components/Screen';
import { Button, Field, Notice, ui } from '../../../components/Controls';
import { useServices } from '../../../core/ServicesContext';
import { usePresenter } from '../../../core/usePresenter';
import { AuthPresenter } from '../presenters/AuthPresenter';
import { DEMO } from '../../../api/demoTransport';
export function ActivationScreen({ navigation, route }) {
  const services = useServices(),
    token = route.params?.token;
  const presenter = useMemo(
    () => new AuthPresenter(services.shared, services.session, services.installationId),
    [services],
  );
  const state = usePresenter(presenter);
  return (
    <Screen
      title="Activate your account"
      subtitle="Use the private access instructions supplied by your school."
      auth
      code="SH02"
      back={() => navigation.goBack()}
    >
      <Notice text={state.error} tone="error" />
      {token ? (
        <Notice text="An invitation link was received. Continue to let EduCore verify it." />
      ) : (
        <>
          <Field
            label="School-issued EduCore login ID"
            placeholder="Login ID on your access slip"
            value={state.values.identifier}
            onChangeText={(v) => presenter.field('identifier', v)}
          />
          <Field
            label="One-time activation code"
            placeholder="Code on your private access slip"
            value={state.values.code}
            onChangeText={(v) => presenter.field('code', v)}
            password
            autoComplete="off"
          />
        </>
      )}
      <Button
        title="Verify and continue"
        loading={state.busy}
        onPress={() => {
          void presenter.activation(token).then((flow) => {
            if (flow) navigation.navigate('Password', { flow });
          });
        }}
      />
      <Text style={ui.muted}>
        Already have an active account for another child? Keep your existing login. Ask the school
        to link the child to that account.
      </Text>
      <Button
        title="Get help with this invitation"
        variant="quiet"
        onPress={() => navigation.navigate('AccessHelp')}
      />
      {services.config.demo && !token && (
        <Button
          title="Fill demo activation slip"
          variant="secondary"
          onPress={() => {
            presenter.field('identifier', DEMO.loginId);
            presenter.field('code', DEMO.activationCode);
          }}
        />
      )}
    </Screen>
  );
}
