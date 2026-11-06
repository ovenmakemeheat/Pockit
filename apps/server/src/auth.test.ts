import { appRouter } from "@Pockit/api/routers/index";
import { createAuth } from "@Pockit/auth";
import { createPrismaClient } from "@Pockit/db";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { hashPassword } from "better-auth/crypto";
import { createServerApp } from "./app";

const baseURL = "http://localhost:3000";
const corsOrigin = "http://localhost:3001";
const databaseUrl = Bun.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must point to a disposable PostgreSQL test database.",
  );
}

const database = createPrismaClient({ DATABASE_URL: databaseUrl });
const auth = createAuth(
  {
    BETTER_AUTH_URL: baseURL,
    BETTER_AUTH_SECRET: "test-only-secret-that-is-not-a-real-credential",
    CORS_ORIGIN: corsOrigin,
  },
  database,
);
const app = createServerApp({
  corsOrigin,
  authHandler: (request) => auth.handler(request),
  trpcHandler: async () => new Response("API"),
});

const userId = crypto.randomUUID();
const administratorId = crypto.randomUUID();
const disabledUserId = crypto.randomUUID();
const email = `auth-${userId}@example.test`;
const administratorEmail = `admin-${administratorId}@example.test`;
const disabledEmail = `disabled-${disabledUserId}@example.test`;
const password = "synthetic-password-only";

async function authRequest(path: string, init?: RequestInit) {
  return app.handle(new Request(`${baseURL}/api/auth/${path}`, init));
}

describe("authentication HTTP contract", () => {
  beforeAll(async () => {
    const [userPasswordHash, administratorPasswordHash, disabledPasswordHash] =
      await Promise.all([
        hashPassword(password),
        hashPassword(password),
        hashPassword(password),
      ]);

    await database.user.createMany({
      data: [
        {
          id: userId,
          name: "Synthetic Auth User",
          email,
          emailVerified: true,
        },
        {
          id: administratorId,
          name: "Synthetic Auth Administrator",
          email: administratorEmail,
          emailVerified: true,
          role: "Administrator",
        },
        {
          id: disabledUserId,
          name: "Synthetic Disabled User",
          email: disabledEmail,
          emailVerified: true,
          isEnabled: false,
        },
      ],
    });
    await database.account.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          accountId: userId,
          userId,
          providerId: "credential",
          password: userPasswordHash,
        },
        {
          id: crypto.randomUUID(),
          accountId: administratorId,
          userId: administratorId,
          providerId: "credential",
          password: administratorPasswordHash,
        },
        {
          id: crypto.randomUUID(),
          accountId: disabledUserId,
          userId: disabledUserId,
          providerId: "credential",
          password: disabledPasswordHash,
        },
      ],
    });
  });

  afterAll(async () => {
    await database.user.deleteMany({
      where: { id: { in: [userId, administratorId, disabledUserId] } },
    });
    await database.$disconnect();
  });

  it("stores a password hash rather than the submitted password", async () => {
    const credential = await database.account.findFirstOrThrow({
      where: { userId, providerId: "credential" },
    });

    expect(credential.password).toBeTruthy();
    expect(credential.password).not.toBe(password);
  });

  it("rejects requests from untrusted origins", async () => {
    const response = await authRequest("sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://untrusted.example.test",
      },
      body: JSON.stringify({ email, password }),
    });
    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });

  it("rejects public account creation without persisting a User", async () => {
    const response = await authRequest("sign-up/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: corsOrigin,
      },
      body: JSON.stringify({
        email: `new-${userId}@example.test`,
        name: "Synthetic New User",
        password,
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "EMAIL_PASSWORD_SIGN_UP_DISABLED",
    });
    expect(
      await database.user.count({
        where: { email: `new-${userId}@example.test` },
      }),
    ).toBe(0);
  });

  it("rejects invalid credentials without issuing a session cookie", async () => {
    const [unknownEmail, incorrectPassword] = await Promise.all([
      authRequest("sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: corsOrigin },
        body: JSON.stringify({
          email: `missing-${userId}@example.test`,
          password,
        }),
      }),
      authRequest("sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: corsOrigin },
        body: JSON.stringify({ email, password: "wrong-synthetic-password" }),
      }),
    ]);

    expect(unknownEmail.status).toBeGreaterThanOrEqual(400);
    expect(incorrectPassword.status).toBe(unknownEmail.status);
    expect(unknownEmail.headers.getSetCookie()).toHaveLength(0);
    expect(incorrectPassword.headers.getSetCookie()).toHaveLength(0);
  });

  it("does not allow login input to elevate a User's role", async () => {
    const signIn = await authRequest("sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: corsOrigin },
      body: JSON.stringify({ email, password, role: "Administrator" }),
    });

    expect(signIn.status).toBe(200);
    const cookie = signIn.headers
      .getSetCookie()
      .map((value) => value.split(";", 1)[0])
      .join("; ");
    const identity = await authRequest("get-session", {
      headers: { cookie, origin: corsOrigin },
    });

    expect(identity.status).toBe(200);
    expect(await identity.json()).toMatchObject({
      user: { id: userId, role: "User" },
    });
  });

  it("authenticates a seeded Administrator with the server-assigned role", async () => {
    const signIn = await authRequest("sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: corsOrigin },
      body: JSON.stringify({ email: administratorEmail, password }),
    });

    expect(signIn.status).toBe(200);
    const cookie = signIn.headers
      .getSetCookie()
      .map((value) => value.split(";", 1)[0])
      .join("; ");
    const identity = await authRequest("get-session", {
      headers: { cookie, origin: corsOrigin },
    });

    expect(identity.status).toBe(200);
    expect(await identity.json()).toMatchObject({
      user: {
        id: administratorId,
        email: administratorEmail,
        role: "Administrator",
      },
    });
  });

  it("rejects sign-in for a disabled User without issuing a session", async () => {
    const response = await authRequest("sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: corsOrigin },
      body: JSON.stringify({ email: disabledEmail, password }),
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.headers.getSetCookie()).toHaveLength(0);
    expect(
      await database.session.count({ where: { userId: disabledUserId } }),
    ).toBe(0);
  });

  it("authenticates a seeded User, returns session identity, and invalidates the session on logout", async () => {
    const signIn = await authRequest("sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: corsOrigin },
      body: JSON.stringify({ email, password }),
    });

    expect(signIn.status).toBe(200);
    const setCookies = signIn.headers.getSetCookie();
    expect(setCookies.some((value) => /Max-Age=604800/i.test(value))).toBe(
      true,
    );
    expect(setCookies.some((value) => /HttpOnly/i.test(value))).toBe(true);
    expect(setCookies.some((value) => /Secure/i.test(value))).toBe(true);
    expect(setCookies.some((value) => /SameSite=None/i.test(value))).toBe(true);
    const cookie = setCookies.map((value) => value.split(";", 1)[0]).join("; ");
    expect(cookie).not.toBe("");

    const identity = await authRequest("get-session", {
      headers: { cookie, origin: corsOrigin },
    });
    expect(identity.status).toBe(200);
    const identityPayload = (await identity.json()) as {
      session: { expiresAt: string };
      user: { id: string; name: string; email: string; role: string };
    };
    expect(identityPayload).toMatchObject({
      user: { id: userId, name: "Synthetic Auth User", email, role: "User" },
    });
    const expiry = new Date(identityPayload.session.expiresAt).getTime();
    expect(expiry).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
    expect(expiry).toBeLessThan(Date.now() + 8 * 24 * 60 * 60 * 1000);

    const logout = await authRequest("sign-out", {
      method: "POST",
      headers: { cookie, origin: corsOrigin },
    });
    expect(logout.status).toBe(200);

    const afterLogout = await authRequest("get-session", {
      headers: { cookie, origin: corsOrigin },
    });
    expect(afterLogout.status).toBe(200);
    expect(await afterLogout.json()).toBeNull();
  });

  it("revokes an active User session immediately when an Administrator disables the User", async () => {
    const userSignIn = await authRequest("sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: corsOrigin },
      body: JSON.stringify({ email, password }),
    });
    const userCookie = userSignIn.headers
      .getSetCookie()
      .map((value) => value.split(";", 1)[0])
      .join("; ");
    expect(userCookie).not.toBe("");

    const administratorSignIn = await authRequest("sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: corsOrigin },
      body: JSON.stringify({ email: administratorEmail, password }),
    });
    const administratorCookie = administratorSignIn.headers
      .getSetCookie()
      .map((value) => value.split(";", 1)[0])
      .join("; ");
    const administratorSession = await auth.api.getSession({
      headers: new Headers({ cookie: administratorCookie, origin: corsOrigin }),
    });
    expect(administratorSession?.user.role).toBe("Administrator");

    const administrator = appRouter.createCaller({
      db: database,
      session: administratorSession,
    });
    await administrator.admin.users.setEnabled({
      userId,
      isEnabled: false,
    });

    const staleCookieIdentity = await authRequest("get-session", {
      headers: { cookie: userCookie, origin: corsOrigin },
    });
    expect(await staleCookieIdentity.json()).toBeNull();
    expect(await database.session.count({ where: { userId } })).toBe(0);

    const newlyResolvedSession = await auth.api.getSession({
      headers: new Headers({ cookie: userCookie, origin: corsOrigin }),
    });
    const protectedCaller = appRouter.createCaller({
      db: database,
      session: newlyResolvedSession,
    });
    let accessError: unknown;
    try {
      await protectedCaller.privateData();
    } catch (error) {
      accessError = error;
    }
    expect(accessError).toMatchObject({ code: "UNAUTHORIZED" });
  });
});
