import type { Database } from "@Pockit/db";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

type ServerAppOptions = {
  corsOrigin: string;
  authHandler: (request: Request) => Promise<Response>;
  trpcHandler: (request: Request) => Promise<Response>;
  database?: Database;
};

export function createServerApp({
  corsOrigin,
  authHandler,
  trpcHandler,
  database,
}: ServerAppOptions) {
  return new Elysia()
    .use(
      cors({
        origin: corsOrigin,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      }),
    )
    .all("/api/auth/*", ({ request, status }) => {
      if (["POST", "GET"].includes(request.method)) {
        return authHandler(request);
      }
      return status(405);
    })
    .all("/trpc/*", ({ request }) => trpcHandler(request))
    .get("/", () => "OK")
    .get("/api/health", () => ({ status: "ok" }))
    .get("/api/ready", async ({ set }) => {
      if (!database) {
        set.status = 503;
        return { status: "not_ready", db: "unavailable" };
      }

      try {
        await database.$queryRaw`SELECT 1`;
        return { status: "ready", db: "connected" };
      } catch {
        set.status = 503;
        return { status: "not_ready", db: "unavailable" };
      }
    });
}
