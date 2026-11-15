export function readEnvironment(values) {
  const demo = values.demo !== 'false';
  const apiBaseUrl = (values.apiBaseUrl ?? '').replace(/\/+$/, '');
  if (!demo) {
    let url;
    try {
      url = new URL(apiBaseUrl);
    } catch {
      throw new Error('Set EXPO_PUBLIC_API_BASE_URL before using the Java backend.');
    }
    const local = ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
      throw new Error('The backend must use HTTPS outside local development.');
    }
    if (
      !url.pathname.endsWith('/api/v1') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('Use the API origin ending /api/v1, with no credentials, query or fragment.');
    }
  }
  return {
    demo,
    apiBaseUrl,
    appLinkHost: values.appLinkHost ?? '',
    easProjectId: values.easProjectId ?? '',
  };
}
export const environment = readEnvironment({
  demo: process.env.EXPO_PUBLIC_DEMO_MODE,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  appLinkHost: process.env.EXPO_PUBLIC_APP_LINK_HOST,
  easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
});
