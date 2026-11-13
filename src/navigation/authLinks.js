export function parseAuthLink(value, allowedHttpsHost = '') {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'educore:' &&
      !(url.protocol === 'https:' && allowedHttpsHost && url.host === allowedHttpsHost)
    )
      return null;
    const path = (url.protocol === 'educore:' ? url.hostname + url.pathname : url.pathname).replace(
      /^\/+|\/+$/g,
      '',
    );
    if (!['activate', 'reset', 'verify-email'].includes(path)) return null;
    const token =
      new URLSearchParams(url.hash.replace(/^#/, '')).get('token') ?? url.searchParams.get('token');
    if (!token || token.length < 20 || token.length > 512) return null;
    return { kind: path, token };
  } catch {
    return null;
  }
}
