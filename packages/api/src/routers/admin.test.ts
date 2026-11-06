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
  user: crypto.randomUUID(),
  administrator: crypto.randomUUID(),
  secondAdministrator: crypto.randomUUID(),
  financialAccount: crypto.randomUUID(),
  session: crypto.randomUUID(),
};

function caller(userId: string, role: string) {
  const session = {
    session: { id: `session-${userId}`, userId },
    user: {
      id: userId,
      name: `Synthetic ${role}`,
      email: `${userId}@example.test`,
      role,
      isEnabled: true,
    },
  } as NonNullable<Context["session"]>;
  return appRouter.createCaller({ db, session });
}

const userCaller = () => caller(ids.user, "User");
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
        id: ids.user,
        name: "Synthetic Managed User",
        email: `${ids.user}@example.test`,
      },
      {
        id: ids.administrator,
        name: "Synthetic Administrator",
        email: `${ids.administrator}@example.test`,
        role: "Administrator",
      },
      {
        id: ids.secondAdministrator,
        name: "Synthetic Second Administrator",
        email: `${ids.secondAdministrator}@example.test`,
        role: "Administrator",
      },
    ],
  });
  await db.financialAccount.create({
    data: {
      id: ids.financialAccount,
      ownerId: ids.user,
      name: "Private synthetic bank",
      type: "CASH",
    },
  });
  await db.session.create({
    data: {
      id: ids.session,
      token: crypto.randomUUID(),
      userId: ids.user,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
});

afterAll(async () => {
  await db.financialAccount.deleteMany({ where: { ownerId: ids.user } });
  await db.user.deleteMany({
    where: {
      id: { in: [ids.user, ids.administrator, ids.secondAdministrator] },
    },
  });
  await db.$disconnect();
});

describe("Administrator user-access API", () => {
  it("lists only identity and access fields, never financial records", async () => {
    const users = await administratorCaller().admin.users.list();
    const user = users.find((candidate) => candidate.id === ids.user);

    expect(user).toMatchObject({
      id: ids.user,
      name: "Synthetic Managed User",
      email: `${ids.user}@example.test`,
      role: "User",
      isEnabled: true,
    });
    expect(Object.keys(user ?? {}).sort()).toEqual(
      ["createdAt", "email", "id", "isEnabled", "name", "role"].sort(),
    );
    expect(JSON.stringify(users)).not.toContain("Private synthetic bank");
  });

  it("disables a User and revokes stored sessions atomically, then allows re-enabling", async () => {
    const administrator = administratorCaller();
    const disabled = await administrator.admin.users.setEnabled({
      userId: ids.user,
      isEnabled: false,
    });

    expect(disabled).toMatchObject({
      id: ids.user,
      role: "User",
      isEnabled: false,
    });
    expect(
      await db.user.findUniqueOrThrow({ where: { id: ids.user } }),
    ).toMatchObject({
      isEnabled: false,
    });
    expect(
      await db.session.findMany({ where: { userId: ids.user } }),
    ).toHaveLength(0);

    const enabled = await administrator.admin.users.setEnabled({
      userId: ids.user,
      isEnabled: true,
    });
    expect(enabled).toMatchObject({
      id: ids.user,
      role: "User",
      isEnabled: true,
    });
  });

  it("rejects access-management calls from Users and unauthenticated callers", async () => {
    const unauthenticated = appRouter.createCaller({ db, session: null });
    await expectRejectedWithCode(userCaller().admin.users.list(), "FORBIDDEN");
    await expectRejectedWithCode(
      unauthenticated.admin.users.list(),
      "UNAUTHORIZED",
    );
  });

  it("does not allow the access endpoint to change an Administrator", async () => {
    await expectRejectedWithCode(
      administratorCaller().admin.users.setEnabled({
        userId: ids.secondAdministrator,
        isEnabled: false,
      }),
      "NOT_FOUND",
    );
    expect(
      await db.user.findUniqueOrThrow({
        where: { id: ids.secondAdministrator },
      }),
    ).toMatchObject({ role: "Administrator", isEnabled: true });
  });
});
