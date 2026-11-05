import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Notice, ui } from '../../../components/Controls';
import { useServices } from '../../../core/ServicesContext';
import { usePresenter } from '../../../core/usePresenter';
import { HelpPresenter } from '../presenters/HelpPresenter';
import { colors } from '../../../theme/tokens';
import type { SharedScreenProps } from '../../../navigation/types';
export function AccessHelpScreen({ navigation }: SharedScreenProps<'AccessHelp'>) {
  const services = useServices(),
    session = usePresenter(services.session);
  const presenter = useMemo(() => new HelpPresenter(services.shared), [services]);
  const state = usePresenter(presenter);
  useEffect(() => {
    void presenter.load();
  }, [presenter]);
  return (
    <Screen
      title="Let's get you access"
      subtitle="Your school creates accounts and approves school and child relationships."
      auth
      code="SH09"
      back={() => navigation.goBack()}
    >
      <Notice text={state.error} tone="error" />
      {state.loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        state.help && (
          <>
            <Card title="How school access works">
              {state.help.instructions.map((line, index) => (
                <View key={line} style={ui.row}>
                  <Text style={[ui.text, { color: colors.primary, fontWeight: '700' }]}>
                    {index + 1}.
                  </Text>
                  <Text style={[ui.text, { flex: 1 }]}>{line}</Text>
                </View>
              ))}
            </Card>
            <Card title="Contact the school office">
              <Text style={ui.text}>{state.help.schoolName}</Text>
              {state.help.schoolPhone && (
                <Text selectable style={ui.text}>
                  {state.help.schoolPhone}
                </Text>
              )}
              {state.help.schoolEmail && (
                <Text selectable style={ui.text}>
                  {state.help.schoolEmail}
                </Text>
              )}
              <Text style={ui.muted}>{state.help.platformContact}</Text>
            </Card>
            {!state.help.assistedRecoveryAvailable && (
              <Notice
                text="If you have neither verified email nor a saved recovery code, contact the school office about your access options. This page cannot reset your global account."
                tone="warning"
              />
            )}
          </>
        )
      )}
      <Button title="Try account recovery" onPress={() => navigation.navigate('Recovery')} />
      <Button
        title="Reload help information"
        variant="secondary"
        onPress={() => {
          void presenter.load();
        }}
      />
      <Button
        title={session.signedIn ? 'Back to my workspace' : 'Back to sign in'}
        variant="quiet"
        onPress={() =>
          session.signedIn ? navigation.navigate('RoleWorkspace') : navigation.navigate('SignIn')
        }
      />
    </Screen>
  );
}
