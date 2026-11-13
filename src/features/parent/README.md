# Parent work area

Assigned pages PA01–PA19. The first flow covers PA01, PA02 and PA10–PA12.

| Screen                          | What it does                                                                              | API requests                                                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| PA01 Parent home                | Switch linked child, see the selected child's schedule and school updates, open fees      | GET /me/contexts, PUT /me/context, GET /my-classes, GET /schedule/day, GET /me/notifications                                                      |
| PA02 My children                | Filter the authorised children by school and choose a child                               | GET /me/contexts, PUT /me/context                                                                                                                 |
| PA10 Fees and payment history   | Filter loaded invoices, open invoice details and see confirmed payments                   | GET /invoices, GET /payments, GET /my-classes, GET /terms                                                                                         |
| PA11 Invoice and payment        | See issued lines and balance, download the invoice, start a Paystack test checkout        | GET /invoices/{id}, GET /invoices/{id}/pdf, POST /invoices/{id}/checkout                                                                          |
| PA12 Payment status and receipt | Verify a payment, refresh the balance, show invoice refunds, download a confirmed receipt | GET /payment-intents/{id}, POST /payment-intents/{id}/verify, GET /invoices/{id}, GET /payments, GET /fee-adjustments, GET /payments/{id}/receipt |

School requests use the current school and child. Payer permission comes from the backend. Paystack opens in the system browser from the test checkout screen. The app displays receipt access after it finds the confirmed payment in the invoice response. The same in-memory attempt and key are used when a request outcome is uncertain. A confirmed payment is available in payment history after the app restarts. An unfinished attempt is tracked for the current workspace session.

## Try the first flow

1. Run npm ci and npm run web. Fill the demo sign-in details, sign in, and select Parent / Guardian in the Greenfield workspace.
2. Choose Zainab. Open Fees and payments, then the first term invoice. The demo contains fictional issued invoices and a fictional confirmed school payment. Use My children to switch to Mariam at Brightfield and see her own invoices.
3. For Paystack and PDF checks, follow the [backend connection guide](../../../docs/BACKEND_INTEGRATION.md) and sign in with the linked demo parent account from your Java environment. Use an unpaid demo invoice. Review the amount and payer email, open Paystack test checkout, return, tap Check Paystack status, and download the confirmed receipt. On a phone the receipt opens the system sharing menu.

PA03–PA09 and PA13–PA19 remain in the Parent screen plan.

Put JSX screens in views, state and actions in presenters, and data access in models and api. Reuse the shared components and client. See the [developer guide](../../../docs/DEVELOPER_GUIDE.md). Ask the lead for changes to shared login, navigation, theme, dependencies or transport.
