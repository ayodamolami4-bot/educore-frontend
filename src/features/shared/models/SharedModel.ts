import type { ApiClient } from '../../../api/client';
import { queryString } from '../../../api/client';
import { ApiError } from '../../../api/errors';
import type {
  AccessHelp,
  Account,
  Ack,
  ContextPreference,
  EmailChangeAccepted,
  NotificationCategory,
  NotificationItem,
  NotificationPreferences,
  Page,
  PasswordFlow,
  PasswordSaved,
  PrivateRecoveryCode,
  PushDevice,
  SchoolContext,
  SessionInfo,
  SessionTokens,
} from '../../../api/contracts';

export class SharedModel {
  private pendingCommands = new Map<string, { body: Record<string, unknown>; key: string }>();
  constructor(
    readonly client: ApiClient,
    private uuid: () => string,
  ) {}
  clearPendingCommands(): void {
    this.pendingCommands.clear();
  }
  private async command<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const semanticFields = Object.fromEntries(
      Object.entries(body).filter(([name]) => name !== 'recentAuthToken'),
    );
    const intent = path + ':' + JSON.stringify(semanticFields);
    let pending = this.pendingCommands.get(intent);
    if (!pending) {
      pending = { body, key: this.uuid() };
      this.pendingCommands.set(intent, pending);
    }
    try {
      const value = await this.client.request<T>(path, {
        method: 'POST',
        body: pending.body,
        idempotencyKey: pending.key,
      });
      this.pendingCommands.delete(intent);
      return value;
    } catch (error) {
      if (error instanceof ApiError && error.problem.status >= 400 && error.problem.status < 500)
        this.pendingCommands.delete(intent);
      throw error;
    }
  }
  login(identifier: string, password: string, installationId: string) {
    return this.client.request<SessionTokens>('/auth/login', {
      method: 'POST',
      auth: false,
      body: { identifier, password, installationId, deviceName: 'EduCore app' },
    });
  }
  activation(proof: { loginId: string; activationCode: string } | { invitationToken: string }) {
    return this.client.request<PasswordFlow>('/auth/activation/review', {
      method: 'POST',
      auth: false,
      body: proof,
    });
  }
  emailRecovery(identifier: string) {
    return this.client.request<Ack>('/auth/recovery/email', {
      method: 'POST',
      auth: false,
      body: { identifier },
    });
  }
  reviewEmailRecovery(token: string) {
    return this.client.request<PasswordFlow>('/auth/recovery/email/review', {
      method: 'POST',
      auth: false,
      body: { token },
    });
  }
  savedCodeRecovery(loginId: string, recoveryCode: string) {
    return this.client.request<PasswordFlow>('/auth/recovery/code/review', {
      method: 'POST',
      auth: false,
      body: { loginId, recoveryCode },
    });
  }
  savePassword(flowToken: string, password: string) {
    return this.client.request<PasswordSaved>('/auth/password/setup', {
      method: 'POST',
      auth: false,
      body: { flowToken, newPassword: password },
    });
  }
  changePassword(currentPassword: string, password: string) {
    return this.client.request<PasswordSaved>('/me/password/change', {
      method: 'POST',
      body: { currentPassword, newPassword: password },
    });
  }
  account() {
    return this.client.request<Account>('/me');
  }
  contexts() {
    return this.client.request<{ items: SchoolContext[] }>('/me/contexts');
  }
  setContext(context: ContextPreference) {
    return this.client.request<ContextPreference>('/me/context', { method: 'PUT', body: context });
  }
  savePhone(phone: string, version: number) {
    return this.client.request<Account>('/me', { method: 'PATCH', version, body: { phone } });
  }
  preferences() {
    return this.client.request<NotificationPreferences>('/me/notification-preferences');
  }
  savePreferences(value: Omit<NotificationPreferences, 'mandatoryInApp'>) {
    return this.client.request<NotificationPreferences>('/me/notification-preferences', {
      method: 'PATCH',
      body: value,
    });
  }
  reauthenticate(currentPassword: string) {
    return this.client.request<{ recentAuthToken: string; expiresAt: string }>(
      '/me/reauthenticate',
      { method: 'POST', body: { currentPassword } },
    );
  }
  rotateRecovery(recentAuthToken: string) {
    return this.client.request<PrivateRecoveryCode>('/me/recovery-code/rotate', {
      method: 'POST',
      body: { recentAuthToken },
    });
  }
  revokeOtherSessions(recentAuthToken: string) {
    return this.command<Ack>('/me/sessions/revoke-others', { recentAuthToken });
  }
  sessions() {
    return this.client.request<Page<SessionInfo>>('/me/sessions?limit=100');
  }
  changeEmail(email: string, recentAuthToken: string) {
    return this.command<EmailChangeAccepted>('/me/email-change-requests', {
      email,
      recentAuthToken,
    });
  }
  resendEmail(requestId: string, idempotencyKey: string) {
    return this.client.request<EmailChangeAccepted>('/me/email-change-requests/resend', {
      method: 'POST',
      idempotencyKey,
      body: { requestId },
    });
  }
  verifyEmail(token: string) {
    return this.client.request<Ack>('/auth/email-verifications/confirm', {
      method: 'POST',
      auth: false,
      body: { token },
    });
  }
  notifications(filters: {
    schoolId: string;
    category?: NotificationCategory;
    unread?: boolean;
    cursor?: string;
  }) {
    return this.client.request<Page<NotificationItem>>(
      '/me/notifications' + queryString({ ...filters, limit: 25 }),
    );
  }
  markRead(id: string) {
    return this.client.request<Ack>(`/me/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PUT',
    });
  }
  help(schoolCode?: string) {
    return this.client.request<AccessHelp>('/public/access-help' + queryString({ schoolCode }), {
      auth: false,
    });
  }
  registerPush(value: { installationId: string; platform: 'ANDROID' | 'IOS'; pushToken: string }) {
    return this.command<PushDevice>('/me/push-devices', value);
  }
  removePush(deviceId: string) {
    return this.client.request<void>(`/me/push-devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
    });
  }
  logout(refreshToken: string) {
    return this.client.request<Ack>('/auth/logout', {
      method: 'POST',
      auth: false,
      body: { refreshToken },
    });
  }
}
