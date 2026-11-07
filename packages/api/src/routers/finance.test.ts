import { createPrismaClient } from "@Pockit/db";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { Context } from "../context";
import { appRouter } from "./index";

const databaseUrl = Bun.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must point to a disposable PostgreSQL test database.",
  );
}

const db = createPrismaClient({ DATABASE_URL: databaseUrl });
const ids = {
  userA: crypto.randomUUID(),
  userB: crypto.randomUUID(),
  administrator: crypto.randomUUID(),
};
const accounts = {
  bank: crypto.randomUUID(),
  card: crypto.randomUUID(),
  salary: crypto.randomUUID(),
  dining: crypto.randomUUID(),
  groceries: crypto.randomUUID(),
  lowCash: crypto.randomUUID(),
  openingOnlyCash: crypto.randomUUID(),
  singleLineCard: crypto.randomUUID(),
  singleLineExpense: crypto.randomUUID(),
  raceCash: crypto.randomUUID(),
  raceCard: crypto.randomUUID(),
  raceExpense: crypto.randomUUID(),
  userBBank: crypto.randomUUID(),
};
function caller(userId: string, role = "User", database = db) {
  const session = {
    session: { id: `session-${userId}`, userId },
    user: {
      id: userId,
      name: `Synthetic ${role}`,
      role,
      isEnabled: true,
    },
  } as NonNullable<Context["session"]>;
  return appRouter.createCaller({ db: database, session });
}

const userCaller = () => caller(ids.userA);
const administratorCaller = () => caller(ids.administrator, "Administrator");

async function expectRejectedWithCode(
  operation: Promise<unknown>,
  code: string,
) {
  let rejection: unknown;
  try {
    await operation;
  } catch (error) {
    rejection = error;
  }
  expect(rejection).toMatchObject({ code });
}

beforeAll(async () => {
  await db.user.createMany({
    data: [
      {
        id: ids.userA,
        name: "Finance User A",
        email: `${ids.userA}@example.test`,
      },
      {
        id: ids.userB,
        name: "Finance User B",
        email: `${ids.userB}@example.test`,
      },
      {
        id: ids.administrator,
        name: "Finance Administrator",
        email: `${ids.administrator}@example.test`,
        role: "Administrator",
      },
    ],
  });

  await db.financialAccount.createMany({
    data: [
      {
        id: accounts.bank,
        ownerId: ids.userA,
        name: "Demo bank",
        type: "CASH",
      },
      {
        id: accounts.card,
        ownerId: ids.userA,
        name: "Demo card",
        type: "LOAN_TAKEN",
      },
      {
        id: accounts.salary,
        ownerId: ids.userA,
        name: "Salary",
        type: "INCOME",
      },
      {
        id: accounts.dining,
        ownerId: ids.userA,
        name: "Dining",
        type: "EXPENSE",
      },
      {
        id: accounts.groceries,
        ownerId: ids.userA,
        name: "Groceries",
        type: "EXPENSE",
      },
      {
        id: accounts.lowCash,
        ownerId: ids.userA,
        name: "Low balance wallet",
        type: "CASH",
      },
      {
        id: accounts.openingOnlyCash,
        ownerId: ids.userA,
        name: "Opening-only synthetic cash",
        type: "CASH",
      },
      {
        id: accounts.singleLineCard,
        ownerId: ids.userA,
        name: "Single-line test card",
        type: "LOAN_TAKEN",
      },
      {
        id: accounts.singleLineExpense,
        ownerId: ids.userA,
        name: "Small purchases",
        type: "EXPENSE",
      },
      {
        id: accounts.raceCash,
        ownerId: ids.userA,
        name: "Snapshot test Cash",
        type: "CASH",
      },
      {
        id: accounts.raceCard,
        ownerId: ids.userA,
        name: "Snapshot test card",
        type: "LOAN_TAKEN",
      },
      {
        id: accounts.raceExpense,
        ownerId: ids.userA,
        name: "Snapshot test Expense",
        type: "EXPENSE",
      },
      {
        id: accounts.userBBank,
        ownerId: ids.userB,
        name: "Private bank",
        type: "CASH",
      },
    ],
  });
});

afterAll(async () => {
  await db.financialTransaction.deleteMany({
    where: { ownerId: { in: Object.values(ids) } },
  });
  await db.financialAccount.deleteMany({
    where: { ownerId: { in: Object.values(ids) } },
  });
  await db.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await db.$disconnect();
});

describe("Sprint 1 financial API", () => {
  it("persists the opening balance, salary, split card purchase, and repayment with correct totals", async () => {
    const api = userCaller();

    await api.finance.accounts.setOpeningBalance({
      accountId: accounts.bank,
      amount: "1000.00",
    });
    await api.finance.transactions.create({
      form: "RECEIVE_MONEY",
      sourceAccountId: accounts.bank,
      totalAmount: "1500.00",
      transactionDate: "1999-01-01",
      allocations: [
        { kind: "INCOME", accountId: accounts.salary, amount: "1500.00" },
      ],
    });
    await api.finance.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: accounts.card,
      totalAmount: "100.00",
      transactionDate: "2026-11-02",
      allocations: [
        { kind: "EXPENSE", accountId: accounts.dining, amount: "65.00" },
        { kind: "EXPENSE", accountId: accounts.groceries, amount: "35.00" },
      ],
    });
    await api.finance.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: accounts.bank,
      totalAmount: "40.00",
      transactionDate: "2026-11-03",
      allocations: [
        {
          kind: "LOAN_TAKEN_REPAYMENT",
          accountId: accounts.card,
          amount: "40.00",
        },
      ],
    });

    const accountList = await api.finance.accounts.list();
    expect(accountList.find(({ id }) => id === accounts.bank)?.balance).toBe(
      "2460.00",
    );
    expect(accountList.find(({ id }) => id === accounts.card)?.balance).toBe(
      "60.00",
    );

    const summary = await api.finance.summary.get();
    expect(summary.incomeTotal).toBe("1500.00");
    expect(summary.expenseTotal).toBe("100.00");
    expect(summary.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: accounts.dining, total: "65.00" }),
        expect.objectContaining({
          accountId: accounts.groceries,
          total: "35.00",
        }),
      ]),
    );

    const history = await api.finance.transactions.history();
    expect(history).toHaveLength(3);
    expect(history.map(({ transactionDate }) => transactionDate)).toEqual([
      "2026-11-03",
      "2026-11-02",
      "1999-01-01",
    ]);
    expect(
      await db.financialTransaction.count({ where: { ownerId: ids.userA } }),
    ).toBe(3);
    expect(
      await db.allocationLine.count({ where: { ownerId: ids.userA } }),
    ).toBe(4);

    const reopenedDb = createPrismaClient({ DATABASE_URL: databaseUrl });
    try {
      const reopenedApi = appRouter.createCaller({
        db: reopenedDb,
        session: {
          session: { id: "reopened-synthetic-session", userId: ids.userA },
          user: {
            id: ids.userA,
            name: "Synthetic User A",
            role: "User",
            isEnabled: true,
          },
        } as NonNullable<Context["session"]>,
      });
      expect(
        (
          await reopenedApi.finance.accounts.get({
            accountId: accounts.bank,
          })
        ).balance,
      ).toBe("2460.00");
      expect(await reopenedApi.finance.transactions.history()).toHaveLength(3);
      expect((await reopenedApi.finance.summary.get()).expenseTotal).toBe(
        "100.00",
      );
    } finally {
      await reopenedDb.$disconnect();
    }
  });

  it("keeps opening balances out of income and expense totals", async () => {
    const api = userCaller();
    const summaryBefore = await api.finance.summary.get();
    const transactionsBefore = await db.financialTransaction.count({
      where: { ownerId: ids.userA },
    });

    await api.finance.accounts.setOpeningBalance({
      accountId: accounts.openingOnlyCash,
      amount: "123.45",
    });

    expect(
      (
        await api.finance.accounts.get({
          accountId: accounts.openingOnlyCash,
        })
      ).balance,
    ).toBe("123.45");
    const summaryAfter = await api.finance.summary.get();
    expect(summaryAfter.incomeTotal).toBe(summaryBefore.incomeTotal);
    expect(summaryAfter.expenseTotal).toBe(summaryBefore.expenseTotal);
    expect(
      await db.financialTransaction.count({ where: { ownerId: ids.userA } }),
    ).toBe(transactionsBefore);
    await expectRejectedWithCode(
      api.finance.accounts.setOpeningBalance({
        accountId: accounts.card,
        amount: "1.00",
      }),
      "BAD_REQUEST",
    );
    await expectRejectedWithCode(
      api.finance.accounts.setOpeningBalance({
        accountId: accounts.userBBank,
        amount: "1.00",
      }),
      "NOT_FOUND",
    );
    await expectRejectedWithCode(
      api.finance.accounts.setOpeningBalance({
        accountId: accounts.openingOnlyCash,
        amount: "0.00",
      }),
      "BAD_REQUEST",
    );
    await expectRejectedWithCode(
      api.finance.accounts.setOpeningBalance({
        accountId: accounts.openingOnlyCash,
        amount: "-1.00",
      }),
      "BAD_REQUEST",
    );
    expect(
      (
        await api.finance.accounts.get({
          accountId: accounts.openingOnlyCash,
        })
      ).balance,
    ).toBe("123.45");
  });

  it("rejects invalid transaction inputs without changing ledger state", async () => {
    const api = userCaller();
    const [
      transactionsBefore,
      allocationsBefore,
      summaryBefore,
      bankBefore,
      cardBefore,
    ] = await Promise.all([
      db.financialTransaction.count({ where: { ownerId: ids.userA } }),
      db.allocationLine.count({ where: { ownerId: ids.userA } }),
      api.finance.summary.get(),
      api.finance.accounts.get({ accountId: accounts.bank }),
      api.finance.accounts.get({ accountId: accounts.card }),
    ]);
    const invalidWrites = [
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "10.00",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "9.99" },
        ],
      },
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.001",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "1.001" },
        ],
      },
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.00",
        transactionDate: "2025-02-29",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "1.00" },
        ],
      },
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "0.00",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "0.00" },
        ],
      },
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.00",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "1.00" },
        ],
      },
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.00",
        transactionDate: "2026-11-04",
        allocations: [],
      },
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.dining,
        totalAmount: "1.00",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "1.00" },
        ],
      },
    ];

    for (const input of invalidWrites) {
      await expectRejectedWithCode(
        api.finance.transactions.create(input as never),
        "BAD_REQUEST",
      );
    }

    const [
      transactionsAfter,
      allocationsAfter,
      summaryAfter,
      bankAfter,
      cardAfter,
    ] = await Promise.all([
      db.financialTransaction.count({ where: { ownerId: ids.userA } }),
      db.allocationLine.count({ where: { ownerId: ids.userA } }),
      api.finance.summary.get(),
      api.finance.accounts.get({ accountId: accounts.bank }),
      api.finance.accounts.get({ accountId: accounts.card }),
    ]);
    expect(transactionsAfter).toBe(transactionsBefore);
    expect(allocationsAfter).toBe(allocationsBefore);
    expect(summaryAfter).toEqual(summaryBefore);
    expect(bankAfter.balance).toBe(bankBefore.balance);
    expect(cardAfter.balance).toBe(cardBefore.balance);
  });

  it("rejects over-repayment, Cash overdraft, and opening-balance rewrites", async () => {
    const api = userCaller();
    const countBefore = await db.financialTransaction.count({
      where: { ownerId: ids.userA },
    });

    await api.finance.accounts.setOpeningBalance({
      accountId: accounts.lowCash,
      amount: "0.01",
    });
    await expectRejectedWithCode(
      api.finance.accounts.setOpeningBalance({
        accountId: accounts.bank,
        amount: "2000.00",
      }),
      "BAD_REQUEST",
    );
    await expectRejectedWithCode(
      api.finance.transactions.create({
        form: "PAYMENT_CHARGE",
        sourceAccountId: accounts.bank,
        totalAmount: "60.01",
        transactionDate: "2026-11-04",
        allocations: [
          {
            kind: "LOAN_TAKEN_REPAYMENT",
            accountId: accounts.card,
            amount: "60.01",
          },
        ],
      }),
      "BAD_REQUEST",
    );
    await expectRejectedWithCode(
      api.finance.transactions.create({
        form: "PAYMENT_CHARGE",
        sourceAccountId: accounts.lowCash,
        totalAmount: "0.02",
        transactionDate: "2026-11-04",
        allocations: [
          {
            kind: "LOAN_TAKEN_REPAYMENT",
            accountId: accounts.card,
            amount: "0.02",
          },
        ],
      }),
      "BAD_REQUEST",
    );

    expect(
      await db.financialTransaction.count({ where: { ownerId: ids.userA } }),
    ).toBe(countBefore);
    expect(
      (await api.finance.accounts.get({ accountId: accounts.bank })).balance,
    ).toBe("2460.00");
    expect(
      (await api.finance.accounts.get({ accountId: accounts.card })).balance,
    ).toBe("60.00");
  });

  it("does not disclose another User account and rejects cross-owner writes", async () => {
    const api = userCaller();
    const countBeforeA = await db.financialTransaction.count({
      where: { ownerId: ids.userA },
    });
    const countBeforeB = await db.financialTransaction.count({
      where: { ownerId: ids.userB },
    });
    expect((await api.finance.accounts.list()).map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        accounts.bank,
        accounts.card,
        accounts.salary,
        accounts.dining,
        accounts.groceries,
        accounts.lowCash,
      ]),
    );
    expect(
      (await caller(ids.userB).finance.accounts.list()).map(({ id }) => id),
    ).toEqual([accounts.userBBank]);
    await expectRejectedWithCode(
      api.finance.accounts.get({ accountId: accounts.userBBank }),
      "NOT_FOUND",
    );

    await expectRejectedWithCode(
      api.finance.transactions.create({
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.00",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.userBBank, amount: "1.00" },
        ],
      }),
      "BAD_REQUEST",
    );
    await expectRejectedWithCode(
      api.finance.transactions.create({
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.00",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.dining, amount: "1.00" },
        ],
      }),
      "BAD_REQUEST",
    );
    expect(
      await db.financialTransaction.count({ where: { ownerId: ids.userA } }),
    ).toBe(countBeforeA);
    expect(
      await db.financialTransaction.count({ where: { ownerId: ids.userB } }),
    ).toBe(countBeforeB);
  });

  it("accepts a one-line card purchase and sums one-cent allocations exactly", async () => {
    const api = userCaller();
    const expensesBefore = (await api.finance.summary.get()).expenseTotal;
    const oneLinePurchase = await api.finance.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: accounts.singleLineCard,
      totalAmount: "10.00",
      transactionDate: "2026-11-05",
      allocations: [
        {
          kind: "EXPENSE",
          accountId: accounts.singleLineExpense,
          amount: "10.00",
        },
      ],
    });
    expect(oneLinePurchase.allocations).toHaveLength(1);
    expect(oneLinePurchase.allocations[0]?.amount).toBe("10.00");

    const smallAllocations = await api.finance.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: accounts.singleLineCard,
      totalAmount: "0.03",
      transactionDate: "2026-11-05",
      allocations: [
        {
          kind: "EXPENSE",
          accountId: accounts.singleLineExpense,
          amount: "0.01",
        },
        { kind: "EXPENSE", accountId: accounts.dining, amount: "0.01" },
        { kind: "EXPENSE", accountId: accounts.groceries, amount: "0.01" },
      ],
    });
    expect(smallAllocations.allocations.map(({ amount }) => amount)).toEqual([
      "0.01",
      "0.01",
      "0.01",
    ]);
    expect(
      (await api.finance.accounts.get({ accountId: accounts.singleLineCard }))
        .balance,
    ).toBe("10.03");
    expect(
      (await api.finance.summary.get()).categories.find(
        ({ accountId }) => accountId === accounts.singleLineExpense,
      )?.total,
    ).toBe("10.01");
    const expensesAfter = (await api.finance.summary.get()).expenseTotal;
    expect(
      BigInt(expensesAfter.replace(".", "")) -
        BigInt(expensesBefore.replace(".", "")),
    ).toBe(1003n);
  });

  it("reads a Loan Taken balance from one snapshot during concurrent postings", async () => {
    const api = userCaller();
    const concurrentWriterDb = createPrismaClient({
      DATABASE_URL: databaseUrl,
    });
    const concurrentWriter = caller(ids.userA, "User", concurrentWriterDb);
    await api.finance.accounts.setOpeningBalance({
      accountId: accounts.raceCash,
      amount: "200.00",
    });
    await api.finance.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: accounts.raceCard,
      totalAmount: "100.00",
      transactionDate: "2026-11-07",
      allocations: [
        {
          kind: "EXPENSE",
          accountId: accounts.raceExpense,
          amount: "100.00",
        },
      ],
    });

    let releaseChargeRead!: () => void;
    const chargeReadGate = new Promise<void>((resolve) => {
      releaseChargeRead = resolve;
    });
    let chargeReadReached!: () => void;
    const chargeRead = new Promise<void>((resolve) => {
      chargeReadReached = resolve;
    });
    let releaseAllocationRead!: () => void;
    const allocationReadGate = new Promise<void>((resolve) => {
      releaseAllocationRead = resolve;
    });
    const synchronizedDatabase = db.$extends({
      query: {
        financialTransaction: {
          async findMany({ args, query }) {
            const result = await query(args);
            if (args.where?.sourceAccountId === accounts.raceCard) {
              chargeReadReached();
              await chargeReadGate;
            }
            return result;
          },
        },
        allocationLine: {
          async findMany({ args, query }) {
            if (args.where?.accountId === accounts.raceCard) {
              await allocationReadGate;
            }
            return query(args);
          },
        },
      },
    });
    const racingApi = appRouter.createCaller({
      db: synchronizedDatabase as unknown as typeof db,
      session: {
        session: { id: `session-${ids.userA}`, userId: ids.userA },
        user: {
          id: ids.userA,
          name: "Synthetic User A",
          role: "User",
          isEnabled: true,
        },
      } as NonNullable<Context["session"]>,
    });
    const balanceRead = racingApi.finance.accounts.get({
      accountId: accounts.raceCard,
    });
    let chargeReadTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const chargeReadTimeout = new Promise<void>((_, reject) => {
      chargeReadTimeoutId = setTimeout(
        () => reject(new Error("Loan Taken charge query was not reached")),
        1_000,
      );
    });
    const balanceReadFinishedEarly = balanceRead.then(
      () => {
        throw new Error("Balance read finished before the charge query gate");
      },
      (error: unknown) => {
        throw error;
      },
    );

    try {
      await Promise.race([
        chargeRead,
        chargeReadTimeout,
        balanceReadFinishedEarly,
      ]);
      await concurrentWriter.finance.transactions.create({
        form: "PAYMENT_CHARGE",
        sourceAccountId: accounts.raceCard,
        totalAmount: "50.00",
        transactionDate: "2026-11-07",
        allocations: [
          {
            kind: "EXPENSE",
            accountId: accounts.raceExpense,
            amount: "50.00",
          },
        ],
      });
      await concurrentWriter.finance.transactions.create({
        form: "PAYMENT_CHARGE",
        sourceAccountId: accounts.raceCash,
        totalAmount: "150.00",
        transactionDate: "2026-11-07",
        allocations: [
          {
            kind: "LOAN_TAKEN_REPAYMENT",
            accountId: accounts.raceCard,
            amount: "150.00",
          },
        ],
      });
    } finally {
      if (chargeReadTimeoutId !== undefined) {
        clearTimeout(chargeReadTimeoutId);
      }
      releaseChargeRead();
      releaseAllocationRead();
      await concurrentWriterDb.$disconnect();
    }

    expect(await balanceRead).toMatchObject({ balance: "100.00" });
    expect(
      (await api.finance.accounts.get({ accountId: accounts.raceCard }))
        .balance,
    ).toBe("0.00");
  });

  it("denies unauthenticated and Administrator access to every financial read and write", async () => {
    const anonymous = appRouter.createCaller({ db, session: null });
    const administrator = administratorCaller();

    await expect(anonymous.finance.accounts.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(administrator.finance.accounts.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(administrator.finance.summary.get()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      administrator.finance.transactions.history(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      administrator.finance.accounts.setOpeningBalance({
        accountId: accounts.bank,
        amount: "1.00",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      administrator.finance.transactions.create({
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.00",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "1.00" },
        ],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
