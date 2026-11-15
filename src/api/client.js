import { ApiError } from './errors';
export class ApiClient {
  baseUrl;
  vault;
  transport;
  timeoutMs;
  tokens = null;
  refreshPromise = null;
  authEpoch = 0;
  scopeEpoch = 0;
  inflight = new Set();
  onSessionExpired = () => {};
  constructor(baseUrl, vault, transport = fetch, timeoutMs = 20000) {
    this.baseUrl = baseUrl;
    this.vault = vault;
    this.transport = transport;
    this.timeoutMs = timeoutMs;
  }
  async acceptTokens(tokens) {
    this.authEpoch += 1;
    this.refreshPromise = null;
    this.tokens = tokens;
    await this.vault.set(tokens.refreshToken);
  }
  async clearSession() {
    this.authEpoch += 1;
    this.refreshPromise = null;
    this.tokens = null;
    this.invalidateScope();
    await this.vault.set(null);
  }
  invalidateScope() {
    this.scopeEpoch += 1;
    for (const controller of this.inflight) controller.abort();
    this.inflight.clear();
  }
  async restore() {
    if (!(await this.vault.get())) return false;
    await this.refresh();
    return true;
  }
  async refresh() {
    if (this.refreshPromise) return this.refreshPromise;
    const epoch = this.authEpoch;
    const operation = (async () => {
      const refreshToken = await this.vault.get();
      if (!refreshToken) throw new Error('No refresh session');
      const response = await this.send('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
      });
      const tokens = await this.decode(response);
      if (epoch !== this.authEpoch) throw new Error('Session changed');
      this.tokens = tokens;
      await this.vault.set(tokens.refreshToken);
    })()
      .catch(async (error) => {
        if (epoch === this.authEpoch) {
          await this.clearSession();
          this.onSessionExpired();
        }
        throw error;
      })
      .finally(() => {
        if (this.refreshPromise === operation) this.refreshPromise = null;
      });
    this.refreshPromise = operation;
    return operation;
  }
  async send(path, options) {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('://'))
      throw new Error('Use a relative API path');
    const controller = new AbortController();
    this.inflight.add(controller);
    const abort = () => controller.abort();
    if (options.signal?.aborted) abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, this.timeoutMs);
    const headers = { Accept: 'application/json', ...options.headers };
    const multipart = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (options.body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
    if (options.auth !== false && this.tokens)
      headers.Authorization = `Bearer ${this.tokens.accessToken}`;
    if (options.version !== undefined) headers['If-Match'] = `"v${options.version}"`;
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
    try {
      return await this.transport(this.baseUrl + path, {
        method: options.method ?? 'GET',
        headers,
        body:
          options.body === undefined
            ? undefined
            : multipart
              ? options.body
              : JSON.stringify(options.body),
        signal: controller.signal,
        credentials: 'omit',
        cache: 'no-store',
      });
    } catch (error) {
      if (controller.signal.aborted)
        throw new ApiError({
          title: 'Request interrupted',
          detail: 'The request timed out or the screen changed. Keep your draft and retry safely.',
          code: 'REQUEST_ABORTED',
          status: 0,
          retryable: true,
        });
      throw error;
    } finally {
      clearTimeout(timer);
      this.inflight.delete(controller);
      options.signal?.removeEventListener('abort', abort);
    }
  }
  async authorisedResponse(path, options) {
    let response = await this.send(path, options);
    if (response.status === 401 && options.auth !== false) {
      try {
        await this.refresh();
      } catch {
        throw new ApiError({
          title: 'Please sign in',
          detail: 'Your session ended. Sign in to continue.',
          code: 'SESSION_EXPIRED',
          status: 401,
          retryable: false,
        });
      }
      response = await this.send(path, options);
    }
    return response;
  }
  checkScope(path, scope) {
    if (scope !== this.scopeEpoch && path.startsWith('/schools/'))
      throw new ApiError({
        title: 'Context changed',
        detail: 'Previous school information was discarded.',
        code: 'STALE_SCOPE',
        status: 0,
        retryable: false,
      });
  }
  async request(path, options = {}) {
    const scope = this.scopeEpoch;
    const response = await this.authorisedResponse(path, options);
    this.checkScope(path, scope);
    const result = await this.decode(response);
    this.checkScope(path, scope);
    return result;
  }
  /** Protected binary download; the caller decides how to view/store the returned Blob. */
  async download(path, signal) {
    const scope = this.scopeEpoch;
    const response = await this.authorisedResponse(path, { signal });
    if (!response.ok) await this.decode(response);
    const file = await response.blob();
    this.checkScope(path, scope);
    return file;
  }
  async decode(response) {
    if (response.status === 204) return undefined;
    const value = await response.json().catch(() => null);
    if (!response.ok) {
      const problem = value && typeof value === 'object' ? value : {};
      throw new ApiError({
        title: problem.title ?? 'Request could not be completed',
        detail: problem.detail ?? 'Please try again. Your entered information has been kept.',
        status: response.status,
        code: problem.code ?? `HTTP_${response.status}`,
        retryable: response.status >= 500,
        ...problem,
      });
    }
    if (value === null) throw new Error('Expected a JSON response');
    return value;
  }
}
export function schoolPath(schoolId, path) {
  if (
    !/^[A-Za-z0-9_-]{6,80}$/.test(schoolId) ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('://') ||
    /(^|\/)\.\.(\/|$)/.test(path)
  )
    throw new Error('Invalid school API path');
  return `/schools/${encodeURIComponent(schoolId)}${path}`;
}
export function queryString(values) {
  const entries = Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return entries.length ? '?' + entries.join('&') : '';
}
