import { Store } from './Store';
import { localError } from '../api/errors';
export class SessionStore extends Store {
  client;
  model;
  vault;
  constructor(client, model, vault) {
    super({
      booting: true,
      signedIn: false,
      account: null,
      contexts: [],
      context: null,
      scopeVersion: 0,
      sessionNotice: '',
      requestedTarget: null,
    });
    this.client = client;
    this.model = model;
    this.vault = vault;
    client.onSessionExpired = () => this.reset('Your session ended. Please sign in again.');
  }
  reset(notice = '') {
    this.model.clearPendingCommands();
    this.patch({
      booting: false,
      signedIn: false,
      account: null,
      contexts: [],
      context: null,
      scopeVersion: this.state.scopeVersion + 1,
      sessionNotice: notice,
      requestedTarget: null,
    });
  }
  async boot() {
    try {
      if (await this.client.restore()) await this.loadSignedIn();
      else this.reset();
    } catch {
      this.reset('Please sign in to continue.');
    } finally {
      this.patch({ booting: false });
    }
  }
  async signIn(identifier, password, installationId) {
    const tokens = await this.model.login(identifier, password, installationId);
    try {
      await this.client.acceptTokens(tokens);
      await this.loadSignedIn();
    } catch (error) {
      await this.client.clearSession();
      this.reset();
      throw error;
    }
  }
  async loadSignedIn() {
    const [account, contexts] = await Promise.all([this.model.account(), this.model.contexts()]);
    this.patch({
      booting: false,
      signedIn: true,
      account,
      contexts: contexts.items,
      sessionNotice: '',
    });
    const previous =
      account.lastContext && contexts.items.find((item) => sameContext(item, account.lastContext));
    const selected = previous ?? (contexts.items.length === 1 ? contexts.items[0] : null);
    if (selected) await this.selectContext(selected);
  }
  async reloadContexts() {
    const result = await this.model.contexts();
    if (this.state.context && !result.items.some((c) => sameContext(c, this.state.context))) {
      this.client.invalidateScope();
      this.patch({ context: null, scopeVersion: this.state.scopeVersion + 1 });
    }
    this.patch({ contexts: result.items });
  }
  async selectContext(value) {
    const allowed = this.state.contexts.find((item) => sameContext(item, value));
    if (!allowed)
      throw localError(
        'This school or role is not currently available. Reload your access choices.',
      );
    await this.model.setContext({
      schoolId: allowed.schoolId,
      role: allowed.role,
      ...(allowed.childId ? { childId: allowed.childId } : {}),
    });
    this.client.invalidateScope();
    this.patch({
      context: allowed,
      scopeVersion: this.state.scopeVersion + 1,
      requestedTarget: null,
    });
  }
  async openNotificationTarget(target) {
    await this.reloadContexts();
    const prefix = target.screenId.slice(0, 2);
    const allowed = this.state.contexts.find(
      (c) =>
        c.schoolId === target.schoolId &&
        (!target.childId || c.childId === target.childId) &&
        {
          AD: ['PRINCIPAL', 'SCHOOL_OFFICE', 'ACCOUNTS'],
          TE: ['TEACHER'],
          ST: ['STUDENT'],
          PA: ['PARENT'],
          SH: ['PRINCIPAL', 'SCHOOL_OFFICE', 'ACCOUNTS', 'TEACHER', 'STUDENT', 'PARENT'],
        }[prefix]?.includes(c.role),
    );
    if (!allowed)
      throw localError('This update is no longer available under your current school access.');
    await this.selectContext(allowed);
    this.patch({ requestedTarget: target });
  }
  updateAccount(account) {
    this.patch({ account });
  }
  async signOut() {
    const token = await this.vault.get();
    await this.client.clearSession();
    this.reset();
    if (token) await this.model.logout(token).catch(() => {});
  }
}
export function sameContext(a, b) {
  return a.schoolId === b.schoolId && a.role === b.role && a.childId === b.childId;
}
