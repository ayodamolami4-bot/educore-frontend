import React from 'react';
import { Text } from 'react-native';
import { Screen } from '../../../components/Screen';
import { Button, Card, EmptyState, Notice, ui } from '../../../components/Controls';
import { useServices } from '../../../core/ServicesContext';
import { usePresenter } from '../../../core/usePresenter';
import { roleModule } from '../../../navigation/roleModules';
import { roleLabel } from '../../../utils/format';
export function RoleWorkspaceScreen({ navigation }) {
  const services = useServices();
  const session = usePresenter(services.session);
  const context = session.context;

  if (!context) return null;

  const feature = roleModule(context.role) ?? {};
  const HomeScreen = feature.HomeScreen;
  if (HomeScreen)
    return (
      <HomeScreen
        context={context}
        openShared={(screen) => navigation.navigate(screen)}
        target={session.requestedTarget ?? undefined}
      />
    );
  return (
    <Screen
      title={`${roleLabel(context.role)} workspace`}
      subtitle={context.schoolName}
      code={context.homeScreenId}
    >
      <Card title={`Welcome, ${session.account?.displayName ?? 'there'}`}>
        <Text style={ui.text}>
          {context.childName
            ? `Selected child: ${context.childName}`
            : `Current role: ${roleLabel(context.role)}`}
        </Text>
        <Notice text="The shared foundation is ready. This role’s pages will be added by its assigned developer." />
        {session.requestedTarget && (
          <Notice
            text={`Requested update: ${session.requestedTarget.screenId}. Its role page is not built yet; no private record was opened.`}
          />
        )}
        <EmptyState
          title="Your role pages go here"
          description="The common sign-in, school selection, notifications and account settings are available now."
          icon="construct-outline"
        />
      </Card>
      <Button
        title="Notifications"
        icon="notifications-outline"
        onPress={() => navigation.navigate('Notifications')}
      />
      <Button
        title="Account settings"
        icon="settings-outline"
        variant="secondary"
        onPress={() => navigation.navigate('Settings')}
      />
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
    </Screen>
  );
}
