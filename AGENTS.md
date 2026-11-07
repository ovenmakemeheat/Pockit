# Pockit — Agent Instructions

## Project identity and source of truth

Pockit is the two-student CPE 334 group project for theme **7: Personal Money and Expense Logging System**. The current project brief is `docs/assignments/final/group_work_specs_v1.pdf`, section 6, theme 7. Follow any later instructor-issued or approved project documents if they refine this brief. Do not silently change scope or treat an assumption as an approved requirement; record open questions and decisions in the engineering documents.

The project is a persistent, full-stack product—not a static UI, generic CRUD demo, or browser-only store. Plan the complete product across three sprints before Sprint 1 implementation, while elaborating each feature contract just before that feature is built.

## Product scope and domain rules

The product lets multiple Users privately manage financial accounts, transactions, favorites, balances, and summaries. The five account types are:

- **Cash** — bank accounts and wallets.
- **Loan Given** — money owed to the User.
- **Loan Taken** — credit cards and other borrowed money.
- **Income** — income categories, such as salary or interest earned.
- **Expense** — spending categories, such as dining, groceries, electricity, or telecom.

Support the two transaction forms in the brief:

1. **Make a payment or record a charge:** select a Cash or Loan Taken account used, then allocate the amount across Expense accounts, repayment of Loan Taken, Loan Given, or a transfer to another Cash account.
2. **Receive money:** select the Cash account receiving it, then allocate the amount across Income, repayment of Loan Given, new borrowing into Loan Taken, or a transfer from another Cash account.

Each transaction has one or more allocation lines. The allocations must equal the transaction total, and all affected balances must update correctly. Opening balances, transfers, borrowing, and loan repayments must not be counted as income or expenses. Support transaction dates and account opening balances. Define currency precision, rounding, and balance-calculation behavior explicitly; do not use imprecise binary floating-point arithmetic for money.

Users can view account balances, outstanding loans and credit-card debt, income/expense summaries, category spending, transaction history, and favorite transactions. Users can mark an existing transaction as a favorite and duplicate it into a new editable transaction.

**Not required by the current brief; do not add without approval:** period or shared budgets, automatic recurring transactions, bank integration, and real payment or messaging integrations. Use synthetic data for demos and tests; never commit real personal/financial data, credentials, or secrets.

## Roles, authentication, and privacy

Sprint 1 must include real authentication and server-side authorization, not authentication alone:

- Provide login, logout, and current-user identity with a documented session/token lifecycle. Seeded demo accounts are sufficient; self-registration, password recovery, email verification, and advanced account administration are not required by the brief.
- **User** manages only their own accounts, transactions, favorites, and summaries.
- **Administrator** manages platform User accounts and access, including enabling/disabling Users, but must never view or modify their financial records or summaries.

Enforce these boundaries in backend/API operations as well as the UI. Test valid/invalid login, unauthenticated access, cross-User access, forbidden role operations, and Administrator attempts to access financial data. Hash passwords if the application manages them; never store plaintext passwords. Define the role/permission matrix in the design documents.

## Sprint 1 minimum vertical slice

The brief's example establishes a minimum workflow, not the complete Sprint 1 contract. Seed a few Users with a bank account, credit-card account, and Income/Expense categories. A User should be able to:

1. record an opening bank balance;
2. record salary received into the bank account;
3. record a credit-card purchase split across at least two Expense categories (e.g. dining and groceries);
4. record repayment of the credit card from the bank account; and
5. see the resulting bank balance, credit-card debt, income/expense summary, and transaction history.

The vertical slice must persist through the database and demonstrate meaningful business-rule rejection and access restrictions with tests. Keep it small, but do not replace domain behavior with mock-only persistence or a UI-only demonstration.

## Engineering contracts and evidence

Maintain the project artifacts required by the brief: a concise SRS with stable FR/BR/NFR identifiers, a feature inventory and requirement-to-feature-to-sprint traceability matrix, and a System-Level SDS covering architecture, data model, UI/API approach, roles, configuration, and planned deployment.

Before implementing each feature, prepare its bounded contract: Feature-Level SDS, applicable UI/API/data specifications, acceptance criteria with stable IDs, a Software Test Specification, dependencies, Definition of Done, and required evidence. Link each acceptance criterion to planned and actual tests. Include negative and boundary cases. For meaningful business-rule, defect, and change work, use TDD: demonstrate the intended test failing before implementing the behavior, then run it and the relevant regressions. Do not weaken a test to make incorrect behavior pass. Record actual commands, results, and tested commits; screenshots and agent statements alone are not test evidence.

**Pre-sprint setup exception:** Project Setup Issue #9 is repository/bootstrap work, not a Sprint 1 product feature, and does not require a formal Software Test Specification. Record actual setup/test commands, outcomes, and acceptance evidence in the issue and pull request.

For Project Deliverable 1, maintain evidence for a runnable release on `main`, its tag/commit, reproducible setup instructions, test commands/results, and a short reproducible demo sequence.

### Team participation and attribution

This is a two-student project:

| GitHub profile | Student | Student number |
| --- | --- | --- |
| [Polwarit Watthanahemmarat](https://github.com/MadMax168) | Polwarit Watthanahemmarat | 67070501067 |
| [Guntee Doungmanee](https://github.com/ovenmakemeheat) | Guntee Doungmanee | 67070501003 |

Both students must participate in requirements/design, testing, AI-agent supervision, implementation, review, deployment, and maintenance. Work may be split by issue or feature, but not into permanent roles such as “one writes docs, one codes.” Show participation and decisions through Issues, commits, PR authorship/reviews, and a short contribution table in delivery documentation. Pair work may name both students; equal commit counts are not required. Both students must be able to explain sampled requirements, tests, design decisions, and release steps.

## Git and delivery workflow

Use GitHub Issues and a project board. Link each Issue to the relevant requirement/feature and engineering contract; use native sub-issues for bounded work. Follow the course flow:

1. Create a feature/fix branch from the current sprint staging branch. Pre-sprint Project Setup Issue #9 is the exception: its issue branch starts from `main`.
2. Implement the bounded Issue, run tests, inspect the diff, and update documents.
3. Open a PR into sprint staging and obtain teammate review before merging. The review must state a specific check, question, finding, or reason for approval; authors do not approve their own PRs. User-authorized implementation PRs that bypass sprint staging and target `main` do not require teammate review. This exception does not apply to release PRs from `staging-N` to `main`, which always require teammate review.
4. Integrate accepted work and run sprint integration/system tests and acceptance checks.
5. Open a separately reviewed release PR from sprint staging to `main`; record/tag the accepted release.

Create exactly one work branch per Issue from its current sprint staging branch. Keep implementation, review fixes, and explicitly requested additional changes on that same issue branch and its active PR; do not create extra branches for subtasks or incremental changes. Project Setup Issue #9 is pre-sprint repository work: it is not assigned to Sprint 1, its direct-to-main implementation PR does not require teammate review, and `staging-1` is aligned with `main` as the clean Sprint 1 baseline. Keep the separate staging-to-main release review requirement. If a PR for an issue has already merged while its acceptance criteria remain open, continue on the same issue branch and open a follow-up PR from it rather than creating another branch. An unrelated change explicitly requested by the user may ride on the active issue branch/PR, but do not silently expand scope or mark unrelated criteria complete.

Record the intended branch and PR target in Issues. Do not merge a partial sub-issue PR as if it completed its parent. Preserve approved contract revisions and implementation history; surface scope changes and blockers rather than silently rewriting them.

### Issue and project-board hygiene

Keep GitHub Issues, their acceptance checklists, and the [Pockit project board](https://github.com/users/ovenmakemeheat/projects/5) synchronized throughout every work item. Update them immediately at each lifecycle transition: issue creation or scope change, branch creation, PR opening, review request or feedback, fix push, merge, blocker/unblock, and issue completion or closure. Link the relevant PR and keep the branch, base, and PR target information current. Maintain the board's `Sprint`, `Estimate (points)`, and `Status` fields; do not invent estimates or sprint dates when they have not been agreed.

Use the board's existing Status values to reflect actual progress: `Backlog` (not ready), `Specified` (bounded contract and acceptance criteria ready), `Started` (work underway), `PR Review` (PR awaiting teammate review), `Fixing` (review feedback being addressed), and `Done` (all issue acceptance criteria verified, work integrated, and issue complete). A merged partial PR does not make its issue Done: leave remaining criteria unchecked and the issue open, with a status matching the remaining work.

Manage issue checklists continuously. Check an acceptance criterion only after it is satisfied and supported by actual evidence; link stable criterion IDs to planned and actual tests where applicable, and record test commands, results, and tested commits. Keep unfinished criteria, blockers, and follow-ups visible; reopen a checked item if later evidence invalidates it. Before finishing an issue task, verify that the issue body, checklist, PR links, and project-board fields all match the current state.

CI becomes mandatory in Lab 5. Before then, run and record local checks against the submitted commit. Design for Docker and GCP deployment from the start, but the group brief schedules Docker, CI/CD, and GCP deployment for Lab 5; do not claim cloud deployment is a Sprint 1 prerequisite.

## Repository and tooling

This repository is a Bun 1.4.4 monorepo using TypeScript, React 19/TanStack Start, Elysia, tRPC, Better Auth, Prisma with PostgreSQL, Tailwind/shadcn UI, Biome, and Turborepo. Respect package boundaries: `apps/web`, `apps/server`, and shared `packages/{api,auth,db,ui,config}`. Prefer existing workspace patterns and dependencies over introducing another framework or duplicating shared behavior.

Useful root commands currently defined:

- `bun install` — install the workspace.
- `bun run dev` — start apps through Turbo.
- `bun run build` and `bun run check-types` — build and type-check workspaces.
- `bun run db:generate` — generate Prisma client; rerun after schema changes.
- `bun run db:migrate` — create/apply versioned development migrations; preserve migrations for reviewed schema changes. `db:push` is not a substitute for a versioned migration when one is required.
- `bun run env:generate` — regenerate Varlock environment accessors after schema changes.

- `bun run test` — generate Prisma Client and run the web, server, API, and PostgreSQL-backed suites. Start the disposable local database and apply migrations first; the database suite must fail rather than silently skip if PostgreSQL is unavailable.
- `bun run db:dev:up` / `bun run db:dev:down` — start or stop the local PostgreSQL Compose service. Do not stop unrelated database services or reset an unknown database.
- `bun run db:migrate:deploy` — apply checked-in migrations non-interactively; use `bun run db:migrate` for local development in a terminal.
- `bun run check` is read-only (`biome check .`). `bun run format` applies formatting and may modify files; inspect its diff before accepting changes. Keep secrets in ignored local environment files and update `.env.schema` / examples without committing secret values.

### User-run development servers

Do not launch or background application development servers for the user, including `bun run dev`, `bun run dev:web`, or `bun run dev:server`. Give the user the command and let them start it. Stop a development server only when the user explicitly asks. This restriction does not prohibit starting the documented local PostgreSQL service for verification; never stop an unrelated service.

## Agent skills

### Issue tracker

Pockit work is tracked in GitHub Issues in `ovenmakemeheat/Pockit`; use `gh`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context domain docs use root `GLOSSARY.md` and `docs/adr/`. See `docs/agents/domain.md`.
