import { describe, expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import type { TRPCQueryKeyWithoutPrefix } from "@trpc/tanstack-react-query";

import { userScopedQueryKey } from "./user-scoped-query-key";

describe("User-scoped financial query cache", () => {
  it("does not return one User's cached financial response to another User", () => {
    const queryClient = new QueryClient();
    const baseKey: TRPCQueryKeyWithoutPrefix = [
      ["finance", "accounts", "list"],
      { type: "query" },
    ];
    const userAKey = userScopedQueryKey(baseKey, "user-a");
    const userBKey = userScopedQueryKey(baseKey, "user-b");
    const userAAccounts = [{ id: "user-a-bank", balance: "123.45" }];

    queryClient.setQueryData(userAKey, userAAccounts);

    expect(userAKey[0]).toEqual(baseKey[0]);
    expect(userAKey[1]?.input).toEqual(baseKey[1]?.input);
    expect(userAKey[1]).toMatchObject({ pockitUserId: "user-a" });
    expect(queryClient.getQueryData(userAKey)).toEqual(userAAccounts);
    expect(queryClient.getQueryData(userBKey)).toBeUndefined();
    queryClient.clear();
  });
});
