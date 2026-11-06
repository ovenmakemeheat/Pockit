# Feature Inventory and Requirement Traceability

**Project:** Pockit — Personal Money and Expense Logging System (CPE 334, Theme 7)<br>
**Version:** 0.1 — Sprint 1 baseline; later-sprint allocation is proposed pending Issue #6<br>
**Issue:** [#4 — Sprint 1: Feature inventory and traceability](https://github.com/ovenmakemeheat/Pockit/issues/4)<br>
**SRS:** [Software Requirements Specification](srs.md)<br>
**Approved brief:** `docs/assignments/final/group_work_specs_v1.pdf`, section 6, item 7; Sprint 1 scope also follows Issue #8.

This inventory maps every stable FR, BR, and NFR in the current SRS to one or more planned features and maps each feature back to its supporting requirements. Sprint 1 allocations follow the approved vertical slice. Sprint 2 and Sprint 3 assignments are **proposals** for the three-sprint plan in Issue #6 to review; they are not settled commitments until that plan is accepted. Do not silently change SRS requirements or open decisions to make an allocation appear final.

## 1. Feature inventory

| Feature ID | Feature / user outcome | Planned sprint | Dependencies / gates | Supporting requirements |
| --- | --- | --- | --- | --- |
| **FEAT-01** | **Authentication and session lifecycle:** Users can log in, log out, and retrieve current identity using the documented session lifecycle. | Sprint 1 — required | Project Setup #9 is complete. Disabled-user revocation follows ADR-0002 and is implemented/tested under Issue #8. | FR-01, FR-02; BR-11; NFR-07 |
| **FEAT-02** | **Server-side role and ownership controls:** Users access only their own financial data; Administrators manage platform access without accessing any financial record or summary. | Sprint 1 — required | FEAT-01. Administrator finance-data denial is tested at the backend/API boundary. | FR-02, FR-03; BR-08, BR-11; NFR-01, NFR-07 |
| **FEAT-03** | **Synthetic Sprint 1 demo data:** Seed demo Users, a bank/Cash Account, a credit-card/Loan Taken Account, and Income/Expense categories. | Sprint 1 — required | Project Setup #9; use synthetic data only. | FR-14; BR-01; NFR-02, NFR-05 |
| **FEAT-04** | **Opening balance and transaction date foundation:** Establish the opening bank balance and record dates for the Sprint 1 Transactions. | Sprint 1 — required | FEAT-03; currency/date open questions must remain visible and must not be guessed. | FR-05; BR-05, BR-06, BR-10; NFR-02, NFR-04, NFR-05 |
| **FEAT-05** | **Receive-money vertical slice:** Record salary into the bank/Cash Account with an Income allocation and the required balance effects. | Sprint 1 — required | FEAT-01–FEAT-04. | FR-07–FR-09; BR-03, BR-04, BR-06, BR-07, BR-10; NFR-02–NFR-04 |
| **FEAT-06** | **Payment/charge vertical slice:** Record a credit-card purchase split across at least two Expense categories and record repayment from the bank Account. | Sprint 1 — required | FEAT-01–FEAT-05; allocation and balance effects must be atomic. | FR-06, FR-08, FR-09; BR-02, BR-04, BR-06, BR-07, BR-10; NFR-02–NFR-04 |
| **FEAT-07** | **Sprint 1 balances and views:** Show the resulting bank balance, outstanding card debt, income/expense summary, category spending for seeded categories, and Transaction history. | Sprint 1 — required | FEAT-04–FEAT-06; values must come from persisted domain data. | FR-09, FR-10; BR-05–BR-07; NFR-02, NFR-06 |
| **FEAT-08** | **Cross-cutting quality and evidence:** Apply server authorization, persistence, atomic financial integrity, exact money handling, synthetic-data/secret safety, credential protection, and requirement-linked verification across all features. | Sprints 1–3 — continuous | Applies to every feature; detailed acceptance tests belong in each Feature-Level SDS/STS. | FR-02; BR-04, BR-08, BR-10, BR-11; NFR-01–NFR-07 |
| **FEAT-09** | **Full Account lifecycle:** Users create and manage all five Account types beyond the seeded Sprint 1 setup. | Sprint 2 — proposed | FEAT-01, FEAT-02, FEAT-03; confirm permitted Account operations in Issue #6/feature contracts. | FR-04; BR-01, BR-05; NFR-02, NFR-05 |
| **FEAT-10** | **Expanded money movement:** Support the remaining approved payment/charge and receive-money allocations, including Loan Given/Loan Taken activity and Cash transfers. | Sprint 2 — proposed | FEAT-09; OQ-01, OQ-02, and OQ-07 must be resolved before final amount validation. | FR-06–FR-09; BR-02–BR-07, BR-10; NFR-02–NFR-04 |
| **FEAT-11** | **Transaction history search and filtering:** Find and filter a User's persisted Transaction history. | Sprint 2 — proposed | FEAT-07; preserve User ownership restrictions. | FR-10, FR-13; BR-08; NFR-01, NFR-02, NFR-06 |
| **FEAT-12** | **Posted Transaction correction:** Correct a Transaction while preserving consistent balances and required history/audit behavior. | Sprint 2 — proposed; gated | FEAT-05, FEAT-06, FEAT-10; OQ-04 must be resolved before the correction contract is approved. | FR-13; BR-04, BR-08, BR-10; NFR-01, NFR-02, NFR-03, NFR-06 |
| **FEAT-13** | **Favorites and duplication:** Mark/view favorite Transactions and duplicate an existing Transaction into a separate editable Transaction. | Sprint 3 — proposed | FEAT-07; duplication must not modify the original. | FR-11, FR-12; BR-09; NFR-02, NFR-06 |
| **FEAT-14** | **Expanded category analysis and reports:** Extend beyond the Sprint 1 seeded-category spending view to the approved later-sprint summaries/reporting scope. | Sprint 3 — proposed; details open | FEAT-07, FEAT-10; report types, periods, and filters need clarification before a feature contract. | FR-09, FR-10; BR-06, BR-07; NFR-02, NFR-06 |

## 2. Requirement-to-feature-to-sprint matrix

Each row is one stable requirement in the SRS. A requirement may map to multiple features when it applies to a Sprint 1 minimum slice and a later expansion, or when it is a cross-cutting quality rule. Such repeated mappings are intentional, not duplicate requirements.

| Requirement ID | Supporting feature(s) | Sprint coverage | Traceability note |
| --- | --- | --- | --- |
| **FR-01** | FEAT-01 | Sprint 1 | Login, logout, current identity, documented sessions. |
| **FR-02** | FEAT-01, FEAT-02, FEAT-08 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Authentication plus server-side ownership/role enforcement and cross-cutting verification. |
| **FR-03** | FEAT-02 | Sprint 1 | Administrator access management, separated from financial data. |
| **FR-04** | FEAT-09 | Sprint 2 proposed | Full create/manage operations; Sprint 1 uses seeded Accounts. |
| **FR-05** | FEAT-04 | Sprint 1 | Opening bank balance and dated Transactions. |
| **FR-06** | FEAT-06, FEAT-10 | Sprint 1, Sprint 2 proposed | Split card purchase/repayment first; remaining outgoing allocations later. |
| **FR-07** | FEAT-05, FEAT-10 | Sprint 1, Sprint 2 proposed | Salary receipt first; remaining receive-money allocations later. |
| **FR-08** | FEAT-05, FEAT-06, FEAT-10 | Sprint 1, Sprint 2 proposed | At least one allocation and exact total equality for every form. |
| **FR-09** | FEAT-05, FEAT-06, FEAT-07, FEAT-10, FEAT-14 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Correct effects for the vertical slice, later operations, and expanded summaries. |
| **FR-10** | FEAT-07, FEAT-11, FEAT-14 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Core balances, summaries, seeded-category spending, and history first; search/report expansion later. |
| **FR-11** | FEAT-13 | Sprint 3 proposed | Favorite existing Transactions and view favorites. |
| **FR-12** | FEAT-13 | Sprint 3 proposed | Create a new editable duplicate without mutating the original. |
| **FR-13** | FEAT-11, FEAT-12 | Sprint 2 proposed | Search/filter and correction are separate features; correction is gated by OQ-04. |
| **FR-14** | FEAT-03 | Sprint 1 | Synthetic seed data required for the vertical slice. |
| **BR-01** | FEAT-03, FEAT-09 | Sprint 1, Sprint 2 proposed | Seeded types first; full Account lifecycle later. |
| **BR-02** | FEAT-06, FEAT-10 | Sprint 1, Sprint 2 proposed | Payment/charge source and allocation destinations. |
| **BR-03** | FEAT-05, FEAT-10 | Sprint 1, Sprint 2 proposed | Receive-money destination and allocation destinations. |
| **BR-04** | FEAT-05, FEAT-06, FEAT-08, FEAT-10, FEAT-12 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Allocation total invariant and atomic rejection, including corrections. |
| **BR-05** | FEAT-04, FEAT-07, FEAT-09, FEAT-10 | Sprint 1, Sprint 2 proposed | Opening baseline first; broader account/transfer effects later. |
| **BR-06** | FEAT-04, FEAT-05, FEAT-06, FEAT-07, FEAT-10, FEAT-14 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Opening-position, balance/category semantics across setup, transactions, and reporting. |
| **BR-07** | FEAT-05, FEAT-06, FEAT-07, FEAT-10, FEAT-14 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Non-income/expense treatment for borrowing and loan activity. |
| **BR-08** | FEAT-02, FEAT-08, FEAT-11, FEAT-12 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Ownership boundary applies to platform access, search, and correction. |
| **BR-09** | FEAT-13 | Sprint 3 proposed | Favorites reference existing transactions; duplicate is distinct/editable. |
| **BR-10** | FEAT-04, FEAT-05, FEAT-06, FEAT-08, FEAT-10, FEAT-12 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Exact arithmetic throughout; OQ-01/OQ-02 remain gates. |
| **BR-11** | FEAT-01, FEAT-02, FEAT-08 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Disabled Users cannot create sessions or access protected operations; disabling revokes stored sessions immediately (ADR-0002). |
| **NFR-01** | FEAT-02, FEAT-08, FEAT-11, FEAT-12 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Server-side privacy/access tests across all relevant operations, including Transaction correction. |
| **NFR-02** | FEAT-03, FEAT-04, FEAT-05, FEAT-06, FEAT-07, FEAT-08, FEAT-09, FEAT-10, FEAT-11, FEAT-12, FEAT-13, FEAT-14 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Seeded data and accepted financial records persist across all product features. |
| **NFR-03** | FEAT-05, FEAT-06, FEAT-08, FEAT-10, FEAT-12 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Transaction and balance effects must commit or reject together. |
| **NFR-04** | FEAT-04, FEAT-05, FEAT-06, FEAT-08, FEAT-10 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Exact amount representation; test precision boundaries after OQ-01/OQ-02. |
| **NFR-05** | FEAT-03, FEAT-04, FEAT-08, FEAT-09 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Synthetic demo data and secret-safe configuration. |
| **NFR-06** | FEAT-07, FEAT-08, FEAT-11, FEAT-12, FEAT-13, FEAT-14 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Cross-cutting requirement-to-acceptance/test evidence on every feature. |
| **NFR-07** | FEAT-01, FEAT-02, FEAT-08 | Sprint 1, Sprint 2 proposed, Sprint 3 proposed | Credential storage and authentication configuration. |

## 3. Coverage audit, gaps, and allocation decisions

### Coverage result

- The current SRS contains **14 FRs, 11 BRs, and 7 NFRs**: 32 stable requirements in total. Every ID appears in the traceability matrix and maps to at least one feature.
- All 14 feature rows have at least one supporting SRS requirement and a sprint allocation. FEAT-08 is intentionally continuous across Sprints 1–3.
- Repeated requirement-to-feature links are deliberate crosscutting or phased coverage, not duplicate IDs. The SRS remains the sole owner of requirement wording and identifiers.
- Sprint 1 is anchored to the approved vertical slice and Issue #8, including category spending for seeded categories. Sprint 2/3 placements are proposals for Issue #6 to confirm; no sprint dates or capacity estimates are invented.

### Recorded gaps and follow-ups

| Gap / question | Current treatment | Follow-up |
| --- | --- | --- |
| The Theme 7 “Later sprints” paragraph mentions reports, but the SRS has no separate report-specific FR defining report content, periods, or filters. | FEAT-14 provisionally maps the reporting outcome to FR-10's summaries/category spending. Do not invent report formats or period rules. | Issue #6 should decide whether FR-10 is sufficient or the SRS needs a stable additional FR before report contracts are written. |
| Exact Sprint 2 versus Sprint 3 assignment is not approved. | The inventory proposes S2/S3 placements to give every feature a planned sprint, explicitly marked proposed. | Issue #6 ratifies or revises the allocations based on dependencies and team capacity. |
| Currency code/precision and rounding rules (OQ-01/OQ-02) are resolved for Sprint 1 in ADR-0001. | FEAT-04–FEAT-06 and FEAT-10 use the exact Sprint 1 policy; no later currency or rounding behavior is implied. | Apply the Issue #8 policy; future extensions need separate decisions. |
| Transaction correction and audit behavior (OQ-04) is unspecified. | FEAT-12 is proposed for Sprint 2 but explicitly gated; no correction semantics are invented. | Resolve before FEAT-12's Feature-Level SDS/STS. |
| Date/time-zone policy, workload/accessibility targets, and future amount boundary rules remain open (OQ-03, OQ-06–OQ-07). Disabled-user session revocation is resolved by ADR-0002. | Mapped to the relevant identity, date, and financial-validation features without treating an assumption as approved. | Resolve remaining questions in Issue #7 feature contracts or before release as applicable. |

## 4. Inventory validation

These are documentation checks; they do not test application behavior. Application acceptance tests are specified before implementation in each feature contract and the Sprint Test Specification.

| Check ID | Validation | Result |
| --- | --- | --- |
| **INV-VAL-01** | Compare feature-table and matrix mappings in both directions; confirm every SRS FR, BR, and NFR appears exactly once in the matrix. | **PASS:** all 32 SRS requirement IDs have matrix rows, and every feature-to-requirement link matches the reverse matrix link. |
| **INV-VAL-02** | Confirm each feature has a planned sprint and supporting SRS IDs, and each matrix coverage label equals the union of its mapped features' planned sprints. | **PASS:** all 14 features have a sprint and requirements; all 32 matrix coverage labels match their mapped feature sprints, including FEAT-08's continuous coverage. |
| **INV-VAL-03** | Cross-check five account types, transaction allocation forms, Sprint 1 slice, and later scope against the approved Theme 7 brief and Issue #8. | **PASS:** manual cross-check against Theme 7 and Issue #8; the report-detail gap is explicitly recorded. |
| **INV-VAL-04** | Review duplicate mappings, gaps, and provisional S2/S3 allocations; confirm every unresolved decision has an owner/follow-up. | **PASS:** repeated mappings are intentional; report detail and proposed S2/S3 allocations have explicit follow-ups. |
| **INV-VAL-05** | Check terminology and stable identifiers against the SRS. | **PASS:** matrix IDs and domain terms match the SRS; no duplicate requirement or feature identifiers. |
