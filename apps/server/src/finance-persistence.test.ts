import type { Context } from "@Pockit/api/context";
import type { AppRouter } from "@Pockit/api/routers/index";
import { appRouter } from "@Pockit/api/routers/index";
import { createPrismaClient } from "@Pockit/db";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createServerApp } from "./app";

const databaseUrl = Bun.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must point to a disposable PostgreSQL test database.",
  );
}

const db = createPrismaClient({ DATABASE_URL: databaseUrl });
let cleanupDb = db;
const userId = crypto.randomUUID();
const accountIds = {
  bank: crypto.randomUUID(),
  card: crypto.randomUUID(),
  income: crypto.randomUUID(),
  dining: crypto.randomUUID(),
  groceries: crypto.randomUUID(),
};
const session = {
  session: { id: `restart-session-${userId}`, userId },
  user: {
    id: userId,
    name: "Synthetic Restart User",
    role: "User",
    isEnabled: true,
  },
} as NonNullable<Context["session"]>;

function createApiApp(database: typeof db) {
  return createServerApp({
    corsOrigin: "http://localhost:3001",
    authHandler: async () => new Response(null, { status: 401 }),
    trpcHandler: (request) =>
      fetchRequestHandler({
        endpoint: "/trpc",
        req: request,
        router: appRouter,
        createContext: () => ({ db: database, session }),
      }),
  });
}

function createHttpClient(app: ReturnType<typeof createApiApp>) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "http://localhost:3000/trpc",
        fetch: (input, init) => app.handle(new Request(input, init)) as never,
      }),
    ],
  });
}

describe("financial data across server-instance recreation", () => {
  beforeAll(async () => {
    await db.user.create({
      data: {
        id: userId,
        name: "Synthetic Restart User",
        email: `${userId}@example.test`,
      },
    });
    await db.financialAccount.createMany({
      data: [
        { id: accountIds.bank, ownerId: userId, name: "Bank", type: "CASH" },
        {
          id: accountIds.card,
          ownerId: userId,
          name: "Card",
          type: "LOAN_TAKEN",
        },
        {
          id: accountIds.income,
          ownerId: userId,
          name: "Salary",
          type: "INCOME",
        },
        {
          id: accountIds.dining,
          ownerId: userId,
          name: "Dining",
          type: "EXPENSE",
        },
        {
          id: accountIds.groceries,
          ownerId: userId,
          name: "Groceries",
          type: "EXPENSE",
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanupDb.financialTransaction.deleteMany({
      where: { ownerId: userId },
    });
    await cleanupDb.financialAccount.deleteMany({ where: { ownerId: userId } });
    await cleanupDb.user.deleteMany({ where: { id: userId } });
    await cleanupDb.$disconnect();
  });

  it("serves the persisted financial journey after rebuilding the HTTP app and DB client", async () => {
    const firstApp = createApiApp(db);
    const firstClient = createHttpClient(firstApp);
    await firstClient.finance.accounts.setOpeningBalance.mutate({
      accountId: accountIds.bank,
      amount: "1000.00",
    });
    await firstClient.finance.transactions.create.mutate({
      form: "RECEIVE_MONEY",
      sourceAccountId: accountIds.bank,
      totalAmount: "1500.00",
      transactionDate: "2026-11-01",
      allocations: [
        { kind: "INCOME", accountId: accountIds.income, amount: "1500.00" },
      ],
    });
    await firstClient.finance.transactions.create.mutate({
      form: "PAYMENT_CHARGE",
      sourceAccountId: accountIds.card,
      totalAmount: "100.00",
      transactionDate: "2026-11-02",
      allocations: [
        { kind: "EXPENSE", accountId: accountIds.dining, amount: "65.00" },
        {
          kind: "EXPENSE",
          accountId: accountIds.groceries,
          amount: "35.00",
        },
      ],
    });
    await firstClient.finance.transactions.create.mutate({
      form: "PAYMENT_CHARGE",
      sourceAccountId: accountIds.bank,
      totalAmount: "40.00",
      transactionDate: "2026-11-03",
      allocations: [
        {
          kind: "LOAN_TAKEN_REPAYMENT",
          accountId: accountIds.card,
          amount: "40.00",
        },
      ],
    });

    await db.$disconnect();
    const reopenedDb = createPrismaClient({ DATABASE_URL: databaseUrl });
    cleanupDb = reopenedDb;
    {
      const restartedApp = createApiApp(reopenedDb);
      const restartedClient = createHttpClient(restartedApp);
      const [accounts, summary, history] = await Promise.all([
        restartedClient.finance.accounts.list.query(),
        restartedClient.finance.summary.get.query(),
        restartedClient.finance.transactions.history.query(),
      ]);

      expect(accounts.find(({ id }) => id === accountIds.bank)?.balance).toBe(
        "2460.00",
      );
      expect(accounts.find(({ id }) => id === accountIds.card)?.balance).toBe(
        "60.00",
      );
      expect(summary.incomeTotal).toBe("1500.00");
      expect(summary.expenseTotal).toBe("100.00");
      expect(history).toHaveLength(3);
      const persistedPurchase = history.find(
        ({ sourceAccountId }) => sourceAccountId === accountIds.card,
      );
      expect(
        persistedPurchase?.allocations.map(({ amount }) => amount).sort(),
      ).toEqual(["35.00", "65.00"]);
    }
  });
});
