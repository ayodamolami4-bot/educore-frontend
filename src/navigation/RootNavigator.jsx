import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { Platform, View } from 'react-native';
import { parseAuthLink } from './authLinks';
import { useServices } from '../core/ServicesContext';
import { usePresenter } from '../core/usePresenter';
import { Notice } from '../components/Controls';
import { errorMessage } from '../api/errors';
import { SignInScreen } from '../features/shared/views/SignInScreen';
import { ActivationScreen } from '../features/shared/views/ActivationScreen';
import { RecoveryScreen } from '../features/shared/views/RecoveryScreen';
import { PasswordScreen } from '../features/shared/views/PasswordScreen';
import { ContextScreen } from '../features/shared/views/ContextScreen';
import { NotificationsScreen } from '../features/shared/views/NotificationsScreen';
import { SettingsScreen } from '../features/shared/views/SettingsScreen';
import { EmailVerificationScreen } from '../features/shared/views/EmailVerificationScreen';
import { AccessHelpScreen } from '../features/shared/views/AccessHelpScreen';
import { RoleWorkspaceScreen } from '../features/shared/views/RoleWorkspaceScreen';
const Stack = createNativeStackNavigator();
const navigation = createNavigationContainerRef();
export function RootNavigator() {
  const services = useServices(),
    session = usePresenter(services.session);
  const [linkError, setLinkError] = useState('');
  const authLink = useRef(null),
    pushTarget = useRef(null);
  const openAuthLink = useCallback((link) => {
    if (!navigation.isReady()) {
      authLink.current = link;
      return;
    }
    if (link.kind === 'activate') navigation.navigate('Activation', { token: link.token });
    else if (link.kind === 'reset') navigation.navigate('Recovery', { token: link.token });
    else navigation.navigate('VerifyEmail', { token: link.token });
  }, []);
  const openPushTarget = useCallback(
    (target) => {
      if (!services.session.getSnapshot().signedIn) {
        pushTarget.current = target;
        return;
      }
      void services.session
        .openNotificationTarget(target)
        .catch((error) => setLinkError(errorMessage(error)));
    },
    [services],
  );
  useEffect(() => {
    const receive = (value) => {
      const parsed = parseAuthLink(value, services.config.appLinkHost);
      if (parsed) openAuthLink(parsed);
    };
    void Linking.getInitialURL().then((value) => {
      if (value) receive(value);
    });
    const subscription = Linking.addEventListener('url', (event) => receive(event.url));
    return () => subscription.remove();
  }, [services, openAuthLink]);
  useEffect(() => {
    if (services.config.demo || Platform.OS === 'web' || !services.config.easProjectId) return;
    let subscription,
      active = true;
    void import('expo-notifications')
      .then(async (Notifications) => {
        const receive = (data) => {
          if (
            typeof data.screenId === 'string' &&
            /^(AD|TE|ST|PA|SH)\d{2}$/.test(data.screenId) &&
            typeof data.schoolId === 'string'
          )
            openPushTarget({
              screenId: data.screenId,
              schoolId: data.schoolId,
              childId: typeof data.childId === 'string' ? data.childId : undefined,
              resourceId: typeof data.resourceId === 'string' ? data.resourceId : undefined,
            });
        };
        const last = await Notifications.getLastNotificationResponseAsync();
        if (!active) return;
        if (last) receive(last.notification.request.content.data ?? {});
        subscription = Notifications.addNotificationResponseReceivedListener((event) =>
          receive(event.notification.request.content.data ?? {}),
        );
      })
      .catch(() => {
        if (active)
          setLinkError(
            'Phone push is unavailable in this build. In-app notifications remain available.',
          );
      });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [services, openPushTarget]);
  useEffect(
    () =>
      services.session.subscribe(() => {
        if (services.session.getSnapshot().signedIn && pushTarget.current) {
          const target = pushTarget.current;
          pushTarget.current = null;
          openPushTarget(target);
        }
      }),
    [services, openPushTarget],
  );
  const key = session.signedIn ? `${session.account?.id}:${session.scopeVersion}` : 'signed-out';
  return (
    <View style={{ flex: 1 }}>
      {linkError ? (
        <View style={{ padding: 12 }}>
          <Notice text={linkError} tone="warning" />
        </View>
      ) : null}
      <NavigationContainer
        key={key}
        ref={navigation}
        onReady={() => {
          if (authLink.current) {
            const link = authLink.current;
            authLink.current = null;
            openAuthLink(link);
          }
        }}
      >
        <Stack.Navigator
          initialRouteName={
            session.signedIn ? (session.context ? 'RoleWorkspace' : 'ChooseContext') : 'SignIn'
          }
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F4F7F8' },
            animation: 'fade',
          }}
        >
          {session.signedIn ? (
            <>
              <Stack.Screen name="ChooseContext" component={ContextScreen} />
              <Stack.Screen name="RoleWorkspace" component={RoleWorkspaceScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </>
          ) : (
            <Stack.Screen name="SignIn" component={SignInScreen} />
          )}
          <Stack.Screen name="Activation" component={ActivationScreen} />
          <Stack.Screen name="Recovery" component={RecoveryScreen} />
          <Stack.Screen name="Password" component={PasswordScreen} />
          <Stack.Screen name="VerifyEmail" component={EmailVerificationScreen} />
          <Stack.Screen name="AccessHelp" component={AccessHelpScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
