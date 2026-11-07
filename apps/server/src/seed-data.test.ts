import type { Context } from "@Pockit/api/context";
import { appRouter } from "@Pockit/api/routers/index";
import { createPrismaClient } from "@Pockit/db";
import { afterAll, beforeAll, expect, it } from "bun:test";
import {
  DEMO_ADMIN,
  DEMO_FINANCIAL_ACCOUNTS,
  DEMO_SECOND_USER,
  DEMO_USER,
  DEMO_USERS,
  seedDemoData,
} from "./seed-data";

const databaseUrl = Bun.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must point to a disposable PostgreSQL test database.",
  );
}

const db = createPrismaClient({ DATABASE_URL: databaseUrl });
const demoUserIds = DEMO_USERS.map(({ id }) => id);
const demoPassword = "synthetic-seed-password";

async function clearDemoFixtures() {
  await db.financialTransaction.deleteMany({
    where: { ownerId: { in: demoUserIds } },
  });
  await db.financialAccount.deleteMany({
    where: { ownerId: { in: demoUserIds } },
  });
  await db.account.deleteMany({ where: { userId: { in: demoUserIds } } });
  await db.user.deleteMany({ where: { id: { in: demoUserIds } } });
}

beforeAll(clearDemoFixtures);
afterAll(async () => {
  await clearDemoFixtures();
  await db.$disconnect();
});

it("seeds synthetic identities and owned finance accounts idempotently", async () => {
  await seedDemoData(db, demoPassword);

  const users = await db.user.findMany({
    where: { id: { in: demoUserIds } },
  });
  expect(users).toHaveLength(DEMO_USERS.length);
  expect(users.find(({ id }) => id === DEMO_ADMIN.id)?.role).toBe(
    "Administrator",
  );

  const accounts = await db.financialAccount.findMany({
    where: { ownerId: { in: demoUserIds } },
    select: { id: true, ownerId: true, type: true },
  });
  expect(accounts).toEqual(
    expect.arrayContaining(
      DEMO_FINANCIAL_ACCOUNTS.map(({ id, ownerId, type }) => ({
        id,
        ownerId,
        type,
      })),
    ),
  );
  expect(accounts).toHaveLength(DEMO_FINANCIAL_ACCOUNTS.length);
  expect(
    await db.financialAccount.count({ where: { ownerId: DEMO_ADMIN.id } }),
  ).toBe(0);

  for (const user of [DEMO_USER, DEMO_SECOND_USER]) {
    const session = {
      session: { id: `session-${user.id}`, userId: user.id },
      user: { ...user, isEnabled: true },
    } as NonNullable<Context["session"]>;
    const visibleAccounts = await appRouter
      .createCaller({ db, session })
      .finance.accounts.list();
    expect(visibleAccounts.map(({ id }) => id).sort()).toEqual(
      DEMO_FINANCIAL_ACCOUNTS.filter(({ ownerId }) => ownerId === user.id)
        .map(({ id }) => id)
        .sort(),
    );
  }

  for (const user of DEMO_USERS) {
    const credential = await db.account.findFirstOrThrow({
      where: { userId: user.id, providerId: "credential" },
    });
    expect(credential.password).toBeTruthy();
    expect(credential.password).not.toBe(demoPassword);
  }

  const bank = DEMO_FINANCIAL_ACCOUNTS.find(
    ({ id }) => id === "pockit-demo-user-bank",
  );
  if (!bank) {
    throw new Error("Expected seeded bank account fixture");
  }
  await db.financialAccount.update({
    where: { id: bank.id },
    data: { openingBalanceMinorUnits: "250000" },
  });
  const transaction = await db.financialTransaction.create({
    data: {
      ownerId: bank.ownerId,
      form: "RECEIVE_MONEY",
      totalMinorUnits: "1000",
      transactionDate: new Date("2026-11-06T00:00:00.000Z"),
      sourceAccountId: bank.id,
      description: "Synthetic user-created record",
    },
  });

  await seedDemoData(db, demoPassword);

  expect(
    await db.financialAccount.count({
      where: { ownerId: { in: demoUserIds } },
    }),
  ).toBe(DEMO_FINANCIAL_ACCOUNTS.length);
  expect(
    await db.financialAccount.findUniqueOrThrow({ where: { id: bank.id } }),
  ).toMatchObject({ openingBalanceMinorUnits: "250000" });
  expect(
    await db.financialTransaction.findUnique({ where: { id: transaction.id } }),
  ).toMatchObject({
    id: transaction.id,
    description: "Synthetic user-created record",
  });
  expect(
    await db.financialTransaction.count({ where: { ownerId: bank.ownerId } }),
  ).toBe(1);
});
