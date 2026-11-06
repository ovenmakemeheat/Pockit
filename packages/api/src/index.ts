import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.session?.user.isEnabled !== true) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No active session",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

function requireRole(role: "User" | "Administrator") {
  return protectedProcedure.use(({ ctx, next }) => {
    if (ctx.session.user.role !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `${role} role required`,
      });
    }
    return next();
  });
}

export const userProcedure = requireRole("User");
export const administratorProcedure = requireRole("Administrator");
