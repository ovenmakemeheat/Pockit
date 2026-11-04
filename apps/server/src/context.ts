import type { Context as ApiContext } from "@Pockit/api/context";
import { auth, db } from "./services";

export type CreateContextOptions = {
  request: Request;
};

export async function createContext({
  request,
}: CreateContextOptions): Promise<ApiContext> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  return {
    db,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
