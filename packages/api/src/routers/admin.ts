import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { administratorProcedure, router } from "../index";

const userAccessFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  isEnabled: true,
  createdAt: true,
} as const;

export const adminRouter = router({
  users: router({
    list: administratorProcedure.query(({ ctx }) =>
      ctx.db.user.findMany({
        where: { role: "User" },
        select: userAccessFields,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    ),
    setEnabled: administratorProcedure
      .input(
        z
          .object({
            userId: z.string().min(1),
            isEnabled: z.boolean(),
          })
          .strict(),
      )
      .mutation(({ ctx, input }) =>
        ctx.db.$transaction(async (transaction) => {
          const target = await transaction.user.findFirst({
            where: { id: input.userId, role: "User" },
            select: { id: true },
          });
          if (!target) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "User not found",
            });
          }

          const updatedUser = await transaction.user.update({
            where: { id: target.id },
            data: { isEnabled: input.isEnabled },
            select: userAccessFields,
          });
          if (!input.isEnabled) {
            await transaction.session.deleteMany({
              where: { userId: target.id },
            });
          }
          return updatedUser;
        }),
      ),
  }),
});
