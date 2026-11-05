import { describe, expect, it } from "bun:test";

import type { Context } from "../context";
import { appRouter } from "./index";

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
      user: { id: "user-test", name: "Synthetic User" },
    } as NonNullable<Context["session"]>;
    const caller = appRouter.createCaller({ db, session });

    expect(await caller.privateData()).toEqual({
      message: "This is private",
      user: session.user,
    });
  });
});
