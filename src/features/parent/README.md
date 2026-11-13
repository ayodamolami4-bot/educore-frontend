# Parent work area

The Parent / Guardian workspace covers PA01–PA19. The parent account is global across schools; the selected school/child context is revalidated by the backend on every request. Parents can read only linked children, published academic material/results, submitted attendance and their own permitted communications/cases. Keep these route identifiers stable for shared notification deep links. The selected child is always resolved from the authenticated school context, never from a locally stored identifier.

## Screen map

| Screen                          | Purpose                                                                                              | Backend operations                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| PA01 Parent home                | Select linked child, see today's schedule and safe school updates                                    | GET /me/contexts, PUT /me/context, GET /my-classes, GET /schedule/day, GET /me/notifications                                                       |
| PA02 My children                | Filter and select verified child links across schools                                                | GET /me/contexts, PUT /me/context                                                                                                                  |
| PA03 Child overview             | View current pupil record, academic history, verified external results and family-visible documents  | GET /students/{studentId}, GET /my-classes, GET /students/{studentId}/academic-history, GET /students/{studentId}/external-results, GET /documents |
| PA04 Timetable and calendar     | View the child's dated timetable, school calendar and published examinations                         | GET /timetable, GET /calendar, GET /examinations                                                                                                   |
| PA05 Learning                   | Read class workspace, published subject materials and eligible assignments                           | GET /classes/{classId}/workspace, GET /materials, GET /assignments                                                                                 |
| PA06 Assignment and feedback    | Read assignment details and accepted submission/released feedback history                            | GET /assignments/{assignmentId}, GET /assignments/{assignmentId}/submissions/{studentId}/history                                                   |
| PA07 Attendance                 | View submitted attendance, missing-register coverage and official corrections for the selected pupil | GET /students/{studentId}/attendance, GET /threads/contacts, GET /attendance/registers/{register}/correction-history                               |
| PA08 Results                    | List published report cards grouped by the server's session/term snapshots                           | GET /students/{studentId}/reports                                                                                                                  |
| PA09 Report card                | View an issued report revision and download its server-generated PDF                                 | GET /reports/{reportId}, GET /reports/{reportId}/pdf                                                                                               |
| PA10 Fees and payment history   | View child-scoped invoices and confirmed payments, only when payer permission exists                 | GET /invoices, GET /payments                                                                                                                       |
| PA11 Invoice and payment        | View invoice lines/balance and start full or permitted partial Paystack test checkout                | GET /invoices/{invoiceId}, POST /invoices/{invoiceId}/checkout, GET /invoices/{invoiceId}/pdf                                                      |
| PA12 Payment status and receipt | Verify provider state and download only the confirmed payment receipt                                | GET /payment-intents/{intentId}, POST /payment-intents/{intentId}/verify, GET /invoices/{invoiceId}, GET /payments/{paymentId}/receipt             |
| PA13 Messages                   | Start a private thread with the child's class teacher or school office; list own threads             | GET /threads/contacts, GET /threads, POST /threads                                                                                                 |
| PA14 Private conversation       | Read/send messages, acknowledge read state and close a completed conversation                        | GET /threads/{threadId}, POST /threads/{threadId}/messages, PUT /threads/{threadId}/read, POST /threads/{threadId}/close                           |
| PA15 School notices             | Read published school notices                                                                        | GET /notices, GET /notices/{id}                                                                                                                    |
| PA16 My complaints              | List only this parent's permitted child-linked cases                                                 | GET /complaints                                                                                                                                    |
| PA17 Submit a complaint         | Submit a child-linked complaint using the school's published category metadata                       | POST /complaints, GET /metadata                                                                                                                    |
| PA18 Complaint and resolution   | Read case history, reply, accept a resolution or request review with a reason                        | GET /complaints/{caseId}, POST /complaints/{caseId}/replies, POST /complaints/{caseId}/status, GET /complaints/{caseId}/history                    |
| PA19 Profile and relationships  | View personal account details and school-managed guardian/child links                                | GET /me, GET /me/contexts                                                                                                                          |

## Access and workflow boundaries

- Use the currently selected parent context. Never use a client-supplied child ID as proof of access; the Java backend rechecks school membership, guardian relationship, learning permission and payer permission.
- A parent can only open approved linked children. Switching schools/children goes through the shared context flow and invalidates prior school-scoped requests.
- Families see published learning materials and released feedback only. Parents cannot submit or grade student work.
- Attendance displays submitted registers. A missing register is incomplete coverage, not an absence. Official corrections are shown only after school review; private teacher requests and office follow-up notes are not exposed.
- Only published report revisions are authoritative. The app downloads the exact server-generated report PDF; it does not calculate marks or generate report cards.
- Fees are available only when the backend grants payer permission. Paystack is test checkout only; a browser return is not confirmation. Show receipts only after server verification finds the matching confirmed payment.
- Conversations are limited to the current child's class teacher or school office. No public parent group or arbitrary teacher contact is exposed.
- Complaints are scoped to the selected child and the current parent. Internal staff notes are never displayed. A parent can accept a resolved case or request review with a reason; only staff resolve/close cases.
- Demo transport is fictional and intentionally does not invent success for unfinished real backend operations. Live Paystack, real email/push providers, native-device sharing and production hosting are separate release checks.

## Try the first flow

1. Run `npm ci` and `npm run web`. Use the local demo sign-in and select Parent / Guardian.
2. Open the parent home and switch between the linked children. Use the academic and communication links to explore the corresponding pages.
3. For real API integration, follow [the backend connection guide](../../../docs/BACKEND_INTEGRATION.md) and use the private parent credentials generated by the local backend demo seed. Never commit or share `.dev/demo-credentials.json`.

## Implementation structure

- JSX screens live in `views`.
- State, child-scope checks and actions live in `models` and `presenters`.
- API access lives in `api` and reuses the shared authenticated client.
- Shared login, navigation, theme, dependencies and transport remain lead-owned.

The Parent screens are implemented in the frontend, but production readiness still requires local contract tests against the running Java services, actual Android/iOS walkthroughs, configured provider checks and the release review described in the backend handover.
