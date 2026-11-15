import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
/** Invoked only after the user presses Enable on this device. Never ask on app launch. */
export async function enablePush(model, config, installationId) {
  if (config.demo)
    return 'Demo mode uses the in-app notification list. No real push token or email is sent.';
  if (Platform.OS === 'web')
    return 'This browser preview uses in-app notifications. Enable phone push from the installed Android or iOS app.';
  if (!Device.isDevice)
    return 'Phone push needs a physical device. In-app notifications are available here.';
  if (!config.easProjectId || Constants.executionEnvironment === 'storeClient')
    return 'Push needs a configured development build. In-app notifications remain available.';
  const Notifications = await import('expo-notifications');
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('school-updates', {
      name: 'School updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted')
    return 'Push permission is off on this device. You can still read all your in-app notifications.';
  const token = await Notifications.getExpoPushTokenAsync({ projectId: config.easProjectId });
  await model.registerPush({
    installationId,
    platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    pushToken: token.data,
  });
  return 'This device is registered for school push notifications.';
}
