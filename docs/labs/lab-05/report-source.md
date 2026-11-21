# Lab 5 submission source — Section 1, PEEEEEEJA

Use this source to prepare `lab5_sec1_PEEEEEEJA.pdf` once all checks have
evidence. It is intentionally incomplete; do not submit it as a final PDF.
Every link and result must be rechecked against the release commit before
export. Use synthetic data and remove secret values from any screenshots.

## Answer Part 0: Team and Evidence Index

Topic: 7 — Personal Money and Expense Logging System (Pockit).

| Student | ID | GitHub | Evidence of participation |
| --- | --- | --- | --- |
| Polwarit Watthanahemmarat | 67070501067 | [MadMax168](https://github.com/MadMax168) | [PR #57](https://github.com/CPE334-Pockit/Pockit/pull/57), local Docker and browser verification; [Issue #36](https://github.com/CPE334-Pockit/Pockit/issues/36). |
| Guntee Doungmanee | 67070501003 | [ovenmakemeheat](https://github.com/ovenmakemeheat) | Teammate reviews in [PR #44](https://github.com/CPE334-Pockit/Pockit/pull/44) and [PR #48](https://github.com/CPE334-Pockit/Pockit/pull/48). Add deployment and release contributions after execution. |

- [Public repository](https://github.com/CPE334-Pockit/Pockit).
- [PR #58](https://github.com/CPE334-Pockit/Pockit/pull/58) merged the
  preparatory evidence index and report source into `lab5` at
  `9ca079f4f4c48f9d85e1a63861c7de7bf3e54469`; this follow-up records
  the completed C-02 demonstration and repository migration.
- Reviewed release commit: `5256b3cd7b9269dc32db5bd10abfe401bbaeb958` ([PR #70](https://github.com/CPE334-Pockit/Pockit/pull/70)); final submitted tag pending.
- Public web/API URL: `https://s4b043a2c-4d7hbszvwq-as.a.run.app`; initial
  manual Pockit revision `s4b043a2c-00002-82b` served the reviewed commit.
  Current revision `s4b043a2c-lab5redeploy` serves the same image at 100% traffic.
- [C-01 through C-06 evidence index](evidence-index.md): C-01 and C-02 are
  verified; C-03 has integrated local Docker evidence; C-04 is verified by the
  public finance workflow and access restriction; C-05 is supported by cloud
  revision/readiness commands and the team's before/after observations, with
  one distinct before image and one post-redeployment image. There is no
  independent screenshot between the rollouts. C-06 has reviewed release,
  manual deployment and live smoke evidence, but still needs a successful
  GitHub Actions deployment.

## Answer Part 1: CI and Quality Gate

- [CI workflow](https://github.com/CPE334-Pockit/Pockit/blob/lab5/.github/workflows/ci-docker.yml),
  [passing PR #50](https://github.com/CPE334-Pockit/Pockit/pull/50), and
  [passing run 44025791559](https://github.com/CPE334-Pockit/Pockit/actions/runs/44025791559)
  on `3057e867b379b017da5a16110afd869c29a694f9` prove C-01.
- [Active `main` ruleset](https://github.com/CPE334-Pockit/Pockit/rules/27470351)
  requires PRs, one approval and the `test-and-docker` check. In normal
  [PR #63](https://github.com/CPE334-Pockit/Pockit/pull/63), the intentional
  test failed in [Actions run 44135270043](https://github.com/CPE334-Pockit/Pockit/actions/runs/44135270043).
  GitHub displayed the failed check as `Required`, `Merging is blocked`, and a
  disabled merge button. The PR was closed without merging, and `main` stayed
  at `211bb77fb2a5ccb95027d9d110e0132ff1001918` (C-02).

## Answer Part 2: Docker and Reproducible Configuration

- [Docker Compose](https://github.com/CPE334-Pockit/Pockit/blob/lab5/docker-compose.yml),
  [server image](https://github.com/CPE334-Pockit/Pockit/blob/lab5/apps/server/Dockerfile),
  [web image](https://github.com/CPE334-Pockit/Pockit/blob/lab5/apps/web/Dockerfile),
  [Docker ignore](https://github.com/CPE334-Pockit/Pockit/blob/lab5/.dockerignore).
- [PR #57](https://github.com/CPE334-Pockit/Pockit/pull/57) records local
  image build, four migrations, synthetic seed, healthy API/web/DB, and a
  browser journey on source commit `499f02b67c101699a5e302b23fa4adf3fd4e4aa3`.
  A separate clean checkout first exposed a missing Prisma Client in the image;
  PR #57 head `42f67d6` generates it during Docker build. The fixed checkout
  built both images, applied migrations, seeded demo data and served healthy
  API/web endpoints. Teammate review passed and PR #57 merged into `lab5` at
  `43d471f4bac4d17a4c2a4bd61ae74b6e4aa40e9a`.
- [Deployment configuration table](deployment.md) explains environment
  variables and which values must stay secret.

## Answer Part 3: GCP Deployment and Persistence

The university portal prepared team PEEEEEEJA's resources on 2026-11-19 in
`cpe-se-course-2026` / `asia-southeast1`, including one Cloud SQL instance and
the reserved public URL above. The [portal completion](artifacts/course-ready-2026-11-19.png)
and [resource record](artifacts/course-resources-2026-11-19.png) are setup
evidence. Pockit replaced the placeholder by a manual deployment of reviewed
commit `5256b3c`: migration and course User bootstrap completed, and initial
revision `s4b043a2c-00002-82b` served 100% of traffic. Current revision
`s4b043a2c-lab5redeploy` serves the same image at 100%. The public root, login, health
and readiness paths returned HTTP 200; an unauthenticated finance read returned
HTTP 401. A team-provided screenshot shows successful public sign-in to the
dashboard and the `LAB5-PERSIST-20261120` Salary receipt for THB 123.45;
Cash on hand and Income both show THB 123.45. The original screenshot is
kept locally because browser chrome includes unrelated personal tabs and
bookmarks. A fresh application revision `s4b043a2c-lab5restart` served the
same release image and public readiness reported `db: connected`; the team
member reported that the record and balance remained visible after refreshing.
A separate manual redeployment created `s4b043a2c-lab5redeploy` from the
same image; public readiness again reported `db: connected`. The team member
reported that the same record and balance remained visible after refreshing
on both revisions. Issue #41 AC-L5-08-01/02 are checked against these
team-observed results and command/revision evidence. The two images submitted
as after-stage evidence have the same SHA-256 digest and are byte-identical.
The team confirmed it has no separate after-restart screenshot. Retain one as
the post-redeployment image; do not present them as two independent images.
The original browser chrome includes unrelated personal tabs and bookmarks,
so place a privacy-safe view in the PDF.
The local Compose restart retained three synthetic Users as supporting local
evidence. For the final PDF, pair the distinct before and post-redeployment
dashboard images and label the first cloud restart as team-reported, supported
by the named revision and readiness command results. Do not imply that the
byte-identical after-stage files are two separate screenshots.

## Answer Part 4: Repeatable Release Pipeline

- [Deployment workflow](https://github.com/CPE334-Pockit/Pockit/blob/lab5/.github/workflows/deploy.yml)
  is present on `lab5`. [PR #56](https://github.com/CPE334-Pockit/Pockit/pull/56)
  documents the release sequence; it was reviewed and merged into `lab5` at
  `30ac9e8a50a28460193a07a3e743179c5965ac6f`.
- [Release PR #70](https://github.com/CPE334-Pockit/Pockit/pull/70) merged
  `lab5` → `main` at `5256b3c`; [main CI](https://github.com/CPE334-Pockit/Pockit/actions/runs/44756809917)
  passed. [Automatic deploy](https://github.com/CPE334-Pockit/Pockit/actions/runs/44757283437)
  and [manual dispatch](https://github.com/CPE334-Pockit/Pockit/actions/runs/44757614254)
  both failed at the course WIF provider's attribute condition before updating
  GCP. A separate manual deployment of the same image succeeded and its Cloud
  Run revision/digest are recorded in [deployment.md](deployment.md). C-06
  still needs a successful GitHub Actions deployment and live workflow evidence.
