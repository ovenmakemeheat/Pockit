# Pockit

Pockit is a Bun 1.4.4 TypeScript monorepo for a personal money and expense logging system. It uses React/TanStack Start, Elysia, tRPC, Better Auth, Prisma, PostgreSQL, Tailwind/shadcn UI, Biome, and Turborepo.

## Prerequisites

- Bun **1.4.4** (`bun --version`); the repository pins this version in `.tool-versions` and `package.json`.
- Docker with Docker Compose for the local PostgreSQL service
- Git

If you use mise, run `mise install` and verify the selected runtime with `mise exec -- bun --version`; commands can be run through `mise exec -- bun ...` if mise shims are not active in your shell. Ensure `bun --version` resolves to 1.4.4 before running workspace scripts.

## Clean-checkout setup

From the repository root:

```sh
bun install
```

Create local environment files from the committed examples. PowerShell:

```powershell
Copy-Item apps/server/.env.example apps/server/.env
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item packages/db/.env.example packages/db/.env
```

Bash:

```sh
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
cp packages/db/.env.example packages/db/.env
```

The `.env` files are local-only and ignored by Git. Replace `BETTER_AUTH_SECRET` in `apps/server/.env` with a random local value of at least 32 characters before using authentication. Keep the `DATABASE_URL` values in `apps/server/.env` and `packages/db/.env` aligned. Never commit real credentials, secrets, or personal/financial data.

## Local PostgreSQL and Prisma

Start the development-only PostgreSQL service:

```sh
bun run db:dev:up
docker compose -f docker-compose.db.yml ps
```

The service binds to localhost port 5432, uses synthetic local credentials from the Compose file, and stores data in the `pockit-postgres-data` Docker volume. To use another port, set `POCKIT_POSTGRES_PORT` before starting it and update both local `DATABASE_URL` values. Stop the service without deleting its data with:

```sh
bun run db:dev:down
```

Generate the Prisma client and apply the checked-in, versioned migrations to the local database:

```sh
bun run db:generate
bun run db:migrate
```

For each schema change, create and review a migration with `bun run db:migrate -- --name <descriptive_name>`, then commit the migration with the schema change. Use `bun run db:migrate:deploy` to apply committed migrations in a deployment environment. Do not use `db:push` as a substitute for versioned team migrations. Never reset or apply migrations to an unknown database.

Seed the synthetic demo identities and owned finance accounts after applying migrations. Set `POCKIT_DEMO_PASSWORD` in the ignored `apps/server/.env` file first; it is used only to hash credentials for the local demo User, second User, and Administrator. The same local password is used for those synthetic identities. The seed command refuses to run in production, and reruns do not delete transactions or reset seeded opening balances:

```sh
bun run db:seed
```

Prisma CLI commands run with Bun. After changing an environment schema, regenerate Varlock accessors with:

```sh
bun run env:generate
```

## Run the applications

```sh
bun run dev
```

- Web: <http://localhost:3001>
- API server: <http://localhost:3000>

To start one application only, use `bun run dev:web` or `bun run dev:server`.

## Tests and checks

The root test command generates Prisma Client and runs the web, server, API, and PostgreSQL-backed test suites. Start PostgreSQL and apply migrations first:

```sh
bun run test
```

The database test connects to the configured database and fails if it cannot connect; it does not silently skip database coverage. Use only the disposable local development database for this command.

Other root checks:

```sh
bun run build
bun run check-types
bun run check
```

`bun run check` is read-only. `bun run format` applies Biome formatting changes and may modify files; inspect its diff before accepting changes.

## Environment configuration

Each app/package owns a committed `.env.schema` and safe `.env.example`. Copy the example to the same directory as `.env` for local values. Varlock generates TypeScript accessors during `bun install`; run `bun run env:generate` after editing schemas. Keep local values in ignored `.env` files or a deployment secret manager. Do not paste or commit secret values.

## Repository structure

```text
apps/
  web/       React + TanStack Start frontend
  server/    Elysia HTTP server and tRPC adapter
packages/
  api/       tRPC router and API context
  auth/      Better Auth setup
  db/        Prisma schema, client, and versioned migrations
  ui/        Shared UI components and styles
  config/    Shared TypeScript and tooling configuration
docs/        Requirements, engineering contracts, and agent guidance
```

Shared UI primitives live in `packages/ui/src/components`. Add app-specific UI in `apps/web` and domain/API behavior in the relevant shared package. See `AGENTS.md` for product scope, privacy rules, issue workflow, and evidence requirements.
