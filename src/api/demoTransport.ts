import type { Transport } from './client';
import type {
  Account,
  NotificationItem,
  NotificationPreferences,
  SchoolContext,
  SessionTokens,
} from './contracts';

export const DEMO = {
  loginId: 'EC-DEMO-001',
  password: 'EduCore learning demo 2026!',
  activationCode: 'DEMO-ACTIVATE-2026',
  recoveryCode: 'DEMO-PRIVATE-RECOVERY-CODE-2026-001',
  resetToken: 'demo-reset-link-token-not-a-real-secret-2026',
  emailToken: 'demo-email-verification-not-a-real-secret-2026',
};

/** Fictional isolated transport. No network, real accounts, emails or push delivery. */
export function createDemoTransport(): Transport {
  let serial = 0,
    password = DEMO.password,
    savedCode = DEMO.recoveryCode;
  let access = '',
    refresh = '',
    pendingEmail = '',
    emailRequestId = '',
    resetUsed = false;
  const flows = new Map<
    string,
    { mode: 'ACTIVATE' | 'RESET_EMAIL' | 'RESET_SAVED_CODE'; expiresAt: string }
  >();
  const consumed = new Set<string>();
  const recentProofs = new Set<string>();
  const response = (body: unknown, status = 200) =>
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  const fail = (detail: string, status = 422, code = 'VALIDATION') =>
    response(
      {
        type: 'urn:educore:problem:demo',
        title: 'Request not accepted',
        status,
        detail,
        code,
        requestId: 'req_demo_' + ++serial,
        retryable: false,
      },
      status,
    );
  const ack = (message: string) => ({ accepted: true, message, requestId: 'req_demo_' + ++serial });
  const contexts: SchoolContext[] = [
    {
      schoolId: 'sch_greenfield',
      schoolName: 'Greenfield Secondary School',
      role: 'PRINCIPAL',
      homeScreenId: 'AD01',
      capabilities: { actions: ['shared.read'] },
    },
    {
      schoolId: 'sch_greenfield',
      schoolName: 'Greenfield Secondary School',
      role: 'TEACHER',
      homeScreenId: 'TE01',
      capabilities: { actions: ['shared.read'] },
    },
    {
      schoolId: 'sch_greenfield',
      schoolName: 'Greenfield Secondary School',
      role: 'STUDENT',
      homeScreenId: 'ST01',
      capabilities: { actions: ['shared.read'] },
    },
    {
      schoolId: 'sch_greenfield',
      schoolName: 'Greenfield Secondary School',
      role: 'PARENT',
      childId: 'stu_zainab_001',
      childName: 'Zainab Bello',
      homeScreenId: 'PA01',
      capabilities: { actions: ['shared.read'] },
    },
    {
      schoolId: 'sch_brightfield',
      schoolName: 'Brightfield Secondary School',
      role: 'PARENT',
      childId: 'stu_mariam_001',
      childName: 'Mariam Bello',
      homeScreenId: 'PA01',
      capabilities: { actions: ['shared.read'] },
    },
  ];
  const account: Account = {
    id: 'acc_demo_001',
    version: 1,
    loginId: DEMO.loginId,
    displayName: 'Ayo · Demo account',
    phone: '+2348031234567',
    verifiedEmail: 'ayo.demo@example.com',
    capabilities: { actions: ['account.self'] },
  };
  let preferences: NotificationPreferences = {
    pushEnabled: true,
    emailOptionalEnabled: true,
    mandatoryInApp: true,
    categories: ['SCHOOL', 'LEARNING', 'FEES', 'MESSAGES', 'CASES'],
  };
  const notifications: NotificationItem[] = [
    {
      id: 'ntf_greenfield_01',
      version: 1,
      schoolId: 'sch_greenfield',
      category: 'SCHOOL',
      title: 'School calendar updated',
      safePreview: 'Open EduCore to view the published school update.',
      createdAt: '2026-11-09T07:30:00Z',
      target: { schoolId: 'sch_greenfield', screenId: 'AD11', resourceId: 'cal_demo_01' },
    },
    {
      id: 'ntf_greenfield_02',
      version: 1,
      schoolId: 'sch_greenfield',
      category: 'LEARNING',
      title: 'A learning update is ready',
      safePreview: 'Sign in to view the update for your permitted class or child.',
      createdAt: '2026-11-09T06:45:00Z',
      target: { schoolId: 'sch_greenfield', screenId: 'ST05', resourceId: 'asn_demo_01' },
    },
    {
      id: 'ntf_greenfield_03',
      version: 1,
      schoolId: 'sch_greenfield',
      category: 'MESSAGES',
      title: 'New school message',
      safePreview: 'You have a new private message in EduCore.',
      createdAt: '2026-11-08T13:15:00Z',
      readAt: '2026-11-08T14:00:00Z',
      target: {
        schoolId: 'sch_greenfield',
        screenId: 'PA14',
        childId: 'stu_zainab_001',
        resourceId: 'cnv_demo_01',
      },
    },
    {
      id: 'ntf_brightfield_01',
      version: 1,
      schoolId: 'sch_brightfield',
      category: 'SCHOOL',
      title: 'Brightfield open day',
      safePreview: 'An update is available in your school notices.',
      createdAt: '2026-11-08T09:00:00Z',
      target: { schoolId: 'sch_brightfield', screenId: 'PA15', childId: 'stu_mariam_001' },
    },
  ];
  const issueTokens = (): SessionTokens => {
    access = 'demo-access-' + ++serial;
    refresh = 'demo-refresh-' + ++serial;
    return {
      accessToken: access,
      refreshToken: refresh,
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      sessionId: 'ses_demo_current',
      accountId: account.id,
      contextCount: contexts.length,
      contextPath: '/api/v1/me/contexts',
    };
  };
  const createFlow = (mode: 'ACTIVATE' | 'RESET_EMAIL' | 'RESET_SAVED_CODE') => {
    const flowToken = 'demo-flow-not-real-' + ++serial;
    const flow = { mode, expiresAt: new Date(Date.now() + 300000).toISOString() };
    flows.set(flowToken, flow);
    return response({
      ...flow,
      flowToken,
      maskedAccount: 'EC-DEMO-***',
      schoolName: 'Greenfield Secondary School',
    });
  };
  let otherSessions = true;
  return async (input, init) => {
    if (init.signal?.aborted) throw new Error('Aborted');
    const url = new URL(input),
      path = url.pathname.replace(/^\/api\/v1/, '');
    const method = init.method ?? 'GET';
    const body: Record<string, unknown> =
      typeof init.body === 'string' ? JSON.parse(init.body) : {};
    const headers = new Headers(init.headers);
    if (path === '/auth/login' && method === 'POST') {
      if (
        ![DEMO.loginId.toLowerCase(), account.verifiedEmail?.toLowerCase()].includes(
          String(body.identifier).toLowerCase(),
        ) ||
        body.password !== password
      )
        return fail(
          'The ID/email and password do not match. Please check them and try again.',
          401,
          'INVALID_CREDENTIALS',
        );
      return response(issueTokens());
    }
    if (path === '/auth/refresh')
      return body.refreshToken === refresh && refresh
        ? response(issueTokens())
        : fail('Please sign in again.', 401, 'SESSION_EXPIRED');
    if (path === '/auth/logout') {
      if (body.refreshToken === refresh) {
        access = '';
        refresh = '';
      }
      return response(ack('Signed out.'));
    }
    if (path === '/auth/activation/review') {
      if (body.activationCode !== DEMO.activationCode && body.invitationToken !== DEMO.resetToken)
        return fail(
          'This invitation is invalid, expired or replaced. Ask the school office for new instructions.',
        );
      return createFlow('ACTIVATE');
    }
    if (path === '/auth/recovery/email') {
      resetUsed = false;
      return response(
        ack('If this account has a verified recovery email, instructions will be sent.'),
        202,
      );
    }
    if (path === '/auth/recovery/email/review')
      return body.token === DEMO.resetToken && !resetUsed
        ? createFlow('RESET_EMAIL')
        : fail('This reset link is invalid, expired or already used. Request a new link.');
    if (path === '/auth/recovery/code/review')
      return body.loginId === DEMO.loginId && body.recoveryCode === savedCode
        ? createFlow('RESET_SAVED_CODE')
        : fail('The recovery details could not be verified.');
    if (path === '/auth/password/setup') {
      const key = String(body.flowToken),
        flow = flows.get(key);
      if (!flow || consumed.has(key) || Date.parse(flow.expiresAt) <= Date.now())
        return fail(
          'This proof is expired or used. Return to sign in or request new recovery instructions.',
        );
      if (String(body.newPassword).length < 15) return fail('Use at least 15 characters.');
      consumed.add(key);
      flows.clear();
      resetUsed = true;
      password = String(body.newPassword);
      access = '';
      refresh = '';
      savedCode = 'DEMO-PRIVATE-RECOVERY-REPLACED-' + ++serial;
      return response({
        changed: true,
        signInRequired: true,
        recoveryCodeShownOnce: true,
        newRecoveryCode: savedCode,
      });
    }
    if (path === '/auth/email-verifications/confirm') {
      if (body.token !== DEMO.emailToken || !pendingEmail)
        return fail('This email link is invalid, expired or already used.');
      account.verifiedEmail = pendingEmail;
      delete account.pendingEmailMasked;
      pendingEmail = '';
      account.version += 1;
      return response(
        ack('Your new email is verified. It is now available for sign-in and recovery.'),
      );
    }
    if (path === '/public/access-help')
      return response({
        schoolName: 'Greenfield Secondary School',
        schoolEmail: 'office@example.com',
        platformContact:
          'Contact your school office using the details on your school-issued access slip.',
        instructions: [
          'New account: ask the school for your EduCore login ID and one-time activation instructions.',
          'Existing account: sign in using your EduCore ID or verified email and your own password.',
          'Forgotten password: use your verified email or your privately saved recovery code.',
          'Missing school or child: ask the school office to review your authorised relationship.',
        ],
        assistedRecoveryAvailable: false,
      });
    if (!access || headers.get('Authorization') !== 'Bearer ' + access)
      return fail('Please sign in again.', 401, 'SESSION_EXPIRED');
    if (path === '/me' && method === 'GET') return response(account);
    if (path === '/me' && method === 'PATCH') {
      if (headers.get('If-Match') !== `"v${account.version}"`)
        return fail(
          'The account changed. Reload settings and review before saving.',
          412,
          'STALE_VERSION',
        );
      account.phone = String(body.phone);
      account.version += 1;
      return response(account);
    }
    if (path === '/me/contexts') return response({ items: contexts });
    if (path === '/me/context') {
      const item = contexts.find(
        (c) => c.schoolId === body.schoolId && c.role === body.role && c.childId === body.childId,
      );
      if (!item) return fail('This school, role or child is unavailable.', 403, 'CONTEXT_DENIED');
      account.lastContext = {
        schoolId: item.schoolId,
        role: item.role,
        ...(item.childId ? { childId: item.childId } : {}),
      };
      return response(account.lastContext);
    }
    if (path === '/me/notification-preferences') {
      if (method === 'PATCH')
        preferences = { ...preferences, ...body, mandatoryInApp: true } as NotificationPreferences;
      return response(preferences);
    }
    if (path === '/me/notifications') {
      const schoolId = url.searchParams.get('schoolId');
      if (!contexts.some((c) => c.schoolId === schoolId))
        return fail('Not found.', 404, 'NOT_FOUND');
      const items = notifications.filter(
        (n) =>
          n.schoolId === schoolId &&
          (!url.searchParams.get('category') || n.category === url.searchParams.get('category')) &&
          (url.searchParams.get('unread') !== 'true' || !n.readAt),
      );
      return response({ items, nextCursor: null, hasMore: false });
    }
    if (/^\/me\/notifications\/[^/]+\/read$/.test(path)) {
      const item = notifications.find((n) => n.id === path.split('/')[3]);
      if (!item) return fail('Not found.', 404);
      item.readAt = new Date().toISOString();
      return response(ack('Marked read.'));
    }
    if (path === '/me/reauthenticate') {
      if (body.currentPassword !== password)
        return fail('Current password was not verified.', 403, 'CREDENTIAL_NOT_VERIFIED');
      const proof = 'demo-recent-auth-proof-' + ++serial;
      recentProofs.add(proof);
      return response({
        recentAuthToken: proof,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      });
    }
    if (
      [
        '/me/recovery-code/rotate',
        '/me/sessions/revoke-others',
        '/me/email-change-requests',
      ].includes(path)
    ) {
      if (!recentProofs.has(String(body.recentAuthToken)))
        return fail('Verify your current password again.', 403, 'RECENT_AUTH_REQUIRED');
      recentProofs.delete(String(body.recentAuthToken));
      if (path === '/me/recovery-code/rotate') {
        savedCode = 'DEMO-PRIVATE-RECOVERY-REPLACED-' + ++serial;
        return response({ recoveryCode: savedCode, shownOnce: true, signInRequired: false });
      }
      if (path === '/me/sessions/revoke-others') {
        otherSessions = false;
        return response(ack('Other sessions signed out.'));
      }
      pendingEmail = String(body.email);
      emailRequestId = 'eml_demo_' + ++serial;
      account.pendingEmailMasked = pendingEmail.slice(0, 2) + '***@' + pendingEmail.split('@')[1];
      return response(
        {
          accepted: true,
          requestId: emailRequestId,
          maskedDestination: account.pendingEmailMasked,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
        202,
      );
    }
    if (path === '/me/email-change-requests/resend')
      return body.requestId === emailRequestId && pendingEmail
        ? response(
            {
              accepted: true,
              requestId: emailRequestId,
              maskedDestination: account.pendingEmailMasked,
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
            },
            202,
          )
        : fail('No pending email change is available.');
    if (path === '/me/password/change') {
      if (body.currentPassword !== password)
        return fail('Your current password was not verified.', 403);
      password = String(body.newPassword);
      access = '';
      refresh = '';
      return response({ changed: true, signInRequired: true, recoveryCodeShownOnce: false });
    }
    if (path === '/me/sessions')
      return response({
        items: [
          {
            id: 'ses_demo_current',
            version: 1,
            deviceName: 'This device',
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            current: true,
          },
          ...(otherSessions
            ? [
                {
                  id: 'ses_demo_previous',
                  version: 1,
                  deviceName: 'Demo second device',
                  createdAt: '2026-11-08T09:00:00Z',
                  lastUsedAt: '2026-11-08T10:30:00Z',
                  current: false,
                },
              ]
            : []),
        ],
        nextCursor: null,
        hasMore: false,
      });
    return fail(
      'This endpoint belongs to a role feature or integration that is not built in the shared starter.',
      404,
      'DEMO_ENDPOINT_NOT_IMPLEMENTED',
    );
  };
}
