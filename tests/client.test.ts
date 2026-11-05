import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient, schoolPath, type Transport } from '../src/api/client';
import { memoryVault } from '../src/api/memoryVault';
import type { SessionTokens } from '../src/api/contracts';
import { ApiError } from '../src/api/errors';

function tokens(accessToken = 'old', refreshToken = 'refresh-old'): SessionTokens {
  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshExpiresAt: '2027-01-01T00:00:00Z',
    sessionId: 'ses_test_01',
    accountId: 'acc_test_01',
    contextCount: 1,
    contextPath: '/me/contexts',
  };
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

test('simultaneous expired requests share one rotating-token refresh', async () => {
  const started = deferred<void>(),
    release = deferred<Response>();
  let refreshes = 0;
  const transport: Transport = async (url, init) => {
    if (url.endsWith('/auth/refresh')) {
      refreshes++;
      started.resolve();
      return release.promise;
    }
    return new Headers(init.headers).get('Authorization') === 'Bearer new'
      ? json({ ok: true })
      : json({ title: 'Expired', detail: 'Expired', code: 'EXPIRED', retryable: false }, 401);
  };
  const vault = memoryVault(),
    client = new ApiClient('https://test.invalid/api/v1', vault, transport);
  await client.acceptTokens(tokens());
  const first = client.request('/me'),
    second = client.request('/me/contexts');
  await started.promise;
  release.resolve(json(tokens('new', 'refresh-new')));
  assert.deepEqual(await Promise.all([first, second]), [{ ok: true }, { ok: true }]);
  assert.equal(refreshes, 1);
  assert.equal(await vault.get(), 'refresh-new');
});

test('a delayed refresh cannot restore credentials after sign-out', async () => {
  const started = deferred<void>(),
    release = deferred<Response>();
  const transport: Transport = async (url) => {
    if (url.endsWith('/auth/refresh')) {
      started.resolve();
      return release.promise;
    }
    return json({ title: 'Expired', detail: 'Expired', code: 'EXPIRED', retryable: false }, 401);
  };
  const vault = memoryVault(),
    client = new ApiClient('https://test.invalid/api/v1', vault, transport);
  await client.acceptTokens(tokens());
  const request = client.request('/me');
  await started.promise;
  await client.clearSession();
  release.resolve(json(tokens('late', 'late-refresh')));
  await assert.rejects(request);
  assert.equal(await vault.get(), null);
});

test('a delayed prior-school response is discarded after context switch', async () => {
  const started = deferred<void>(),
    release = deferred<Response>();
  const transport: Transport = async () => {
    started.resolve();
    return release.promise;
  };
  const client = new ApiClient('https://test.invalid/api/v1', memoryVault(), transport);
  const request = client.request('/schools/sch_first/attendance');
  await started.promise;
  client.invalidateScope();
  release.resolve(json({ private: 'old child data' }));
  await assert.rejects(
    request,
    (error: unknown) => error instanceof ApiError && error.code === 'STALE_SCOPE',
  );
});

test('version and idempotency headers are explicit and retained on retry', async () => {
  const sent: Headers[] = [];
  const transport: Transport = async (_url, init) => {
    sent.push(new Headers(init.headers));
    return json({ accepted: true });
  };
  const client = new ApiClient('https://test.invalid/api/v1', memoryVault(), transport);
  const options = {
    method: 'POST' as const,
    version: 7,
    body: { example: true },
    idempotencyKey: '10c544d1-bb83-4013-821e-6653e6db0460',
  };
  await client.request('/example', options);
  await client.request('/example', options);
  assert.equal(sent[0].get('If-Match'), '"v7"');
  assert.equal(sent[0].get('Idempotency-Key'), sent[1].get('Idempotency-Key'));
});

test('request client will not send a bearer token to an arbitrary absolute URL', async () => {
  let calls = 0;
  const client = new ApiClient('https://test.invalid/api/v1', memoryVault(), async () => {
    calls++;
    return json({});
  });
  await assert.rejects(client.request('https://other.invalid/steal'));
  assert.equal(calls, 0);
  assert.equal(schoolPath('sch_greenfield', '/students'), '/schools/sch_greenfield/students');
  assert.throws(() => schoolPath('../escape', '/students'));
});

test('school isolation is checked after a delayed response body is decoded', async () => {
  const decoding = deferred<void>(),
    release = deferred<unknown>();
  const response = json({});
  response.json = async () => {
    decoding.resolve();
    return release.promise;
  };
  const client = new ApiClient('https://test.invalid/api/v1', memoryVault(), async () => response);
  const request = client.request('/schools/sch_first/profile');
  await decoding.promise;
  client.invalidateScope();
  release.resolve({ private: 'prior school body' });
  await assert.rejects(
    request,
    (error: unknown) => error instanceof ApiError && error.code === 'STALE_SCOPE',
  );
});

test('multipart uploads retain the runtime boundary and are not JSON-stringified', async () => {
  let captured: RequestInit | undefined;
  const client = new ApiClient('https://test.invalid/api/v1', memoryVault(), async (_url, init) => {
    captured = init;
    return json({});
  });
  const form = new FormData();
  form.append('purpose', 'SUBMISSION');
  form.append('file', new Blob(['demo'], { type: 'application/pdf' }), 'work.pdf');
  await client.request('/schools/sch_first/files', { method: 'POST', body: form });
  assert.equal(captured?.body, form);
  assert.equal(new Headers(captured?.headers).has('Content-Type'), false);
});
