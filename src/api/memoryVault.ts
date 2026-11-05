import type { TokenVault } from './client';
/** Tests/demo/browser only. Native real accounts use SecureStore. */
export function memoryVault(): TokenVault {
  let token: string | null = null;
  return {
    get: async () => token,
    set: async (value) => {
      token = value;
    },
  };
}
