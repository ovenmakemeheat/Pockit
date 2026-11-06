import { describe, expect, it } from "bun:test";

import type { Context } from "../context";
import { administratorProcedure, router, userProcedure } from "../index";
import { appRouter } from "./index";

const roleRouter = router({
  userOnly: userProcedure.query(({ ctx }) => ctx.session.user.id),
  administratorOnly: administratorProcedure.query(
    ({ ctx }) => ctx.session.user.id,
  ),
});

describe("API router", () => {
  const db = {} as Context["db"];

  it("returns the public health result", async () => {
    const caller = appRouter.createCaller({ db, session: null });

    expect(await caller.healthCheck()).toBe("OK");
  });

  it("rejects protected data without a session", async () => {
    const caller = appRouter.createCaller({ db, session: null });

    await expect(caller.privateData()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("serves protected data to an authenticated synthetic user", async () => {
    const session = {
      session: { id: "session-test", userId: "user-test" },
      user: {
        id: "user-test",
        name: "Synthetic User",
        role: "User",
        isEnabled: true,
      },
    } as NonNullable<Context["session"]>;
    const caller = appRouter.createCaller({ db, session });

    expect(await caller.privateData()).toEqual({
      message: "This is private",
      user: session.user,
    });
  });

  it("enforces User and Administrator roles at the API boundary", async () => {
    const makeSession = (userId: string, role: string) =>
      ({
        session: { id: `session-${userId}`, userId },
        user: {
          id: userId,
          name: `Synthetic ${role}`,
          role,
          isEnabled: true,
        },
      }) as NonNullable<Context["session"]>;

    const userCaller = roleRouter.createCaller({
      db,
      session: makeSession("user-test", "User"),
    });
    const administratorCaller = roleRouter.createCaller({
      db,
      session: makeSession("admin-test", "Administrator"),
    });
    const invalidRoleCaller = roleRouter.createCaller({
      db,
      session: makeSession("invalid-role-test", "Owner"),
    });
    const disabledSession = makeSession("disabled-user-test", "User");
    const disabledUserCaller = roleRouter.createCaller({
      db,
      session: {
        ...disabledSession,
        user: { ...disabledSession.user, isEnabled: false },
      },
    });
    const unauthenticatedCaller = roleRouter.createCaller({
      db,
      session: null,
    });

    expect(await userCaller.userOnly()).toBe("user-test");
    await expect(userCaller.administratorOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(await administratorCaller.administratorOnly()).toBe("admin-test");
    await expect(administratorCaller.userOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(invalidRoleCaller.userOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(invalidRoleCaller.administratorOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(disabledUserCaller.userOnly()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(unauthenticatedCaller.userOnly()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      unauthenticatedCaller.administratorOnly(),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
