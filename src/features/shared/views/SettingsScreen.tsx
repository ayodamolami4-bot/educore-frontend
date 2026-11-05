import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, ToggleRow, ui } from '../../../components/Controls';
import { PrivateCode } from '../../../components/PrivateCode';
import { useServices } from '../../../core/ServicesContext';
import { usePresenter } from '../../../core/usePresenter';
import { SettingsPresenter } from '../presenters/SettingsPresenter';
import { enablePush } from '../../../notifications/push';
import { errorMessage } from '../../../api/errors';
import type { SharedScreenProps } from '../../../navigation/types';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
export function SettingsScreen({ navigation }: SharedScreenProps<'Settings'>) {
  const services = useServices(),
    session = usePresenter(services.session);
  const presenter = useMemo(
    () => new SettingsPresenter(services.shared, services.session),
    [services],
  );
  const state = usePresenter(presenter),
    [pushBusy, setPushBusy] = useState(false),
    [pushMessage, setPushMessage] = useState(''),
    [confirm, setConfirm] = useState<'logout' | 'sessions' | 'recovery' | null>(null);
  useFocusEffect(
    useCallback(() => {
      void presenter.load();
      return () => {
        presenter.clearRecoveryCode();
        presenter.field('currentPassword', '');
      };
    }, [presenter]),
  );
  return (
    <Screen
      title="Account settings"
      subtitle="Your personal account works across your permitted school relationships."
      code="SH07"
      back={() => navigation.goBack()}
    >
      <Notice text={state.error} tone="error" />
      <Notice text={state.notice} tone="success" />
      <Card
        title={session.account?.displayName ?? 'My account'}
        subtitle={`EduCore ID: ${session.account?.loginId ?? ''}`}
      >
        <Field
          label="Contact phone"
          value={state.phone}
          keyboardType="phone-pad"
          onChangeText={(v) => presenter.field('phone', v)}
          hint="A contact update does not change school roles or child relationships."
        />
        <Button
          title="Save contact phone"
          variant="secondary"
          loading={state.busy}
          disabled={state.loading}
          onPress={() => {
            void presenter.savePhone();
          }}
        />
      </Card>
      <Card title="Sign-in email">
        <Text style={ui.text}>{session.account?.verifiedEmail ?? 'No verified email yet'}</Text>
        {session.account?.pendingEmailMasked && (
          <Notice
            text={`Pending verification: ${session.account.pendingEmailMasked}. Your existing verified address remains active.`}
          />
        )}
        <Field
          label="New email address"
          value={state.email}
          keyboardType="email-address"
          autoComplete="email"
          onChangeText={(v) => presenter.field('email', v)}
        />
        <Text style={ui.muted}>
          Use the current-password field below to verify sensitive changes.
        </Text>
        <Button
          title="Request email verification"
          variant="secondary"
          loading={state.busy}
          onPress={() => {
            void presenter.requestEmailChange();
          }}
        />
        {state.emailRequest && (
          <Button
            title="View email verification status"
            variant="quiet"
            onPress={() =>
              navigation.navigate('VerifyEmail', {
                requestId: state.emailRequest!.requestId,
                maskedDestination: state.emailRequest!.maskedDestination,
              })
            }
          />
        )}
      </Card>
      <Card title="Notifications">
        {state.preferences && (
          <>
            <ToggleRow
              title="Push notifications"
              description="Allow optional push delivery. Device permission is managed separately."
              value={state.preferences.pushEnabled}
              disabled={state.busy}
              onChange={(v) => {
                void presenter.setPreference('pushEnabled', v);
              }}
            />
            <ToggleRow
              title="Optional email updates"
              description="Mandatory account messages and in-app records stay available."
              value={state.preferences.emailOptionalEnabled}
              disabled={state.busy}
              onChange={(v) => {
                void presenter.setPreference('emailOptionalEnabled', v);
              }}
            />
          </>
        )}
        <Notice text={pushMessage} />
        <Button
          title="Enable push on this device"
          variant="secondary"
          loading={pushBusy}
          onPress={() => {
            setPushBusy(true);
            void enablePush(services.shared, services.config, services.installationId)
              .then(setPushMessage)
              .catch((error) => setPushMessage(errorMessage(error)))
              .finally(() => setPushBusy(false));
          }}
        />
      </Card>
      <Card title="Password and recovery">
        <Field
          label="Current password for sensitive actions"
          value={state.currentPassword}
          password
          autoComplete="current-password"
          onChangeText={(v) => presenter.field('currentPassword', v)}
          hint="Re-enter it before changing email, replacing a recovery code or signing out other sessions."
        />
        <Button
          title="Change my password"
          variant="secondary"
          onPress={() => navigation.navigate('Password', { change: true })}
        />
        <Button
          title="Replace saved recovery code"
          variant="secondary"
          loading={state.busy}
          onPress={() => setConfirm('recovery')}
        />
        {state.recoveryCode && (
          <PrivateCode value={state.recoveryCode} onDone={() => presenter.clearRecoveryCode()} />
        )}
      </Card>
      <Card title="Signed-in devices">
        {state.sessions.map((item) => (
          <View key={item.id} style={ui.row}>
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{item.deviceName}</Text>
              <Text style={ui.muted}>{item.current ? 'Current session' : 'Other session'}</Text>
            </View>
          </View>
        ))}
        <Button
          title="Sign out other sessions"
          variant="secondary"
          loading={state.busy}
          onPress={() => setConfirm('sessions')}
        />
      </Card>
      <Button
        title="Switch school or role"
        variant="secondary"
        onPress={() => navigation.navigate('ChooseContext')}
      />
      <Button
        title="Access help"
        variant="quiet"
        onPress={() => navigation.navigate('AccessHelp')}
      />
      <Button title="Sign out of EduCore" variant="danger" onPress={() => setConfirm('logout')} />
      <ConfirmDialog
        visible={confirm !== null}
        title={
          confirm === 'recovery'
            ? 'Replace your recovery code?'
            : confirm === 'sessions'
              ? 'Sign out other sessions?'
              : 'Sign out of EduCore?'
        }
        description={
          confirm === 'recovery'
            ? 'The previous saved code will stop working. Verify your current password and save the new code privately.'
            : confirm === 'sessions'
              ? 'Your other devices will need to sign in again. Your current session will remain active.'
              : 'Your private session data will be cleared from this app.'
        }
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const action = confirm;
          setConfirm(null);
          if (action === 'recovery') void presenter.rotateRecovery();
          else if (action === 'sessions') void presenter.revokeOtherSessions();
          else void services.session.signOut();
        }}
      />
    </Screen>
  );
}
