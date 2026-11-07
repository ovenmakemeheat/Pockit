import type { Database } from "@Pockit/db";
import { hashPassword } from "better-auth/crypto";

export const DEMO_USER = {
  id: "pockit-demo-user",
  name: "Pockit Demo User",
  email: "demo.user@pockit.test",
  role: "User",
} as const;

export const DEMO_SECOND_USER = {
  id: "pockit-demo-user-2",
  name: "Pockit Demo User 2",
  email: "demo.user2@pockit.test",
  role: "User",
} as const;

export const DEMO_ADMIN = {
  id: "pockit-demo-admin",
  name: "Pockit Demo Administrator",
  email: "demo.admin@pockit.test",
  role: "Administrator",
} as const;

export const DEMO_USERS = [DEMO_USER, DEMO_SECOND_USER, DEMO_ADMIN] as const;

export const DEMO_FINANCIAL_ACCOUNTS = [
  {
    id: "pockit-demo-user-bank",
    ownerId: DEMO_USER.id,
    name: "Main bank",
    type: "CASH",
    currencyCode: "THB",
  },
  {
    id: "pockit-demo-user-card",
    ownerId: DEMO_USER.id,
    name: "Credit card",
    type: "LOAN_TAKEN",
    currencyCode: "THB",
  },
  {
    id: "pockit-demo-user-salary",
    ownerId: DEMO_USER.id,
    name: "Salary",
    type: "INCOME",
    currencyCode: "THB",
  },
  {
    id: "pockit-demo-user-dining",
    ownerId: DEMO_USER.id,
    name: "Dining",
    type: "EXPENSE",
    currencyCode: "THB",
  },
  {
    id: "pockit-demo-user-groceries",
    ownerId: DEMO_USER.id,
    name: "Groceries",
    type: "EXPENSE",
    currencyCode: "THB",
  },
  {
    id: "pockit-demo-user-2-bank",
    ownerId: DEMO_SECOND_USER.id,
    name: "Main bank",
    type: "CASH",
    currencyCode: "THB",
  },
  {
    id: "pockit-demo-user-2-card",
    ownerId: DEMO_SECOND_USER.id,
    name: "Credit card",
    type: "LOAN_TAKEN",
    currencyCode: "THB",
  },
  {
    id: "pockit-demo-user-2-salary",
    ownerId: DEMO_SECOND_USER.id,
    name: "Salary",
    type: "INCOME",
    currencyCode: "THB",
  },
  {
    id: "pockit-demo-user-2-dining",
    ownerId: DEMO_SECOND_USER.id,
    name: "Dining",
    type: "EXPENSE",
    currencyCode: "THB",
  },
  {
    id: "pockit-demo-user-2-groceries",
    ownerId: DEMO_SECOND_USER.id,
    name: "Groceries",
    type: "EXPENSE",
    currencyCode: "THB",
  },
] as const;

const minimumPasswordLength = 8;

export async function seedDemoData(db: Database, password: string) {
  if (password.length < minimumPasswordLength) {
    throw new Error(
      `The local demo password must contain at least ${minimumPasswordLength} characters.`,
    );
  }

  const passwordHashes = await Promise.all(
    DEMO_USERS.map(() => hashPassword(password)),
  );

  await db.$transaction(async (tx) => {
    for (const [index, user] of DEMO_USERS.entries()) {
      const existingUser = await tx.user.findUnique({ where: { id: user.id } });
      if (!existingUser) {
        await tx.user.create({
          data: { ...user, emailVerified: true },
        });
      } else if (
        existingUser.email !== user.email ||
        existingUser.role !== user.role
      ) {
        throw new Error(
          `Reserved demo identity conflict for ${user.id}; refusing to modify the existing User.`,
        );
      }

      const credentials = await tx.account.findMany({
        where: { userId: user.id, providerId: "credential" },
      });
      if (credentials.length > 1) {
        throw new Error(
          `Multiple credential records exist for reserved demo identity ${user.id}.`,
        );
      }

      const credential = credentials[0];
      if (credential) {
        if (credential.accountId !== user.id) {
          throw new Error(
            `Credential identity conflict for reserved demo identity ${user.id}.`,
          );
        }
        await tx.account.update({
          where: { id: credential.id },
          data: { password: passwordHashes[index] },
        });
      } else {
        await tx.account.create({
          data: {
            id: `pockit-demo-credential-${user.id}`,
            accountId: user.id,
            providerId: "credential",
            userId: user.id,
            password: passwordHashes[index],
          },
        });
      }
    }

    for (const account of DEMO_FINANCIAL_ACCOUNTS) {
      const seededAccount = await tx.financialAccount.upsert({
        where: { id: account.id },
        update: {},
        create: account,
      });
      if (
        seededAccount.ownerId !== account.ownerId ||
        seededAccount.name !== account.name ||
        seededAccount.type !== account.type ||
        seededAccount.currencyCode !== account.currencyCode
      ) {
        throw new Error(
          `Reserved demo Account conflict for ${account.id}; refusing to modify the existing Account.`,
        );
      }
    }
  });

  return { users: DEMO_USERS.length, accounts: DEMO_FINANCIAL_ACCOUNTS.length };
}
