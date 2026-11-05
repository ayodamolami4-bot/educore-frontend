import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../src/api/client';
import { createDemoTransport, DEMO } from '../src/api/demoTransport';
import { memoryVault } from '../src/api/memoryVault';
import { SharedModel } from '../src/features/shared/models/SharedModel';
import { SessionStore } from '../src/core/SessionStore';
import { AuthPresenter } from '../src/features/shared/presenters/AuthPresenter';
import { SettingsPresenter } from '../src/features/shared/presenters/SettingsPresenter';
import { NotificationsPresenter } from '../src/features/shared/presenters/NotificationsPresenter';
import { readEnvironment } from '../src/config/environment';
import { parseAuthLink } from '../src/navigation/authLinks';
import { passwordValue, normalisePhone } from '../src/utils/validation';

function setup() {
  const vault = memoryVault(),
    client = new ApiClient('https://demo.educore.invalid/api/v1', vault, createDemoTransport());
  const model = new SharedModel(client, () => '10c544d1-bb83-4013-821e-6653e6db0460');
  const session = new SessionStore(client, model, vault);
  return {
    vault,
    client,
    model,
    session,
    auth: new AuthPresenter(model, session, 'installation_test'),
  };
}
async function signIn(value: ReturnType<typeof setup>) {
  value.auth.demo();
  await value.auth.signIn();
  assert.equal(value.session.getSnapshot().signedIn, true);
}

test('login loads allowed contexts; arbitrary school/role cannot be self-granted', async () => {
  const value = setup();
  await signIn(value);
  await assert.rejects(value.session.selectContext({ schoolId: 'sch_unknown', role: 'PRINCIPAL' }));
  assert.equal(value.session.getSnapshot().context, null);
  const allowed = value.session.getSnapshot().contexts.find((c) => c.role === 'STUDENT')!;
  await value.session.selectContext(allowed);
  assert.equal(value.session.getSnapshot().context?.role, 'STUDENT');
  await value.session.signOut();
  assert.equal(await value.vault.get(), null);
  assert.equal(value.session.getSnapshot().contexts.length, 0);
});

test('recovery proof is single-use and a new password preserves intentional spaces', async () => {
  const value = setup();
  value.auth.field('identifier', DEMO.loginId);
  value.auth.field('code', DEMO.recoveryCode);
  const flow = await value.auth.savedCodeRecovery();
  assert.ok(flow);
  const password = '  A private memorable phrase for 2026!  ';
  value.auth.field('newPassword', password);
  value.auth.field('confirmPassword', password);
  await value.auth.savePassword(flow);
  assert.ok(value.auth.getSnapshot().saved?.newRecoveryCode);
  assert.equal(value.session.getSnapshot().signedIn, false, 'reset must not automatically sign in');
  await assert.rejects(value.model.savePassword(flow.flowToken, password));
  assert.equal(JSON.stringify(value.session.getSnapshot()).includes('RECOVERY'), false);
  value.auth.clearSecret();
  assert.equal(value.auth.getSnapshot().saved, null);
  value.auth.field('identifier', DEMO.loginId);
  value.auth.field('password', password);
  await value.auth.signIn();
  assert.equal(value.session.getSnapshot().signedIn, true);
});

test('password mismatch retains entered work and does not consume recovery proof', async () => {
  const value = setup();
  const flow = await value.model.activation({
    loginId: DEMO.loginId,
    activationCode: DEMO.activationCode,
  });
  value.auth.field('newPassword', 'A long memorable password phrase');
  value.auth.field('confirmPassword', 'Different long password phrase');
  await value.auth.savePassword(flow);
  assert.match(value.auth.getSnapshot().error, /do not match/);
  assert.equal(value.auth.getSnapshot().values.newPassword, 'A long memorable password phrase');
  value.auth.field('confirmPassword', 'A long memorable password phrase');
  await value.auth.savePassword(flow);
  assert.equal(value.auth.getSnapshot().saved?.changed, true);
});

test('email change retains old verified email until token confirmation', async () => {
  const value = setup();
  await signIn(value);
  const settings = new SettingsPresenter(value.model, value.session);
  await settings.load();
  const old = value.session.getSnapshot().account!.verifiedEmail;
  settings.field('email', 'new.demo@example.com');
  settings.field('currentPassword', DEMO.password);
  await settings.requestEmailChange();
  assert.equal(value.session.getSnapshot().account!.verifiedEmail, old);
  await assert.rejects(value.model.verifyEmail('not-valid'));
  assert.equal((await value.model.account()).verifiedEmail, old);
  await value.model.verifyEmail(DEMO.emailToken);
  await settings.load();
  assert.equal(value.session.getSnapshot().account!.verifiedEmail, 'new.demo@example.com');
  assert.equal(settings.getSnapshot().emailRequest, null);
  assert.equal(settings.getSnapshot().notice, '');
  await assert.rejects(
    value.model.verifyEmail(DEMO.emailToken),
    'used verification token must fail',
  );
});

test('notification filters and read state remain within the selected school', async () => {
  const value = setup();
  await signIn(value);
  const presenter = new NotificationsPresenter(value.model, 'sch_greenfield');
  await presenter.load();
  assert.equal(
    presenter.getSnapshot().items.every((n) => n.schoolId === 'sch_greenfield'),
    true,
  );
  await presenter.filter(undefined, true);
  const item = presenter.getSnapshot().items[0];
  await presenter.markRead(item);
  assert.equal(
    presenter.getSnapshot().items.some((n) => n.id === item.id),
    false,
  );
  await assert.rejects(value.model.notifications({ schoolId: 'sch_foreign' }));
});

test('new recovery code invalidates the old code and never enters account state', async () => {
  const value = setup();
  await signIn(value);
  const settings = new SettingsPresenter(value.model, value.session);
  settings.field('currentPassword', DEMO.password);
  await settings.rotateRecovery();
  assert.ok(settings.getSnapshot().recoveryCode);
  await assert.rejects(value.model.savedCodeRecovery(DEMO.loginId, DEMO.recoveryCode));
  assert.equal('recoveryCode' in (await value.model.account()), false);
  settings.clearRecoveryCode();
  assert.equal(settings.getSnapshot().recoveryCode, '');
});

test('real mode requires the intended HTTPS API origin; deep links restrict host/path', () => {
  assert.equal(readEnvironment({}).demo, true);
  assert.throws(() => readEnvironment({ demo: 'false', apiBaseUrl: 'http://example.com/api/v1' }));
  assert.throws(() =>
    readEnvironment({ demo: 'false', apiBaseUrl: 'https://example.com/not-an-api' }),
  );
  assert.equal(
    readEnvironment({ demo: 'false', apiBaseUrl: 'https://example.com/api/v1' }).demo,
    false,
  );
  assert.equal(
    parseAuthLink('https://untrusted.example/reset?token=' + DEMO.resetToken, 'app.school.example'),
    null,
  );
  assert.equal(parseAuthLink('educore://reset?token=' + DEMO.resetToken)?.kind, 'reset');
  assert.equal(parseAuthLink('educore://arbitrary-admin-route?token=' + DEMO.resetToken), null);
  assert.equal(passwordValue('  private phrase  '), '  private phrase  ');
  assert.equal(normalisePhone('0803 123 4567'), '+2348031234567');
});

test('an uncertain shared command retry retains its original body and idempotency key', async () => {
  const sent: { key: string | null; body: BodyInit | null | undefined }[] = [];
  let calls = 0;
  const client = new ApiClient('https://test.invalid/api/v1', memoryVault(), async (_url, init) => {
    sent.push({ key: new Headers(init.headers).get('Idempotency-Key'), body: init.body });
    if (++calls === 1) throw new Error('Connection lost after send');
    return new Response(
      JSON.stringify({
        accepted: true,
        requestId: 'eml_test_001',
        maskedDestination: 'a***@example.com',
        expiresAt: '2026-12-01T00:00:00Z',
      }),
      { status: 202 },
    );
  });
  let sequence = 0;
  const model = new SharedModel(client, () => 'test-intent-' + ++sequence);
  await assert.rejects(model.changeEmail('a@example.com', 'first-proof'));
  await model.changeEmail('a@example.com', 'replacement-proof');
  assert.equal(sent[0].key, sent[1].key);
  assert.equal(sent[0].body, sent[1].body);
});
