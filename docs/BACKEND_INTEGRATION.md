# Backend integration notes

The demo transport is an isolated fixture for frontend development. It is not a Java backend, production authentication or authorisation implementation. Unknown role-feature routes fail rather than returning invented success.

## Java responsibilities

- Route the selected Java services behind one /api/v1 origin; the app does not know internal service ports or connect to PostgreSQL.
- Authenticate every protected request, check current school memberships and actual duties, and validate child learning/payer permissions. Opaque IDs and client context/capabilities never grant access.
- Access tokens expire after15min; rotating refresh sessions have a30day maximum. Check revoked session/membership state even before an access token expires. Serialise refresh rotation server-side and detect replay. The client performs one refresh operation for simultaneous expired requests and discards late results after logout.
- On logout revoke the refresh session and detach its installation's push delivery. If the device is offline, local sign-out can complete while remote revocation still needs server expiry/reconciliation; never promise an offline request reached Java.
- Use restricted, expiring, single-use activation/reset/email proofs; hash codes at rest. Never log passwords, tokens or recovery codes or put them in push previews. Apply the chosen15–128character new-password policy and common/breached-password checks server-side.
- The personal settings fields do not mutate school-maintained records or grant parent/role access. A pending email is not verified.
- Save idempotent command results by actor/scope/path/key. Recheck current permission before replay; resolve a known accepted result before stale-version/proof errors. An uncertain retry retains its original command/body/key. Permanent business unique keys outlive response caches.
- Problem errors include title,detail,status,code,requestId,retryable and optional field errors. Return404 for inaccessible foreign-school objects,403 for known in-scope forbidden actions,412 for stale If-Match and422 for field/rule errors.
- Native requests are not subject to browser CORS, but the web development preview needs an explicit allowed origin and Authorization/Content-Type/If-Match/Idempotency-Key headers. Use TLS outside explicit localhost development. Do not add wildcard credential-sharing rules.
- The generic notification list is account-owned and filtered to current school. Include only safe previews and target references. Recheck the actual target on open. Native push payload data uses screenId,schoolId and optional childId/resourceId; no grades, complaint text, balances, tokens or passwords.
- Verified email delivery and native push credentials/EAS project are deployment setup. The demo sends neither. OS denial does not hide in-app notifications.

## Native authentication links

The scheme is `educore`. Supported links: `educore://activate?token=...`, `educore://reset?token=...`, `educore://verify-email?token=...`. An optional verified HTTPS host is configured separately. For HTTPS links prefer fragment tokens where supported; sanitise logs/referrers. The app validates protocol/host/path and sends proof only to the intended backend action; it does not treat the URL as access authority.

Actual Android app links/iOS universal links and email web fallbacks need your production domain and platform association files. They have not been provisioned. Existing signed-in users may open an email-verification link; a successful password reset/change returns to normal sign-in. Do not link another child by resetting a multi-school guardian identity.

## Before production

Test on Android/iOS hardware, including secure storage/reinstall, OS back/keyboard, link launch/expiry/replay, offline/timeout, revoked membership, cross-school IDs and actual configured push delivery. Run real staging Java contract tests. Staff-assisted global account recovery without a verified email or saved private code still needs an approved identity-proofing/escalation policy; the help page provides contacts and no reset powers.
