# Software Requirements Specification: Pockit

**Project:** Personal Money and Expense Logging System (CPE 334, Theme 7)<br>
**Version:** 0.1 — Draft baseline for team review<br>
**Issue:** [#3 — Sprint 1: SRS and product scope](https://github.com/ovenmakemeheat/Pockit/issues/3)<br>
**Source of truth:** `docs/requirements/final/group_work_specs_v1.pdf`, section 6, item 7; plus the approved project constraints in `AGENTS.md`.

This SRS records the approved product scope and separates requirements from unresolved choices. Requirement identifiers are stable; do not renumber them when wording changes. Add new identifiers rather than reusing retired ones. Open questions below are not approved decisions and must be resolved in the relevant design/feature contract before implementation depends on them.

## 1. Purpose and product scope

Pockit is a persistent, full-stack personal-finance system for multiple Users. Each User privately manages financial Accounts, Transactions, favorites, balances, and summaries. Administrators manage platform User access, including enabling and disabling Users, but must not view or modify financial records or summaries.

The product supports Cash, Loan Given, Loan Taken, Income, and Expense Accounts; opening balances; dated Transactions with allocation lines; correct balance updates; history; summaries; favorites; and duplication of an existing Transaction into a new editable Transaction. The system must persist data in a database and enforce identity, ownership, and role restrictions on the server.

### 1.1 In scope

- Authentication, session lifecycle, and current-User identity.
- User-owned Account and Transaction data, with backend authorization.
- The two Transaction forms and permitted allocation types defined in BR-02 and BR-03.
- Opening balances, transaction dates, balances, loan/credit-card debt, income/expense summaries, category spending, and history.
- Favorite and duplicate behavior.
- Administrator User-access management without Administrator access to financial data.
- Synthetic demo/test data and reproducible verification.

### 1.2 Out of scope

Unless a later approved change expands the brief, Pockit will not provide period or shared budgets, automatic recurring Transactions, bank integration, real payment processing, or real messaging integrations. Self-registration, password recovery, email verification, and advanced User administration are not required. Use synthetic demo/test financial data; never commit real personal/financial data, credentials, or secrets.

## 2. Actors and responsibilities

| Actor | Responsibilities and permissions |
| --- | --- |
| **User** | Authenticates and manages only their own Accounts, Transactions, favorites, balances, and summaries. A User cannot access another User's financial records. |
| **Administrator** | Manages platform User accounts and access, including enabling/disabling Users. An Administrator cannot view, create, modify, or summarize any User's financial records. |
| **Unauthenticated visitor** | May use the login entry point only. All protected identity, User, and financial operations require authentication. |

Seeded demo Users are sufficient for the project; public self-registration is not required.

## 3. Functional requirements

“Must” denotes required product behavior. Sprint allocation is the current high-level allocation; Issues #4 and #6 own detailed feature-to-sprint mapping and sequencing. “Later sprint” means after the Sprint 1 vertical slice; its exact Sprint 2 versus Sprint 3 placement is intentionally not decided here.

| ID | Requirement | Priority / allocation |
| --- | --- | --- |
| **FR-01** | The system must authenticate a User and provide login, logout, and current-User identity with a documented session lifecycle. | Must; Sprint 1 |
| **FR-02** | The system must enforce authentication, role, and record ownership on backend/API operations. A User must access only their own financial data; an Administrator must not access financial records or summaries. | Must; Sprint 1 |
| **FR-03** | An Administrator must be able to manage platform User access, including enabling and disabling Users, without access to financial data. | Must; Sprint 1 |
| **FR-04** | A User must be able to create and manage Accounts of the five types in BR-01. | Must; later sprint; Sprint 1 may use seeded Accounts |
| **FR-05** | A User must be able to establish an Account opening balance and record a Transaction date. | Must; Sprint 1 includes an opening bank balance and dated Transactions; broader management later |
| **FR-06** | A User must be able to record a payment/charge using a Cash or Loan Taken Account and allocate its total across the permitted destinations in BR-02. | Must; Sprint 1 includes a split credit-card purchase; remaining cases later |
| **FR-07** | A User must be able to record money received into a Cash Account and allocate its total across the permitted destinations in BR-03. | Must; Sprint 1 includes salary received; remaining cases later |
| **FR-08** | Every Transaction must have one or more allocation lines, and allocation amounts must equal the Transaction total. The system must reject an invalid allocation without partially applying the Transaction or its balance effects. | Must; Sprint 1 |
| **FR-09** | The system must update all affected Account balances and category totals consistently with the operation; opening balances, transfers, borrowing, and loan repayments must not be classified as income or expenses. | Must; Sprint 1 |
| **FR-10** | A User must be able to view their Account balances, outstanding Loan Given/Loan Taken balances (including credit-card debt), income/expense summaries, category spending, and Transaction history. | Must; Sprint 1 includes bank balance, card debt, income/expense summary, category spending for the seeded categories, and history; broader summaries later |
| **FR-11** | A User must be able to mark an existing Transaction as a favorite and view favorite Transactions. | Must; later sprint |
| **FR-12** | A User must be able to duplicate an existing Transaction into a new editable Transaction; duplication must not alter the original. | Must; later sprint |
| **FR-13** | A User must be able to correct Transactions and search/filter Transaction history. | Must; later sprint; exact correction/audit behavior remains an open question |
| **FR-14** | The product must provide seeded synthetic demo data sufficient to demonstrate the Sprint 1 journey, including Users, a bank Account, a credit-card/Loan Taken Account, and Income/Expense categories. | Must; Sprint 1 |

## 4. Business rules

| ID | Rule |
| --- | --- |
| **BR-01** | The supported Account types are exactly **Cash**, **Loan Given**, **Loan Taken**, **Income**, and **Expense**. Cash includes bank accounts and wallets; Loan Given represents money owed to a User; Loan Taken includes credit cards and other borrowed money. Income and Expense Accounts categorize the corresponding activity. |
| **BR-02** | For a payment/charge Transaction, the User selects a Cash or Loan Taken Account used. Allocation lines may represent Expense, repayment of Loan Taken, money lent to another party (Loan Given), or a transfer to another Cash Account. |
| **BR-03** | For a receive-money Transaction, the User selects the receiving Cash Account. Allocation lines may represent Income, repayment of Loan Given, new borrowing into Loan Taken, or a transfer from another Cash Account. |
| **BR-04** | A Transaction has at least one allocation line. The exact sum of its allocation lines must equal its total; a mismatch is rejected. |
| **BR-05** | Opening balances establish the starting balance for an Account. Subsequent Transactions change every affected balance according to the operation. A transfer changes the source and destination Cash balances by equal and opposite amounts. |
| **BR-06** | Cash increases on receipt and decreases on payment. Loan Taken outstanding debt increases when borrowed or charged and decreases when repaid. Loan Given outstanding receivable increases when money is lent and decreases when repaid. Income and Expense category totals increase only for their corresponding allocations. Opening balances and transfers do not create income or expenses. |
| **BR-07** | Borrowing and Loan Taken repayments, and lending and Loan Given repayments, affect the corresponding debt/receivable balances but are not classified as income or expenses. |
| **BR-08** | A User may read or change only their own financial records. An Administrator may manage platform User access but has no permission to view or modify financial records or summaries. The backend must enforce this boundary regardless of UI behavior. |
| **BR-09** | Favorites refer to existing Transactions. Duplicating a Transaction creates a distinct new editable Transaction and does not mutate the source Transaction. |
| **BR-10** | Monetary calculations must use exact decimal or integer-minor-unit arithmetic, never imprecise binary floating-point arithmetic. Currency code, permitted precision, rounding mode, and treatment of unrepresentable amounts remain unresolved (see OQ-01 and OQ-02); the implementation must not silently assume them. |
| **BR-11** | Disabled Users must not gain access to protected operations. The exact effect on existing sessions and session revocation timing is unresolved (OQ-05). |

## 5. Non-functional requirements

| ID | Requirement and verification measure |
| --- | --- |
| **NFR-01 — Privacy and authorization** | Every protected financial API operation must enforce authenticated User ownership and Administrator restrictions server-side. Verification must include unauthenticated access, cross-User access, forbidden role operations, and Administrator attempts to access financial records/summaries. |
| **NFR-02 — Persistence** | Accepted Accounts, Transactions, allocations, and balance effects must persist in the database and remain available after an application restart. Verify with a database-backed test or reproducible restart scenario. |
| **NFR-03 — Financial integrity** | Transaction totals, allocations, and all balance effects must be committed or rejected together; a rejected operation must leave no partial Transaction or balance change. Verify with valid, invalid, and boundary cases. |
| **NFR-04 — Money precision** | Monetary storage and arithmetic must avoid binary floating-point error. Once OQ-01/OQ-02 are approved, tests must cover the smallest supported unit and rounding/precision boundaries. |
| **NFR-05 — Secret and demo-data safety** | Repository examples and tests use synthetic data. Real credentials, secrets, and personal/financial data must not be committed. Verify tracked examples/configuration and review changed files for sensitive data. |
| **NFR-06 — Verifiability** | Each implemented requirement must link to observable acceptance criteria and actual tests/evidence. Required authentication, authorization, persistence, and financial-invariant behavior must not be represented solely by UI mocks. |

## 6. Sprint allocation

### Sprint 1 — required minimum vertical slice

Sprint 1 must demonstrate real login/logout/current identity and backend authorization; seeded Users, a bank Account, a Loan Taken credit-card Account, and Income/Expense categories; an opening bank balance; salary received into the bank; a credit-card purchase allocated across at least two Expense categories; and repayment from the bank Account. The User must see the resulting bank balance, credit-card debt, income/expense summary, category spending for the seeded categories, and Transaction history. The workflow must persist through the database and include meaningful business-rule rejection and tests.

### Sprint 2 and Sprint 3 — remaining approved product scope

The remaining requirements include full Account management, the broader payment/receive-money allocation cases, Loan Given/Loan Taken flows, transfers, transaction correction, history search/filtering, favorites and duplication, expanded category-spending summaries, and reports. Their exact sprint assignment and sequencing are open until Issue #4 (feature traceability) and Issue #6 (three-sprint plan) are completed. This SRS does not silently allocate these features to one specific later sprint.

## 7. Assumptions and resolved constraints

1. The approved requirements baseline is Theme 7, section 6, item 7 of the group work specifications PDF, refined only by approved project instructions.
2. There are two product roles: User and Administrator. Administrator financial-data exclusion is absolute, including summaries.
3. The project has a persistent database-backed full-stack product; browser-only storage and mock-only domain behavior are insufficient.
4. Seeded demo accounts are sufficient for Sprint 1. Self-registration and account recovery are not required.
5. No real bank/payment/messaging integration, shared or period budgets, or automatic recurring Transactions are included without explicit approval.
6. The Sprint 1 example is the minimum vertical slice, not the entire product scope.
7. Exact currency and date policies are not approved by this SRS; see open questions. No implementation should infer them from locale or sample data.

## 8. Open questions — decisions not yet approved

| ID | Question | Must be resolved by |
| --- | --- | --- |
| **OQ-01** | What currency/currencies are supported, and what is the storage/display precision for each? | Before the financial data model and amount validation are finalized. |
| **OQ-02** | What rounding mode, if any, applies to calculations, and how are amounts with excess fractional digits rejected or rounded? | Before transaction calculation implementation; maintain exact arithmetic. |
| **OQ-03** | What is the canonical date/time-zone policy, and what is the default Transaction date? | Before transaction date and summary-period contracts. |
| **OQ-04** | What are the exact edit/delete/correction and audit-history rules for posted Transactions? | Before implementing Transaction correction. |
| **OQ-05** | When an Administrator disables a User, are existing sessions invalidated immediately, and how are those sessions revoked? | Before final authentication/administration contract approval. |
| **OQ-06** | What measurable performance, supported-browser, and accessibility targets are required for the course release? | Before release criteria are finalized. |
| **OQ-07** | Are there any account-specific minimum/maximum amount, zero-value, negative-value, or allocation-count constraints beyond allocation totals matching the Transaction total? | Before detailed transaction validation contracts. |

## 9. Requirements validation checklist

These checks validate the SRS content, not application behavior. Application tests will be specified in the feature contracts and Software Test Specification before implementation.

| Check ID | SRS acceptance criterion | Validation method |
| --- | --- | --- |
| **SRS-AC-01 / SRS-VAL-01** | Actors and responsibilities, including User and Administrator, are defined. | Review Section 2 against the approved brief and project constraints. |
| **SRS-AC-02 / SRS-VAL-02** | Functional, business, and important measurable non-functional requirements have stable identifiers. | Inspect FR/BR/NFR tables for unique, persistent identifiers and observable wording. |
| **SRS-AC-03 / SRS-VAL-03** | Scope, exclusions, assumptions, and resolved constraints are explicit. | Review Sections 1 and 7 against the brief; confirm excluded features are not included as requirements. |
| **SRS-AC-04 / SRS-VAL-04** | Account types and both transaction forms, allocation, and balance rules match the approved brief. | Cross-check BR-01 through BR-10 against Theme 7 text. |
| **SRS-AC-05 / SRS-VAL-05** | Sprint 1 is distinguished from later approved scope. | Cross-check Section 6 against the Sprint 1 example and “Later sprints” paragraphs. |
| **SRS-AC-06 / SRS-VAL-06** | Unresolved questions are recorded instead of presented as settled decisions. | Review Section 8 and confirm unresolved decisions are not contradicted elsewhere. |
