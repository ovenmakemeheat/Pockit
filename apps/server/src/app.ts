import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

type ServerAppOptions = {
  corsOrigin: string;
  authHandler: (request: Request) => Promise<Response>;
  trpcHandler: (request: Request) => Promise<Response>;
};

export function createServerApp({
  corsOrigin,
  authHandler,
  trpcHandler,
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
    .get("/", () => "OK");
}
