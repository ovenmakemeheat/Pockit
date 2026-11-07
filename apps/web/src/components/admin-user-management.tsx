import type { AppRouter } from "@Pockit/api/routers/index";
import { Button } from "@Pockit/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@Pockit/ui/components/card";
import type { inferRouterOutputs } from "@trpc/server";

export type ManagedUser =
  inferRouterOutputs<AppRouter>["admin"]["users"]["list"][number];

type AdminUserManagementProps = {
  users: ManagedUser[];
  pendingUserId?: string;
  onSetEnabled: (userId: string, isEnabled: boolean) => void;
};

export function AdminUserManagement({
  users,
  pendingUserId,
  onSetEnabled,
}: AdminUserManagementProps) {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
          Platform administration
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          User access
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Enable or disable platform Users. Disabling access ends their active
          sessions; their private financial information is not shown here.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No platform Users are available.
            </p>
          ) : (
            users.map((user) => {
              const isPending = pendingUserId === user.id;
              return (
                <section
                  className="bg-background flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={user.id}
                  aria-label={`Access for ${user.name}`}
                >
                  <div className="min-w-0 space-y-1">
                    <h2 className="truncate text-sm font-semibold">
                      {user.name}
                    </h2>
                    <p className="text-muted-foreground truncate text-sm">
                      {user.email}
                    </p>
                    <p
                      className={
                        user.isEnabled
                          ? "text-xs font-medium text-emerald-700 dark:text-emerald-400"
                          : "text-destructive text-xs font-medium"
                      }
                    >
                      {user.isEnabled ? "Access enabled" : "Access disabled"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={user.isEnabled ? "outline" : "default"}
                    disabled={isPending}
                    aria-label={`${user.isEnabled ? "Disable" : "Enable"} ${user.name}`}
                    onClick={() => onSetEnabled(user.id, !user.isEnabled)}
                  >
                    {isPending
                      ? "Saving…"
                      : user.isEnabled
                        ? "Disable access"
                        : "Enable access"}
                  </Button>
                </section>
              );
            })
          )}
        </CardContent>
      </Card>
    </main>
  );
}
