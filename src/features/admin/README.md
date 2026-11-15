# EduCore — Admin module (React Native + JavaScript, MVP)

## The MVP rule (the lecturer's flow)

**Model–View–Presenter.** Data moves in one direction:

```
VIEW (screens) ──user events──▶ PRESENTER ──asks──▶ MODEL ──calls──▶ JAVA API
VIEW ◀──render state────────── PRESENTER ◀──results── MODEL ◀────────────
```

- **View** (`views/`): React Native screens. Renders state, forwards taps and
  text. No fetch, no business logic.
- **Presenter** (`presenters/`): the screen's brain — loading / empty / content /
  error states, validation, safe submission (draft → saving → accepted/failed),
  routing decisions. Easy to unit-test because it is plain JavaScript.
- **Model** (`models/`): the only code that talks to the backend. Calls the API,
  normalises records into plain display objects. One file per domain.
- **API** (`api/`): the shared fetch client, token storage, and every endpoint
  from the AD01–AD34 handoff table.

## The reference example: searching students (AD02)

The lecturer's exact flow, file by file:

1. **View passes the search text to the Presenter** —
   `views/screens/StudentListView.js` → `presenter.onSearchChange(text)`.
2. **The Presenter shows a loading state and asks the Model for matching
   students** — `presenters/StudentListPresenter.js` `_fetchStudents()`
   (debounced 350 ms, ignores stale responses).
3. **The Model calls the Java API and returns the results** —
   `models/StudentModel.js` `list()` → `api.get(endpoints.students.list)`.
4. **The Presenter updates the screen state, and the View displays the
   students** — `setState({status:'content', students:[…]})` → the list renders.

Read those three files in that order and you know the whole pattern.

## What is built vs. what is next

| Built (working end-to-end pattern)                                | Screen                               |
| ----------------------------------------------------------------- | ------------------------------------ |
| `DashboardModel/Presenter` + `AdminHomeView`                      | AD01 Admin home                      |
| `StudentModel` + `StudentListPresenter` + `StudentListView`       | AD02 Student list                    |
| `StudentModel` + `StudentProfilePresenter` + `StudentProfileView` | AD04 Student profile                 |
| `FinanceModel` + `InvoiceListPresenter` + `InvoiceListView`       | AD22 Invoices                        |
| `NoticesModel` + `NoticesPresenter` + `NoticesView`               | AD28 Announcements (safe submission) |

All other AD screens (`AD03, AD05–AD21, AD23–AD27, AD29–AD34`) are registered in
`views/screens/index.js` and currently show a `PlaceholderScreen` with the recipe.
Every endpoint they will need is already in `api/endpoints.js`.

## How to build one more screen (the same every time)

1. **Endpoints** — 90% done already; check `api/endpoints.js`, add anything missing.
2. **Model** — copy `models/NoticesModel.js`, rename, call the endpoints, normalise records.
3. **Presenter** — copy `presenters/InvoiceListPresenter.js` (list screen) or
   `NoticesPresenter.js` (form screen). Keep the state machine: loading / content /
   empty / error, and draft / saving / accepted / failed for submissions.
4. **View** — copy `views/screens/StudentListView.js`. Render state, forward taps.
5. **Register** — in `views/screens/index.js`, give the AD entry its real `Component`.
6. **Wire navigation** — buttons in other presenters navigate to `entry.name`.

## Backend configuration

`api/client.js` holds two knobs:

- `baseUrl` — your Java API URL (or Supabase URL in that scenario).
- `schoolScope` — the `S/` prefix from the endpoint table. If the backend drops
  it, change this one string.

Auth: `api/auth.js` stores the Bearer token and fires a global logout on any 401.
Set it up after login with `saveSession({ token, user })` and
`setOnUnauthorized(() => …)` in your root `App.js`.

## Non-negotiables from the design handoff

- Java owns authoritative calculations: balances, marks, timetable conflicts,
  promotion, idempotency. The phone only displays and forwards decisions.
- Statuses show **words as well as colour** (`StatusBadge`).
- Touch targets ≥ 44×44; title 23px, body 13–14px, labels 12px (`views/theme.js`).
- Protect unsaved work; validate inline and focus the first error; never
  double-submit while saving; show success only after the backend accepts.
- Never expose another school's or child's records — the backend enforces it,
  the UI must not assume it.
