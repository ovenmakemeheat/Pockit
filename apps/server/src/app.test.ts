import type { Database } from "@Pockit/db";
import { describe, expect, it } from "bun:test";

import { createServerApp } from "./app";

describe("server HTTP app", () => {
  const app = createServerApp({
    corsOrigin: "http://localhost:3001",
    authHandler: async () => new Response("auth"),
    trpcHandler: async () => new Response("api"),
  });

  it("returns the health response without starting a listener", async () => {
    const response = await app.handle(new Request("http://localhost/"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });

  it("returns a public health result", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/health"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("reports not ready when no database is configured", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/ready"),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "not_ready",
      db: "unavailable",
    });
  });

  it("reports ready when the database query succeeds", async () => {
    const database = {
      $queryRaw: async () => [],
    } as unknown as Database;
    const readyApp = createServerApp({
      corsOrigin: "http://localhost:3001",
      authHandler: async () => new Response("auth"),
      trpcHandler: async () => new Response("api"),
      database,
    });

    const response = await readyApp.handle(
      new Request("http://localhost/api/ready"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ready",
      db: "connected",
    });
  });

  it("reports not ready when the database query fails", async () => {
    const database = {
      $queryRaw: async () => {
        throw new Error("database unavailable");
      },
    } as unknown as Database;
    const readyApp = createServerApp({
      corsOrigin: "http://localhost:3001",
      authHandler: async () => new Response("auth"),
      trpcHandler: async () => new Response("api"),
      database,
    });

    const response = await readyApp.handle(
      new Request("http://localhost/api/ready"),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "not_ready",
      db: "unavailable",
    });
  });

  it("rejects unsupported authentication methods", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/auth/session", { method: "DELETE" }),
    );

    expect(response.status).toBe(405);
  });
});
