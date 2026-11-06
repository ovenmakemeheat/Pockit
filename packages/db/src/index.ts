import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../prisma/generated/client";
import type { DatabaseConfig } from "./config";

export { Prisma } from "../prisma/generated/client";

export function createPrismaClient(env: DatabaseConfig) {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

export type Database = ReturnType<typeof createPrismaClient>;
