# Sprint 1 Software Test Specification

**Version:** 0.3 — Issue #8 implementation, verification, and session-race review follow-up<br>
**Issue:** [#8 — Sprint 1: Working Sprint 1 and verification](https://github.com/ovenmakemeheat/Pockit/issues/8) (contract baseline: [#7](https://github.com/ovenmakemeheat/Pockit/issues/7))<br>
**Feature contract:** [Sprint 1 Feature-Level SDS](../features/sprint1-feature-contracts.md)<br>
**Requirements:** [SRS](../requirements/srs.md), [Feature Inventory](../requirements/feature-inventory.md), [System-Level SDS](../architecture/system-level-sds.md)

> **Status:** Issue #8 implementation is in progress. Baseline source commit `b99ed0924eee7ad46f1b3300120951eb8b70c1fa` passed the root suite (49 tests), root type/build checks (6 Turbo tasks), targeted Biome checks, migration status, secret-pattern scan, and `git diff --check`; the User-scoped finance-cache regression also passed in isolation. Session-race follow-up source commit `9b613e864323640f68c96d6b23b942bf68b10c89` passed the PostgreSQL-backed auth test file (10 tests), server type check, targeted Biome check, and `git diff --check`; the new deterministic race regression failed without the post-create guard and passed with it. The execution records below distinguish these tested source commits; this documentation update follows the follow-up commit. PR [#23](https://github.com/ovenmakemeheat/Pockit/pull/23) is open to `staging-1`, with @MadMax168 requested as reviewer. ADR-0001 and ADR-0002 still require specific teammate review in that PR. OQ-05 is resolved by ADR-0002. Historical pre-implementation failing output for the earlier financial business rules was not captured in this execution record; do not claim TDD-first evidence for those changes. Future currency/amount-limit extensions remain outside this Sprint 1 slice.

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
3. Use a known isolated THB fixture: opening Cash `O = 1,000.00`, salary `S = 1,500.00`, split purchase `C = 100.00` with Expense allocations `E1 = 65.00` and `E2 = 35.00`, and repayment `R = 40.00`. Expected closing Cash is `2,460.00`, card debt is `60.00`, Income is `1,500.00`, and Expense is `100.00`; other test cases may choose smaller positive values. No test asserts an unapproved maximum amount or allocation-line count.
4. Use exact THB decimal strings with at most two fractional digits, and test `0.01` as one minor unit. Reject zero/negative values, excess fractional precision, repayments above debt, and Cash outflows above available balance. Do not infer a product-specific maximum or allocation-count limit.
5. Every Transaction test supplies an explicit valid `YYYY-MM-DD` date. Dates are stored/returned unchanged; summary tests use all-time totals without an implicit date filter. Date-filter behavior is outside Sprint 1.
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
| **STS-AUTH-07** | HTTP/Auth + DB | Mark a synthetic User disabled before a fresh login; submit that User's valid credentials. | Sign-in fails without issuing a session cookie; no protected access is granted. | F1-AC-06, F2-AC-06 |
| **STS-AUTH-08** | HTTP/Auth + API + DB | Establish a session, disable that User through the Administrator operation, then request identity and a protected operation using the pre-existing cookie. | The stored session is deleted atomically with disablement; identity resolves to no session and protected operations are rejected immediately. The stale cookie alone grants no access. | F1-AC-06, F2-AC-06 |
| **STS-AUTH-09** | HTTP/Auth + configuration review | Inspect actual configured session lifecycle and cookies; exercise an untrusted Origin and an allowed Origin; check cookie attributes and configured expiry/renewal behavior. | Documentation matches the running configuration; only trusted origins are accepted; cookies are not available to client-side script and retain required deployed security attributes. Expiry/renewal assertions use the selected config, not an invented duration. | F1-AC-05 |
| **STS-AUTH-10** | HTTP/Auth + DB | Sign in as a seeded User while submitting a client-controlled `role: Administrator` field; then request the identity using the returned session. | The login either ignores the unsupported field or rejects it; in no case does the User session gain Administrator role. The persisted server-assigned role remains authoritative. | F1-AC-03, F8-AC-03 |
| **STS-AUTH-11** | HTTP/Auth + DB concurrency | Deterministically pause sign-in after its enabled-status read; let an Administrator disable the User and commit, then resume session creation. After sign-in completes, re-enable the User and use the returned cookie. | No session row created by the racing sign-in remains; the returned cookie resolves to no identity after re-enable and cannot revive the revoked session. | F1-AC-06, F2-AC-06, F8-AC-03 |

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
| **STS-AUTHZ-09** | API + DB | Disable a User who has an active stored session, then invoke a protected API operation with that session context/cookie. | The disable operation deletes persisted sessions and the protected operation rejects access; no financial data is returned or changed. | F2-AC-06, F8-AC-03 |

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
| **STS-OPEN-04** | API + DB | Create a Sprint 1 Transaction with explicit `YYYY-MM-DD`, then read it back in history. | The date round-trips unchanged; invalid/missing dates are rejected, and no default or timezone shift is applied. | F4-AC-04, F7-AC-03, F7-AC-05 |
| **STS-OPEN-05** | API + DB | Submit `1.00` THB and `0.01` THB, then submit `1.001` THB. | Valid amounts remain exact; `1.001` is rejected; values are not silently rounded, and serialization uses two fractional digits. | F4-AC-05, F7-AC-05, F8-AC-01 |
| **STS-OPEN-06** | API + DB | Exercise zero and negative opening amounts. | Both are rejected with persistent Account state unchanged. No arbitrary maximum or allocation-line limit is asserted. | F4-AC-05 |

### 4.5 Salary receipt — FEAT-05

| Test ID | Level | Preconditions and input | Expected observable result | Covers |
| --- | --- | --- | --- | --- |
| **STS-RECEIVE-01** | API + DB | User A submits a valid receive-money Transaction to their Cash Account with one Salary/Income allocation exactly equal to the total and an approved explicit date. | Cash increases by the total; the Income category increases by its allocation; the Transaction/allocation persist and are returned by a later read. | F5-AC-01, F5-AC-02, F5-AC-05, F8-AC-01 |
| **STS-RECEIVE-02** | API + DB | Submit a receive-money Transaction whose allocation sum differs from its total. Read all affected records/balances before and after. | Request is rejected; no Transaction/allocation or balance/category/summary effect remains. | F5-AC-03, F8-AC-02 |
| **STS-RECEIVE-03** | API + DB | Submit a receive-money Transaction with no allocation lines. | Request is rejected and persistent financial state is unchanged. | F5-AC-03, F8-AC-02 |
| **STS-RECEIVE-04** | API + DB | Use a non-Cash receiver, non-Income destination in the Sprint 1 salary flow, or another User's Account. | Request is rejected without exposing or changing foreign records; no partial financial effect occurs. | F5-AC-04, F8-AC-02, F8-AC-03 |
| **STS-RECEIVE-05** | API + DB | Submit valid THB strings with zero, one, and two fractional digits, plus an amount with three fractional digits. | Valid inputs are interpreted exactly and returned with two fractional digits; excess precision is rejected without rounding or a persistent effect. | F5-AC-01, F5-AC-03, F8-AC-01 |
| **STS-RECEIVE-06** | DB + API | Complete salary receipt, close/recreate the API/database client (and run the required application/database restart scenario), then query the record and balances again. | The Transaction, allocation, Cash balance effect, and Income total remain available and consistent from PostgreSQL. | F5-AC-02, F7-AC-04, F8-AC-02 |

### 4.6 Split credit-card purchase and repayment — FEAT-06

| Test ID | Level | Preconditions and input | Expected observable result | Covers |
| --- | --- | --- | --- | --- |
| **STS-CARD-01** | API + DB | User A selects their Loan Taken/card Account and posts a valid purchase total `C` split across distinct Expense allocations `E1` and `E2`, where `E1 + E2 = C`. | Card debt increases by `C`; each Expense category increases by its line amount; the dated Transaction and both allocations persist. | F6-AC-01, F6-AC-03, F6-AC-05, F8-AC-01 |
| **STS-CARD-02** | API + DB | In the Sprint 1 card-purchase flow, submit a mismatched allocation total, no allocations, a non-Expense allocation, or a foreign-owned allocation. | Invalid case is rejected; no purchase, allocation, debt, category, summary, or history change is committed. | F6-AC-04, F8-AC-02, F8-AC-03 |
| **STS-CARD-03** | API + DB | With a valid known card debt and Cash position, submit a Cash-funded repayment `R` allocated to the owned Loan Taken/card Account. | Cash decreases by `R`; card debt decreases by `R`; no Income or Expense total changes because of repayment; the repayment persists. | F6-AC-02, F6-AC-03, F6-AC-05, F8-AC-01 |
| **STS-CARD-04** | API + DB | Submit repayment using a wrong source/destination Account type or another User's Account. | Request is rejected with no partial record or financial effect and no foreign data disclosure. | F6-AC-04, F8-AC-02, F8-AC-03 |
| **STS-CARD-05** | DB + API | Run the complete isolated sequence: opening balance `O`, salary `S`, split card purchase `C`, repayment `R`; read all balances and categories through the API after writes. | `Cash = O + S - R`; card debt equals starting debt plus `C - R`; Income increases only by salary; Expense categories increase by `E1`/`E2`; each result matches persisted records. Values use an approved valid fixture. | F6-AC-03, F6-AC-05, F7-AC-01, F7-AC-02, F8-AC-01 |
| **STS-CARD-06** | API + DB | Attempt a repayment exceeding current card debt and a Cash outflow exceeding the available balance; also submit zero/negative totals and allocations. | Each attempt is rejected and leaves Transaction, allocation, debt, Cash balance, category totals, and history unchanged. | F6-AC-04, F8-AC-02 |
| **STS-CARD-07** | API + DB | User A posts a valid Sprint 1 card purchase with exactly one Expense allocation equal to the Transaction total, using a valid fixture amount. Read persisted debt and category totals before and after. | Purchase succeeds and persists; card debt increases by the total and the selected Expense category increases by that same line amount. No second allocation is required for this valid one-line purchase. | F6-AC-01, F6-AC-03, F8-AC-01 |

### 4.7 Financial views and persistence — FEAT-07

| Test ID | Level | Preconditions and input | Expected observable result | Covers |
| --- | --- | --- | --- | --- |
| **STS-VIEW-01** | API + DB | Complete known opening/receipt/purchase/repayment fixture, then request User A's balances. | Cash and Loan Taken balances match the opening position and each committed posting exactly; values are sourced from persisted state. | F7-AC-01, F8-AC-01 |
| **STS-VIEW-02** | API + DB | Query User A's all-time Income/Expense summary after the opening position, salary, split purchase, and repayment. | Income includes salary allocation; expenses include only Expense allocations; opening position and loan repayment are excluded. Exact totals match persisted allocation lines. | F7-AC-02, F7-AC-05, F6-AC-05 |
| **STS-VIEW-03** | API + DB | Query category spending and transaction history as User A after the full journey. | Dining/grocery category totals match the split allocations; salary, purchase, and repayment history belongs to User A, includes allocations, and uses approved dates. | F7-AC-02, F7-AC-03 |
| **STS-VIEW-04** | API + DB | Authenticate User A and query User B's balance, category, summary, or history via IDs/filters. | The response exposes no User B financial values or record data; no mutation occurs. | F7-AC-03, F8-AC-03 |
| **STS-VIEW-05** | DB + API | Complete the journey, then perform a fresh database-backed read after the application/client is restarted. | Balances, summaries, categories, and history still match committed PostgreSQL records. | F7-AC-04, F5-AC-02, F6-AC-03, F8-AC-02 |
| **STS-VIEW-06** | API + DB | Query the Sprint 1 summary and category totals without a date filter; verify returned amounts include exactly two fractional digits. | The result includes all persisted eligible allocations with no implicit period/date filter and no rounding; any date-filtered reporting remains outside Sprint 1. | F7-AC-05 |

### 4.8 Cross-cutting integrity, safety, and UI — FEAT-08

| Test ID | Level | Preconditions and input | Expected observable result | Covers |
| --- | --- | --- | --- | --- |
| **STS-INT-01** | API + DB | Submit a financially invalid multi-allocation write and compare the complete persistent state before/after. Include a failure case affecting an otherwise valid source/target pair. | The operation is rejected and there is no partial Transaction, allocation, balance, category, summary, or history effect. | F5-AC-03, F6-AC-04, F8-AC-02 |
| **STS-INT-02** | API + DB | Run exact THB arithmetic/equality/balance cases including repeated `0.01` allocations, a mismatch, and serialization round-trip. | Exact minor-unit totals remain exact through API, persistence, and all-time summary; values render to two fractional digits and no binary-float drift or rounding occurs. | F4-AC-05, F5-AC-01, F6-AC-01, F8-AC-01 |
| **STS-INT-03** | API/HTTP + repository review | Cause invalid login, authorization denial, and financial validation failure; inspect client responses, tracked fixtures, and captured logs. | No password, secret, or financial record belonging to another User is exposed in error output/logs; tracked sample data remains synthetic. | F1-AC-02, F2-AC-02, F3-AC-04, F8-AC-04 |
| **STS-UI-01** | UI component/workflow | Render the login UI, submit empty/invalid fields and then valid synthetic credentials through the intended auth interaction. | Inputs have accessible labels; field/server errors are visible; successful authentication navigates to the authenticated experience without exposing credentials. This does not replace STS-AUTH cases. | F1-AC-01, F1-AC-02 |
| **STS-UI-02** | UI workflow + API-backed test | Render the authenticated User dashboard with persisted API results from the complete fixture. | Visible bank balance, card debt, summary, category spending, and history match the API-backed values. Test loading/error/empty states without treating mocked values as persistence evidence. | F7-AC-01, F7-AC-02, F7-AC-03, F7-AC-04, F7-AC-05 |
| **STS-UI-03** | UI component/workflow + API | Render the Administrator experience and inspect available actions/navigation; attempt the finance API separately as STS-AUTHZ-08. | Administrator access controls are available; financial views/navigation are not presented as allowed capabilities. The server-side denial remains authoritative regardless of UI. | F2-AC-03, F2-AC-05, F8-AC-03 |
| **STS-UI-04** | UI finance-cache boundary | Cache a financial query response under User A's authenticated identity, then request the same finance query for User B using the same QueryClient. | User B cannot read User A's cached financial response; the query still targets the same tRPC procedure and input. A browser-level account-switch journey remains separate evidence. | F7-AC-03, F8-AC-03 |

## 5. Acceptance-criteria to test traceability

Every contract AC appears below. The actual-result column distinguishes passing coverage from partial/missing cases and process-level evidence. Passing statuses include evidence from tested source commit `b99ed0924eee7ad46f1b3300120951eb8b70c1fa`; teammate review and merge/release evidence remain pending.

| Acceptance criterion | Planned test(s) | Actual test/result (latest tested source commit `b99ed09`, unless noted) |
| --- | --- | --- |
| F1-AC-01 | STS-AUTH-01, STS-AUTH-02, STS-UI-01 | Pass: PostgreSQL-backed HTTP tests sign in seeded User/Admin identities; sign-in component test validates credential submission and dashboard navigation. |
| F1-AC-02 | STS-AUTH-03, STS-UI-01, STS-INT-03 | Partial: invalid credentials fail without cookies and component tests show field/server errors; dedicated structured log-redaction assertions remain absent. |
| F1-AC-03 | STS-AUTH-01, STS-AUTH-05, STS-AUTH-10 | Pass: server-assigned role survives a client-supplied role field; API role guards reject wrong/unknown roles. |
| F1-AC-04 | STS-AUTH-04 | Pass: logout invalidates the session; subsequent identity resolution is null. |
| F1-AC-05 | STS-AUTH-06, STS-AUTH-09 | Pass: stored password is hashed; untrusted Origin is rejected; cookie HttpOnly/Secure/SameSite and configured expiry are asserted. |
| F1-AC-06 — disabled-user revocation | STS-AUTH-07, STS-AUTH-08, STS-AUTH-11 | Pass: disabled login issues no session; disabling an active User deletes sessions; the deterministic sign-in/disable race leaves no session row, and its cookie remains unauthenticated after re-enable. |
| F2-AC-01 | STS-AUTHZ-02 | Pass: finance API reads/writes operate within the session-derived owner scope. |
| F2-AC-02 | STS-AUTHZ-03, STS-AUTHZ-04, STS-AUTHZ-05, STS-INT-03 | Pass for exercised cases: direct foreign-account reads and cross-owner transaction references are denied without creating records for either User. |
| F2-AC-03 | STS-AUTHZ-07, STS-UI-03 | Partial: Admin API returns only identity/access fields and component UI has no financial values; no browser/route workflow test was run. |
| F2-AC-04 | STS-AUTHZ-01, STS-AUTHZ-06 | Pass: unauthenticated, User, Administrator, unknown-role, and disabled-session API paths are checked. |
| F2-AC-05 | STS-AUTHZ-08, STS-UI-03 | Partial: Admin finance reads/writes are denied at the API and Admin component excludes finance values; no browser route test was run. |
| F2-AC-06 — disabled-user revocation | STS-AUTH-07, STS-AUTH-08, STS-AUTHZ-09, STS-AUTH-11 | Pass: transactional disablement deletes stored sessions; the deterministic concurrent sign-in regression leaves no session; re-enable requires a new login and the stale cookie fails. |
| F3-AC-01 | STS-SEED-01 | Pass: PostgreSQL seed integration test creates synthetic Users, Admin, Cash/card, Income, and Expense accounts. |
| F3-AC-02 | STS-SEED-02 | Pass: seed integration test authenticates both synthetic User session contexts through the API and confirms each sees only their owned seeded Accounts. |
| F3-AC-03 | STS-SEED-03 | Pass: repeat seeding preserves a user-modified opening balance and unrelated synthetic transaction without duplication. |
| F3-AC-04 | STS-SEED-04, STS-INT-03 | Pass: synthetic-only fixture/auth data and hashed passwords were reviewed; a token/private-key pattern scan of changed project paths found no matches. |
| F3-AC-05 | STS-AUTHZ-07, STS-AUTHZ-08 | Pass for exercised cases: Admin response keys are restricted to identity/access fields and the finance API denies Admin calls. |
| F4-AC-01 | STS-OPEN-01 | Pass: Cash opening balance is persisted and returned from a database-backed account read. |
| F4-AC-02 | STS-OPEN-02 | Pass: opening-only Cash changes neither income/expense totals nor transaction count. |
| F4-AC-03 | STS-OPEN-03 | Pass for exercised cases: foreign-owned and non-Cash opening balances, Administrator finance writes, and baseline rewrites are rejected. |
| F4-AC-04 | STS-OPEN-04 | Pass for API/unit coverage: explicit date round-trips, invalid calendar dates fail, and a missing date is rejected by the API schema. |
| F4-AC-05 | STS-OPEN-05, STS-OPEN-06, STS-INT-02 | Pass for exercised inputs: exact minor units, two-digit formatting, non-positive and excess-precision rejection; ADR-0001 still needs teammate review. |
| F5-AC-01 | STS-RECEIVE-01, STS-RECEIVE-05 | Pass: salary receipt persists exact amount, updates Cash/Income, and UI submits the receive-money form. |
| F5-AC-02 | STS-RECEIVE-01, STS-RECEIVE-06 | Pass for restart-style verification: a newly constructed Elysia API handler and Prisma client re-read the full persisted journey over HTTP; no listener/dev server was started. |
| F5-AC-03 | STS-RECEIVE-02, STS-RECEIVE-03, STS-RECEIVE-05 | Pass for exercised cases: mismatched, zero, malformed/missing-date, excess-precision, and empty-allocation requests are rejected with unchanged transactions, allocations, balances, and summary. |
| F5-AC-04 | STS-RECEIVE-04, STS-AUTHZ-05 | Pass for exercised cases: foreign/wrong-type allocation targets and a non-Cash receive source are rejected without any ledger state change. |
| F5-AC-05 | STS-RECEIVE-01, STS-VIEW-02 | Pass: salary contributes to the all-time total even when dated 1999-01-01; the API applies no implicit reporting-period filter. |
| F6-AC-01 | STS-CARD-07, STS-CARD-01, STS-INT-02 | Pass: the required two-Expense split persists and a separate one-line card purchase succeeds; three 0.01 allocations sum exactly. |
| F6-AC-02 | STS-CARD-03 | Pass: Cash repayment reduces Cash and card debt and is excluded from income/expense totals. |
| F6-AC-03 | STS-CARD-01, STS-CARD-03, STS-CARD-05, STS-CARD-07 | Pass: journey writes and allocation lines persist; account balances, summary, and history are re-read from PostgreSQL. |
| F6-AC-04 | STS-CARD-02, STS-CARD-04, STS-CARD-06 | Pass for exercised cases: mismatch/precision/date/zero, empty allocations, wrong type/owner, overdraft, and over-repayment are rejected without ledger changes. |
| F6-AC-05 | STS-CARD-01, STS-CARD-03, STS-CARD-05, STS-VIEW-02 | Pass: complete opening/salary/split-purchase/repayment journey verifies exact Cash/card balances and eligible income/expense totals. |
| F7-AC-01 | STS-CARD-05, STS-VIEW-01, STS-UI-02 | Pass: PostgreSQL API journey verifies balances; UI component renders API-shaped 2,460.00 Cash and 60.00 card balance values. |
| F7-AC-02 | STS-CARD-05, STS-VIEW-02, STS-VIEW-03, STS-UI-02 | Pass: API totals are Income 1,500.00 and Expense 100.00 with dining/grocery category values; component tests render these API-shaped outputs. |
| F7-AC-03 | STS-OPEN-04, STS-VIEW-03, STS-VIEW-04, STS-UI-02, STS-UI-04 | Pass for exercised API behavior and cache boundary: history is owner-scoped and date-ordered with allocation lines; the same finance query's cached response is isolated by authenticated User. Browser-level account switching and route rendering remain unverified. |
| F7-AC-04 | STS-RECEIVE-06, STS-VIEW-05, STS-UI-02 | Pass for persistence/recreation seam: after closing the original DB client, a new Prisma client and Elysia HTTP app read back balances, summary, allocations, and history. UI route is verified by component test, not browser. |
| F7-AC-05 | STS-OPEN-04, STS-OPEN-05, STS-VIEW-02, STS-VIEW-06, STS-UI-02 | Pass for tested API/component behavior: a 1999 receipt contributes to all-time totals and the UI renders exact two-decimal values; ADR-0001 awaits teammate review. |
| F8-AC-01 | STS-OPEN-05, STS-RECEIVE-01, STS-CARD-01, STS-CARD-03, STS-CARD-05, STS-CARD-07, STS-VIEW-01, STS-INT-02 | Pass for exercised cases: exact BigInt minor-unit utilities, persisted journey arithmetic, and repeated 0.01 allocation summation are verified. |
| F8-AC-02 | STS-AUTHZ-04, STS-AUTHZ-05, STS-OPEN-03, STS-RECEIVE-02, STS-RECEIVE-03, STS-CARD-02, STS-CARD-04, STS-INT-01 | Pass for exercised financial-validation cases: transaction/allocation counts, balances, and summary are snapshotted and unchanged after invalid writes; ownership failures preserve both Users' transaction counts. |
| F8-AC-03 | STS-AUTHZ-01, STS-AUTHZ-02, STS-AUTHZ-03, STS-AUTHZ-04, STS-AUTHZ-05, STS-AUTHZ-06, STS-AUTHZ-07, STS-AUTHZ-08, STS-AUTHZ-09, STS-AUTH-11, STS-RECEIVE-04, STS-CARD-02, STS-CARD-04, STS-VIEW-04, STS-UI-03, STS-UI-04 | Pass for API role/ownership, disabled-session including the concurrent sign-in race, and query-cache isolation cases; browser route separation/account-switch flow remains unverified. |
| F8-AC-04 | STS-AUTH-06, STS-SEED-04, STS-INT-03 | Pass: synthetic fixture/auth data and hashed passwords were reviewed; no credential-token/private-key patterns were found in reviewed changed paths. |
| F8-AC-05 | This AC→STS table plus actual test/result/commit record in Issue #8 | Partial: results and tested implementation commit are recorded below; PR #23 is open and @MadMax168 was requested for review. Review/integration/release evidence remains pending. |
| F8-AC-06 | Reviewed PR/issue history and project-board/checklist state before Issue #8 implementation | Pending: PR #23 requests teammate review of ADR-0001/0002 and implementation; project board remains Started. |

## 6. Execution and reporting requirements

### Actual execution record — Issue #8 working tree

- Tested source commit: `b99ed0924eee7ad46f1b3300120951eb8b70c1fa` on branch `feature/working-sprint1`, based on the Issue #8 implementation and verification commits on `staging-1`. Application verification ran against this exact source tree before commit; this execution-record document changed afterward. The earlier implementation baseline was `45a935be1d35d31afa6a00a45cb2a6fbac08263f`.
- Database: isolated disposable PostgreSQL container `pockit-issue8-final-test-db`, database `pockit_issue8_test`, host port `55439`; all four checked-in migrations applied. `prisma migrate status` reported the database schema is up to date. The container is stopped after verification; it was created only for this test run and is not shared or personal.
- `DATABASE_URL='postgresql://pockit:pockit-test-only@127.0.0.1:55439/pockit_issue8_test?schema=public' bun run test` — **PASS: 49 tests** (API 20, server 13, web 14, PostgreSQL database 2). Prisma Client generation and every configured database test passed.
- `cd apps/web && bun test src/utils/user-scoped-query-key.test.ts` — **PASS: 1 test**. The regression was first run against the unscoped cache behavior and failed because User B could retrieve User A's cached response; it passed after scoping by authenticated User ID. The initial failure output is not retained as a separate artifact.
- `VITE_SERVER_URL='http://localhost:3000' DATABASE_URL='postgresql://pockit:pockit-test-only@127.0.0.1:55439/pockit_issue8_test?schema=public' bun run check-types` — **PASS: 6 Turbo tasks**; the web production client/SSR/Nitro build completed. Existing Rolldown module-level `"use client"` bundling warnings were non-fatal.
- `bunx biome check` on 35 changed TypeScript/TSX/JavaScript/JSON files at the implementation baseline — **PASS**, no diagnostics or automatic modifications. After the cache fix, targeted Biome checks on the four changed TypeScript/TSX source and test files also **PASS**; deleted paths were excluded.
- `git diff --check` — **PASS**; Git reported only expected line-ending normalization warnings on Windows.
- Migration/security review: Prisma reported all migrations applied; scan of changed tracked/untracked paths found no private-key, provider-token, or cloud-key patterns. Seed/test records and credentials are synthetic; passwords are hashed.
- No web/server `dev` process was started. Browser-level visual checks and full browser route journeys were not run; UI evidence is from component tests only.
- Remaining limitations: browser-run UI/route role separation was not verified because no dev server may be started; dedicated structured log-redaction assertions are absent. The persistence test reconstructs the HTTP app handler and DB client without opening a listener or launching an app process.
- The historical pre-implementation failing test run for each business rule was not captured in this record. Passing tests verify current behavior only and do not prove TDD-first chronology.
- PR [#23](https://github.com/ovenmakemeheat/Pockit/pull/23) is open from `feature/working-sprint1` to `staging-1`; @MadMax168 is the requested reviewer. The automated Codex review's P1 finding about cross-User finance-cache reuse was fixed in `b99ed09` and its regression passed. Issue #8 and the project board remain **Started**. Teammate review, reviewed merge to `staging-1`, and the separate release PR to `main` are still required.

### Actual execution record — PR #23 session-race follow-up

- Tested source commit: `9b613e864323640f68c96d6b23b942bf68b10c89` on `feature/working-sprint1`; this documentation update followed that source commit.
- Database: disposable PostgreSQL 17 container `pockit-pr23-auth-test-db`, database `pockit_issue8_test`, bound only to `127.0.0.1:55439`; the four checked-in migrations were applied with `bun run db:migrate:deploy`. The test container was stopped and removed after verification. The existing local Compose database and other containers were not touched.
- Test-first evidence: with the `session.create.after` guard temporarily removed, the targeted regression failed because one session row remained (`expected 0, received 1`). With the guard restored, the complete auth test file passed: `cd apps/server && DATABASE_URL='postgresql://pockit:pockit-test-only@127.0.0.1:55439/pockit_issue8_test?schema=public' bunx varlock run -- bun test src/auth.test.ts` — **PASS: 10 tests, 43 assertions**.
- `cd apps/server && bun run check-types` — **PASS**.
- `bunx biome check apps/server/src/auth.test.ts packages/auth/src/index.ts` — **PASS**, 2 files; `git diff --check` — **PASS**.
- No root/full suite or finance tests were rerun for this targeted auth review fix. No dev server was started.
- The sign-in/disable race is synchronized in the test by pausing the enabled-status query, committing the Administrator disable operation, then allowing sign-in to continue. It verifies that no session row survives and that the returned cookie cannot produce an identity after the User is re-enabled.

- **Primary regression command:** `bun run test` from repository root after the database is configured and Prisma generation/migrations are ready. It runs web/server/API tests and PostgreSQL-backed database tests. Do not claim it passed if a configured database test was skipped or unavailable.
- Run targeted package tests while developing the relevant seam, then the root suite and applicable type/build/lint checks before integration. Record exact commands, results, environment prerequisites, and tested commit in Issue #8/its PR.
- For every meaningful business-rule test, record the pre-implementation failing result and the post-implementation passing result. Run affected regression tests after fixes.
- Keep the test database disposable and separate from any personal/shared database. Never reset an unknown database. Use synthetic fixtures only.
- Report unresolved decision-dependent tests as **blocked** with the decision ID; do not count them as passed, silently omit them, or select a policy by changing test inputs.
- Contract documents were prepared under Issue #7; this execution evidence is maintained with Issue #8 and must be refreshed with the final tested commit and reviewed PR.`
