import { afterAll, describe, expect, it } from "bun:test";

import { createPrismaClient } from "./index";

const databaseUrl = Bun.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required; copy packages/db/.env.example to packages/db/.env.",
  );
}

const db = createPrismaClient({ DATABASE_URL: databaseUrl });
afterAll(async () => db.$disconnect());

describe("PostgreSQL integration", () => {
  it("connects to the configured database and executes a query", async () => {
    const result = await db.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;

    expect(result).toEqual([{ ok: 1 }]);
  });

  it("has applied the checked-in initial migration", async () => {
    const migrations = await db.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE migration_name = '20261103000000_initial_auth_schema'
        AND finished_at IS NOT NULL
    `;

    expect(migrations).toEqual([
      { migration_name: "20261103000000_initial_auth_schema" },
    ]);
  });
});
