import { appRouter } from "@Pockit/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createServerApp } from "./app";
import { createContext } from "./context";
import { ENV } from "./env.server";
import { auth, db } from "./services";

const app = createServerApp({
  corsOrigin: ENV.CORS_ORIGIN,
  database: db,
  authHandler: (request) => auth.handler(request),
  trpcHandler: (request) =>
    fetchRequestHandler({
      endpoint: "/trpc",
      router: appRouter,
      req: request,
      createContext: () => createContext({ request }),
    }),
});

app.listen({ hostname: ENV.HOST, port: ENV.PORT }, () => {
  console.log(`Server is running on http://${ENV.HOST}:${ENV.PORT}`);
});
