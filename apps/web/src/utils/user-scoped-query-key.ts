import type { TRPCQueryKeyWithoutPrefix } from "@trpc/tanstack-react-query";

export function userScopedQueryKey(
  queryKey: TRPCQueryKeyWithoutPrefix,
  userId: string,
): TRPCQueryKeyWithoutPrefix {
  const scopedOptions = {
    ...queryKey[1],
    pockitUserId: userId,
  };

  // tRPC reads the procedure path and `input`; React Query hashes every key field.
  return [queryKey[0], scopedOptions] as TRPCQueryKeyWithoutPrefix;
}
