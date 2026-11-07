import { createPrismaClient } from "@Pockit/db";

import { ENV } from "./env.server";
import { seedDemoData } from "./seed-data";

async function main() {
  if (ENV.NODE_ENV === "production") {
    throw new Error("Synthetic demo seeding is disabled in production.");
  }
  if (!ENV.POCKIT_DEMO_PASSWORD) {
    throw new Error(
      "Set POCKIT_DEMO_PASSWORD in the local environment before seeding demo data.",
    );
  }

  const db = createPrismaClient(ENV);
  try {
    const result = await seedDemoData(db, ENV.POCKIT_DEMO_PASSWORD);
    console.info(
      `Seeded ${result.users} synthetic identities and ${result.accounts} financial accounts.`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown seed error";
  console.error(`Demo seed failed: ${message}`);
  process.exitCode = 1;
});
