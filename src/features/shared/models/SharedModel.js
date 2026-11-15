import { queryString } from '../../../api/client';
import { ApiError } from '../../../api/errors';
export class SharedModel {
  client;
  uuid;
  pendingCommands = new Map();
  constructor(client, uuid) {
    this.client = client;
    this.uuid = uuid;
  }
  clearPendingCommands() {
    this.pendingCommands.clear();
  }
  async command(path, body) {
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
      const value = await this.client.request(path, {
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
  login(identifier, password, installationId) {
    return this.client.request('/auth/login', {
      method: 'POST',
      auth: false,
      body: { identifier, password, installationId, deviceName: 'EduCore app' },
    });
  }
  activation(proof) {
    return this.client.request('/auth/activation/review', {
      method: 'POST',
      auth: false,
      body: proof,
    });
  }
  emailRecovery(identifier) {
    return this.client.request('/auth/recovery/email', {
      method: 'POST',
      auth: false,
      body: { identifier },
    });
  }
  reviewEmailRecovery(token) {
    return this.client.request('/auth/recovery/email/review', {
      method: 'POST',
      auth: false,
      body: { token },
    });
  }
  savedCodeRecovery(loginId, recoveryCode) {
    return this.client.request('/auth/recovery/code/review', {
      method: 'POST',
      auth: false,
      body: { loginId, recoveryCode },
    });
  }
  savePassword(flowToken, password) {
    return this.client.request('/auth/password/setup', {
      method: 'POST',
      auth: false,
      body: { flowToken, newPassword: password },
    });
  }
  changePassword(currentPassword, password) {
    return this.client.request('/me/password/change', {
      method: 'POST',
      body: { currentPassword, newPassword: password },
    });
  }
  account() {
    return this.client.request('/me');
  }
  contexts() {
    return this.client.request('/me/contexts');
  }
  setContext(context) {
    return this.client.request('/me/context', { method: 'PUT', body: context });
  }
  savePhone(phone, version) {
    return this.client.request('/me', { method: 'PATCH', version, body: { phone } });
  }
  preferences() {
    return this.client.request('/me/notification-preferences');
  }
  savePreferences(value) {
    return this.client.request('/me/notification-preferences', {
      method: 'PATCH',
      body: value,
    });
  }
  reauthenticate(currentPassword) {
    return this.client.request('/me/reauthenticate', { method: 'POST', body: { currentPassword } });
  }
  rotateRecovery(recentAuthToken) {
    return this.client.request('/me/recovery-code/rotate', {
      method: 'POST',
      body: { recentAuthToken },
    });
  }
  revokeOtherSessions(recentAuthToken) {
    return this.command('/me/sessions/revoke-others', { recentAuthToken });
  }
  sessions() {
    return this.client.request('/me/sessions?limit=100');
  }
  changeEmail(email, recentAuthToken) {
    return this.command('/me/email-change-requests', {
      email,
      recentAuthToken,
    });
  }
  resendEmail(requestId, idempotencyKey) {
    return this.client.request('/me/email-change-requests/resend', {
      method: 'POST',
      idempotencyKey,
      body: { requestId },
    });
  }
  verifyEmail(token) {
    return this.client.request('/auth/email-verifications/confirm', {
      method: 'POST',
      auth: false,
      body: { token },
    });
  }
  notifications(filters) {
    return this.client.request('/me/notifications' + queryString({ ...filters, limit: 25 }));
  }
  markRead(id) {
    return this.client.request(`/me/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PUT',
    });
  }
  help(schoolCode) {
    return this.client.request('/public/access-help' + queryString({ schoolCode }), {
      auth: false,
    });
  }
  registerPush(value) {
    return this.command('/me/push-devices', value);
  }
  removePush(deviceId) {
    return this.client.request(`/me/push-devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
    });
  }
  logout(refreshToken) {
    return this.client.request('/auth/logout', {
      method: 'POST',
      auth: false,
      body: { refreshToken },
    });
  }
}
