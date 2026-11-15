import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../../components/Screen';
import { Button, Field, Notice, ui } from '../../../components/Controls';
import { useServices } from '../../../core/ServicesContext';
import { usePresenter } from '../../../core/usePresenter';
import { AuthPresenter } from '../presenters/AuthPresenter';
export function SignInScreen({ navigation }) {
  const services = useServices();
  const presenter = useMemo(
    () => new AuthPresenter(services.shared, services.session, services.installationId),
    [services],
  );
  const state = usePresenter(presenter),
    session = usePresenter(services.session);
  return (
    <Screen
      title="Welcome back"
      subtitle="Sign in with the account your school created for you."
      auth
      code="SH01"
    >
      <Notice text={session.sessionNotice} />
      <Notice text={state.error} tone="error" />
      <Field
        label="EduCore ID or verified email"
        placeholder="e.g. EC-P-482731"
        value={state.values.identifier}
        onChangeText={(v) => presenter.field('identifier', v)}
        autoComplete="username"
        textContentType="username"
      />
      <Field
        label="Password"
        placeholder="Your personal password"
        value={state.values.password}
        onChangeText={(v) => presenter.field('password', v)}
        password
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={() => {
          void presenter.signIn();
        }}
      />
      <Button
        title="Sign in"
        icon="arrow-forward"
        loading={state.busy}
        onPress={() => {
          void presenter.signIn();
        }}
      />
      <Button
        title="Forgot your password?"
        variant="quiet"
        onPress={() => navigation.navigate('Recovery')}
      />
      <View style={ui.divider} />
      <Text style={[ui.muted, { textAlign: 'center' }]}>Joining EduCore for the first time?</Text>
      <Button
        title="Activate school-issued account"
        variant="secondary"
        onPress={() => navigation.navigate('Activation')}
      />
      <Button
        title="I need access help"
        variant="quiet"
        onPress={() => navigation.navigate('AccessHelp')}
      />
      {services.config.demo && (
        <Button
          title="Fill demo sign-in details"
          variant="secondary"
          icon="flask-outline"
          onPress={() => presenter.demo()}
        />
      )}
    </Screen>
  );
}
