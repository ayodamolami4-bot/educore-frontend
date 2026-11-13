import { Platform } from 'react-native';
import { uuid } from '../utils/uuid.js';
import * as SecureStore from 'expo-secure-store';
import { environment } from '../config/environment.js';
import { ApiClient } from '../api/client.js';
import { createDemoTransport } from '../api/demoTransport.js';
import { nativeTokenVault } from '../api/tokenVault.js';
import { memoryVault } from '../api/memoryVault.js';
import { SharedModel } from '../features/shared/models/SharedModel.js';
import { SessionStore } from './SessionStore.js';

let singleton = null;
export function createServices() {
  singleton ??= (async () => {
    let installationId = uuid();
    if (!environment.demo && Platform.OS !== 'web') {
      const previous = await SecureStore.getItemAsync('educore.installation');
      if (previous) installationId = previous;
      else await SecureStore.setItemAsync('educore.installation', installationId);
    }
    const vault = environment.demo ? memoryVault() : nativeTokenVault();
    const client = new ApiClient(
      environment.demo ? 'https://demo.educore.invalid/api/v1' : environment.apiBaseUrl,
      vault,
      environment.demo ? createDemoTransport() : fetch,
    );
    const shared = new SharedModel(client, uuid);
    return {
      config: environment,
      client,
      shared,
      session: new SessionStore(client, shared, vault),
      installationId,
      uuid,
    };
  })();
  return singleton;
}
