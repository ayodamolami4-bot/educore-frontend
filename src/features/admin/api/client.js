
import { schoolPath, queryString } from '../../../api/client.js';
import { ApiError, localError } from '../../../api/errors.js';
import { demoRequest } from './demoData.js';

let activeServices = null;

const pendingCommands = new Map();

export function configureRoleApi(services) {
  if (!services?.client?.request || !services?.session?.getSnapshot) {
    throw new Error('EduCore shared services are required.');
  }

  activeServices = services;
}

export const API_CONFIG = {
  get demo() {
    return activeServices?.config?.demo ?? true;
  },
  get baseUrl() {
    return activeServices?.config?.apiBaseUrl ?? '';
  },
  timeoutMs: 20000,
};

function getContext() {
  const services = activeServices;
  const context = services?.session?.getSnapshot()?.context;

  if (!services || !context?.schoolId) {
    throw localError('Select an authorised school before opening this workspace.');
  }

  return { services, context };
}

export function path(template, params = {}) {
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    const value = params[key];

    if (value === undefined || value === null || value === '') {
      throw localError(`Missing required path value: ${key}`);
    }

    return encodeURIComponent(String(value));
  });
}

async function request(template, options = {}) {
  const { method = 'GET', body, query, params } = options;
  const { services, context } = getContext();
  const resolvedPath = path(template, params || {});

  if (services.config.demo) {
    const payload = await demoRequest({
      path: resolvedPath,
      method,
      query: query || {},
      body: body ?? null,
    });

    if (payload?.ok === false) {
      throw localError(payload.error || 'Request failed.');
    }

    return payload;
  }

  const cleanQuery = Object.fromEntries(
    Object.entries(query || {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );

  const url =
    schoolPath(context.schoolId, `/${resolvedPath.replace(/^\/+/, '')}`) +
    queryString(cleanQuery);

  const requestOptions = { method };

  if (body !== undefined) {
    requestOptions.body = body;
  }

  let commandIdentity;

  if (method !== 'GET') {
    commandIdentity = `${method}:${url}:${JSON.stringify(body ?? null)}`;

    let command = pendingCommands.get(commandIdentity);

    if (!command) {
      command = { key: services.uuid() };
      pendingCommands.set(commandIdentity, command);
    }

    requestOptions.idempotencyKey = command.key;

    const version = options.version ?? body?.version;
    if (Number.isSafeInteger(version) && version > 0) {
      requestOptions.version = version;
    }
  }

  try {
    const result = await services.client.request(url, requestOptions);

    if (commandIdentity) {
      pendingCommands.delete(commandIdentity);
    }

    return result;
  } catch (error) {
    if (commandIdentity && error instanceof ApiError) {
      const status = error.problem?.status;

      if (
        status >= 400 &&
        status < 500 &&
        ![408, 409, 429].includes(status)
      ) {
        pendingCommands.delete(commandIdentity);
      }
    }

    throw error;
  }
}

export function normalizePage(payload) {
  const value = payload || {};

  const items =
    value.items ||
    value.data ||
    value.results ||
    (Array.isArray(value) ? value : []);

  return {
    items,
    total: value.total ?? items.length,
    page: value.page ?? 1,
    pages: value.pages ?? value.totalPages ?? 1,
  };
}

export { ApiError };

export const api = {
  get: (template, params, query) =>
    request(template, { params, query }),
  post: (template, params, body, extra = {}) =>
    request(template, { params, method: 'POST', body, ...extra }),

  patch: (template, params, body, extra = {}) =>
    request(template, { params, method: 'PATCH', body, ...extra }),

  put: (template, params, body, extra = {}) =>
    request(template, { params, method: 'PUT', body, ...extra }),
  download: async (template, params, query) => {
    const { services, context } = getContext();
    if (services.config.demo) {
      throw localError('Protected file downloads require the connected school API.');
    }
    const resolvedPath = path(template, params || {});
    const cleanQuery = Object.fromEntries(
      Object.entries(query || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const url = schoolPath(context.schoolId, '/' + resolvedPath.replace(/^\/+/, '')) + queryString(cleanQuery);
    return services.client.download(url);
  },
};
