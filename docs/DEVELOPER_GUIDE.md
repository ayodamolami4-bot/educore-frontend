# Your role work area

There is one React Native application. Four developers own different feature folders; each Java microservice is a backend concern. Screens are compiled into the same app. Do not create four Expo projects or four copies of authentication.

## Start a feature

Inside your role folder keep `views/`, `presenters/`, `models/` and `api/`:

| File example                        | Responsibility                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `views/AttendanceScreen.jsx`        | Draw fields/buttons, subscribe to the Presenter and forward user actions         |
| `presenters/AttendancePresenter.js` | Manage editable/loading/error state and the use case; no React Native UI imports |
| `models/AttendanceModel.js`         | Use the role API adapter and its response fields                                 |
| `api/attendanceApi.js`              | Call the agreed Java endpoint through the shared client                          |

Follow the working shared examples under `src/features/shared`. Reuse `Screen`, `Button`, `Field`, `Select`, `Card`, `Notice` and `ui` from components. Use the shared theme instead of inventing slightly different buttons or colours. A scrolling section, dialog or file picker is not a separate page ID.

## Register your role home without editing shared navigation

Use `.jsx` for files that render JSX and `.js` for presenters, models and API adapters.
Include the extension in relative imports.

Your role `index.js` exports `<role>Module`. Import your screen there and set it as `HomeScreen`. The app passes the active `context` and the `openShared` navigation function.

```jsx
import React from 'react';
import { Screen } from '../../../components/Screen.jsx';
import { Button } from '../../../components/Controls.jsx';

export function TeacherHome({ context, openShared }) {
  return (
    <Screen title="Teacher home" subtitle={context.schoolName}>
      <Button title="Notifications" onPress={() => openShared('Notifications')} />
    </Screen>
  );
}
```

Place that example inside `features/teacher/views`; your actual role home replaces it. You may export a navigator containing all your own role screens instead. Keep your role screen routes in your own folder. `openShared` supports Notifications, Settings and ChooseContext. Never replace the root NavigationContainer.

A `target` prop may contain a notification screenId/resourceId. It is a hint. Map supported IDs to your own screens and fetch the record under current permissions before showing it. Show an unavailable state if the backend denies access. Do not show cached information from a prior school/child.

## Calling Java

Inject `services.client` into your Model. Use relative paths such as `/me` or `schoolPath(schoolId, '/attendance/registers')`; do not hardcode hosts in screens. IDs come from API records/dropdowns, not text labels. Use `queryString` for filters and encoding.

Keep a generated UUID for each pending command requiring Idempotency-Key. Reuse it after an unknown timeout; generate another only for a deliberate new command. For versioned changes send the record's returned version; the client sets If-Match. On412 retain the user's draft and reload/review. Keep local draft, saving, accepted, published and failed distinct. A POST202 returns work accepted, not completed.

Store official data under account/school/role/child scope. Scope changes remount the role workspace and cancel old in-flight shared-client requests. Do not create an unscoped module-global cache. Never send a parent through student-submission endpoints or calculate official balances/promotions in the app.

## Shared changes

If you need a new reusable component, API payload definition or dependency, ask the lead. Do not change package.json, lockfile, shared login, API token logic or root navigation in a role pull request. Add role-specific dependencies only after the lead coordinates one shared installation/lockfile update.

Before a PR, run the checks and include affected page IDs, endpoints, test notes and a screenshot for a visible UI change. The lead is the integrator. Ownership automation detects folder-scope mistakes but does not replace review.
