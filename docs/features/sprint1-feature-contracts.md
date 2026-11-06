# Sprint 1 Feature-Level Software Design Specifications

**Version:** 0.1 — draft for teammate review before implementation<br>
**Issue:** [#7 — Sprint 1: Engineering contracts](https://github.com/ovenmakemeheat/Pockit/issues/7)<br>
**Implementation parent:** [#8 — Sprint 1 implementation](https://github.com/ovenmakemeheat/Pockit/issues/8)<br>
**Sources:** [SRS](../requirements/srs.md), [Feature Inventory](../requirements/feature-inventory.md), [System-Level SDS](../architecture/system-level-sds.md), [Three-Sprint Plan](../planning/three-sprint-plan.md), and Theme 7 of the approved course brief.

> **Approval status:** This is a proposed contract, not approval to begin implementation. A teammate must review this issue/PR and record specific approval before Issue #8 starts. Open questions below remain open until the team/course confirms them. No acceptance criterion depending on an unresolved question is release-ready until that decision and the corresponding test expectation are recorded.

## 1. Scope and implementation boundary

This document defines the feature-level behavior, workflows, validation, errors, permissions, dependencies, UI/API/data expectations, acceptance criteria, Definition of Done, and evidence for **FEAT-01 through FEAT-08**. FEAT-08 is cross-cutting and applies to every Sprint 1 feature. It does not implement any feature.

The Sprint 1 product journey is limited to:

1. A seeded User authenticates and can retrieve their current identity.
2. A User records an opening balance for their seeded bank/Cash Account.
3. The User records salary received into that Cash Account with an Income allocation.
4. The User records a Loan Taken/credit-card purchase allocated across at least two Expense Accounts.
5. The User records repayment of that Loan Taken balance from the bank/Cash Account.
6. The User sees persisted balances, outstanding card debt, income/expense and category totals, and transaction history.
7. An Administrator can manage platform User access but cannot access any financial record or summary. Server-side role and ownership tests cover both allowed and denied operations.

Full CRUD for all five Account types, remaining allocation kinds, transfer workflows, favorites, duplication, correction, and report expansion are outside this Sprint 1 contract unless a separately reviewed scope change is approved. Project Setup #9 is a completed prerequisite, not product-feature work in this issue.

## 2. Shared design, interaction, and data rules

### 2.1 Actors and permission boundary

| Actor | Allowed in this contract | Not allowed |
| --- | --- | --- |
| Unauthenticated visitor | Submit login credentials. | Protected identity, User-management, or financial operations. |
| **User** | Read and mutate only their own Sprint 1 Accounts and Transactions; see only their own balances, summaries, categories, and history. | Another User's records or Administrator-only access management. |
| **Administrator** | Read the minimum platform identity/access fields needed to enable or disable Users. | Any financial Account, Transaction, allocation, favorite, balance, category total, summary, or financial history operation. |

Derive the acting identity from a server-validated session. Never use a client-provided owner ID as authorization. Apply role and owner checks to direct IDs, nested Account IDs, filters, lists, and summaries. A denial must not return protected record contents; choose and consistently document the API's non-disclosing forbidden/not-found response convention during implementation.

### 2.2 Common API and data contract

- Preserve the current package boundaries and stack: Better Auth for authentication/session handling; Elysia for HTTP composition; tRPC for typed application procedures; Prisma/PostgreSQL for persisted records; React/TanStack for the web UI.
- These are logical capabilities, not final procedure names or physical Prisma field names. Feature implementation may choose names within the existing package boundaries and must update this contract if that choice changes observable behavior.
- The authenticated application actor has a stable User identity, role (`User` or `Administrator`), and enabled status available to server authorization. Role/status cannot be trusted from browser input. Financial records have an owner. A financial Transaction has a form, total, explicit date, selected source/receiving Financial Account, and one or more allocation lines. Every referenced Account and Transaction must be verified against the acting User.
- Transport money as base-10 decimal strings; use exact decimal/integer arithmetic and exact persistence. Never use JavaScript binary floating-point for money, allocation equality, balances, summaries, or tests of money behavior.
- Invalid financial writes must be rejected as a whole. A failed create leaves no Transaction, allocation, or balance/summary effect. The API may return the repository's consistent validation/authorization error category; tests assert the observable rejection and unchanged state, not internal implementation details or a specific error message unless that message is part of a user-facing requirement.
- Persist accepted financial records in PostgreSQL. Browser state, a mock-only store, or a computed display value with no database backing is insufficient.
- Opening positions and Transaction effects must preserve the System-Level SDS natural-balance rules. Opening balances, transfers, borrowing, and loan repayments do not become Income or Expense.

### 2.3 Open decisions and implementation gates

| Decision | Contract treatment | Gate |
| --- | --- | --- |
| **OQ-01 — currency codes and scale** | Use exact decimal values and decimal-string transport, but do not select or hard-code a currency or fractional scale. | Team/course confirmation is required before schema precision, input-scale validation, display formatting, or boundary fixtures depend on a value. |
| **OQ-02 — excess precision and rounding** | No floating-point approximation. The System-Level SDS labels excess-precision rejection and no-rounding as proposals, not approved policy. | Team/course confirmation is required before the application rejects/rounds an amount for a particular scale or rounds derived results. |
| **OQ-03 — date/time-zone and summary period** | A Transaction date must be explicitly represented in the input and persisted; the candidate `YYYY-MM-DD` civil-date representation, default-date behavior, timezone conversion, and summary-period/default-range behavior are proposals only. | Confirm date representation and summary scope before date-dependent UI/API behavior is treated as accepted. Do not invent a current-date default or silently apply local/UTC conversion. |
| **OQ-05 — disabled User with an existing session** | Disabled Users must not gain protected access. Login/status enforcement is server-side. | The exact timing and mechanism for invalidating an already-active session is unresolved. Confirm it before final auth/admin acceptance; do not silently claim immediate revocation or allow access contrary to the approved decision. |
| **OQ-06 — quality targets** | Follow the existing NFRs and verify the required functional/security behaviors. | Performance, supported-browser, and accessibility thresholds remain open; do not invent release targets in this contract. |
| **OQ-07 — amount constraints** | Validate allocation structure, Account type, owner, and exact total equality. | Zero/negative values, amount bounds, overpayment/overdraft, and allocation-count limits remain unapproved. Use valid in-range synthetic fixtures; do not add extra rejection rules until confirmed. |

## 3. Feature contracts

### FEAT-01 — Authentication and session lifecycle

**Outcome and actors:** A seeded User or Administrator can sign in, obtain a server-validated session, retrieve their own current identity, and sign out. Self-registration, password recovery, and email verification are not Sprint 1 requirements.

**Workflow:** The actor submits credentials through the existing Better Auth flow; the server validates them and establishes a protected session. A subsequent identity/protected request resolves the session server-side. Sign-out invalidates the session, after which the same session cannot access protected procedures.

**UI/API/data contract:** Keep the existing login UI and Better Auth endpoints/client. The session cookie remains server-managed, HttpOnly, Secure in deployed environments, and restricted to trusted origins as configured. The current Better Auth database adapter persists identity/session data in PostgreSQL. The application must document the actual session expiry/renewal and cookie lifecycle after its configuration is chosen. When application-managed passwords are stored, persist only password hashes. Do not add public sign-up.

**Validation and errors:** Missing/invalid credentials do not create an authenticated session. Missing, invalid, logged-out, or expired sessions cannot invoke protected operations. Do not disclose secrets or raw password values in UI feedback or logs. Disabled-user existing-session behavior is subject to OQ-05.

**Permissions:** Login is public; identity and protected operations require an active, valid session. The returned identity must be the session's actor, not a caller-selected User.

**Dependencies/gates:** Project Setup #9; Better Auth/Prisma persistence; FEAT-02 consumes the session. OQ-05 and the configured session lifetime must be documented before final acceptance.

**Acceptance criteria:**

- **F1-AC-01:** Correct synthetic credentials for each seeded role establish a session that the server accepts on a subsequent request.
- **F1-AC-02:** Invalid credentials establish no authenticated session and return a user-safe failure.
- **F1-AC-03:** Current identity returns only the identity associated with the validated session; changing client-supplied identity data cannot impersonate another User.
- **F1-AC-04:** Logout makes the session unusable for a subsequent protected request.
- **F1-AC-05:** Session lifecycle, cookie/trusted-origin protections, and credential hashing are documented and verified without committing credentials or exposing secret values.
- **F1-AC-06:** Disabled-user authentication and already-active-session behavior match a recorded OQ-05 decision; this criterion remains gated until that decision is approved.

**Definition of Done / evidence:** Link F1 criteria to STS-AUTH tests; test the HTTP/auth/session boundary with synthetic identities and PostgreSQL; include the approved lifecycle decision, exact commands/results, and tested commit in the issue/PR. No plaintext password is stored; no real credentials or personal data appear in tracked files.

### FEAT-02 — Server-side role and ownership controls

**Outcome and actors:** A User works only with their own data. An Administrator can enable/disable platform Users but is categorically excluded from financial data. This boundary holds when callers bypass the UI.

**Workflow:** The server resolves session identity, role, and enabled status; an application operation authorizes its role and scopes every financial read/write to the acting User. An Administrator invokes only User access-management operations. Any request crossing the boundary is denied without disclosing protected records or applying a mutation.

**UI/API/data contract:** UI route guards and hidden navigation are usability only. Apply checks in tRPC/application operations and include the owner constraint in financial lookups/mutations. User-management responses expose only the platform identity/access fields needed for administration; they must not join or serialize finance records. Generic lookups and summary procedures are also in the denial boundary.

**Validation and errors:** Unauthenticated protected calls are rejected; a User calling an Administrator operation is rejected; an Administrator calling any finance operation is rejected; foreign IDs/references/filters reveal no financial contents and do not mutate data. Disabled-user timing remains gated by OQ-05.

**Permissions:** Exactly the matrix in §2.1. Administrator is not a financial User merely because the session is authenticated.

**Dependencies/gates:** FEAT-01; current API `protectedProcedure` only checks session presence and is not sufficient. OQ-05 gates the existing-session behavior after disabling a User.

**Acceptance criteria:**

- **F2-AC-01:** A User can access their own authorized Sprint 1 financial operations, while every financial operation derives ownership from the session.
- **F2-AC-02:** Attempts to read or mutate another User's Account, Transaction, allocation, balance, summary, or history are denied without exposing record data or changing either User's state.
- **F2-AC-03:** An Administrator can perform the approved platform User enable/disable operations and receives no financial fields or aggregates in those responses.
- **F2-AC-04:** User and unauthenticated actors cannot invoke Administrator access-management operations.
- **F2-AC-05:** Administrator requests to financial APIs, including direct record lookup, list/filter, balance, category, summary, and history surfaces, are denied with no financial response.
- **F2-AC-06:** Disablement blocks protected access according to the approved OQ-05 policy, including its stated effect on pre-existing sessions; remains gated until recorded.

**Definition of Done / evidence:** Link every permission case to STS-AUTHZ tests at the API seam; include positive User/admin-access tests and negative role/ownership tests. UI screenshots alone are not authorization evidence. Record review and checked commit.

### FEAT-03 — Synthetic Sprint 1 demo data

**Outcome and actors:** The team can reproducibly demonstrate the required journey using synthetic identities and records, without real personal or financial data.

**Workflow:** A controlled seed operation prepares synthetic User and Administrator identities plus the required bank/Cash account, credit-card/Loan Taken account, an Income category, and at least two Expense categories. Tests create or reset only isolated synthetic fixtures. Seed credentials are injected/generated for the local demonstration/test environment and are never stored as plaintext passwords or committed as reusable secrets.

**UI/API/data contract:** Seeded identities use the same authentication/role path as ordinary identities. Seeded Financial Accounts and categories belong to a specific User. Seed data supports, but does not fake, the live database-backed user journey. Seeding is additive/idempotent by stable synthetic identity so reruns do not duplicate demo records or reset unrelated/user-created financial data.

**Validation and errors:** The seed operation must fail visibly when its required database/configuration is unavailable; it must not silently skip, seed real data, or overwrite unrelated data. Synthetic fixture amounts must not establish an unapproved currency scale or rounding policy.

**Permissions:** Seeded User data is owner-scoped. The seeded Administrator receives access-management capability only, never financial access.

**Dependencies/gates:** Project Setup #9; FEAT-01/02; OQ-01/OQ-02 gate monetary seed values if those values depend on currency scale.

**Acceptance criteria:**

- **F3-AC-01:** A fresh prepared demo database contains the synthetic roles and required Cash, Loan Taken, Income, and at least two Expense records needed for the Sprint 1 journey.
- **F3-AC-02:** Seeded financial records have explicit owners and are isolated between synthetic Users.
- **F3-AC-03:** Re-running the seed does not duplicate demo fixtures or reset unrelated/user-created data.
- **F3-AC-04:** Seed/demo/test data contains no real personal/financial data, plaintext stored passwords, committed reusable credentials, or secrets.
- **F3-AC-05:** The seeded Administrator can manage access but cannot read or receive financial data.

**Definition of Done / evidence:** Link criteria to STS-SEED and DB tests; record the seed command, environment prerequisites, clean/repeat-run results, and reviewed diff. Include a reproducible demo sequence using synthetic identities without publishing reusable secrets.

### FEAT-04 — Opening balance and explicit Transaction date foundation

**Outcome and actors:** A User records the initial bank/Cash position and supplies dates for Sprint 1 Transactions, so that subsequent balances are based on a persistent starting point and dated activity.

**Workflow:** Before posting the vertical-slice Transactions, the User records an opening balance on their seeded bank/Cash Account. The balance is persisted as the Account's opening position, not as Income. When recording each Transaction, the User supplies an explicit date; no implicit local/UTC date or current-date default is assumed until OQ-03 is approved.

**UI/API/data contract:** The logical data model associates an exact opening amount with the owned Financial Account and stores an explicit Transaction date with each Transaction. Candidate API representation for the date is an ISO calendar-date string (`YYYY-MM-DD`), with no timezone conversion; this is a proposal subject to OQ-03 confirmation. The opening balance is a baseline for later ledger effects. Initial balance entry is available for the seeded Cash account; changing the baseline after postings is not part of this Sprint 1 workflow and would require a reviewed correction/audit decision.

**Validation and errors:** Reject foreign-owned Accounts, non-Cash targets for the Sprint 1 opening-balance operation, absent/invalid date input under the approved date policy, and malformed monetary strings. Exact currency scale, allowed zero/negative values, and reopening/edit semantics are not assumed; OQ-01/02/03/07 gates apply.

**Permissions:** Only the owner User may record/read the opening position; Administrator is denied by FEAT-02.

**Dependencies/gates:** FEAT-01–FEAT-03; OQ-01/OQ-02 before precision policy; OQ-03 before date representation/default/summary semantics; OQ-07 before amount boundary rules.

**Acceptance criteria:**

- **F4-AC-01:** The owner can record an exact opening balance on their seeded Cash Account, and a subsequent read returns the persisted value.
- **F4-AC-02:** The opening balance establishes the Cash starting position without creating Income/Expense activity.
- **F4-AC-03:** A foreign-owned, Administrator-owned, or non-Cash Account cannot be used for this User opening-balance action; rejected attempts leave state unchanged.
- **F4-AC-04:** A Sprint 1 Transaction requires an explicit date and the accepted date round-trips unchanged according to the approved OQ-03 representation; the chosen representation/default/timezone behavior must be recorded before implementation acceptance.
- **F4-AC-05:** Monetary transport/storage is exact; configured scale, precision boundary, and any rounding behavior follow approved OQ-01/OQ-02 decisions, not an undocumented assumption.

**Definition of Done / evidence:** Link criteria to STS-OPEN tests and database persistence checks. Record the accepted opening-balance representation and the team-approved date/money decisions. If a required decision remains unresolved, keep the dependent criterion explicitly gated rather than claiming full acceptance.

### FEAT-05 — Salary receipt into Cash

**Outcome and actors:** A User records salary received by the bank/Cash Account as Income, with a persisted amount and correct balance/category effects.

**Workflow:** The User selects the receiving Cash Account, enters the exact Transaction total and the candidate explicit date, and allocates the total to an Income Account. Confirm date input/default behavior under OQ-03 before implementation. The operation is accepted as one persisted Transaction plus its allocation. Sprint 1 does not implement the other receive-money allocation forms.

**UI/API/data contract:** The form identifies the receive-money operation, receiving Cash Account, date, total, and one or more Income allocation lines. The initial vertical slice uses a salary Income category and one allocation line. API requests contain no authoritative owner ID; the actor comes from the session. The response/history reflects persisted data.

**Validation and errors:** Require a User-owned Cash receiver, at least one allowed Income allocation, exact equality between allocations and total, valid explicit date, and accepted exact-money representation. Reject unsupported allocation types, cross-owner references, missing lines, and mismatched totals without creating partial records. OQ-01/02/03/07 remain gates for currency/date/value policy.

**Permissions:** User role and ownership only. Administrator and unauthenticated callers are denied.

**Dependencies/gates:** FEAT-01–FEAT-04. OQ-01/OQ-02/OQ-03/OQ-07 must be resolved for any behavior depending on their values.

**Acceptance criteria:**

- **F5-AC-01:** A valid salary receipt increases the selected Cash balance by the exact Transaction total and increases the selected Income category total by the exact allocation amount.
- **F5-AC-02:** Salary is persisted as a dated Transaction with its allocation and remains visible after a database-backed reload/restart check.
- **F5-AC-03:** The allocation total must exactly equal the Transaction total; a mismatch or no allocation is rejected with no partial Transaction, allocation, balance, or summary effect.
- **F5-AC-04:** A wrong-type, foreign-owned, or otherwise unauthorized receiving/allocation Account is rejected without exposing or changing another User's data.
- **F5-AC-05:** The salary receipt is classified as Income only; its Cash effect is not counted again as another Income or Expense.

**Definition of Done / evidence:** Link criteria to STS-RECEIVE and DB tests; demonstrate one valid salary receipt and meaningful invalid allocation rejection through the persisted API seam. Record tested commit and exact commands/results.

### FEAT-06 — Credit-card purchase and bank repayment

**Outcome and actors:** A User can record a valid Loan Taken/credit-card purchase with one or more Expense allocation lines, then repay the card from Cash, with exact and consistent balances. The Sprint 1 demonstration specifically includes a purchase split across at least two Expense categories.

**Workflow:** The SRS requires a payment/charge Transaction to contain one or more allocation lines; for this Sprint 1 card-purchase flow, the User selects their Loan Taken/credit-card Account and allocates the purchase total across one or more owned Expense Accounts. The required demonstration uses at least two Expense Accounts (e.g. dining and groceries). A single Expense allocation equal to the total is also valid. Other payment/charge destination types remain outside this Sprint 1 feature. For repayment, the User selects their Cash/bank Account and allocates the repayment to that same Loan Taken Account as a repayment. Both are separately dated, persisted Transactions; the candidate date input/default behavior remains subject to OQ-03 approval. The Sprint 1 scope does not add transfers, borrowing into other accounts, Loan Given behavior, or remaining transaction forms.

**UI/API/data contract:** Use the approved payment/charge form and an explicit date. A card purchase using Loan Taken increases that card's outstanding debt by the total; each Expense category increases by its allocation. A repayment selected from Cash decreases bank balance by the total and decreases the Loan Taken debt by the repayment amount. Repayment does not create Income or Expense. Values cross the API as exact decimal strings.

**Validation and errors:** Require an owned Loan Taken source and one or more owned Expense allocation lines for a Sprint 1 card purchase; allocation amounts must exactly equal the total. The two-Expense-line minimum applies only to the required split demonstration, not to general allocation validity. Require an owned Cash source and owned Loan Taken repayment target for the repayment. Reject mismatched totals, no/invalid allocations, wrong types, foreign-owner references, and other unauthorized writes atomically. Whether a repayment may exceed current debt, whether cash may be overdrawn, and zero/negative/boundary amounts are not specified; do not invent those rules (OQ-07).

**Permissions:** User role and ownership only. Administrator and unauthenticated callers are denied.

**Dependencies/gates:** FEAT-01–FEAT-05; OQ-01/OQ-02/OQ-03/OQ-07 gate dependent amount/date behavior.

**Acceptance criteria:**

- **F6-AC-01:** A valid Sprint 1 credit-card purchase with one or more Expense allocation lines increases card debt by the exact total and each Expense category by its line amount. The demonstration also proves a purchase split across at least two Expense Accounts.
- **F6-AC-02:** A valid repayment decreases the selected Cash balance and Loan Taken debt by the exact repayment amount and creates no Income/Expense allocation effect.
- **F6-AC-03:** The purchase and repayment Transactions and all allocation lines persist and appear in owner-scoped history.
- **F6-AC-04:** Purchase/repayment allocation mismatch, missing lines, invalid target type, or foreign-owned reference is rejected with no partial record or balance/category effect.
- **F6-AC-05:** The full salary → split purchase → repayment journey preserves exact arithmetic and does not classify borrowing/repayment as Income or Expense.

**Definition of Done / evidence:** Link criteria to STS-CARD and database atomicity tests. Evidence includes before/after balances and category totals from persisted reads, not a mocked UI; all rejected cases prove unchanged persistent state.

### FEAT-07 — Persisted balances, summary, category spending, and history

**Outcome and actors:** A User can see the results of the required journey from persisted records: Cash balance, credit-card/Loan Taken debt, Income/Expense summary, seeded-category spending, and Transaction history.

**Workflow:** The authenticated User opens the dashboard/financial views. The app queries the database using the session-derived owner. Reads reflect the accepted opening balance and committed Transactions/allocation lines; after a successful write or application restart, the same source records produce the same results.

**UI/API/data contract:** The User view includes bank/Cash balance, outstanding card debt, Income and Expense totals, category totals, and dated transaction history. For a clean synthetic fixture, expected values follow: `Cash = opening balance + received Cash - Cash payments/repayments`; `Loan Taken debt = posted card charges/borrowing - repayments`; Income and Expense totals are sums only of their matching allocation lines. Opening balance, borrowing/charge principal and repayments are not double-counted as Income/Expense. These formulas state classification/effects, not an unapproved scale or currency.

**Validation and errors:** Missing/invalid sessions are denied; all reads are owner-scoped. A User cannot pass a different owner to broaden a query. An Administrator cannot retrieve any financial read. Date-filter/default-period behavior is not implemented until OQ-03 is confirmed; no period budget, reporting feature, or invented default range is added.

**Permissions:** Only the authenticated owner User; Administrator and other Users are denied.

**Dependencies/gates:** FEAT-01–FEAT-06; OQ-03 for any date-dependent filtering/default summary scope; OQ-01/OQ-02 for displayed precision/rounding decisions.

**Acceptance criteria:**

- **F7-AC-01:** A User sees bank balance and card debt that match the persisted opening position and committed payment/receipt/charge/repayment effects.
- **F7-AC-02:** Income/Expense summaries and per-category spending match their eligible persisted allocation lines; opening balances, transfers, borrowing, and loan repayment are excluded from income/expense totals.
- **F7-AC-03:** Transaction history shows the User's persisted Sprint 1 records and allocations with their accepted dates, and excludes another User's records.
- **F7-AC-04:** Results remain correct after a new server/database-backed read and the required restart/persistence scenario; browser-only or mock-only values do not satisfy acceptance.
- **F7-AC-05:** Any date scope/default period or display rounding follows a recorded OQ-01/OQ-02/OQ-03 approval; no unapproved period/rounding behavior is shipped.

**Definition of Done / evidence:** Link criteria to STS-VIEW tests, API/database assertions, and at least one end-to-end or reproducible demo flow. Capture exact query inputs, synthetic fixture, command/results, and tested commit. A screenshot supplements but does not replace persistence/security tests.

### FEAT-08 — Cross-cutting integrity, security, and evidence

**Outcome and actors:** Every Sprint 1 feature consistently meets privacy, persistence, financial-integrity, exact-money, secret-safety, and verification obligations in the SRS.

**Workflow:** Each feature PR links its stable AC IDs to the STS and actual tests. Business-rule work follows TDD: demonstrate the intended test failing before implementing behavior, then run that test and relevant regressions. Each issue branch is based on current `staging-1`; its work-item PR targets `staging-1` and receives a specific teammate review before integration. The author does not approve or merge their own work-item PR. Keep the project board and issue checklist synchronized.

**UI/API/data contract:** Backend authorization and transaction persistence are authoritative. Monetary JSON values are decimal strings with exact server/database operations. Each accepted Transaction and all allocations commit together, or none do. Test and demo data is synthetic; local secrets remain ignored and are not put in source, logs, screenshots, or committed artifacts.

**Validation and errors:** Every protected API/UI view is covered for allowed and denied roles. Financial invalid cases assert both rejection and unchanged persistent state. Do not weaken tests to accept incorrect arithmetic or access. Record unresolved decision failures as blocked, never as passing.

**Permissions/dependencies:** Applies to FEAT-01–FEAT-07 and every later sprint. Depends on the complete SRS, Feature Inventory, System-Level SDS, this reviewed contract, and the STS below.

**Acceptance criteria:**

- **F8-AC-01:** No binary floating-point arithmetic is used for monetary transport, allocation equality, balance effects, persistence, or summaries.
- **F8-AC-02:** Every financial mutation is atomic across Transaction, allocation lines, and derived balance/category effects; rejected operations leave persistent state unchanged.
- **F8-AC-03:** Authentication, role, and ownership tests execute at backend/API or HTTP boundaries; UI-only hiding/mocks are insufficient evidence.
- **F8-AC-04:** Synthetic data and secret handling satisfy NFR-05/NFR-07; the reviewed diff and tracked files contain no real financial records, credentials, or secrets.
- **F8-AC-05:** Every feature AC has one or more linked STS IDs; actual results and tested commits are recorded; TDD failing-test evidence exists for meaningful business-rule work.
- **F8-AC-06:** The teammate review/approval of this contract occurs before Issue #8 feature implementation begins; both students participate in requirements/design, testing, AI-agent supervision, implementation, review, integration, deployment, and maintenance, with bounded task splits rather than permanent documentation/coding roles; project board, checklist, and PR target/status remain accurate.

**Definition of Done / evidence:** Keep an AC→STS→actual-test/result→commit mapping for all features. Record commands, pass/fail counts, environmental prerequisites, skipped/gated tests, teammate review, and the merge commit. Do not claim cloud deployment as a Sprint 1 prerequisite; Lab 5 owns the planned Docker/CI/GCP delivery work.

## 4. Feature-to-requirement traceability

| Feature | Supporting SRS baseline | Acceptance criteria |
| --- | --- | --- |
| FEAT-01 | FR-01, FR-02; BR-11; NFR-07 | F1-AC-01–06 |
| FEAT-02 | FR-02, FR-03; BR-08, BR-11; NFR-01, NFR-07 | F2-AC-01–06 |
| FEAT-03 | FR-14; BR-01; NFR-02, NFR-05 | F3-AC-01–05 |
| FEAT-04 | FR-05; BR-05, BR-06, BR-10; NFR-02, NFR-04, NFR-05 | F4-AC-01–05 |
| FEAT-05 | FR-07–FR-09; BR-03, BR-04, BR-06, BR-07, BR-10; NFR-02–NFR-04 | F5-AC-01–05 |
| FEAT-06 | FR-06, FR-08, FR-09; BR-02, BR-04, BR-06, BR-07, BR-10; NFR-02–NFR-04 | F6-AC-01–05 |
| FEAT-07 | FR-09, FR-10; BR-05–BR-07; NFR-02, NFR-06 | F7-AC-01–05 |
| FEAT-08 | FR-02; BR-04, BR-08, BR-10, BR-11; NFR-01–NFR-07 | F8-AC-01–06 |

**Required sequence:** FEAT-01/02 → FEAT-03 → FEAT-04 → FEAT-05/06 → FEAT-07. FEAT-08 applies continuously. Issue #8 must not begin product-feature implementation until the teammate has reviewed/approved this contract, the STS, and any OQ decisions that the selected implementation requires.
