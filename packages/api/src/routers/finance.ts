import { Prisma } from "@Pockit/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "../context";
import {
  formatCalendarDate,
  formatMinorUnits,
  parseCalendarDate,
  parseMoneyToMinorUnits,
} from "../finance/value";
import { router, userProcedure } from "../index";

const allocationKinds = [
  "EXPENSE",
  "LOAN_TAKEN_REPAYMENT",
  "LOAN_GIVEN_LENDING",
  "TRANSFER_TO_CASH",
  "INCOME",
  "LOAN_GIVEN_REPAYMENT",
  "LOAN_TAKEN_BORROWING",
  "TRANSFER_FROM_CASH",
] as const;

const accountIdSchema = z.string().min(1);
const accountLookupSchema = z.object({ accountId: accountIdSchema });
const openingBalanceSchema = z.object({
  accountId: accountIdSchema,
  amount: z.string(),
});
const transactionSchema = z.object({
  form: z.enum(["PAYMENT_CHARGE", "RECEIVE_MONEY"]),
  sourceAccountId: accountIdSchema,
  totalAmount: z.string(),
  transactionDate: z.string(),
  description: z.string().optional(),
  allocations: z
    .array(
      z.object({
        kind: z.enum(allocationKinds),
        accountId: accountIdSchema,
        amount: z.string(),
      }),
    )
    .min(1),
});

type AccountRecord = Awaited<
  ReturnType<Prisma.TransactionClient["financialAccount"]["findFirstOrThrow"]>
>;

type DataClient = Prisma.TransactionClient;

function badRequest(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function missingAccount(): never {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Financial Account not found",
  });
}

function amountInMinorUnits(value: string): bigint {
  try {
    return parseMoneyToMinorUnits(value);
  } catch {
    return badRequest(
      "Amount must be a positive THB value with at most two fractional digits",
    );
  }
}

function transactionDate(value: string): Date {
  try {
    return parseCalendarDate(value);
  } catch {
    return badRequest(
      "Transaction date must be a valid YYYY-MM-DD calendar date",
    );
  }
}

function sumMinorUnits(values: string[]): bigint {
  return values.reduce((total, value) => total + BigInt(value), 0n);
}

function isSerializationConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

async function serializable<T>(
  db: Context["db"],
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await db.$transaction(operation, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    if (isSerializationConflict(error)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A concurrent financial update occurred; retry the operation",
        cause: error,
      });
    }
    throw error;
  }
}

async function findOwnedAccount(
  client: DataClient,
  ownerId: string,
  accountId: string,
) {
  const account = await client.financialAccount.findFirst({
    where: { id: accountId, ownerId },
  });
  if (!account) {
    return missingAccount();
  }
  return account;
}

async function accountBalanceMinorUnits(
  client: DataClient,
  account: NonNullable<AccountRecord>,
): Promise<bigint> {
  const opening = BigInt(account.openingBalanceMinorUnits ?? "0");

  if (account.type === "CASH") {
    const transactions = await client.financialTransaction.findMany({
      where: { ownerId: account.ownerId, sourceAccountId: account.id },
      select: { form: true, totalMinorUnits: true },
    });
    return transactions.reduce((balance, transaction) => {
      const amount = BigInt(transaction.totalMinorUnits);
      return transaction.form === "RECEIVE_MONEY"
        ? balance + amount
        : balance - amount;
    }, opening);
  }

  if (account.type === "LOAN_TAKEN") {
    const [transactions, allocations] = await Promise.all([
      client.financialTransaction.findMany({
        where: { ownerId: account.ownerId, sourceAccountId: account.id },
        select: { form: true, totalMinorUnits: true },
      }),
      client.allocationLine.findMany({
        where: {
          ownerId: account.ownerId,
          accountId: account.id,
          kind: { in: ["LOAN_TAKEN_REPAYMENT", "LOAN_TAKEN_BORROWING"] },
        },
        select: { kind: true, amountMinorUnits: true },
      }),
    ]);
    const charges = transactions.reduce(
      (total, transaction) =>
        transaction.form === "PAYMENT_CHARGE"
          ? total + BigInt(transaction.totalMinorUnits)
          : total,
      opening,
    );
    return allocations.reduce((balance, allocation) => {
      const amount = BigInt(allocation.amountMinorUnits);
      return allocation.kind === "LOAN_TAKEN_REPAYMENT"
        ? balance - amount
        : balance + amount;
    }, charges);
  }

  if (account.type === "LOAN_GIVEN") {
    const allocations = await client.allocationLine.findMany({
      where: {
        ownerId: account.ownerId,
        accountId: account.id,
        kind: { in: ["LOAN_GIVEN_LENDING", "LOAN_GIVEN_REPAYMENT"] },
      },
      select: { kind: true, amountMinorUnits: true },
    });
    return allocations.reduce((balance, allocation) => {
      const amount = BigInt(allocation.amountMinorUnits);
      return allocation.kind === "LOAN_GIVEN_LENDING"
        ? balance + amount
        : balance - amount;
    }, opening);
  }

  return 0n;
}

async function categoryTotalMinorUnits(
  client: DataClient,
  ownerId: string,
  accountId: string,
  kind: "INCOME" | "EXPENSE",
): Promise<bigint> {
  const lines = await client.allocationLine.findMany({
    where: { ownerId, accountId, kind },
    select: { amountMinorUnits: true },
  });
  return sumMinorUnits(lines.map(({ amountMinorUnits }) => amountMinorUnits));
}

function serializeAccount(
  account: NonNullable<AccountRecord>,
  amount: bigint | null,
) {
  const isCategory = account.type === "INCOME" || account.type === "EXPENSE";
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    currencyCode: account.currencyCode,
    openingBalance: account.openingBalanceMinorUnits
      ? formatMinorUnits(BigInt(account.openingBalanceMinorUnits))
      : null,
    balance: isCategory || amount === null ? null : formatMinorUnits(amount),
    categoryTotal:
      !isCategory || amount === null ? null : formatMinorUnits(amount),
  };
}

function serializeTransaction<
  T extends {
    id: string;
    form: string;
    totalMinorUnits: string;
    transactionDate: Date;
    sourceAccountId: string;
    description: string | null;
    allocations: Array<{
      id: string;
      accountId: string;
      kind: string;
      amountMinorUnits: string;
      account?: { name: string };
    }>;
  },
>(transaction: T) {
  return {
    id: transaction.id,
    form: transaction.form,
    totalAmount: formatMinorUnits(BigInt(transaction.totalMinorUnits)),
    transactionDate: formatCalendarDate(transaction.transactionDate),
    sourceAccountId: transaction.sourceAccountId,
    description: transaction.description,
    allocations: transaction.allocations.map((allocation) => ({
      id: allocation.id,
      accountId: allocation.accountId,
      accountName: allocation.account?.name,
      kind: allocation.kind,
      amount: formatMinorUnits(BigInt(allocation.amountMinorUnits)),
    })),
  };
}

function parseTransactionInput(input: z.infer<typeof transactionSchema>) {
  const totalMinorUnits = amountInMinorUnits(input.totalAmount);
  const date = transactionDate(input.transactionDate);
  const allocations = input.allocations.map((allocation) => ({
    ...allocation,
    amountMinorUnits: amountInMinorUnits(allocation.amount),
  }));
  const allocationTotal = allocations.reduce(
    (total, allocation) => total + allocation.amountMinorUnits,
    0n,
  );
  if (allocationTotal !== totalMinorUnits) {
    return badRequest("Allocation amounts must equal the Transaction total");
  }
  return { totalMinorUnits, date, allocations };
}

async function validateTransaction(
  client: DataClient,
  ownerId: string,
  input: z.infer<typeof transactionSchema>,
  parsed: ReturnType<typeof parseTransactionInput>,
) {
  const { totalMinorUnits, date, allocations } = parsed;
  const source = await findOwnedAccount(client, ownerId, input.sourceAccountId);
  const distinctAccountIds = [
    ...new Set(allocations.map(({ accountId }) => accountId)),
  ];
  const destinations = await client.financialAccount.findMany({
    where: { ownerId, id: { in: distinctAccountIds } },
  });
  if (destinations.length !== distinctAccountIds.length) {
    return badRequest("An allocation Account is unavailable");
  }
  const destinationById = new Map(
    destinations.map((account) => [account.id, account]),
  );

  for (const allocation of allocations) {
    const destination = destinationById.get(allocation.accountId);
    if (!destination) {
      return badRequest("An allocation Account is unavailable");
    }
    if (destination.currencyCode !== "THB") {
      return badRequest("Sprint 1 Transactions support THB Accounts only");
    }
  }
  if (source.currencyCode !== "THB") {
    return badRequest("Sprint 1 Transactions support THB Accounts only");
  }

  const isIncome = allocations.every(
    (allocation) =>
      allocation.kind === "INCOME" &&
      destinationById.get(allocation.accountId)?.type === "INCOME",
  );
  const isExpense = allocations.every(
    (allocation) =>
      allocation.kind === "EXPENSE" &&
      destinationById.get(allocation.accountId)?.type === "EXPENSE",
  );
  const repayments = allocations.every(
    (allocation) =>
      allocation.kind === "LOAN_TAKEN_REPAYMENT" &&
      destinationById.get(allocation.accountId)?.type === "LOAN_TAKEN",
  );

  if (input.form === "RECEIVE_MONEY") {
    if (source.type !== "CASH" || !isIncome) {
      return badRequest(
        "Receive-money Transactions require a Cash Account and Income allocations",
      );
    }
  } else if (source.type === "LOAN_TAKEN") {
    if (!isExpense) {
      return badRequest("Card charges require Expense allocations");
    }
  } else if (source.type === "CASH") {
    if (!repayments) {
      return badRequest(
        "Cash payments in Sprint 1 must repay Loan Taken Accounts",
      );
    }
  } else {
    return badRequest(
      "This Transaction form is not available for the selected Account type",
    );
  }

  return { source, destinationById, allocations, totalMinorUnits, date };
}

export const financeRouter = router({
  accounts: router({
    list: userProcedure.query(async ({ ctx }) =>
      ctx.db.$transaction(
        async (tx) => {
          const ownerId = ctx.session.user.id;
          const accounts = await tx.financialAccount.findMany({
            where: { ownerId },
            orderBy: [{ type: "asc" }, { name: "asc" }],
          });
          return Promise.all(
            accounts.map(async (account) => {
              const balance =
                account.type === "INCOME"
                  ? await categoryTotalMinorUnits(
                      tx,
                      ownerId,
                      account.id,
                      "INCOME",
                    )
                  : account.type === "EXPENSE"
                    ? await categoryTotalMinorUnits(
                        tx,
                        ownerId,
                        account.id,
                        "EXPENSE",
                      )
                    : await accountBalanceMinorUnits(tx, account);
              return serializeAccount(account, balance);
            }),
          );
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      ),
    ),
    get: userProcedure
      .input(accountLookupSchema)
      .query(async ({ ctx, input }) =>
        ctx.db.$transaction(
          async (tx) => {
            const account = await tx.financialAccount.findFirst({
              where: { id: input.accountId, ownerId: ctx.session.user.id },
            });
            if (!account) {
              return missingAccount();
            }
            const balance =
              account.type === "INCOME"
                ? await categoryTotalMinorUnits(
                    tx,
                    ctx.session.user.id,
                    account.id,
                    "INCOME",
                  )
                : account.type === "EXPENSE"
                  ? await categoryTotalMinorUnits(
                      tx,
                      ctx.session.user.id,
                      account.id,
                      "EXPENSE",
                    )
                  : await accountBalanceMinorUnits(tx, account);
            return serializeAccount(account, balance);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
        ),
      ),
    setOpeningBalance: userProcedure
      .input(openingBalanceSchema)
      .mutation(async ({ ctx, input }) => {
        const amountMinorUnits = amountInMinorUnits(input.amount);
        return serializable(ctx.db, async (tx) => {
          const account = await findOwnedAccount(
            tx,
            ctx.session.user.id,
            input.accountId,
          );
          if (account.type !== "CASH") {
            return badRequest(
              "An opening balance can only be set for a Cash Account",
            );
          }
          if (account.openingBalanceMinorUnits !== null) {
            return badRequest("The opening balance has already been recorded");
          }
          const [sourceCount, allocationCount] = await Promise.all([
            tx.financialTransaction.count({
              where: {
                ownerId: ctx.session.user.id,
                sourceAccountId: account.id,
              },
            }),
            tx.allocationLine.count({
              where: { ownerId: ctx.session.user.id, accountId: account.id },
            }),
          ]);
          if (sourceCount > 0 || allocationCount > 0) {
            return badRequest(
              "An opening balance cannot be changed after financial activity",
            );
          }
          const updated = await tx.financialAccount.update({
            where: { id: account.id },
            data: { openingBalanceMinorUnits: amountMinorUnits.toString() },
          });
          return serializeAccount(updated, amountMinorUnits);
        });
      }),
  }),
  transactions: router({
    create: userProcedure
      .input(transactionSchema)
      .mutation(async ({ ctx, input }) => {
        const parsed = parseTransactionInput(input);
        return serializable(ctx.db, async (tx) => {
          const ownerId = ctx.session.user.id;
          const validated = await validateTransaction(
            tx,
            ownerId,
            input,
            parsed,
          );
          const {
            source,
            destinationById,
            allocations,
            totalMinorUnits,
            date,
          } = validated;

          if (input.form === "PAYMENT_CHARGE" && source.type === "CASH") {
            const cashBalance = await accountBalanceMinorUnits(tx, source);
            if (cashBalance < totalMinorUnits) {
              return badRequest(
                "Cash outflow cannot exceed the available balance",
              );
            }
            const repaymentsByAccount = new Map<string, bigint>();
            for (const allocation of allocations) {
              repaymentsByAccount.set(
                allocation.accountId,
                (repaymentsByAccount.get(allocation.accountId) ?? 0n) +
                  allocation.amountMinorUnits,
              );
            }
            for (const [accountId, repayment] of repaymentsByAccount) {
              const destination = destinationById.get(accountId);
              if (!destination) {
                return badRequest("A repayment Account is unavailable");
              }
              const debt = await accountBalanceMinorUnits(tx, destination);
              if (repayment > debt) {
                return badRequest(
                  "Loan repayment cannot exceed outstanding debt",
                );
              }
            }
          }

          const transaction = await tx.financialTransaction.create({
            data: {
              ownerId,
              form: input.form,
              totalMinorUnits: totalMinorUnits.toString(),
              transactionDate: date,
              sourceAccountId: source.id,
              description: input.description,
              allocations: {
                create: allocations.map((allocation) => ({
                  account: {
                    connect: {
                      id_ownerId: { id: allocation.accountId, ownerId },
                    },
                  },
                  kind: allocation.kind,
                  amountMinorUnits: allocation.amountMinorUnits.toString(),
                })),
              },
            },
            include: {
              allocations: {
                include: { account: { select: { name: true } } },
              },
            },
          });
          return serializeTransaction(transaction);
        });
      }),
    history: userProcedure.query(async ({ ctx }) => {
      const transactions = await ctx.db.financialTransaction.findMany({
        where: { ownerId: ctx.session.user.id },
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
        include: {
          allocations: {
            include: { account: { select: { name: true } } },
          },
        },
      });
      return transactions.map(serializeTransaction);
    }),
  }),
  summary: router({
    get: userProcedure.query(async ({ ctx }) =>
      ctx.db.$transaction(
        async (tx) => {
          const ownerId = ctx.session.user.id;
          const accounts = await tx.financialAccount.findMany({
            where: { ownerId },
            orderBy: [{ type: "asc" }, { name: "asc" }],
          });
          const [incomeLines, expenseLines] = await Promise.all([
            tx.allocationLine.findMany({
              where: { ownerId, kind: "INCOME" },
              select: { amountMinorUnits: true },
            }),
            tx.allocationLine.findMany({
              where: { ownerId, kind: "EXPENSE" },
              select: { amountMinorUnits: true },
            }),
          ]);
          const categories = await Promise.all(
            accounts
              .filter(
                (account) =>
                  account.type === "INCOME" || account.type === "EXPENSE",
              )
              .map(async (account) => ({
                accountId: account.id,
                accountName: account.name,
                type: account.type,
                total: formatMinorUnits(
                  await categoryTotalMinorUnits(
                    tx,
                    ownerId,
                    account.id,
                    account.type === "INCOME" ? "INCOME" : "EXPENSE",
                  ),
                ),
              })),
          );
          const balances = await Promise.all(
            accounts
              .filter(
                (account) =>
                  account.type === "CASH" ||
                  account.type === "LOAN_GIVEN" ||
                  account.type === "LOAN_TAKEN",
              )
              .map(async (account) => ({
                accountId: account.id,
                accountName: account.name,
                type: account.type,
                balance: formatMinorUnits(
                  await accountBalanceMinorUnits(tx, account),
                ),
              })),
          );
          return {
            incomeTotal: formatMinorUnits(
              sumMinorUnits(
                incomeLines.map(({ amountMinorUnits }) => amountMinorUnits),
              ),
            ),
            expenseTotal: formatMinorUnits(
              sumMinorUnits(
                expenseLines.map(({ amountMinorUnits }) => amountMinorUnits),
              ),
            ),
            balances,
            categories,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      ),
    ),
  }),
});
