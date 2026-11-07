import { protectedProcedure, publicProcedure, router } from "../index";
import { adminRouter } from "./admin";
import { financeRouter } from "./finance";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  admin: adminRouter,
  finance: financeRouter,
});
export type AppRouter = typeof appRouter;
