# Sprint 1 Software Test Specification

**Version:** 0.1 — draft for teammate review before implementation<br>
**Issue:** [#7 — Sprint 1: Engineering contracts](https://github.com/ovenmakemeheat/Pockit/issues/7)<br>
**Feature contract:** [Sprint 1 Feature-Level SDS](../features/sprint1-feature-contracts.md)<br>
**Requirements:** [SRS](../requirements/srs.md), [Feature Inventory](../requirements/feature-inventory.md), [System-Level SDS](../architecture/system-level-sds.md)

> **Status:** Planned tests only; no Sprint 1 product behavior is claimed as implemented or tested by this document. Teammate review/approval is required before Issue #8 implementation begins. Tests depending on OQ-01/02/03/05/07 remain blocked until their decisions and expected outcomes are recorded.

## 1. Test purpose and quality rules

This specification defines observable test cases for FEAT-01–FEAT-08. Its goal is to show the Sprint 1 journey works with persistent data and that invalid, unauthenticated, cross-User, and forbidden-role operations fail safely.

A good test exercises behavior visible at the highest useful boundary and asserts returned values, user-visible outcomes, persisted records, authorization decisions, and unchanged state after rejection. It must not depend on private helper names, internal component state, query shape, schema field names, or a particular implementation algorithm. Database-backed requirements use a disposable PostgreSQL database; mocks alone do not prove persistence, authorization, atomicity, or financial correctness. A UI test supplements but never substitutes for API/HTTP and database evidence.

For every failure/denial test involving a write, inspect persistent state before and after and confirm there is no partial Transaction, allocation, balance, summary, or foreign-User mutation. Do not weaken assertions to make incorrect behavior pass. Meaningful business-rule work follows TDD: first run the new test and record its intended failure, then implement, rerun the test, and run relevant regressions.

## 2. Test levels, seams, and environment

| Level | Seam and use | Evidence boundary |
| --- | --- | --- |
| **HTTP/Auth integration** | Exercise Better Auth through the Elysia app's request handler and a disposable PostgreSQL database. Use real synthetic credentials and returned session cookies for login, identity, logout, and session/role lifecycle checks. | HTTP responses, cookie/session lifecycle, and subsequent protected-request outcomes. No listening dev server is needed. |
| **API integration** | Call the tRPC router with controlled session contexts and a real disposable PostgreSQL-backed Prisma client for application operations. | Externally visible result/error and persisted owner-scoped state. Use a fake/minimal database only for behavior that is explicitly independent of persistence. |
| **Database integration** | Use the real Prisma/PostgreSQL connection and versioned migrations for persistence, exact values, allocation atomicity, and restart/re-read behavior. | Committed records and aggregates read back from PostgreSQL. Never run destructive reset commands against an unknown database. |
| **UI component/workflow** | Render user-visible React components/routes with the existing Bun and Testing Library setup. Use this for field validation, accessible feedback, and display of API-backed result states. | Accessible controls and visible content/actions. A mocked UI result does not prove backend permission or persistence. |
| **Repository/security review** | Inspect tracked seed/config/test artifacts and the tested commit. | No real financial data, reusable credentials, plaintext stored passwords, or secrets. This supplements automated tests. |

### Existing prior art

- `packages/api/src/routers/index.test.ts` uses tRPC callers to cover public, unauthenticated protected, and authenticated synthetic-session behavior. Extend this seam for observable API authorization and validation.
- `apps/server/src/app.test.ts` calls `app.handle()` without opening a listener and checks HTTP health/method behavior. Extend the HTTP boundary for Better Auth/session behavior.
- `packages/db/src/index.test.ts` uses configured PostgreSQL to verify connectivity and the applied migration. Extend the DB integration seam for persisted financial behavior; fail clearly when the disposable test database is unavailable rather than silently skipping.
- `apps/web/src/components/button.test.tsx` uses Bun and React Testing Library to assert accessible UI behavior. Follow that user-visible style for login and dashboard interactions once those flows are implemented.

## 3. Shared fixture and execution assumptions

1. Each test suite uses isolated synthetic identities: **User A**, **User B**, and **Administrator**. Each User owns separate synthetic financial records. Test identities/passwords are generated or injected for the test run; no real credentials or reusable secrets are tracked.
2. The financial fixture includes User A's bank/Cash Account, Loan Taken credit-card Account, salary Income Account, and at least two distinct Expense Accounts; User B has separate records. The Administrator has platform access-management rights and no finance privileges.
3. The happy-path fixture starts with known isolated state: opening Cash position `O`, salary `S`, purchase `C` split into Expense allocations `E1` and `E2` where `E1 + E2 = C`, and repayment `R`. Choose `R` so the example is valid under approved balance/amount rules. The starting card balance and prior Income/Expense totals are known fixture values. These symbols describe test inputs, not an approved currency, scale, or rounding rule.
4. Once OQ-01/02/07 are approved, select valid amounts from the configured currency and bounds. Until then, cases not dependent on those decisions can use exact whole-number decimal strings and structural mismatch cases, but no amount scale, limit, or overpayment rule is implied.
5. Once OQ-03 is approved, use explicit dates and the approved date/time-zone/summary-window policy. Keep Transaction dates within the accepted reporting scope for expected summary tests. Do not assume a default date or period before approval.
6. All DB-backed cases run against a disposable PostgreSQL database with checked-in migrations applied. Use isolated fixtures/transactions and clean only records created by the test. Never point destructive tests at a personal or shared database.

## 4. Detailed test cases

### 4.1 Authentication and session — FEAT-01

| Test ID | Level | Preconditions and input | Expected observable result | Covers |
| --- | --- | --- | --- | --- |
| **STS-AUTH-01** | HTTP/Auth + DB | Active synthetic User A exists with a correctly provisioned password. Submit valid credentials, then use the returned session for current identity and a protected request. | Authentication succeeds; a subsequent request resolves User A; no caller-supplied identity is needed. | F1-AC-01, F1-AC-03 |
| **STS-AUTH-02** | HTTP/Auth + DB | Active synthetic Administrator exists. Submit valid credentials and request identity. | Authentication succeeds and identity reflects the Administrator, without granting finance access (finance denial is also asserted in STS-AUTHZ-08). | F1-AC-01 |
| **STS-AUTH-03** | HTTP/Auth | Use an unknown email and a known email with an incorrect password. | Both fail without an authenticated session; response/log output contains no submitted password or secret. | F1-AC-02 |
| **STS-AUTH-04** | HTTP/Auth + API | Authenticate User A, log out using that session, then repeat a protected request with the same cookie/token. | Logout succeeds; the subsequent request is unauthenticated/rejected. | F1-AC-04 |
| **STS-AUTH-05** | API | Authenticate as User A; attempt to supply User B's identity/owner ID in a current-identity or protected request. | Returned identity and authorization remain tied to User A's server-validated session; User B is not impersonated. | F1-AC-03 |
| **STS-AUTH-06** | DB + repository review | Provision a test password and inspect only its stored credential representation, then authenticate with the original synthetic password. | The database does not contain the plaintext password; authentication still verifies correctly. Do not print or persist the credential in test output. | F1-AC-05, F8-AC-04 |
| **STS-AUTH-07** | HTTP/Auth + DB | Mark a synthetic User disabled before a fresh login; submit that User's valid credentials. | Disabled User cannot establish a new protected session; no protected access is granted. | F1-AC-06 (new-login portion), F2-AC-06 |
| **STS-AUTH-08** | HTTP/Auth + API + DB | Establish a session, disable that User, then make a protected request using the pre-existing session. Run only after OQ-05 is explicitly decided. | Result matches the recorded OQ-05 policy and its timing exactly; no unapproved behavior is treated as passing. Until approval, report **BLOCKED**, not pass/fail. | F1-AC-06, F2-AC-06 |
| **STS-AUTH-09** | HTTP/Auth + configuration review | Inspect actual configured session lifecycle and cookies; exercise an untrusted Origin and an allowed Origin; check cookie attributes and configured expiry/renewal behavior. | Documentation matches the running configuration; only trusted origins are accepted; cookies are not available to client-side script and retain required deployed security attributes. Expiry/renewal assertions use the selected config, not an invented duration. | F1-AC-05 |

### 4.2 Server-side roles and ownership — FEAT-02

| Test ID | Level | Preconditions and input | Expected observable result | Covers |
| --- | --- | --- | --- | --- |
| **STS-AUTHZ-01** | API | Call each implemented protected financial/admin operation with no session. | Each protected operation is rejected as unauthenticated; no records or protected values are returned. | F2-AC-04, F8-AC-03 |
| **STS-AUTHZ-02** | API + DB | Authenticate User A and read/mutate an owned Sprint 1 record using its legitimate ID. | The operation succeeds within the User A scope and changes only User A's intended state. | F2-AC-01 |
| **STS-AUTHZ-03** | API + DB | Authenticate User A; query User B's Account/Transaction by direct ID and through any available list/filter/summary inputs. | Requests are denied or return the documented non-disclosing empty/not-found result; no User B data is present in responses. | F2-AC-02 |
| **STS-AUTHZ-04** | API + DB | Authenticate User A; attempt to update/delete User B's record by ID. Compare both Users' persistent state before and after. | The attempt is denied; neither User's record, balance, allocation, nor summary changes. | F2-AC-02 |
| **STS-AUTHZ-05** | API + DB | Authenticate User A; submit a valid-looking Transaction that references User B's source or allocation Account. | Request is denied without disclosure; no Transaction, allocations, or financial effects are committed. | F2-AC-02, F8-AC-02, F8-AC-03 |
| **STS-AUTHZ-06** | API | Call Administrator access-management operations as User A and with no session. | Both are denied; no platform User access state changes. | F2-AC-04, F8-AC-03 |
| **STS-AUTHZ-07** | API + DB | Authenticate as Administrator; list synthetic Users, enable/disable one, then inspect the response and persistent access state. | Approved platform access operations succeed; only required identity/access fields are returned; no financial entity or aggregate is joined, serialized, or exposed. | F2-AC-03, F3-AC-05 |
| **STS-AUTHZ-08** | API + DB | Authenticate as Administrator; attempt each available finance route/category: Account list/detail, Transaction list/detail, create/update, balance, category totals, summary, and history. | Every financial operation is denied and returns no financial information; no mutation occurs. Cover direct IDs and generic lookup surfaces, not just hidden UI links. | F2-AC-05, F3-AC-05, F8-AC-03 |
| **STS-AUTHZ-09** | API + DB | Repeat protected access after a User is disabled while an existing session is active. | Follows the approved OQ-05 decision exactly. Blocked until that decision is recorded. | F2-AC-06, F8-AC-03 |

### 4.3 Synthetic seed data — FEAT-03

| Test ID | Level | Preconditions and input | Expected observable result | Covers |
| --- | --- | --- | --- | --- |
| **STS-SEED-01** | DB + API | Prepare a fresh disposable database and run the documented seed operation. | Required synthetic User and Administrator identities, bank/Cash Account, Loan Taken/card Account, Income Account, and at least two Expense Accounts are available for the journey. | F3-AC-01 |
| **STS-SEED-02** | DB + API | Query seeded finance records as User A and User B using their respective sessions. | Each User sees only their own seeded Financial Accounts/categories; owner identity cannot be changed by request input. | F3-AC-02 |
| **STS-SEED-03** | DB | Run the seed twice, with a separate synthetic user-created record present between runs. | Demo identities/Accounts/categories are not duplicated; the unrelated record and its state are not reset or deleted. | F3-AC-03 |
| **STS-SEED-04** | Repository/security review | Inspect seed fixtures, examples, environment files, logs captured by tests, and the changed-file diff. | Data is synthetic; no real personal/financial data, reusable committed credentials, plaintext stored password, or secrets are present. | F3-AC-04, F8-AC-04 |

### 4.4 Opening balance and dates — FEAT-04

| Test ID | Level | Preconditions and input | Expected observable result | Covers |
| --- | --- | --- | --- | --- |
| **STS-OPEN-01** | API + DB | User A records an allowed exact opening amount on their seeded bank/Cash Account, then reads the Account back. | The exact opening position is persisted and returned; it is the starting Cash amount for subsequent balance calculations. | F4-AC-01 |
| **STS-OPEN-02** | API + DB | Record an opening Cash position with no Transactions and query Income/Expense totals. | Opening balance affects the Cash position only; it creates no Income or Expense allocation/summary activity. | F4-AC-02 |
| **STS-OPEN-03** | API + DB | Try to set an opening balance on a foreign-owned Account, a non-Cash Account, or as Administrator. Also repeat after financial postings if the operation would rewrite a baseline. | Each unauthorized/wrong-type/out-of-scope change is rejected and persistent state remains unchanged. Apply the approved one-time/baseline policy; do not infer correction behavior. | F4-AC-03, F8-AC-02, F8-AC-03 |
| **STS-OPEN-04** | API + DB | Create a Sprint 1 Transaction with an explicit date using the approved OQ-03 date representation; read it back in history. | The explicit date round-trips as specified, with no silent timezone shift or current-date substitution. Until OQ-03 approval, report **BLOCKED**. | F4-AC-04, F7-AC-03, F7-AC-05 |
| **STS-OPEN-05** | API + DB | Submit exact decimal strings at the configured precision boundary, one value beyond it, and values requiring any derived calculation behavior. | Results match the approved OQ-01/OQ-02 currency-scale and rounding policy. Until approval, do not assert that a value is rounded or rejected for excess precision; report **BLOCKED**. | F4-AC-05, F7-AC-05, F8-AC-01 |
| **STS-OPEN-06** | API + DB | Exercise zero, negative, and configured minimum/maximum opening amounts. | Results match the approved OQ-07 amount-boundary policy. Until approval, these cases are **BLOCKED** and must not be used to silently choose limits. | F4-AC-05 |

### 4.5 Salary receipt — FEAT-05

| Test ID | Level | Preconditions and input | Expected observable result | Covers |
| --- | --- | --- | --- | --- |
| **STS-RECEIVE-01** | API + DB | User A submits a valid receive-money Transaction to their Cash Account with one Salary/Income allocation exactly equal to the total and an approved explicit date. | Cash increases by the total; the Income category increases by its allocation; the Transaction/allocation persist and are returned by a later read. | F5-AC-01, F5-AC-02, F5-AC-05, F8-AC-01 |
| **STS-RECEIVE-02** | API + DB | Submit a receive-money Transaction whose allocation sum differs from its total. Read all affected records/balances before and after. | Request is rejected; no Transaction/allocation or balance/category/summary effect remains. | F5-AC-03, F8-AC-02 |
| **STS-RECEIVE-03** | API + DB | Submit a receive-money Transaction with no allocation lines. | Request is rejected and persistent financial state is unchanged. | F5-AC-03, F8-AC-02 |
| **STS-RECEIVE-04** | API + DB | Use a non-Cash receiver, non-Income destination in the Sprint 1 salary flow, or another User's Account. | Request is rejected without exposing or changing foreign records; no partial financial effect occurs. | F5-AC-04, F8-AC-02, F8-AC-03 |
| **STS-RECEIVE-05** | API + DB | Submit equivalent money strings with different formatting and precision cases allowed by the approved policy. | Accepted/rejected values and serialized results follow the confirmed exact-decimal/scale policy; no binary-float discrepancy. Until OQ-01/OQ-02 approval, scale-dependent assertions are **BLOCKED**. | F5-AC-01, F5-AC-03, F8-AC-01 |
| **STS-RECEIVE-06** | DB + API | Complete salary receipt, close/recreate the API/database client (and run the required application/database restart scenario), then query the record and balances again. | The Transaction, allocation, Cash balance effect, and Income total remain available and consistent from PostgreSQL. | F5-AC-02, F7-AC-04, F8-AC-02 |

### 4.6 Split credit-card purchase and repayment — FEAT-06

| Test ID | Level | Preconditions and input | Expected observable result | Covers |
| --- | --- | --- | --- | --- |
| **STS-CARD-01** | API + DB | User A selects their Loan Taken/card Account and posts a valid purchase total `C` split across distinct Expense allocations `E1` and `E2`, where `E1 + E2 = C`. | Card debt increases by `C`; each Expense category increases by its line amount; the dated Transaction and both allocations persist. | F6-AC-01, F6-AC-03, F6-AC-05, F8-AC-01 |
| **STS-CARD-02** | API + DB | In the Sprint 1 card-purchase flow, submit a mismatched allocation total, no allocations, a non-Expense allocation, or a foreign-owned allocation. | Invalid case is rejected; no purchase, allocation, debt, category, summary, or history change is committed. | F6-AC-04, F8-AC-02, F8-AC-03 |
| **STS-CARD-03** | API + DB | With a valid known card debt and Cash position, submit a Cash-funded repayment `R` allocated to the owned Loan Taken/card Account. | Cash decreases by `R`; card debt decreases by `R`; no Income or Expense total changes because of repayment; the repayment persists. | F6-AC-02, F6-AC-03, F6-AC-05, F8-AC-01 |
| **STS-CARD-04** | API + DB | Submit repayment using a wrong source/destination Account type or another User's Account. | Request is rejected with no partial record or financial effect and no foreign data disclosure. | F6-AC-04, F8-AC-02, F8-AC-03 |
| **STS-CARD-05** | DB + API | Run the complete isolated sequence: opening balance `O`, salary `S`, split card purchase `C`, repayment `R`; read all balances and categories through the API after writes. | `Cash = O + S - R`; card debt equals starting debt plus `C - R`; Income increases only by salary; Expense categories increase by `E1`/`E2`; each result matches persisted records. Values use an approved valid fixture. | F6-AC-03, F6-AC-05, F7-AC-01, F7-AC-02, F8-AC-01 |
| **STS-CARD-06** | API + DB | Attempt a repayment exceeding current card debt or a payment that would exceed an approved Cash boundary. | Result follows an explicitly approved OQ-07 rule. Until approval, do not assert overpayment/overdraft rejection or acceptance; report **BLOCKED**. | F6-AC-04 |
| **STS-CARD-07** | API + DB | User A posts a valid Sprint 1 card purchase with exactly one Expense allocation equal to the Transaction total, using a valid fixture amount. Read persisted debt and category totals before and after. | Purchase succeeds and persists; card debt increases by the total and the selected Expense category increases by that same line amount. No second allocation is required for this valid one-line purchase. | F6-AC-01, F6-AC-03, F8-AC-01 |

### 4.7 Financial views and persistence — FEAT-07

| Test ID | Level | Preconditions and input | Expected observable result | Covers |
| --- | --- | --- | --- | --- |
| **STS-VIEW-01** | API + DB | Complete known opening/receipt/purchase/repayment fixture, then request User A's balances. | Cash and Loan Taken balances match the opening position and each committed posting exactly; values are sourced from persisted state. | F7-AC-01, F8-AC-01 |
| **STS-VIEW-02** | API + DB | Query User A's Income/Expense summary for the approved scope with opening position, salary, split purchase, and repayment present. | Income includes salary allocation; expenses include only Expense allocations; opening position and loan repayment are excluded. Exact totals match persisted allocation lines. OQ-03 scope must be approved before acceptance. | F7-AC-02, F7-AC-05, F6-AC-05 |
| **STS-VIEW-03** | API + DB | Query category spending and transaction history as User A after the full journey. | Dining/grocery category totals match the split allocations; salary, purchase, and repayment history belongs to User A, includes allocations, and uses approved dates. | F7-AC-02, F7-AC-03 |
| **STS-VIEW-04** | API + DB | Authenticate User A and query User B's balance, category, summary, or history via IDs/filters. | The response exposes no User B financial values or record data; no mutation occurs. | F7-AC-03, F8-AC-03 |
| **STS-VIEW-05** | DB + API | Complete the journey, then perform a fresh database-backed read after the application/client is restarted. | Balances, summaries, categories, and history still match committed PostgreSQL records. | F7-AC-04, F5-AC-02, F6-AC-03, F8-AC-02 |
| **STS-VIEW-06** | API + DB | Request summaries with and without date filters/default ranges, and values requiring display rounding. | Behavior matches approved OQ-01/OQ-02/OQ-03 decisions. Until confirmed, the default range, timezone boundaries, and rounded display result are **BLOCKED**; no arbitrary default is accepted. | F7-AC-05 |

### 4.8 Cross-cutting integrity, safety, and UI — FEAT-08

| Test ID | Level | Preconditions and input | Expected observable result | Covers |
| --- | --- | --- | --- | --- |
| **STS-INT-01** | API + DB | Submit a financially invalid multi-allocation write and compare the complete persistent state before/after. Include a failure case affecting an otherwise valid source/target pair. | The operation is rejected and there is no partial Transaction, allocation, balance, category, summary, or history effect. | F5-AC-03, F6-AC-04, F8-AC-02 |
| **STS-INT-02** | API + DB | Run exact arithmetic/equality/balance cases around the confirmed currency scale, including repeated smallest supported units and serialization round-trip. | Exact expected totals remain exact through API, persistence, and summary; no binary-float drift or unapproved rounding occurs. Scale-specific assertions are **BLOCKED** until OQ-01/OQ-02 approval. | F4-AC-05, F5-AC-01, F6-AC-01, F8-AC-01 |
| **STS-INT-03** | API/HTTP + repository review | Cause invalid login, authorization denial, and financial validation failure; inspect client responses, tracked fixtures, and captured logs. | No password, secret, or financial record belonging to another User is exposed in error output/logs; tracked sample data remains synthetic. | F1-AC-02, F2-AC-02, F3-AC-04, F8-AC-04 |
| **STS-UI-01** | UI component/workflow | Render the login UI, submit empty/invalid fields and then valid synthetic credentials through the intended auth interaction. | Inputs have accessible labels; field/server errors are visible; successful authentication navigates to the authenticated experience without exposing credentials. This does not replace STS-AUTH cases. | F1-AC-01, F1-AC-02 |
| **STS-UI-02** | UI workflow + API-backed test | Render the authenticated User dashboard with persisted API results from the complete fixture. | Visible bank balance, card debt, summary, category spending, and history match the API-backed values. Test loading/error/empty states without treating mocked values as persistence evidence. | F7-AC-01, F7-AC-02, F7-AC-03, F7-AC-04, F7-AC-05 |
| **STS-UI-03** | UI component/workflow + API | Render the Administrator experience and inspect available actions/navigation; attempt the finance API separately as STS-AUTHZ-08. | Administrator access controls are available; financial views/navigation are not presented as allowed capabilities. The server-side denial remains authoritative regardless of UI. | F2-AC-03, F2-AC-05, F8-AC-03 |

## 5. Acceptance-criteria to test traceability

Every contract AC appears below. A criterion marked **gate** has a planned test but cannot be reported as passed until the named decision is approved. “Actual test/result/commit” is filled in by the feature implementation issue after running the tests; this specification does not claim those results.

| Acceptance criterion | Planned test(s) | Actual test/result/commit |
| --- | --- | --- |
| F1-AC-01 | STS-AUTH-01, STS-AUTH-02, STS-UI-01 | Pending implementation |
| F1-AC-02 | STS-AUTH-03, STS-UI-01, STS-INT-03 | Pending implementation |
| F1-AC-03 | STS-AUTH-01, STS-AUTH-05 | Pending implementation |
| F1-AC-04 | STS-AUTH-04 | Pending implementation |
| F1-AC-05 | STS-AUTH-06, STS-AUTH-09 | Pending implementation |
| F1-AC-06 — OQ-05 gate | STS-AUTH-07, STS-AUTH-08 | Pending OQ-05 decision and implementation |
| F2-AC-01 | STS-AUTHZ-02 | Pending implementation |
| F2-AC-02 | STS-AUTHZ-03, STS-AUTHZ-04, STS-AUTHZ-05, STS-INT-03 | Pending implementation |
| F2-AC-03 | STS-AUTHZ-07, STS-UI-03 | Pending implementation |
| F2-AC-04 | STS-AUTHZ-01, STS-AUTHZ-06 | Pending implementation |
| F2-AC-05 | STS-AUTHZ-08, STS-UI-03 | Pending implementation |
| F2-AC-06 — OQ-05 gate | STS-AUTH-07, STS-AUTH-08, STS-AUTHZ-09 | Pending OQ-05 decision and implementation |
| F3-AC-01 | STS-SEED-01 | Pending implementation |
| F3-AC-02 | STS-SEED-02 | Pending implementation |
| F3-AC-03 | STS-SEED-03 | Pending implementation |
| F3-AC-04 | STS-SEED-04, STS-INT-03 | Pending implementation |
| F3-AC-05 | STS-AUTHZ-07, STS-AUTHZ-08 | Pending implementation |
| F4-AC-01 | STS-OPEN-01 | Pending implementation |
| F4-AC-02 | STS-OPEN-02 | Pending implementation |
| F4-AC-03 | STS-OPEN-03 | Pending implementation |
| F4-AC-04 — OQ-03 gate | STS-OPEN-04 | Pending OQ-03 decision and implementation |
| F4-AC-05 — OQ-01/02/07 gates | STS-OPEN-05, STS-OPEN-06, STS-INT-02 | Pending decisions and implementation |
| F5-AC-01 | STS-RECEIVE-01, STS-RECEIVE-05 | Pending implementation; scale case gated |
| F5-AC-02 | STS-RECEIVE-01, STS-RECEIVE-06 | Pending implementation |
| F5-AC-03 | STS-RECEIVE-02, STS-RECEIVE-03, STS-RECEIVE-05 | Pending implementation; scale case gated |
| F5-AC-04 | STS-RECEIVE-04, STS-AUTHZ-05 | Pending implementation |
| F5-AC-05 | STS-RECEIVE-01, STS-VIEW-02 | Pending implementation; summary scope gated |
| F6-AC-01 | STS-CARD-07, STS-CARD-01, STS-INT-02 | Pending implementation; precision case gated |
| F6-AC-02 | STS-CARD-03 | Pending implementation |
| F6-AC-03 | STS-CARD-01, STS-CARD-03, STS-CARD-05, STS-CARD-07 | Pending implementation |
| F6-AC-04 | STS-CARD-02, STS-CARD-04, STS-CARD-06 | Pending implementation; OQ-07 case gated |
| F6-AC-05 | STS-CARD-01, STS-CARD-03, STS-CARD-05, STS-VIEW-02 | Pending implementation; summary scope gated |
| F7-AC-01 | STS-CARD-05, STS-VIEW-01, STS-UI-02 | Pending implementation |
| F7-AC-02 | STS-CARD-05, STS-VIEW-02, STS-VIEW-03, STS-UI-02 | Pending implementation; OQ-03 scope gated |
| F7-AC-03 | STS-OPEN-04, STS-VIEW-03, STS-VIEW-04, STS-UI-02 | Pending implementation; date case gated |
| F7-AC-04 | STS-RECEIVE-06, STS-VIEW-05, STS-UI-02 | Pending implementation |
| F7-AC-05 — OQ-01/02/03 gates | STS-OPEN-04, STS-OPEN-05, STS-VIEW-02, STS-VIEW-06, STS-UI-02 | Pending decisions and implementation |
| F8-AC-01 — OQ-01/02-dependent checks | STS-OPEN-05, STS-RECEIVE-01, STS-CARD-01, STS-CARD-03, STS-CARD-05, STS-CARD-07, STS-VIEW-01, STS-INT-02 | Pending implementation; scale-specific checks gated |
| F8-AC-02 | STS-AUTHZ-04, STS-AUTHZ-05, STS-OPEN-03, STS-RECEIVE-02, STS-RECEIVE-03, STS-CARD-02, STS-CARD-04, STS-INT-01 | Pending implementation |
| F8-AC-03 | STS-AUTHZ-01, STS-AUTHZ-02, STS-AUTHZ-03, STS-AUTHZ-04, STS-AUTHZ-05, STS-AUTHZ-06, STS-AUTHZ-07, STS-AUTHZ-08, STS-AUTHZ-09, STS-RECEIVE-04, STS-CARD-02, STS-CARD-04, STS-VIEW-04, STS-UI-03 | Pending implementation; OQ-05 cases gated |
| F8-AC-04 | STS-AUTH-06, STS-SEED-04, STS-INT-03 | Pending implementation |
| F8-AC-05 | This AC→STS table plus actual test/result/commit record in Issue #8 | Pending implementation |
| F8-AC-06 | Reviewed PR/issue history and project-board/checklist state before Issue #8 implementation | Pending teammate review |

## 6. Execution and reporting requirements

- **Primary regression command:** `bun run test` from repository root after the database is configured and Prisma generation/migrations are ready. It runs web/server/API tests and PostgreSQL-backed database tests. Do not claim it passed if a configured database test was skipped or unavailable.
- Run targeted package tests while developing the relevant seam, then the root suite and applicable type/build/lint checks before integration. Record exact commands, results, environment prerequisites, and tested commit in Issue #8/its PR.
- For every meaningful business-rule test, record the pre-implementation failing result and the post-implementation passing result. Run affected regression tests after fixes.
- Keep the test database disposable and separate from any personal/shared database. Never reset an unknown database. Use synthetic fixtures only.
- Report unresolved decision-dependent tests as **blocked** with the decision ID; do not count them as passed, silently omit them, or select a policy by changing test inputs.
- No application tests were run for this specification-only issue. Its documentation checks and actual results will be recorded separately in the Issue #7 PR.
