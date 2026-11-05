# Shared API mapping

Base: `EXPO_PUBLIC_API_BASE_URL`, ending `/api/v1`. Actual Java service implementations are required in real mode. Shared wire types are in `src/api/contracts.ts`; calls are in `features/shared/models/SharedModel.ts`.

| Page              | Relative method/path                                                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SH01              | POST /auth/login                                                                                                                                                                    |
| SH02              | POST /auth/activation/review                                                                                                                                                        |
| SH03              | POST /auth/password/setup; POST /me/password/change                                                                                                                                 |
| SH04              | POST /auth/recovery/email; POST /auth/recovery/email/review; POST /auth/recovery/code/review                                                                                        |
| SH05              | GET /me/contexts; PUT /me/context                                                                                                                                                   |
| SH06              | GET /me/notifications; PUT /me/notifications/{id}/read                                                                                                                              |
| SH07              | GET/PATCH /me; GET/PATCH /me/notification-preferences; POST /me/reauthenticate; POST /me/recovery-code/rotate; GET /me/sessions; POST /me/sessions/revoke-others; POST /auth/logout |
| SH08              | POST /me/email-change-requests; POST /me/email-change-requests/resend; POST /auth/email-verifications/confirm                                                                       |
| SH09              | GET /public/access-help                                                                                                                                                             |
| Session lifecycle | POST /auth/refresh                                                                                                                                                                  |
| Device push       | POST /me/push-devices; DELETE /me/push-devices/{id}                                                                                                                                 |

Bearer access token is held in memory. The native refresh token alone is stored in SecureStore. Browser/demo credentials are memory-only; refreshing the web page signs out. Requests use application/json; errors use application/problem+json. List responses are `{items,nextCursor,hasMore}`. IDs are opaque strings. For protected official record updates supply `version`; the request client sends If-Match with a quoted v-number.

Sign-in request fields: identifier, password, installationId, deviceName. Response: accessToken, refreshToken, tokenType, expiresIn, refreshExpiresAt, sessionId, accountId, contextCount, contextPath. Java validates the credentials and current account state; roles are loaded from /me/contexts, not chosen by the login payload.

Activation accepts `{loginId,activationCode}` or `{invitationToken}` and returns PasswordFlow `{mode,flowToken,expiresAt,maskedAccount,schoolName?}`. Recovery review returns the same restricted flow type. Password setup sends `{flowToken,newPassword}` and returns PasswordSaved. Proof mode is not a user-selected permission. A private `newRecoveryCode` appears only in the one-time save response, never /me/history or email. A normal signed-in password change uses currentPassword instead of a reset token.

Account context fields: schoolId,schoolName,role,homeScreenId,capabilities and optional childId/childName. Parent selection may switch school. PUT /me/context rechecks current membership/child access. Backend authorisation applies separately to each actual record read, including a notification target.

Email change requires email and recentAuthToken. Return202 with requestId,maskedDestination,expiresAt. Keep current verifiedEmail until /auth/email-verifications/confirm accepts the separate single-use token. Resend invalidates previous unused link. Neither request acceptance nor client button press means verified.

Recovery-email request always returns the same generic acknowledgement for unknown/unverified/known accounts. Rate-limit credentials and proofs server-side. A password reset returns to normal sign-in and revokes prior sessions/proofs. Personal recovery code and initial school activation code are different secrets.

The phone UI accepts local Nigerian numbers and converts to E.164. The backend must validate again and reject stale account updates. School official contact/relationship records are separate from personal account settings.
