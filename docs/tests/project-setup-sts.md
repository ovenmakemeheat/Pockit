# Software Test Specification: Project Setup

**Feature contract:** [Project Setup SDS](../features/project-setup-sds.md)
**Issue:** [#9 — Sprint 1: Project setup](https://github.com/ovenmakemeheat/Pockit/issues/9)
**Branch:** `feature/project-setup`; work-item PR target: `staging-1`

## Test objective and quality rules

Verify the externally observable setup contract: a clean checkout can follow the documented steps; users can run deterministic tests through root scripts; web, HTTP server, and API behavior is tested at their highest practical seams; and database checks use a real disposable PostgreSQL instance. Tests should assert behavior and outputs, not internal implementation details. Avoid mocking the Elysia HTTP handling or Prisma behavior in tests that claim server/database integration. Keep test data synthetic. Database tests must not use a developer's production or unknown database and must not silently skip when unavailable.

## Planned test cases

| ID | Type / seam | Behavior and expected result | Acceptance mapping | Status |
|---|---|---|---|---|
| PS-TST-01 | Manual clean-checkout setup | Follow documented install, env-example copy, local database startup, generation, migration, and app-start instructions; web and server become reachable at documented addresses. | PS-AC-02 | Planned |
| PS-TST-02 | Configuration and repository review | Example env files contain only synthetic placeholders; actual env files remain ignored; no secrets or real personal/financial data are introduced by the change. | PS-AC-03 | Planned |
| PS-TST-03 | Database integration / PostgreSQL | Against the disposable local PostgreSQL database, apply versioned migrations, confirm migration status is current, create/connect Prisma client, and run a simple query; a missing DB produces an explicit test failure. | PS-AC-04 | Planned |
| PS-TST-04 | Web / rendered UI component | Render a stable shared UI component under the documented Bun/JSDOM setup and assert its visible accessible output. | PS-AC-05 | Planned |
| PS-TST-05 | API / tRPC caller | Public health procedure returns its documented result; protected procedure rejects a missing session and returns expected data for an authenticated synthetic context. | PS-AC-05 | Planned |
| PS-TST-06 | Server / in-process HTTP | Invoke the composed Elysia app with `app.handle()`; root health route returns HTTP 200 and `OK` without opening a port or requiring external credentials. | PS-AC-05 | Planned |
| PS-TST-07 | Root runner | Run the root test command; it discovers and executes web, server/API, and DB package tests, and propagates a package failure as non-zero. | PS-AC-05 | Planned |
| PS-TST-08 | Setup/check commands | Run documented generation, test, build, type-check, and read-only lint/format-check commands; capture the actual command, exit status, and commit. | PS-AC-04, PS-AC-06 | Planned |
| PS-TST-09 | Teammate clean-checkout verification | Teammate follows the documented setup without undocumented machine state and reports blockers or confirms completion. | PS-AC-07 | Planned |
| PS-TST-10 | Scope review | Inspect branch diff and issue to verify no Sprint 1 financial workflow was implemented. | PS-AC-08 | Planned |

## Execution record

Record results in this table only after execution. Include the commit SHA for command evidence; a test that could not run is **Blocked**, not Passed.

| ID | Result | Command / evidence | Tested commit / notes |
|---|---|---|---|
| PS-TST-01 | Blocked | Clean-checkout procedure not run end-to-end; Docker Compose cannot start because the local Docker daemon is unavailable. | Worktree based on `3227a27`; local setup remains unverified. |
| PS-TST-02 | Pass | Reviewed the tracked `.env.example` files and diff; `git check-ignore -v --no-index apps/server/.env.local` confirms local env files are ignored and the example-file exception is present. | Worktree based on `3227a27`; no real `.env` files were read or added. |
| PS-TST-03 | Blocked (expected failure observed) | `DATABASE_URL='postgresql://pockit:pockit-local-only@127.0.0.1:5432/pockit?schema=public&connect_timeout=2' NODE_ENV=development bun run test` generated Prisma Client, then the DB tests failed explicitly with `Can't reach database server at 127.0.0.1:5432`. Migration application/status was not verified. | Worktree based on `3227a27`; Docker daemon unavailable, so no DB-backed pass is claimed. |
| PS-TST-04 | Pass | `cd apps/web && bun test` — 1 passed, 0 failed. | Worktree based on `3227a27`; uncommitted changes. |
| PS-TST-05 | Pass | `cd packages/api && bun test` — 3 passed, 0 failed. | Worktree based on `3227a27`; uncommitted changes. |
| PS-TST-06 | Pass | `cd apps/server && bun test` — 2 passed, 0 failed. | Worktree based on `3227a27`; uncommitted changes. |
| PS-TST-07 | Pass (failure propagation verified) | Root `bun run test` ran web (1), server (2), and API (3) tests successfully, then returned non-zero when the PostgreSQL suite could not connect. | Worktree based on `3227a27`; DB availability is an environment blocker, not a silent skip. |
| PS-TST-08 | Partial | `bun run db:generate` — pass; `bun run build` — pass; `bun run check-types` — pass; root `bun run check` — fail (35 errors, 58 warnings, including pre-existing source baseline); targeted `bunx biome check` over changed TypeScript/JSON files — pass. | Worktree based on `3227a27`; build emitted non-fatal Rollup warnings. Root check is not recorded as passing. |
| PS-TST-09 | Not run | Teammate clean-checkout verification has not been performed. | Requires Polwarit to follow the instructions from a clean checkout. |
| PS-TST-10 | Pass | Reviewed the issue branch diff; no Sprint 1 financial workflow was added. | Worktree based on `3227a27`; uncommitted changes. |

All command results above were gathered on an uncommitted worktree based on `3227a27`; there is no tested commit SHA yet. A bare `bun test` from the repository root is not the documented test entry point: it does not use the app-local Bun/JSDOM configuration. Use the root `bun run test` or run a package's test command from that package directory.

## Prior art

The repository currently contains no test files, test scripts, or prior test conventions. This specification establishes the initial conventions for Bun's test runner, UI tests using the existing Testing Library and JSDOM dependencies, in-process Elysia requests, tRPC caller tests, and real PostgreSQL-backed integration tests.
