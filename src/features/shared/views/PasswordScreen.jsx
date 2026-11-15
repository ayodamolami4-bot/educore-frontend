import React, { useMemo } from 'react';
import { Screen } from '../../../components/Screen';
import { Button, Field, Notice } from '../../../components/Controls';
import { PrivateCode } from '../../../components/PrivateCode';
import { useServices } from '../../../core/ServicesContext';
import { usePresenter } from '../../../core/usePresenter';
import { AuthPresenter } from '../presenters/AuthPresenter';
export function PasswordScreen({ navigation, route }) {
  const services = useServices(),
    flow = route.params.flow,
    change = route.params.change === true;
  const presenter = useMemo(
    () => new AuthPresenter(services.shared, services.session, services.installationId),
    [services],
  );
  const state = usePresenter(presenter);
  const finish = async () => {
    const wasSignedIn = services.session.getSnapshot().signedIn;
    presenter.clearSecret();
    await services.session.signOut();
    if (!wasSignedIn) navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
  };
  return (
    <Screen
      title={
        state.saved ? 'Password saved' : change ? 'Change your password' : 'Create your password'
      }
      subtitle={
        change
          ? 'Confirm your current password before changing it.'
          : flow
            ? `Verified account: ${flow.maskedAccount}`
            : 'Open a valid activation or recovery link first.'
      }
      auth
      code="SH03"
      back={state.saved ? undefined : () => navigation.goBack()}
    >
      <Notice text={state.error} tone="error" />
      {state.saved ? (
        <>
          <Notice text={state.notice} tone="success" />
          {state.saved.newRecoveryCode ? (
            <PrivateCode
              value={state.saved.newRecoveryCode}
              onDone={() => {
                void finish();
              }}
            />
          ) : (
            <Button
              title="Return to sign in"
              onPress={() => {
                void finish();
              }}
            />
          )}
        </>
      ) : flow || change ? (
        <>
          {change && (
            <Field
              label="Current password"
              password
              value={state.values.currentPassword}
              onChangeText={(v) => presenter.field('currentPassword', v)}
              autoComplete="current-password"
            />
          )}
          <Field
            label="New password"
            password
            value={state.values.newPassword}
            onChangeText={(v) => presenter.field('newPassword', v)}
            autoComplete="new-password"
            hint="Use 15–128 characters. Spaces and memorable phrases are welcome."
          />
          <Field
            label="Confirm new password"
            password
            value={state.values.confirmPassword}
            onChangeText={(v) => presenter.field('confirmPassword', v)}
            autoComplete="new-password"
          />
          <Button
            title="Save my password"
            loading={state.busy}
            onPress={() => {
              void presenter.savePassword(flow, change);
            }}
          />
          <Notice text="Your school will not see your permanent password or personal recovery code." />
        </>
      ) : (
        <Button title="Go to account recovery" onPress={() => navigation.navigate('Recovery')} />
      )}
    </Screen>
  );
}
