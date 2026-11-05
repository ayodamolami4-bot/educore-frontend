# EduCore coding boundaries

The user/lead is @ayodamolami4-bot. MVP means Model-View-Presenter. This is one Expo React Native TypeScript app; microservices belong to the Java backend outside this repository.

Role contributors must work inside their assigned src/features/admin/, teacher/, student/ or parent/ folder. Follow team-ownership.json and CONTRIBUTING.md. Shared components, navigation, core/session, API transport, theme, configuration, dependencies, root files, workflows and ownership rules are lead-owned. Request a lead change rather than editing them in a role task. Explicit lead instructions can authorise shared work.

Implement only the requested scope. The initial scaffold intentionally contains no role business pages. Keep Views presentational, Presenters testable without React Native, Models/API adapters typed. Reuse the shared client/components and register role entry through the role index.ts. Keep official permissions/calculations on Java. Never introduce self-granted roles, arbitrary child access, secret logging or direct SQL from the app.

Run npm run check for substantive changes, use npm run export:web for a UI integration change, and explain any checks that could not run. Do not claim a demo is a live backend integration. Do not use force pushes, rewrite other contributors' work or change permissions to bypass ownership review.
