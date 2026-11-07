# Three-Sprint Product Plan — Pockit

**Version:** 0.1 — proposed for teammate and course review
**Issue:** [#6 — Sprint 1: Three-sprint plan](https://github.com/ovenmakemeheat/Pockit/issues/6)
**Parent:** [#2 — Sprint 1: Baseline and working increment](https://github.com/ovenmakemeheat/Pockit/issues/2)
**Requirements:** [SRS](../requirements/srs.md)
**Feature traceability:** [Feature inventory](../requirements/feature-inventory.md)
**System design:** [System-Level SDS](../architecture/system-level-sds.md)
**Course sources:** `docs/assignments/final/group_work_specs_v1.pdf`, Theme 7 and schedule; `docs/assignments/final/project_final_delivery_v1.pdf`

This plan proposes a sequence and milestone strategy for delivering the approved product over three sprints. Sprint 1 scope follows the brief and Issue #8. Sprint 2/3 allocations follow the proposed feature assignments in the feature inventory; they become the team's plan only after teammate review and any required course confirmation. This plan does not change SRS requirements or resolve its open questions.

## 1. Planning guardrails

- The approved Group Work Specifications and SRS define product scope. Do not silently add budgets, automatic recurring transactions, bank integration, real payment/messaging integrations, or other excluded features.
- Issue #9 (Project Setup) is pre-sprint repository work and is complete. Issues #3–#5 are integrated into `staging-1`; Issue #7's feature contracts must be reviewed before the product implementation in Issue #8 begins.
- Sprint 1 is a database-backed, authenticated and authorized vertical slice, not a UI mock or a promise to complete every account/transaction workflow.
- Sprint 2/3 work remains subject to the gates below. Currency/date/correction/reporting questions remain open until decided by the team/course and captured in the relevant contract or SRS revision.
- Both students participate in requirements/design, testing, AI-agent supervision, implementation, review, integration, deployment and maintenance. Split bounded tasks as useful; do not assign permanent documentation-versus-coding roles.

## 2. Sprint goals and proposed scope

| Sprint | Goal and exit outcome | Feature allocation | Course checkpoint |
| --- | --- | --- | --- |
| **Sprint 1 — required baseline** | Release a small, persistent product journey: a User records an opening bank balance, receives salary, splits a credit-card purchase across Expense categories, repays the card, and sees correct balances/history/summaries. Authentication, backend authorization, meaningful rejection, and tests are part of the journey. | FEAT-01–FEAT-07; FEAT-08 applies continuously. | Project Deliverable 1: **15 November 2026**. Sprint 1 deployment/repeatable delivery for Lab 5: **22 November 2026**. |
| **Sprint 2 — complete core account and money movement** | Expand from seeded accounts and the minimum journey to the remaining approved account lifecycle, transaction allocation, and history operations. Preserve exact arithmetic, owner isolation, and atomic persistence. | FEAT-09–FEAT-12; FEAT-08 applies continuously. FEAT-12 is gated by OQ-04. | Contribute to a substantially complete product and Project Deliverable 2 by **29 November 2026**. |
| **Sprint 3 — complete remaining user outcomes and acceptance** | Deliver private favorites and editable duplication, complete only the report/category-analysis scope approved by the team/course, and finish whole-product regression, UAT, and release readiness. | FEAT-13–FEAT-14; FEAT-08 applies continuously. FEAT-14's report detail is gated by scope clarification. | Product substantially complete by **29 November 2026**; final fixes, verification and submission preparation lead to Final Delivery on **13 December 2026**. |

The course schedule supplies assessment deadlines, but does not prescribe formal sprint start/end dates. Treat the dates above as finish-by checkpoints, not as an instructor-approved sprint calendar. At sprint planning, the two students should set the actual timebox against their exam/workshop availability and record it in the sprint issue/board.

### Feature-to-requirement allocation

Feature IDs and supporting requirement IDs below follow the feature inventory. FEAT-08 is cross-cutting and applies during all three sprints; it is not work that can be postponed to Sprint 3.

| Feature | Planned sprint | Supporting baseline | Dependency, decision gate, or completion note |
| --- | --- | --- | --- |
| **FEAT-01** Authentication and session lifecycle | Sprint 1 | FR-01, FR-02; BR-11; NFR-07 | Implement login, logout, identity, and a documented session lifecycle using seeded demo Users. Implement immediate disabled-user session revocation per ADR-0002. |
| **FEAT-02** Server-side role and ownership controls | Sprint 1 | FR-02, FR-03; BR-08, BR-11; NFR-01, NFR-07 | Depends on FEAT-01. Let the Administrator manage platform User access (including enabling/disabling Users) while backend operations deny all financial records and summaries. |
| **FEAT-03** Synthetic Sprint 1 demo data | Sprint 1 | FR-14; BR-01; NFR-02, NFR-05 | Seed only synthetic Users, bank/Cash and credit-card/Loan Taken Accounts, and Income/Expense categories. |
| **FEAT-04** Opening balance and transaction date foundation | Sprint 1 | FR-05; BR-05, BR-06, BR-10; NFR-02, NFR-04, NFR-05 | Depends on FEAT-03. Keep date and money open questions visible; do not infer currency or date policy. |
| **FEAT-05** Receive-money vertical slice | Sprint 1 | FR-07–FR-09; BR-03, BR-04, BR-06, BR-07, BR-10; NFR-02–NFR-04 | Depends on FEAT-01–FEAT-04. Demonstrate salary allocated to Income and correct persisted balance effects. |
| **FEAT-06** Payment/charge vertical slice | Sprint 1 | FR-06, FR-08, FR-09; BR-02, BR-04, BR-06, BR-07, BR-10; NFR-02–NFR-04 | Depends on FEAT-01–FEAT-05. Demonstrate split credit-card purchase and bank-funded repayment with atomic allocation validation. |
| **FEAT-07** Sprint 1 balances and views | Sprint 1 | FR-09, FR-10; BR-05–BR-07; NFR-02, NFR-06 | Depends on FEAT-04–FEAT-06. Read results from persisted records, not mock-only/browser-only state. |
| **FEAT-08** Cross-cutting quality and evidence | Sprints 1–3 | FR-02; BR-04, BR-08, BR-10, BR-11; NFR-01–NFR-07 | Continuous across every feature: exact money, authorization, persistence, atomicity, synthetic data, secrets, stable acceptance/test IDs, and evidence. |
| **FEAT-09** Full Account lifecycle | Sprint 2 | FR-04; BR-01, BR-05; NFR-02, NFR-05 | Depends on the User/ownership foundation and seeded model. Support create/manage operations for all five Account types and broader opening-balance management. |
| **FEAT-10** Expanded money movement | Sprint 2 | FR-06–FR-09; BR-02–BR-07, BR-10; NFR-02–NFR-04 | Depends on FEAT-09 and the Sprint 1 transaction foundation. Resolve OQ-01, OQ-02, and OQ-07 before amount validation depends on their values. |
| **FEAT-11** Transaction history search/filter | Sprint 2 | FR-10, FR-13; BR-08; NFR-01, NFR-02, NFR-06 | Depends on persisted history and owner-scoped queries. Define date/period behavior only after resolving relevant OQ-03 contract decisions. |
| **FEAT-12** Posted Transaction correction | Sprint 2 — gated | FR-13; BR-04, BR-08, BR-10; NFR-01–NFR-03, NFR-06 | Depends on FEAT-05, FEAT-06, and FEAT-10. **Do not implement correction until OQ-04 (edit/delete/correction and audit history) is resolved and approved in its feature contract.** If unresolved at Sprint 2 planning, record an explicit reallocation/approved scope decision; do not invent correction semantics. |
| **FEAT-13** Favorites and duplication | Sprint 3 | FR-11, FR-12; BR-09; NFR-02, NFR-06 | Depends on persisted, owner-scoped Transactions. Prove a duplicate is a distinct editable Transaction and does not mutate its source. |
| **FEAT-14** Expanded category analysis and reports | Sprint 3 — gated | FR-09, FR-10; BR-06, BR-07; NFR-02, NFR-06 | Depends on FEAT-07 and the expanded data from FEAT-10. Theme 7 mentions reports but the SRS has no report-specific FR; confirm whether FR-10 is sufficient or an approved SRS change is needed before defining report behavior. Do not invent periods or filters. |

## 3. Dependency and sequencing plan

1. **Governance and contracts:** finish/review Issues #3–#6, then approve the bounded feature contracts and Software Test Specifications in Issue #7 before implementing the Sprint 1 journey in Issue #8. Project Setup #9 is already complete and is not a Sprint 1 product feature.
2. **Sprint 1 domain sequence:** authenticate (FEAT-01) → enforce server role/ownership restrictions (FEAT-02) → seed synthetic data (FEAT-03) → establish the opening balance/date foundation (FEAT-04) → salary receipt and split-card-purchase/repayment flows (FEAT-05/06) → persisted balances, summaries, category spending, and history (FEAT-07). Validate the complete journey and its rejection cases through the database-backed API seam.
3. **Sprint 2:** build full Account lifecycle (FEAT-09) before expanding the permitted payment/receive-money allocations and transfer/loan effects (FEAT-10). Add history search/filter (FEAT-11) against the persisted owner-scoped records. Start FEAT-12 only after OQ-04 has an approved decision and its correction/audit contract; otherwise record the blocker and seek an explicit plan change.
4. **Sprint 3:** build favorites and duplication (FEAT-13) on persisted history. Define FEAT-14 only after report scope is confirmed against FR-10 or an approved SRS revision. Run end-to-end regression/UAT against the complete approved feature set.
5. **Cross-cutting:** apply FEAT-08's authorization, exact-money, persistence, atomicity, secrets, test/evidence, and review requirements in every sprint. Later work must not weaken or bypass the Sprint 1 privacy/domain rules.

## 4. Course timing and capacity

### Milestone map

| Date/window (2026) | Course milestone | Planning response |
| --- | --- | --- |
| **12–25 October** | Project launch, scope, workflow, engineering baseline | Use approved Issues and requirements; Project Setup #9 completed before Sprint 1 work. |
| **26 October–1 November** | Examination period | Plan work around student exam commitments; do not use this window as assumed full team capacity. |
| **3 and 5 November** | Midterm break/workshop: SRS, system SDS, Sprint 1 contract, tests, integration | Complete the baseline design/roadmap and prepare the Sprint 1 contract/test work. |
| **15 November, 23:59** | Project Deliverable 1: baseline plus working Sprint 1 | Treat the database-backed minimum vertical slice and its evidence as a fixed acceptance checkpoint. |
| **22 November, 23:59** | Lab 5: deployed Sprint 1 and repeatable delivery; Lab 6 due | Reserve deployment, integration, UAT/defect handling, and evidence time; Docker/GCP work is due here, not a Sprint 1 cloud prerequisite. |
| **29 November, 23:59** | Project Deliverable 2 and Lab 7 due; product should be substantially complete | Finish substantial feature work and keep actual requirements/test/review evidence current. |
| **1–11 December** | Final examination period | Avoid scheduling new feature scope here; reserve this period primarily for examinations and only essential, bounded fixes/verification. |
| **13 December, 23:59** | Final product, report, and demo video | Submit the accepted release, complete traceability/QA evidence, reproducible handoff, and demo. |

The group work schedule does not state a per-sprint engineering capacity or historical velocity. The two-person team must check actual availability at each sprint planning, including exams, labs, and review/integration time. Board point values correspond to assessment rubric weights and **must not** be treated as story points or throughput. Do not invent person-hours or a velocity. If the approved scope cannot fit the remaining calendar, reprioritize only through a recorded team decision and any required instructor/TA approval; never silently drop a baseline requirement. Both students remain involved across the engineering lifecycle.

## 5. Verification and release gates

| Sprint | Required verification before calling the increment accepted |
| --- | --- |
| **Sprint 1** | Complete Issue #8's opening balance → salary → split card purchase → repayment journey. Use real persistence. Verify valid/invalid login, unauthenticated access, cross-User access, forbidden role operations, Administrator access management (including enabling/disabling Users) and finance-data denial, exact allocation equality, meaningful invalid-transaction rejection with no partial effects, correct balances/summaries/history, and synthetic seed data. Link every acceptance ID to actual test IDs/results. |
| **Sprint 2** | Database/API tests for all five Account types and allowed operations; both transaction forms and remaining allocations; equal/opposite Cash transfers; loan balances not misclassified as Income/Expense; exact arithmetic and atomic rejection; owner-scoped search/filter; and correction only if OQ-04 is approved. Include negative, boundary, and cross-User cases. |
| **Sprint 3** | Verify favorite ownership, duplicate independence/editability, approved reporting/category outcomes, and full regression of previous sprints. Complete teammate-reviewed UAT/re-tests, deployment/restart persistence checks, defect status, and final release evidence. |

Before implementation, each feature contract must supply stable acceptance/test IDs, negative and boundary cases, dependencies, Definition of Done, and required evidence. Use TDD for meaningful business-rule, defect, and change work; preserve the intended failing-test evidence and test the accepted commit. A UI-only demonstration, agent statement, or screenshot is not evidence of backend authorization or database persistence.

Use one issue branch per Issue, based on its current `staging-N` branch. Work-item PRs target that staging branch and require a specific teammate review before integration; the author does not approve or merge their own work-item PR. A release is a separate, teammate-reviewed PR from `staging-N` to `main`. Create `staging-2` and `staging-3` from the then-current `main` at the start of their respective sprint cycles, as recorded in parent Issue #1. Keep Issues, checklists, PR links, and board Status synchronized at each lifecycle transition.

## 6. Risks, open decisions, and scope protection

| Risk/open decision | Planned handling |
| --- | --- |
| Two-person capacity around exams is unknown. | Confirm real availability at sprint planning; protect contract, test, review, integration, UAT, and release time; replan explicitly if the milestone is at risk. |
| OQ-01/OQ-02 currency and rounding policy remain open. | Keep exact arithmetic; do not select a currency/scale or treat proposed precision/rounding rules as approved. Resolve before implementation requires those decisions. |
| OQ-03 date/time-zone and reporting-period behavior remain open. | Do not invent period boundaries or date semantics; settle them in relevant contracts before date-dependent behavior. |
| OQ-04 correction and audit history are unspecified. | Gate FEAT-12; no correction implementation before the approved decision and feature contract. |
| OQ-06 measurable performance, browser, and accessibility targets are open. | Set observable targets and include the relevant checks in release acceptance before claiming final readiness. |
| Reports are mentioned in the brief without report-specific SRS requirements. | Keep FEAT-14 provisional; confirm FR-10 coverage or approve an SRS change before report contracts are written. |
| Feature inventory labels Sprint 2/3 placements proposed. | This plan proposes to ratify the same FEAT-09–FEAT-14 allocation. The allocations remain proposals until this plan is teammate-reviewed and accepted; update traceability through a reviewed change if the team revises them. |

## 7. Plan validation

| Check ID | Acceptance evidence | Result |
| --- | --- | --- |
| **PLAN-VAL-01** | Every feature FEAT-01–FEAT-14 is allocated to Sprint 1, 2, or 3 (with FEAT-08 explicitly continuous), with supporting SRS IDs linked to the feature inventory. | **PASS:** automated check confirmed all 14 sprint assignments and expanded FR/BR/NFR mappings match the feature inventory. |
| **PLAN-VAL-02** | Dependencies and OQ gates identify the required sequence; gated work is not silently treated as approved or complete. | **PASS:** manual review of Sections 3 and 6 against the SRS/SDS confirms OQ-01/02/03/04/05/06/07 gates and required sequencing. |
| **PLAN-VAL-03** | Sprint 1 preserves the minimum authenticated, authorized, persistent journey and meaningful business-rule rejection/test evidence from the brief and Issue #8. | **PASS:** cross-checked against Theme 7 and Issue #8; includes authentication, server authorization, persistence, rejection, and tests. |
| **PLAN-VAL-04** | All remaining approved later-sprint scope is assigned or its requirements gap/gate is explicitly recorded; no feature is silently dropped. | **PASS:** all 14 features are allocated; correction and report-scope gates remain explicit. |
| **PLAN-VAL-05** | Course dates, examination constraints, two-student participation, and unknown capacity are considered without inventing sprint dates, hours, or velocity. | **PASS:** course PDF milestones/exam windows cross-checked; team capacity is recorded as two students with no invented velocity or sprint dates. |
| **PLAN-VAL-06** | Goals and allocations agree with the SRS and System-Level SDS; proposed later-sprint assignments agree with the feature inventory. | **PASS:** manual cross-check against SRS, SDS, and inventory; all feature allocations and supporting IDs match. |
