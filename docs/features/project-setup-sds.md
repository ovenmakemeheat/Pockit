# Feature-Level SDS: Project Setup (Pre-sprint Foundation)

**Issue:** [#9 — Project Setup](https://github.com/ovenmakemeheat/Pockit/issues/9)
**Branch:** `feature/project-setup` from `main`; PR #11 targets `main`
**Status:** Repository/bootstrap foundation for the project; not part of Sprint 1. The issue remains open until its acceptance criteria are verified.

## Problem and outcome

The repository needs a clean, repeatable path to configure, start, and verify the existing web app, API server, and PostgreSQL database before Sprint 1 begins. The README previously recommended schema push instead of the versioned migration workflow, and the workspace lacked root-level test commands and baseline tests. This issue establishes the engineering foundation only; it does not implement a financial product workflow.

## Scope

- Document prerequisites and clean-checkout install, environment setup, database startup, Prisma generation/migrations, development startup, and verification commands.
- Provide safe example environment files and a local-only PostgreSQL development service. Examples contain synthetic local values, never real data or credentials.
- Establish Bun test commands for web UI, server/API behavior, and PostgreSQL-backed database checks; expose a root test command.
- Separate server app construction from the listen side effect so HTTP behavior can be tested in-process.
- Keep generated client and migration artifacts reproducible and version controlled where appropriate.
- Make the root check read-only and provide an explicit formatting command.
- Record actual commands, outcomes, and tested commits in Issue #9 and PR #11. This repository/bootstrap issue does not require a formal Software Test Specification.

## Acceptance criteria and evidence

| ID | Acceptance criterion | Evidence location |
|---|---|---|
| PS-AC-01 | Issue #9 is a project-level pre-sprint prerequisite, not a Sprint 1 work item, and is completed before Sprint 1 work is unblocked. | Issue hierarchy and project board. |
| PS-AC-02 | A clean checkout has reproducible install and local startup steps for web, server, and database. | README and actual setup evidence in Issue #9 / PR #11. |
| PS-AC-03 | Environment configuration is explained through schemas and safe examples, with no secrets or real financial data committed. | Tracked examples/schema and repository diff. |
| PS-AC-04 | Prisma generation and the versioned migration workflow are documented and verified against disposable local PostgreSQL. | Issue #9 / PR #11 verification record. |
| PS-AC-05 | Reproducible root and package commands cover web UI, server/API, and database-backed tests. | Test command results in Issue #9 / PR #11. |
| PS-AC-06 | Build, type-check, formatting/lint, and database setup commands are documented with their actual outcomes. | Exact commands, results, and tested commits in Issue #9 / PR #11. |
| PS-AC-07 | Both students can follow clean-checkout setup without unrecorded machine state. | Teammate clean-checkout confirmation in Issue #9. |
| PS-AC-08 | No Sprint 1 financial product workflow is implemented in this setup issue. | Issue scope and pull request diff. |

## Design and interaction decisions

1. **Pre-sprint and branch workflow:** Issue #9 is repository/bootstrap work outside Sprint 1. Keep all work and follow-up fixes on the single `feature/project-setup` issue branch, based on `main`; PR #11 targets `main`. PR #10 remains historically merged to `staging-1`; PR #11 carries those repository-guidance/template changes together with the setup work into `main`. This user-authorized direct-to-main implementation PR does not require teammate review. Squash merging after acceptance keeps the resulting `main` history consolidated; the separate staging-to-main release PR must still receive teammate review.
2. **Workspace testing:** Use Bun's built-in test runner and Turbo package tasks. Avoid another test framework unless Bun proves insufficient for required external behavior.
3. **Test seams:** Test the web at a rendered shared UI component; test API procedures with tRPC callers and controlled contexts; test the Elysia HTTP app through `app.handle()` without opening a listener; test the database with an actual PostgreSQL connection against the disposable local service.
4. **Server composition:** Separate server app construction from the listen side effect. The runtime entry point composes real services and listens; tests invoke the app without opening a port or initializing production integrations.
5. **Database safety:** Local PostgreSQL data is disposable development data. Use versioned migrations (`migrate dev` locally and `migrate deploy` for deployment), not `db push` as the normal migration path. Never reset an unknown database or accept data loss. Database-backed tests must fail clearly when the configured database is unavailable rather than silently skipping.
6. **Environment safety:** Commit schema files and clearly named examples only. Ignore actual `.env` files. Use synthetic local values and a database reserved for local development/testing. Do not access or copy a user's existing `.env` contents.
7. **Checks:** Root check/lint commands are read-only. Formatting that writes changes must be explicit.
8. **No product behavior:** No financial accounts, transaction workflow, balance, summary, admin, or authentication feature work is in scope beyond the existing scaffold needed to start the apps.

## Dependencies

- Bun 1.3.14 and workspace dependencies installed.
- Docker Compose or a separately provisioned disposable local PostgreSQL instance for database/migration verification.
- Generated Varlock environment accessors and Prisma client.
- Access to the repository, Issue #9, and PR #11 for tracking evidence.

## Definition of Done

- This setup design, reproducible instructions, and actual verification evidence are recorded in version control and Issue #9 / PR #11; no formal STS is required for this pre-sprint foundation.
- Safe environment examples and the local database/migration workflow are documented and verified.
- Root and package tests run as documented; required database coverage does not silently skip.
- Prisma migrations and generated client workflow are reproducible without destructive operations on an unknown database.
- Relevant build, type, lint/format, and test outcomes are recorded against exact commits, including failures and limitations.
- Clean-checkout setup is verified or remaining user/teammate checks are kept explicit and open.
- Acceptance checks and project-board fields match verified evidence.
- PR #11's acceptance criteria are verified before it is squash-merged into `main`; no teammate review is required for this direct-to-main implementation PR. The later staging-to-main release PR still requires a specific teammate review.
