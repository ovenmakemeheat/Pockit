# Lab 5 Deployment Record

This document is the evidence record for Lab 5. Update it with actual commands,
links, results, and tested commits as the work is performed. Do not put passwords,
connection strings, API keys, service-account keys, or other secrets here.

## 1. Team and baseline

| Item | Value |
| --- | --- |
| Repository | `https://github.com/CPE334-Pockit/Pockit` |
| Lab 5 staging branch | `lab5` |
| Current deployment Issue | [#38](https://github.com/CPE334-Pockit/Pockit/issues/38) |
| Working branch | `lab5-gcp-deploy` |
| Sprint 1 baseline commit | `e99da77` |
| GCP project ID | `cpe-se-course-2026` (shared course project) |
| GCP region | `asia-southeast1` |
| Team prefix | `s4b043a2c` assigned by the course portal |
| Public service URL | `https://s4b043a2c-4d7hbszvwq-as.a.run.app` (initial Pockit revision `s4b043a2c-00002-82b`; current `s4b043a2c-lab5redeploy` serves 100% of traffic) |

## 2.1 GCP deployment plan

The course portal completed resource provisioning on 2026-11-19 at 19:15:54 ICT.
It allocated **one** Cloud Run service and one Cloud SQL PostgreSQL instance to
this team. Pockit retains separate web and API processes inside one course
container; `deploy/course-entry.ts` routes `/api/*` and `/trpc/*` to the API
and other paths to the SSR web process. This replaces the original two-service
plan for the shared course environment.

| Resource | Portal-assigned name | Purpose |
| --- | --- | --- |
| Artifact Registry repository | `s4b043a2c` | Stores the unified image tagged by the release SHA. |
| Cloud SQL instance | `s4b043a2c-pg` | Persistent PostgreSQL database `s4b043a2c`. |
| Cloud Run service | `s4b043a2c` | Public Pockit web and API behind one container port. |
| Migration job | `s4b043a2c-migrate` | Runs checked-in migrations before deployment. |
| Runtime service account | `s4b043a2c-runner@cpe-se-course-2026.iam.gserviceaccount.com` | Existing team runtime identity. |
| Secret Manager secret | `s4b043a2c-database-url` | Portal-created database connection; value is never copied into the repo. |
| Secret Manager secret | `s4b043a2c-app-secret-1` | Pockit's Better Auth signing secret; random value stored as version 1 on 2026-11-19 without displaying it. |
| Secret Manager secret | `s4b043a2c-app-secret-2` | Team-chosen course User password. The bootstrap job completed using this secret reference; its value was not read or recorded. |

Deployment order:

1. Confirm the portal-assigned names and restricted IAM access.
2. Build and push the unified image to the team's existing registry, tagged with
   the full reviewed `main` commit SHA.
3. Update and execute the existing migration job; stop if it fails.
4. Run the same team job with the one-time course User bootstrap command. It
   creates one synthetic User and five financial accounts if absent, and never
   resets the password or finance data on a later release. Stop if it fails.
5. Update only the team's existing Cloud Run service with the same image and
   public URL settings. Preserve its existing database secret and connection.
6. Verify health, readiness, authentication, the Sprint 1 financial workflow, and
   one rejection/access restriction through the public web URL.

The course portal creates infrastructure and IAM. Never run the former teardown
script, create another Cloud SQL instance, or update another team's resources.
The local first-deployment script and GitHub workflow only update team resources
and use `--update-env-vars` / `--update-secrets` to preserve portal settings.
The serving revision, image digest, migration result, and browser evidence must
be recorded after an actual deployment.

## 2. GCP setup evidence

The earlier personal Free Trial blocker was superseded by the shared course
portal. On 2026-11-19, the approved Google account signed in to the portal for
team PEEEEEEJA. The portal completed all six provisioning steps. A read-only
`gcloud sql instances describe s4b043a2c-pg --project=cpe-se-course-2026`
returned `RUNNABLE` in `asia-southeast1`; read-only describes confirmed the
existing service and migration job. At setup time the service ran the portal
placeholder image; the first Pockit deployment is recorded below. [Issue #35](https://github.com/CPE334-Pockit/Pockit/issues/35) tracks
team access and the course-managed cost-control decision. The
[portal completion screenshot](artifacts/course-ready-2026-11-19.png) shows all
six steps complete; the [resource screenshot](artifacts/course-resources-2026-11-19.png)
shows the assigned project, region, prefix, and reserved URL without credentials.

| Check | Result/evidence |
| --- | --- |
| Approved account used | Portal verified the registered Google account; no account identifier or credential recorded here. |
| Billing or Free Trial active | Shared university project provisioned resources successfully; personal Free Trial is no longer the deployment path. |
| Teammate access | Both students reported on 2026-11-21 that they can access the team resources in the intended GCP project; this is a team report, not an agent-observed second-account session. |
| Budget alert | No team-created alert. The original personal Free Trial handout strongly recommended one, but the later course portal supplies a shared project and shared credits without a student budget setup step. The team does not claim that a central alert exists. |
| Region and quota checked | Portal assigned `asia-southeast1` and Cloud SQL `db-f1-micro`; team-specific quotas were not independently verified. |

Under the university's shared-project instructions, the team uses its one
portal-provisioned Cloud SQL instance and existing team resources. The serving
Cloud Run service is configured with minimum instances 0 and maximum instances
1. The team must not create another SQL instance or modify billing for the
shared project. The original alerts-only budget recommendation applied to a
student-owned Free Trial project; it is not recorded as a configured control
for this course-managed project. Course administrators can confirm whether
they operate central billing alerts if needed.

### Course-image local verification (2026-11-19)

The image and gateway changes were tested on the existing `lab5-gcp-deploy`
branch after fast-forwarding it to `lab5` merge commit
`0b3364660da8b6d4ccc7839846e328701edcfd7e`. Local image and runtime
checks used change commit `eba7db6dbc663e2d617652f52cdfc2ac8cb61357`;
the latest source and CI status are tracked in
[follow-up PR #65](https://github.com/CPE334-Pockit/Pockit/pull/65). This is
local verification, not evidence that Pockit is deployed on GCP.

| Command or check | Result |
| --- | --- |
| `docker build --platform linux/amd64 -f deploy/Dockerfile.course --build-arg VITE_SERVER_URL=https://s4b043a2c-4d7hbszvwq-as.a.run.app --secret id=web_env,src=apps/web/.env.example --secret id=server_env,src=apps/server/.env.example -t pockit-course-release-check .` | Passed on the earlier PR #65 source. The Dockerfile was later moved to the repository root for the university portal connector; this row is the historical command actually run. |
| `POCKIT_POSTGRES_PORT=15434 docker compose -p pockit-course-check -f docker-compose.db.yml up -d` | Started a new isolated local PostgreSQL container and volume without touching other services. |
| `docker run --rm --network pockit-course-check_default ... pockit-course-local bun run db:migrate:deploy` | Applied all four checked-in migrations to the isolated database. The omitted argument was a synthetic local-only connection URL. |
| Run the production-built course image on localhost:3000, then request `/api/health`, `/api/ready`, `/`, and `/login` | Health returned `ok`, readiness returned `db: connected`, web root and login both returned HTTP 200. The first attempt exposed a missing runtime `VITE_SERVER_URL`; the Dockerfile was fixed to carry the build argument into the runner stage. |
| `DATABASE_URL=<isolated synthetic URL> bun run test` | Web, server, API, and PostgreSQL suites passed when run with local DB network access. The first sandboxed invocation could not reach localhost and failed; the authorized rerun passed. |
| `bun run check-types`; `bunx biome check deploy/course-entry.ts`; `bash -n deploy/course-first-deploy.sh`; `DRY_RUN=1 bash deploy/course-first-deploy.sh` | Passed. The dry run listed only updates to this team's existing job and service. |
| `bun run check` | Repository-wide Biome check still reports existing errors and warnings in unrelated files; the new entrypoint passes targeted Biome validation. CI will determine the PR gate result. |

The verification containers were stopped, leaving the isolated PostgreSQL
volume intact. None of these commands accessed the university database.

## 3. Environment variables

Values below describe the variables currently declared by the repository. Local
values belong in ignored `.env` files; deployed secret values must come from the
GCP runtime secret/configuration mechanism.

| Variable | Used by | Secret? | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | Web/server/database | No | Runtime mode (`development`, `test`, or `production`). |
| `HOST` | Server | No | Listener hostname; Cloud Run uses `0.0.0.0`. |
| `PORT` | Server | No | Listener port supplied by the runtime; local default is `3000`. |
| `BETTER_AUTH_SECRET` | Server/auth | Yes | Session and authentication signing secret. |
| `BETTER_AUTH_URL` | Server/auth | No | Canonical server URL for the environment. |
| `CORS_ORIGIN` | Server/auth | No | Trusted web origin for browser requests. |
| `DATABASE_URL` | Server/database | Yes | PostgreSQL connection string. |
| `POCKIT_DEMO_PASSWORD` | Server seed | Yes | Optional synthetic local demo password; never commit a real value. |
| `POCKIT_BOOTSTRAP_PASSWORD` | One-time course bootstrap job only | Yes | Team-chosen credential supplied from pre-provisioned app secret slot 2; it is never mapped to the serving application. |
| `VITE_SERVER_URL` | Web | No | Public server URL used by the web client. |
| `SERVER_URL` | Web SSR | No | Internal API listener in the single-service course image. |

## 4. Local Docker workflow

The full Compose stack runs PostgreSQL, the API server, and the web application.
PostgreSQL data is stored in the named `pockit-postgres-data` volume and is not
stored in either application container.

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
docker compose build
docker compose up -d
docker compose ps
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:3000/api/ready
```

Apply migrations and seed synthetic local data after PostgreSQL is healthy:

```bash
docker compose run --rm -w /app server bun run db:migrate:deploy
docker compose run --rm -w /app -e NODE_ENV=development server bun run db:seed
```

Set a synthetic local-only `POCKIT_DEMO_PASSWORD` in the ignored
`apps/server/.env` before seeding. The production container image defaults to
`NODE_ENV=production`; the one-off seed command explicitly opts into local
development mode. Run these commands only against a disposable local database.
If port 5432 is already occupied, set `POCKIT_POSTGRES_PORT=15432` for every
Compose command in the same isolated project instead of stopping the existing
database service.

### Local verification on 2026-11-17 (Issue #36)

Tested source commit: `499f02b67c101699a5e302b23fa4adf3fd4e4aa3`.
An isolated Compose project named `pockit-lab5-audit` used host PostgreSQL port
15432 and its own named volume. Ignored local `.env` files contained synthetic
values. The following commands and observations were recorded:

| Command or check | Result |
| --- | --- |
| `docker compose -p pockit-lab5-audit build` | API and web images built successfully, exit 0. |
| `POCKIT_POSTGRES_PORT=15432 docker compose -p pockit-lab5-audit up -d postgres` | PostgreSQL started healthy. The default 5432 host port was occupied by another service. |
| `POCKIT_POSTGRES_PORT=15432 docker compose -p pockit-lab5-audit run --rm -w /app server bun run db:migrate:deploy` | Four checked-in migrations applied, exit 0. |
| `POCKIT_POSTGRES_PORT=15432 docker compose -p pockit-lab5-audit run --rm -e NODE_ENV=development -w /app server bun run db:seed` | Seeded 3 synthetic identities and 10 financial accounts, exit 0. |
| `POCKIT_POSTGRES_PORT=15432 docker compose -p pockit-lab5-audit up -d server web` | PostgreSQL, API and web containers reached healthy state. |
| `curl --fail http://localhost:3000/api/health`; `curl --fail http://localhost:3000/api/ready`; `curl --fail -o /dev/null -w '%{http_code}' http://localhost:3001/` | `ok`, database `connected`, and web HTTP 200. |
| `POCKIT_POSTGRES_PORT=15432 docker compose -p pockit-lab5-audit run --rm -w /app -e NODE_ENV=test server bun run test` | Web, server, API and PostgreSQL test suites passed; includes valid/invalid login, finance journey and rejection/access checks. |
| Count synthetic Users, restart only `server web`, count again and request `/api/ready` | Count 3 before and 3 after; readiness returned database `connected`. |

The automated finance persistence test also disconnects Prisma, recreates the
server app and database client, and verifies balances, summaries and history.
This local restart is not evidence of GCP redeployment or persistence through a
new Cloud Run revision.

### Local browser journey (AC-L5-03-04)

Using the same isolated Compose stack and synthetic seeded User, the browser
opened `http://localhost:3001/`, signed in, and reached `/dashboard`. The
following actions were observed through the live UI on the production-built
images from source commit `499f02b67c101699a5e302b23fa4adf3fd4e4aa3`:

1. Set Main bank opening balance to THB 1,000.00; cash became THB 1,000.00.
2. Enter a THB 100.00 credit-card purchase split between Dining (THB 65.00)
   and Groceries (THB 35.00); card debt and Expenses became THB 100.00.
3. Before saving, changed the second allocation to THB 34.00; the UI displayed
   `Allocated THB 99.00 / THB 100.00` and disabled `Record card purchase`.
   Restored THB 35.00 and saved the transaction.
4. Recorded THB 1,500.00 salary into Main bank and THB 40.00 repayment from
   Main bank to Credit card.
5. The dashboard showed cash THB 2,460.00, card debt THB 60.00, income
   THB 1,500.00, expenses THB 100.00 and three transactions in history.

This is local browser and database evidence only. It does not prove the public
GCP URL or a cloud restart/redeployment.

### Fresh-checkout Docker regression and fix (AC-L5-03-01)

The first separate checkout of `lab5` at
`3c7a7e9fba6fec20c50a2e504d7e71fbe720c061` failed
`docker compose build server`: the generated Prisma Client import was missing.
Earlier CI and workspace builds had generated that ignored directory before
building the image. Both application Dockerfiles now run `bun run db:generate`
inside the builder stage after installing dependencies; the build-time local
environment remains mounted as a BuildKit secret.

With this Dockerfile fix applied to that same clean checkout and only ignored
synthetic `.env` files added, the isolated `pockit-lab5-clean` Compose project
passed `docker compose build --quiet` for API and web. Four migrations applied
using `run --rm -w /app server bun run db:migrate:deploy`; local seed created
3 synthetic Users and 10 accounts using `run --rm -e NODE_ENV=development
-w /app server bun run db:seed`. PostgreSQL and API reached healthy state,
`/api/health` returned `ok`, `/api/ready` returned `db: connected`, and the web
root returned HTTP 200. Host PostgreSQL used port 15433 to avoid the unrelated
service on 5432. This result proves the fixed images build and run without a
pre-generated Prisma Client in the checkout.

Stop the application without deleting the database volume with `docker compose
down`. Remove the volume only when disposable local data may be deleted.

## 5. Evidence rules

- Record the exact command, result, and tested commit for repository checks.
- Link Issues, PRs, reviews, workflow runs, and deployed revisions directly.
- Use screenshots only when a link cannot prove the result, such as a blocked merge
  button or before/after persistence state.
- Redact secrets and personal billing information before adding screenshots.
- Keep this document updated at each Lab 5 lifecycle transition.

## 6. Planned evidence index

The [Issue #41 evidence index](evidence-index.md) records the actual result,
tested commit, and remaining proof for each C-01 through C-06 check. A passing
CI job is not evidence of a public deployment or persistence after a restart.

| Check | Requirement | Artifact/result |
| --- | --- | --- |
| C-01 | R-05 | _Passing PR and CI run_ |
| C-02 | R-06 | _Failing temporary PR with merge blocked_ |
| C-03 | R-01, R-02 | _Clean-clone Docker build/run_ |
| C-04 | R-03 | _Live URL workflow evidence_ |
| C-05 | R-04 | _Data before/after restart and redeploy_ |
| C-06 | R-07-R-10 | _Reviewed release and running commit_ |

## 7. Pull-request CI

`.github/workflows/ci-docker.yml` runs for pull requests targeting `lab5` or
`main`. The required check name is `test-and-docker`. It starts PostgreSQL,
installs the locked Bun dependencies, generates Prisma Client, applies migrations,
runs the automated tests, checks types, builds the workspaces, validates Compose,
and builds the Docker images.

Record the passing workflow URL, summary, and head commit in Issue #37 and in the
final evidence index.

## 8. Authentication and merge gate

GitHub Actions must authenticate to GCP with Workload Identity Federation or an
equivalent keyless mechanism. Do not download, commit, or place a service-account
JSON key in GitHub Actions secrets. On 2026-11-20, the TA enabled a new portal
path for public non-Starter-Kit repositories with a root `Dockerfile`. The
portal inspected `CPE334-Pockit/Pockit` at `main` commit `211bb77` and offered
to connect it despite its different layout, but `main` had no root Dockerfile.
The course image Dockerfile reached the root of `main` in release PR #66 at
`01c298717b1809ec220eed8906d9a9508a673f85`. The portal accepted the
request to connect `CPE334-Pockit/Pockit` to team `s4b043a2c` on 2026-11-20;
WIF setup completed and the portal showed `GitHub Actions connected`. A fresh
repo reinspection displayed `Possible credentials were detected in a deployment
file` and kept
the older cached review SHA; this warning has not yet identified a file or a
secret value. The portal displayed four GitHub variables for the `demo`
environment and a generated workflow. The [GitHub `demo` environment](https://github.com/CPE334-Pockit/Pockit/settings/environments/27997376231/edit) was created,
restricted to branch `main`, and populated with those four non-secret values
plus `APP_PORT=3000`. The generated workflow was inspected; Pockit's workflow
retains its exact-SHA CI gate, migration-before-service ordering, course User
bootstrap, and public smoke checks while switching to the portal-bound `demo`
environment. Runtime secrets remain in Secret Manager.

The team later supplied a privacy-safe [portal status screenshot](artifacts/course-wif-connected-2026-11-21.png)
showing `เชื่อม GitHub Actions (WIF) — เชื่อมแล้ว` after resource preparation.
This verifies that the portal reports the connection as complete; it is not
evidence that Google accepted a GitHub OIDC token. The [manual `main` deploy
attempt 3](https://github.com/CPE334-Pockit/Pockit/actions/runs/44757614254/attempts/3)
still failed at token exchange. The separate error screenshot and a portal
team-information screenshot are kept in Git-ignored `artifacts/private/` for
the TA because the latter contains a member email.

Configure the `main` branch ruleset with:

- Enforcement: active.
- Require a pull request before merging.
- Require the `test-and-docker` status check.
- Require branches to be up to date before merging.
- Empty bypass list.

Evidence for Issue #39 must include a normal, non-draft temporary-branch PR with
one intentionally failing test. Record the failed workflow, the required-check
indicator, and the disabled merge action. Close that PR without merging it and do
not alter the released application.

The active [`main-release-gate` ruleset](https://github.com/CPE334-Pockit/Pockit/rules/27470351)
requires a PR, one approval, the GitHub Actions `test-and-docker` check, and an
up-to-date branch, with no bypass actors. [PR #63](https://github.com/CPE334-Pockit/Pockit/pull/63)
was a normal PR from `lab5-merge-gate-demo` to `main` at head
`198742072b773dde74474c495360ed6ca11c148b`. Its intentionally failing
test at `apps/server/src/merge-gate-demo.test.ts:4` failed in
[Actions run 44135270043](https://github.com/CPE334-Pockit/Pockit/actions/runs/44135270043).
The PR UI showed the check as `Required`, `Merging is blocked`, and a disabled
merge button. The PR was closed without merging; `main` remained at
`211bb77fb2a5ccb95027d9d110e0132ff1001918`. This proves the merge gate;
the separate GitHub-to-GCP authentication check still requires a successful
workflow run using the portal connection completed on 2026-11-20.

## 9. Release workflow

### First-release identity preparation

Pockit disables public signup, and the local synthetic seed command deliberately
refuses production. Before the first GCP release, the team must put a password
of at least 16 characters into its pre-provisioned
`s4b043a2c-app-secret-2` slot. Use a password manager to retain the value;
the web portal cannot display it later. Do not put it in GitHub, an issue, a
shell argument, or this document. For example, this local command uses a hidden
prompt and passes the value to gcloud on standard input:

```bash
python3 - <<'PY'
import getpass
import subprocess

password = getpass.getpass('Course User password (at least 16 characters): ')
if len(password) < 16:
    raise SystemExit('Password must contain at least 16 characters')
subprocess.run([
    'gcloud', 'secrets', 'versions', 'add', 's4b043a2c-app-secret-2',
    '--project=cpe-se-course-2026', '--data-file=-',
], input=password.encode(), check=True)
PY
```

The bootstrap job uses that secret to create `course.user@pockit.test` and
five THB accounts after migrations succeed and before the service is updated.
It is safe to rerun: an existing identity, password hash, and finance data are
preserved. Keep the chosen password to sign in during public verification.
Changing secret slot 2 later does not rotate the existing account password.
If the bootstrap job fails, the service update does not run. The local
`db:seed` production safeguard remains in place.

`.github/workflows/deploy.yml` starts on a push to `main` or by manual dispatch
from `main`. Before authenticating to GCP, it waits for the `CI and Docker`
push run on the exact release SHA to pass; a failed or missing CI result stops
the deployment. Once the portal GitHub connection is completed, it
authenticates without a key, builds the single course image tagged with the full
commit SHA, pushes it to the team's existing Artifact Registry repository,
updates and executes the existing migration job, runs the course User bootstrap,
updates the existing Cloud Run service, and runs bounded public health/readiness
smoke checks. It never creates
infrastructure or changes project IAM.

### Repeatable release procedure (AC-L5-07-06)

1. Merge the bounded issue PR into `lab5` after a specific teammate review and
   passing `test-and-docker` check. Record the issue, PR, review and head SHA.
2. Open a separate PR from `lab5` into `main`. Ask the other student to review
   the release diff and the required CI result. Merge only after that review
   and all required checks pass. Record the release PR and merge commit SHA.
3. Confirm `CI and Docker` passed on that exact `main` SHA. The `push: main`
   trigger starts both CI and `deploy.yml`; the deployment waits for passing CI
   before authenticating or changing GCP. If a manual workflow dispatch is used,
   confirm its selected ref and SHA correspond to the reviewed release and that
   CI passed for that same SHA.
4. Inspect the deployment run in GitHub Actions. Record its run URL, full image
   tag/digest, migration job result, Cloud Run revision, public web/API paths
   on the same team URL, and health/readiness smoke results. Do not report a release
   complete if migration or smoke test failed.
5. Compare the full release commit SHA from `main` with the image tags and the
   image used by each serving Cloud Run revision. Open the public web URL and
   verify the released change through a synthetic user journey. Record the
   result in the evidence index (C-06) and Issue #40.

The separately reviewed PR #66 merged `lab5` to `main` at
`01c298717b1809ec220eed8906d9a9508a673f85`. Main
[CI run 44750632611](https://github.com/CPE334-Pockit/Pockit/actions/runs/44750632611)
passed. The triggered
[deployment run 44751105668](https://github.com/CPE334-Pockit/Pockit/actions/runs/44751105668)
failed at `Validate university GitHub connection`: `WIF_PROVIDER` and
`WIF_SERVICE_ACCOUNT` were empty in the workflow's former `production`
environment.
The authentication, build, migration, service update and smoke steps were all
skipped. This is the historical first attempt, before the `demo` environment
change reached `main` in [release PR #70](https://github.com/CPE334-Pockit/Pockit/pull/70).
The later WIF attempts and first manual Pockit deployment are recorded below.

For a manual deployment fallback, run
`DRY_RUN=1 bash deploy/course-first-deploy.sh` and inspect its commands; after
the reviewed commit reaches a clean local `main`, run
`DRY_RUN=0 bash deploy/course-first-deploy.sh`. The script validates the
course project and existing team resources, builds an amd64 image, stops if
migrations fail, and updates only the team's existing service. This manual
first deployment does not satisfy the GitHub Actions release criterion.

The workflow uses the portal-assigned project, region, prefix, and URL. The
project and region come from the `demo` environment variables and are checked
against the assigned team values before authentication. It was compared with
the downloaded portal workflow and retains the Pockit-specific
exact-SHA CI gate, migrations before traffic, one-time identity bootstrap, and
public smoke checks. Its GitHub environment is `demo`, restricted to `main`,
with `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, and
`APP_PORT=3000` configured as non-secret environment variables. The portal also
requires a root Dockerfile; a plain
`docker build --platform linux/amd64 -t pockit-portal-root-check .` passed
locally without build arguments or secrets. The workflow directly runs
`bun run db:migrate:deploy` and Pockit's course User bootstrap; it does not
depend on the optional `MIGRATE_COMMAND` variable used by the generic portal
workflow.
The portal-assigned deployer identity is
`s4b043a2c-deployer@cpe-se-course-2026.iam.gserviceaccount.com`.
The existing runtime identity is `s4b043a2c-runner@cpe-se-course-2026.iam.gserviceaccount.com`;
the portal already mapped `DATABASE_URL` and attached Cloud SQL to the service
and job. The deploy adds `BETTER_AUTH_SECRET` from app secret slot 1 without
replacing the database mapping. Record the workflow URL, image tag/digest,
serving revision, smoke-test result, and release commit for Issue #40.

### First public Pockit deployment (2026-11-20)

[Release PR #70](https://github.com/CPE334-Pockit/Pockit/pull/70) merged the
portal `demo` environment change to `main` at full commit
`5256b3cd7b9269dc32db5bd10abfe401bbaeb958`.
[Main CI run 44756809917](https://github.com/CPE334-Pockit/Pockit/actions/runs/44756809917)
passed. The [automatic deployment run 44757283437](https://github.com/CPE334-Pockit/Pockit/actions/runs/44757283437)
and [manual dispatch run 44757614254](https://github.com/CPE334-Pockit/Pockit/actions/runs/44757614254)
both passed exact-SHA/variable checks but failed at keyless authentication:
`unauthorized_client: The given credential is rejected by the attribute
condition`. The team account cannot read the course provider condition
(`iam.workloadIdentityPoolProviders.get` denied). No GitHub Actions deployment
has succeeded; the TA must inspect the provider's binding for this repo,
`main`, `.github/workflows/deploy.yml`, and `demo`.

On 2026-11-21 ICT, the failed manual run was retried as
[attempt 3](https://github.com/CPE334-Pockit/Pockit/actions/runs/44757614254/attempts/3)
on the same `main` commit. Job `136443062030` passed checkout, latest-main,
exact-SHA CI and university variable validation, then failed at
`Authenticate without a service-account key` with the same
`unauthorized_client` attribute-condition rejection. No build, migration or
Cloud Run update ran. The downloaded newer team workflow differs from
Pockit's workflow in trigger (`push` versus `workflow_run`) and Google auth
action version (v3 versus v2); neither difference is established as the cause.
Send the attempt-3 job log to the TA and ask them to compare the provider
condition with this run's OIDC claims. A reviewed follow-up on PR #71 now
proposes the portal's `push: main` trigger and pinned v3 auth/setup actions as
a diagnostic while retaining the exact-SHA CI gate and Pockit release steps.
The earlier failures remain historical evidence; this change does not prove
WIF works until a new run on `main` authenticates successfully.

To verify the application while WIF is blocked, an isolated clean `main`
worktree at the release commit ran:

1. `DRY_RUN=1 bash deploy/course-first-deploy.sh` — passed; the printed
   commands targeted only prefix `s4b043a2c` in project
   `cpe-se-course-2026`, region `asia-southeast1`.
2. `DRY_RUN=0 bash deploy/course-first-deploy.sh` — passed; the script
   verified local `main` equaled `origin/main`, built and pushed the amd64
   image, waited for migration and course User bootstrap, updated the existing
   service, then checked health, readiness and web root.

| Result | Observed evidence |
| --- | --- |
| Image tag | `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s4b043a2c/s4b043a2c:5256b3cd7b9269dc32db5bd10abfe401bbaeb958` |
| Registry manifest-list digest | `sha256:5e206e635ecab27b398360265c4f0cdf955ca746ab612270ba6b5d0f77790e3b` from Docker push |
| Migration | Execution `s4b043a2c-migrate-2vpgq`, `Completed=True` at `2026-11-20T14:59:52Z` |
| Course User bootstrap | Execution `s4b043a2c-migrate-7gfpq`, `Completed=True` at `2026-11-20T15:00:18Z`; the job references secret `s4b043a2c-app-secret-2:latest` without exposing its value |
| Cloud Run | Initial service `s4b043a2c` revision `s4b043a2c-00002-82b` was Ready and served 100% at `https://s4b043a2c-4d7hbszvwq-as.a.run.app` after first deployment; current `s4b043a2c-lab5redeploy` serves 100% with the same release image. |
| Serving image | Revision digest `sha256:015061e172242f39cc28fba2a59618076ea2fb685b509cf98835700eac391eee` (selected platform manifest); service config retains full release SHA image tag |
| Public paths | `GET /`, `/login`, `/api/health`, and `/api/ready` each returned HTTP 200. Readiness body: `{"status":"ready","db":"connected"}`. The browser home page identified Pockit. |
| Access restriction | Unauthenticated `GET /trpc/finance.accounts.list` returned HTTP 401, `Authentication required`. |
| Runtime secrets | Service config maps `DATABASE_URL` to `s4b043a2c-database-url:latest` and `BETTER_AUTH_SECRET` to `s4b043a2c-app-secret-1:latest`; no values were read or committed. |

The team member signed in to the public dashboard as the synthetic course User
and recorded one `Salary` receipt dated 2026-11-20, description
`LAB5-PERSIST-20261120`, amount THB 123.45 into `Main bank`. Their screenshot
shows the public `/dashboard` URL, the single Recent activity entry, Cash on
hand THB 123.45 and Income THB 123.45. The original screenshot is retained
locally at `artifacts/private/public-income-before-restart-2026-11-20.png`
for the report because its browser chrome includes unrelated personal tabs
and bookmarks. The `artifacts/private/` directory is Git-ignored. Together
with the HTTP 401 finance read above, this
verifies the public business action and access restriction in #38. The
signed-in journey is a team-observed screenshot, not an agent-controlled trace.

For the first cloud persistence step, the same reviewed image was rolled to a
fresh application revision without touching Cloud SQL or rerunning the
bootstrap job:

`gcloud run services update s4b043a2c --image=asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s4b043a2c/s4b043a2c:5256b3cd7b9269dc32db5bd10abfe401bbaeb958 --revision-suffix=lab5restart --project=cpe-se-course-2026 --region=asia-southeast1 --quiet`

The command exited 0. A subsequent service describe showed revision
`s4b043a2c-lab5restart` Ready and serving 100% of traffic with the same full
release SHA image tag. Public `/api/ready` returned
`{"status":"ready","db":"connected"}`. After refreshing the public
dashboard, the team member reported that the same transaction and balance
remained visible. No distinct screenshot was captured between the two
rollouts; record this as a user observation plus CLI revision/readiness
evidence.

For a separate redeployment check, the same `gcloud run services update`
command was run with `--revision-suffix=lab5redeploy`, keeping the exact
release image tag and team service. It exited 0 and created revision
`s4b043a2c-lab5redeploy`. Service describe showed that revision Ready and
serving 100% of traffic with the full `5256b3cd7b9269dc32db5bd10abfe401bbaeb958`
image tag. Public `/api/ready` again returned
`{"status":"ready","db":"connected"}`. After refreshing the public
dashboard again, the team member reported that the same transaction and THB
123.45 balance remained visible. Issue #41 AC-L5-08-01/02 are checked using
the team-observed results and the named command/revision/readiness evidence.
The team later sent two screenshot files for the after-rollout stages. Both
display the public `/dashboard`, the one `LAB5-PERSIST-20261120` transaction
and THB 123.45 Cash/Income totals. File inspection showed that both have the
same SHA-256 digest
`3383f8ad7bb9672cea297eb3061a38d94034e2a6bfaf5db646cfd259d69c07ec`;
they are byte-identical copies rather than distinct observations of the two
revisions. One copy is retained locally at
`artifacts/private/public-income-after-redeploy-2026-11-20.png` because its
browser chrome includes unrelated personal tabs and bookmarks. Treat it as a
post-redeployment dashboard image, paired with the service revision/readiness
commands and the team's explicit observations. The team confirmed it has no
separate screenshot from after the first rollout; do not caption the duplicate
as independent after-restart evidence.

Read-only revision describe recorded creation timestamps
`2026-11-20T15:35:26.928193Z` for `s4b043a2c-lab5restart` and
`2026-11-20T15:42:39.035745Z` for `s4b043a2c-lab5redeploy`, both Ready.
The first before-rollout screenshot file was saved at about 22:34 ICT; the
byte-identical after-stage files were received at 22:45 ICT, after the second
revision existed. These file times are consistent with the team's account
but do not replace an independent screenshot from between the rollouts.
This manual redeployment does not substitute for the still-failing GitHub
Actions workflow in #39/#40.

