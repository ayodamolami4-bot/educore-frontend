/**
 * Central API client for the EduCore admin app
 * EVERY network call in the app goes through here — screens and presenters
 * never call fetch directly. This mirrors the central client from your v1
 * React project (token injection + 401 logout), carried over to React Native.
 *
 * \\ The dude's endpoint table prefixes
 * admin routes with `S/` (the school-scoped admin surface), so paths are
 * written here WITHOUT that prefix and the client adds it from API_CONFIG.
 */

import { getToken, fireUnauthorized } from './auth';
import { ApiError } from './ApiError';
import { demoRequest } from './demoData';

const REAL_API_URL = process.env.EXPO_PUBLIC_API_URL || '';

export const API_CONFIG = {
  // To connect the real Java API: create a .env file in the project root with
  // EXPO_PUBLIC_API_URL=https://your-api.example.com/api/v1 and restart with
  // `npx expo start -c`. While it is unset the app runs in DEMO MODE: every
  // request is answered from api/demoData.js without touching the network —
  // no CORS errors on web, no "Network error" on the phone.
  baseUrl: REAL_API_URL || 'https://api.example.invalid/api/v1',

  // The `S/` prefix from the endpoint table. If the backend drops or renames
  // it, change this one string and every screen keeps working.
  schoolScope: 'S',

  timeoutMs: 20000,

  demo: !REAL_API_URL,
};

/** Normalised API failure so presenters can show one consistent error shape.
    MUST stay the SAME class the presenters import — the v15 refactor created
    a second ApiError class here, and `error instanceof ApiError` then failed
    for every server error, replacing all detailed messages with generic ones. */
export { ApiError };

function buildUrl(path, query) {
  const base = API_CONFIG.baseUrl.replace(/\/+$/, '');
  const scope = API_CONFIG.schoolScope ? `${API_CONFIG.schoolScope}/` : '';
  let url = `${base}/${scope}${path.replace(/^\/+/, '')}`;
  if (query && Object.keys(query).length > 0) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    url += `?${qs}`;
  }
  return url;
}

/** Substitute `{placeholder}` segments: path('students/{id}', { id: 7 }) */
export function path(template, params) {
  let out = template;
  Object.entries(params || {}).forEach(([key, value]) => {
    out = out.replace(`{${key}}`, encodeURIComponent(String(value)));
  });
  return out;
}

async function request(template, options = {}) {
  const { method = 'GET', body, query, params } = options;

  // Demo mode — serve the built-in sample data, no network at all.
  if (API_CONFIG.demo) {
    const payload = await demoRequest({ path: path(template, params), method, query, body });
    // Demo handlers signal rejection as { ok: false, error }. Surface it the
    // same way a failed HTTP call would be, so every presenter's catch works
    // and error messages actually reach the screen.
    if (payload && payload.ok === false) {
      throw new ApiError(422, payload.error || 'Request failed.');
    }
    return payload;
  }

  const url = buildUrl(path(template, params), query);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

  let response;
  try {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    response = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (_networkError) {
    throw new ApiError(0, 'Network error — check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) {
    fireUnauthorized(); // session expired , app-level logout
    throw new ApiError(401, 'Your session expired. Please sign in again.');
  }

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      (payload && (payload.message || payload.error || payload.title)) ||
      `Request failed (${response.status})`;
    throw new ApiError(response.status, message, payload);
  }

  return payload;
}

/**
 * The pagination contract used across the API (same as your v1 project):
 * { items, total, page, pages }. Tolerates small backend naming differences.
 */
export function normalizePage(payload) {
  const p = payload || {};
  const items = p.items || p.data || p.results || (Array.isArray(p) ? p : []);
  return {
    items,
    total: p.total ?? items.length,
    page: p.page ?? 1,
    pages: p.pages ?? p.totalPages ?? 1,
  };
}

export const api = {
  get: (template, params, query) => request(template, { params, query }),
  post: (template, params, body) => request(template, { params, method: 'POST', body }),
  patch: (template, params, body) => request(template, { params, method: 'PATCH', body }),
  put: (template, params, body) => request(template, { params, method: 'PUT', body }),
};
