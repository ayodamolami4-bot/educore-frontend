import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { memoryVault } from './memoryVault';
/** Native refresh token only. Browser preview deliberately keeps credentials in memory. */
export function nativeTokenVault() {
  if (Platform.OS === 'web') return memoryVault();
  let queue = Promise.resolve();
  return {
    get: async () => {
      await queue;
      return SecureStore.getItemAsync('educore.refresh');
    },
    set: (value) => {
      const operation = queue.then(async () => {
        if (value === null) await SecureStore.deleteItemAsync('educore.refresh');
        else
          await SecureStore.setItemAsync('educore.refresh', value, {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          });
      });
      queue = operation.catch(() => {});
      return operation;
    },
  };
}
