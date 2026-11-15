import React, { useMemo } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Notice, ui } from '../../../components/Controls';
import { useServices } from '../../../core/ServicesContext';
import { usePresenter } from '../../../core/usePresenter';
import { EmailVerificationPresenter } from '../presenters/EmailVerificationPresenter';
import { DEMO } from '../../../api/demoTransport';
export function EmailVerificationScreen({ navigation, route }) {
  const services = useServices(),
    params = route.params;
  const presenter = useMemo(
    () => new EmailVerificationPresenter(services.shared, services.uuid),
    [services],
  );
  const state = usePresenter(presenter);
  return (
    <Screen
      title={state.verified ? 'Email verified' : 'Verify your email'}
      subtitle="Only a successful verification changes your sign-in and recovery address."
      auth
      code="SH08"
      back={() => navigation.goBack()}
    >
      <Notice text={state.error} tone="error" />
      <Notice text={state.notice} tone={state.verified ? 'success' : 'info'} />
      {state.verified ? (
        <Button title="Continue" onPress={() => navigation.goBack()} />
      ) : (
        <>
          <Card title="Check your email">
            <Text style={ui.text}>
              {params?.maskedDestination
                ? `Verification requested for ${params.maskedDestination}.`
                : 'Open the verification link sent to the new email address.'}
            </Text>
            <Text style={ui.muted}>
              Your previous verified address stays active until the new address is accepted.
            </Text>
          </Card>
          {params?.token ? (
            <Button
              title="Verify this email link"
              loading={state.busy}
              onPress={() => {
                void presenter.confirm(params.token);
              }}
            />
          ) : (
            <Notice text="Use the link in your email to complete verification. The app will not mark an address verified from a button press alone." />
          )}
          {params?.requestId && (
            <Button
              title="Request a replacement link"
              variant="secondary"
              loading={state.busy}
              onPress={() => {
                void presenter.resend(params.requestId);
              }}
            />
          )}
          {services.config.demo && params?.requestId && (
            <Button
              title="Verify the demo email link"
              variant="secondary"
              onPress={() => {
                void presenter.confirm(DEMO.emailToken);
              }}
            />
          )}
        </>
      )}
    </Screen>
  );
}
