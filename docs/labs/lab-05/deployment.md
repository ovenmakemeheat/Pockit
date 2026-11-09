# Lab 5 Deployment Record

This document is the evidence record for Lab 5. Update it with actual commands,
links, results, and tested commits as the work is performed. Do not put passwords,
connection strings, API keys, service-account keys, or other secrets here.

## 1. Team and baseline

| Item | Value |
| --- | --- |
| Repository | `https://github.com/ovenmakemeheat/Pockit` |
| Lab 5 staging branch | `lab5` |
| Current Issue | [#34](https://github.com/ovenmakemeheat/Pockit/issues/34) |
| Working branch | `lab5-cloud-ready` |
| Sprint 1 baseline commit | `e99da77` |
| GCP project ID | _To be recorded after setup_ |
| GCP region | _To be recorded after setup_ |
| Public service URL | _To be recorded after deployment_ |

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

## 4. Evidence rules

- Record the exact command, result, and tested commit for repository checks.
- Link Issues, PRs, reviews, workflow runs, and deployed revisions directly.
- Use screenshots only when a link cannot prove the result, such as a blocked merge
  button or before/after persistence state.
- Redact secrets and personal billing information before adding screenshots.
- Keep this document updated at each Lab 5 lifecycle transition.

## 5. Planned evidence index

| Check | Requirement | Artifact/result |
| --- | --- | --- |
| C-01 | R-05 | _Passing PR and CI run_ |
| C-02 | R-06 | _Failing temporary PR with merge blocked_ |
| C-03 | R-01, R-02 | _Clean-clone Docker build/run_ |
| C-04 | R-03 | _Live URL workflow evidence_ |
| C-05 | R-04 | _Data before/after restart and redeploy_ |
| C-06 | R-07-R-10 | _Reviewed release and running commit_ |

