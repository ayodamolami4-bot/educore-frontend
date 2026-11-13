/** Tests/demo/browser only. Native real accounts use SecureStore. */
export function memoryVault() {
  let token = null;
  return {
    get: async () => token,
    set: async (value) => {
      token = value;
    },
  };
}
