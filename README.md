# EduCore frontend

React Native + TypeScript + Expo. Model-View-Presenter. Secondary schools, JSS1–SSS3.

**Lead: [@ayodamolami4-bot](https://github.com/ayodamolami4-bot).** This repository contains the shared foundation and four separate role work areas. The role business pages and Java backend have not been implemented here.

Lead: follow [the initial setup and teammate assignment guide](docs/LEAD_SETUP.md) before handing out role tasks. It also explains how to install this source from a downloaded ZIP into the existing repository.

## Start the app

Install Node.js 24 LTS and Git. Clone this private repository after the lead grants your GitHub account access.

```sh
git clone https://github.com/ayodamolami4-bot/educore-frontend.git
cd educore-frontend
npm ci
npm run web
```

For Android/iOS, run `npm start` and open the app in an Expo client that matches the SDK in package.json, or a development build. This starter uses SDK58 from the official template. During an Expo SDK transition the store's Expo Go version may differ; the web preview works without an emulator, Android Studio, Xcode or a paid Expo plan.

The app defaults to **clearly labelled demo mode** with fictional records. On the sign-in screen press **Fill demo sign-in details**, then **Sign in**. The five demo contexts cover the four role work areas and a parent switching school. Nothing is sent to a real school, email provider or payment service.

## What is built

| Shared page                | Implementation                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| SH01 Sign in               | School ID/verified email, password visibility, session handling                                           |
| SH02 Activation            | School-issued slip or deep-link proof; backend validates context                                          |
| SH03 Password setup/change | Validated proof/current password, confirmation, private recovery-code reveal                              |
| SH04 Recovery              | Generic verified-email request, saved-code proof, reset-link review                                       |
| SH05 School/role selection | Only returned memberships, parent child context, stale-data clearing                                      |
| SH06 Notifications         | School/category/unread filters, pagination, read state, checked target context                            |
| SH07 Settings              | Phone, verified-email change, channel preferences, device push opt-in, recovery rotation, sessions/logout |
| SH08 Email verification    | Single-use link confirmation/resend; retain old email until success                                       |
| SH09 Access help           | Approved school/platform instructions; no school-controlled global reset                                  |

Shared components include buttons, password/text fields, dropdowns, cards, banners, toggles, confirmation dialogs, empty/loading states, a school-items background and design tokens. The shared request client has typed errors, version headers, caller-supplied idempotency keys, single-flight refresh and scope cancellation. Native refresh credentials use SecureStore; browser/demo credentials stay in memory.

## Who edits what

| Area                                                                                                                      | Owner                              |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `src/features/admin/`                                                                                                     | Administrator developer, AD01–AD34 |
| `src/features/teacher/`                                                                                                   | Teacher developer, TE01–TE19       |
| `src/features/student/`                                                                                                   | Student developer, ST01–ST13       |
| `src/features/parent/`                                                                                                    | Parent developer, PA01–PA19        |
| `src/features/shared/`, components, navigation, api/client, core, theme, configuration, tests/scripts/docs and root files | Lead: @ayodamolami4-bot            |

Keep your Views, Presenters, Models and role API functions in your role folder. Each role already has an `index.ts` entry. Export your home screen or role navigator there; the shared navigation loads it automatically. See your role README and [the developer guide](docs/DEVELOPER_GUIDE.md).

Ask the lead to add your GitHub username to `team-ownership.json` before your first pull request. Do not change that mapping yourself. Lead then runs `npm run team:owners` to refresh CODEOWNERS. Until assignments are entered, only the lead passes the ownership check.

## Branch and review process

```sh
git switch main
git pull origin main
git switch -c feature/teacher-attendance
# Work only in your assigned role folder.
npm run check
git add src/features/teacher
git commit -m "Add teacher attendance screen"
git push -u origin feature/teacher-attendance
```

Open a pull request into main and request the lead's review. The lead checks changed files, behaviour and API use, then merges. Pull the latest main before the next task. Never force-push main or solve a conflict by replacing someone else's whole file. Shared dependency changes, new root routes or components go through the lead.

**Folder ownership is a team/CI rule, not a GitHub folder permission.** A collaborator with write access can technically change any file. The included scope check flags unrelated changes; it cannot prevent direct pushes or a user bypassing checks. CODEOWNERS/protected review enforcement depends on the GitHub plan; a free private repository does not provide enforced protected-branch/code-owner approval. Keep the lead-only merge agreement. No teammates were invited automatically.

## Connect to Java

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_DEMO_MODE=false` plus your reachable HTTPS Java origin ending `/api/v1`. Restart Expo after environment changes. `EXPO_PUBLIC_*` values are public app configuration; never put database passwords, Paystack secret keys or email credentials there. The mobile app never connects directly to SQL.

Use the shared client from `useServices()` or inject it into your role Model. Build a school path with `schoolPath(context.schoolId, '/students')`. Backend APIs must enforce school, role, duty and child/payer permissions on every request. Client navigation is not permission enforcement. See [shared endpoints](docs/SHARED_API.md) and [backend integration notes](docs/BACKEND_INTEGRATION.md).

## Checks

```sh
npm run check          # TypeScript, lint, meaningful Node tests
npm run format:check
npm run export:web     # Builds the web preview; does not deploy
```

The tests cover refresh concurrency, stale school responses, recovery proofs, role selection, email verification and folder boundaries. A passing web export is not an Android/iOS device test or a live backend/payment test. Native push requires a configured EAS project and a physical development build; the opt-in button explains unavailable configurations. In-app notifications work independently.

Staff-assisted global recovery without verified email or a saved personal recovery code still needs the operational identity-proofing policy agreed by the lead and backend team before production.
