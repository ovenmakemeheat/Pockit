# Lab 5 Deployment Record

This document is the evidence record for Lab 5. Update it with actual commands,
links, results, and tested commits as the work is performed. Do not put passwords,
connection strings, API keys, service-account keys, or other secrets here.

## 1. Team and baseline

| Item | Value |
| --- | --- |
| Repository | `https://github.com/ovenmakemeheat/Pockit` |
| Lab 5 staging branch | `lab5` |
| Current Issue | [#40](https://github.com/ovenmakemeheat/Pockit/issues/40) |
| Working branch | `lab5-deploy-workflow` |
| Sprint 1 baseline commit | `e99da77` |
| GCP project ID | _To be recorded after setup_ |
| GCP region | _To be recorded after setup_ |
| Public service URL | _To be recorded after deployment_ |

## 2.1 GCP deployment plan

Pockit uses separate web and API containers, so the first deployment uses two
Cloud Run services backed by one Cloud SQL PostgreSQL instance:

| Resource | Planned name | Purpose |
| --- | --- | --- |
| Artifact Registry repository | `pockit` | Stores immutable web and API images. |
| Cloud SQL instance | `pockit-pg` | Persistent PostgreSQL data. |
| Cloud Run API service | `pockit-api` | Elysia API, authentication, and tRPC. |
| Cloud Run web service | `pockit-web` | TanStack Start UI. |
| Secret Manager secret | `pockit-database-url` | Cloud SQL connection string. |
| Secret Manager secret | `pockit-auth-secret` | Better Auth signing secret. |

Deployment order:

1. Confirm billing, budget, project, region, and IAM access.
2. Create the Artifact Registry repository and Cloud SQL instance/database.
3. Store the database URL and authentication secret in Secret Manager.
4. Build and deploy the API image, then record its Cloud Run URL.
5. Build the web image with the API URL as `VITE_SERVER_URL` and deploy it.
6. Update API CORS/trusted-origin configuration with the web URL.
7. Run additive migrations before accepting traffic.
8. Verify health, readiness, authentication, the Sprint 1 financial workflow, and
   one rejection/access restriction through the public web URL.

The actual project ID, resource URLs, revisions, image digests, migration result,
and browser evidence must be recorded after the team runs this plan in Cloud
Shell. No GCP resource or secret is created by repository tests.

## 2. GCP setup evidence

Complete these fields only after checking the Google Cloud Console:

| Check | Result/evidence |
| --- | --- |
| Approved account used | _Record account type only; do not record credentials_ |
| Billing or Free Trial active | _Record result and date_ |
| Teammate added to project | _Record GitHub/Google identity and role_ |
| Alerts-only budget created | _Record budget name and threshold; hide billing details in screenshots_ |
| Region and quota checked | _Record region and result_ |

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
| `VITE_SERVER_URL` | Web | No | Public server URL used by the web client. |

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
docker compose run --rm server bun run db:migrate:deploy
docker compose run --rm server bun run db:seed
```

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
JSON key in GitHub Actions secrets. The deployment environment must be restricted
to the `main` branch and must contain only the project, region, provider, and
deployer-service-account identifiers; runtime secrets remain in Secret Manager.

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

## 9. Release workflow

`.github/workflows/deploy.yml` runs after the `CI and Docker` workflow succeeds on
the exact `main` commit, or by manual dispatch. It authenticates with Workload
Identity Federation, builds API and web images tagged with the full commit SHA,
pushes them to Artifact Registry, creates or updates the migration job with its
explicit command and database configuration, deploys both public Cloud Run
services with explicit container ports, aligns the API trusted origin with the
web URL, and runs public health/readiness smoke checks.

Required `production` environment variables are `GCP_PROJECT_ID`, `GCP_REGION`,
`WIF_PROVIDER`, and `WIF_SERVICE_ACCOUNT`. The pre-provisioned runtime service
account must be `pockit-runner@PROJECT_ID.iam.gserviceaccount.com`, and it needs
Cloud SQL access plus access to the `pockit-database-url` and
`pockit-auth-secret` secrets. Runtime database and authentication secrets remain
in Secret Manager. Record the workflow URL, image tags, Cloud Run revisions,
smoke-test result, and serving commit for Issue #40.

