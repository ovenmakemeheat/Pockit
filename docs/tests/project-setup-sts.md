# Software Test Specification: Project Setup

**Feature contract:** [Project Setup SDS](../features/project-setup-sds.md)
**Issue:** [#9 — Sprint 1: Project setup](https://github.com/ovenmakemeheat/Pockit/issues/9)
**Branch:** `feature/project-setup`; work-item PR target: `staging-1`

## Test objective and quality rules

Verify the externally observable setup contract: a clean checkout can follow the documented steps; users can run deterministic tests through root scripts; web, HTTP server, and API behavior is tested at their highest practical seams; and database checks use a real disposable PostgreSQL instance. Tests should assert behavior and outputs, not internal implementation details. Avoid mocking the Elysia HTTP handling or Prisma behavior in tests that claim server/database integration. Keep test data synthetic. Database tests must not use a developer's production or unknown database and must not silently skip when unavailable.

## Planned test cases

| ID | Type / seam | Behavior and expected result | Acceptance mapping | Status |
|---|---|---|---|---|
| PS-TST-01 | Manual clean-checkout setup | Follow documented install, env-example copy, local database startup, generation, migration, and app-start instructions; web and server become reachable at documented addresses. | PS-AC-02 | Partial |
| PS-TST-02 | Configuration and repository review | Example env files contain only synthetic placeholders; actual env files remain ignored; no secrets or real personal/financial data are introduced by the change. | PS-AC-03 | Passed |
| PS-TST-03 | Database integration / PostgreSQL | Against the disposable local PostgreSQL database, apply versioned migrations, confirm migration status is current, create/connect Prisma client, and run a simple query; a missing DB produces an explicit test failure. | PS-AC-04 | Passed |
| PS-TST-04 | Web / rendered UI component | Render a stable shared UI component under the documented Bun/JSDOM setup and assert its visible accessible output. | PS-AC-05 | Passed |
| PS-TST-05 | API / tRPC caller | Public health procedure returns its documented result; protected procedure rejects a missing session and returns expected data for an authenticated synthetic context. | PS-AC-05 | Passed |
| PS-TST-06 | Server / in-process HTTP | Invoke the composed Elysia app with `app.handle()`; root health route returns HTTP 200 and `OK` without opening a port or requiring external credentials. | PS-AC-05 | Passed |
| PS-TST-07 | Root runner | Run the root test command; it discovers and executes web, server/API, and DB package tests, and propagates a package failure as non-zero. | PS-AC-05 | Passed |
| PS-TST-08 | Setup/check commands | Run documented generation, test, build, type-check, and read-only lint/format-check commands; capture the actual command, exit status, and commit. | PS-AC-04, PS-AC-06 | Partial |
| PS-TST-09 | Teammate clean-checkout verification | Teammate follows the documented setup without undocumented machine state and reports blockers or confirms completion. | PS-AC-07 | Not run |
| PS-TST-10 | Scope review | Inspect branch diff and issue to verify no Sprint 1 financial workflow was implemented. | PS-AC-08 | Passed |

## Execution record

Record results in this table only after execution. Include the commit SHA for command evidence; a test that could not run is **Blocked**, not Passed.

| ID | Result | Command / evidence | Tested commit / notes |
|---|---|---|---|
| PS-TST-01 | Partial | `bun run db:dev:up` first failed because host port 5432 was already allocated. `POCKIT_POSTGRES_PORT=5433 bun run db:dev:up` then started the local service; `POCKIT_POSTGRES_PORT=5433 docker compose -f docker-compose.db.yml up -d --wait --wait-timeout 60` reported healthy at `127.0.0.1:5433`. A clean-checkout flow and app reachability were not tested. | `45e5f4569b8b05ae26bad18502a11e1a0331881a`; no other process or service on port 5432 was changed. |
| PS-TST-02 | Pass | Reviewed the tracked `.env.example` files; `git check-ignore -v --no-index apps/server/.env.local` confirms local env files are ignored and the example-file exception is present. | `45e5f4569b8b05ae26bad18502a11e1a0331881a`; no real `.env` files were read or added. |
| PS-TST-03 | Pass | `cd packages/db && DATABASE_URL='postgresql://pockit:pockit-local-only@127.0.0.1:5433/pockit?schema=public&connect_timeout=2' NODE_ENV=development bun run db:migrate` applied `20261103000000_initial_auth_schema`; Prisma `migrate status` reported `Database schema is up to date!`; root test run passed both PostgreSQL tests. | `45e5f4569b8b05ae26bad18502a11e1a0331881a`. The root Turbo wrapper could not start interactive `migrate dev` in the non-TTY tool; the package-level migration command succeeded. |
| PS-TST-04 | Pass | `cd apps/web && bun test` — 1 passed, 0 failed; also passed in the root test run. | `45e5f4569b8b05ae26bad18502a11e1a0331881a`. |
| PS-TST-05 | Pass | `cd packages/api && bun test` — 3 passed, 0 failed; also passed in the root test run. | `45e5f4569b8b05ae26bad18502a11e1a0331881a`. |
| PS-TST-06 | Pass | `cd apps/server && bun test` — 2 passed, 0 failed; also passed in the root test run. | `45e5f4569b8b05ae26bad18502a11e1a0331881a`. |
| PS-TST-07 | Pass | `DATABASE_URL='postgresql://pockit:pockit-local-only@127.0.0.1:5433/pockit?schema=public&connect_timeout=2' NODE_ENV=development bun run test` passed all 8 tests: web (1), server (2), API (3), and PostgreSQL (2). Prisma Client generation also passed. | `45e5f4569b8b05ae26bad18502a11e1a0331881a`. |
| PS-TST-08 | Partial | `bun run db:generate`, `bun run build`, `bun run check-types`, targeted `bunx biome check`, Compose config, and local migration/status — pass. Root `bun run check` — fail (35 errors, 58 warnings, including existing source baseline). | `45e5f4569b8b05ae26bad18502a11e1a0331881a`; build/type-check emitted non-fatal Rollup warnings. Root check is not recorded as passing. |
| PS-TST-09 | Not run | Teammate clean-checkout verification has not been performed. | Requires Polwarit to follow the instructions from a clean checkout. |
| PS-TST-10 | Pass | Reviewed the issue branch diff; no Sprint 1 financial workflow was added. | `45e5f4569b8b05ae26bad18502a11e1a0331881a`. |

Successful command runs above were verified against the issue-branch commit shown in the table. A bare `bun test` from the repository root is not the documented test entry point: it does not use the app-local Bun/JSDOM configuration. Use the root `bun run test` or run a package's test command from that package directory.

## Test-first evidence

For PS-TST-06, `apps/server/src/app.test.ts` was written before the server app factory. The first `bun test apps/server/src/app.test.ts` run failed because `./app` did not yet exist; after adding the app factory, `cd apps/server && bun test` passed both HTTP tests.

## Prior art

Before this issue, the repository contained no test files, test scripts, or prior test conventions. This specification establishes the initial conventions for Bun's test runner, UI tests using the existing Testing Library and JSDOM dependencies, in-process Elysia requests, tRPC caller tests, and real PostgreSQL-backed integration tests.
