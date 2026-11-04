# Feature-Level SDS: Project Setup

**Issue:** [#9 — Sprint 1: Project setup](https://github.com/ovenmakemeheat/Pockit/issues/9)
**Branch:** `feature/project-setup` from `staging-1`; work-item PR target: `staging-1`
**Status:** Contract for the setup foundation. The issue remains open until every acceptance criterion is verified.

## Problem and outcome

The repository has a working monorepo scaffold, but a clean checkout does not yet have a complete, reproducible path to configure, start, and verify the web app, API server, and PostgreSQL database. The README recommends schema push instead of the required versioned migration workflow, and there are no root test commands or baseline tests. This issue establishes a documented foundation only; it must not implement a financial workflow.

## Scope

- Document prerequisites and clean-checkout install, environment setup, database startup, Prisma generation/migrations, development startup, and verification commands.
- Provide safe example environment files and a local-only PostgreSQL development service. Examples contain synthetic local values, never real data or credentials.
- Establish Bun test commands for web UI, server/API behavior, and a PostgreSQL-backed database check; expose a root test command.
- Separate server app construction from the listen side effect so its HTTP behavior can be tested in-process.
- Keep generated client and migration artifacts reproducible and version controlled where appropriate.
- Replace the mutating root `check` command with a read-only check; provide an explicit formatting command if needed.
- Record actual commands, outcomes, and tested commit in the issue and project setup evidence.

## Acceptance criteria and evidence links

| ID | Acceptance criterion | Planned evidence |
|---|---|---|
| PS-AC-01 | Issue #9 has no blockers and is completed before the other Sprint 1 child issues are unblocked. | Issue dependency graph and project board; verify before closure. |
| PS-AC-02 | A clean checkout has reproducible install and local startup steps for web, server, and database. | README steps followed from a clean checkout; PS-TST-01. |
| PS-AC-03 | Environment configuration is explained through schemas and safe examples, with no secrets or real financial data committed. | Review tracked examples/schema and `git diff`; PS-TST-02. |
| PS-AC-04 | Prisma generation and the versioned migration workflow are documented and verified against an isolated local PostgreSQL database. | Generated client; migration status/apply evidence against disposable local DB; PS-TST-03. |
| PS-AC-05 | Reproducible test setup and root commands cover web UI, server/API, and database-backed tests. | Root `bun run test` and package test scripts; PS-TST-04 through PS-TST-07. |
| PS-AC-06 | Build, type-check, formatting/lint, and database setup commands are documented with actual results. | Recorded command log with exit status and tested commit; PS-TST-08. |
| PS-AC-07 | Both students can follow clean-checkout setup without unrecorded machine state. | Reproducible instructions plus teammate clean-checkout run/review; PS-TST-09. |
| PS-AC-08 | No Sprint 1 financial product workflow is implemented in this setup issue. | Diff and scope review; PS-TST-10. |

## Design and interaction decisions

1. **One issue branch:** Keep all work for this issue, review fixes, and explicitly requested additional changes on `feature/project-setup`. Do not create subtask branches. Target work-item PRs at `staging-1`; a separate reviewed release PR is required for `main`. If a previous PR merged while #9 remains open, continue on this same issue branch and use a follow-up PR as needed.
2. **Workspace testing:** Use Bun's built-in test runner and Turbo package tasks. Avoid adding another test framework unless Bun proves insufficient for a required external behavior.
3. **Test seams:** Test the web at a rendered shared UI component; test API procedures with tRPC callers and controlled contexts; test the Elysia HTTP app through `app.handle()` without opening a listener; test the database using an actual PostgreSQL connection against the local disposable development service.
4. **Server composition:** Extract a server-app factory that accepts its external handlers/configuration and returns an Elysia app. The runtime entry point composes real services and listens; tests invoke the factory without initializing Better Auth or connecting to a real user database.
5. **Database safety:** Local PostgreSQL data is disposable development data. Use versioned migrations (`migrate dev` for local development and `migrate deploy` for deployment), not `db push` as the normal migration path. Never reset an unknown database or accept data loss. Database-backed tests must fail clearly when the configured database is unavailable rather than silently skipping.
6. **Environment safety:** Commit schema files and clearly named examples only. Ignore actual `.env` files. Use placeholder/synthetic local secrets and a database name reserved for local development/testing. Do not access or copy a user's existing `.env` contents.
7. **Checks:** Root check/lint commands must be read-only. Formatting that writes changes must be explicit.
8. **No product behavior:** No financial accounts, transaction workflow, balance, summary, admin, or authentication feature work is in scope beyond the existing scaffold needed to start it.

## Dependencies

- Bun 1.3.14 and workspace dependencies installed.
- Docker Compose or a separately provisioned, disposable local PostgreSQL instance for database/migration verification.
- Generated Varlock environment accessors and Prisma client.
- Access to the repository and issue #9 for tracking evidence.

## Definition of Done

- The setup contract and test specification are version controlled.
- Safe examples and local database workflow are documented and runnable.
- Root and package test commands run the planned tests; no test silently skips required database coverage.
- Prisma migrations and generated client workflow are reproducible without destructive operations on an unknown database.
- Relevant build, types, lint/format, and test checks are executed; outcomes and exact commit are recorded.
- Clean-checkout steps are followed or any blocked steps and evidence limitations are explicitly recorded.
- All acceptance checks are linked to actual evidence; the issue checklist and project board reflect verified—not assumed—progress.
- A teammate review is recorded before the work-item PR merges to `staging-1`.
