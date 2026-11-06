import { Button } from "@Pockit/ui/components/button";
import { Input } from "@Pockit/ui/components/input";
import { Label } from "@Pockit/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function SignInForm() {
  const navigate = useNavigate({ from: "/" });
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        { email: value.email, password: value.password },
        {
          onSuccess: () => {
            navigate({ to: "/dashboard" });
            toast.success("Sign in successful");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Enter a valid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  if (isPending) return <Loader />;

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-10">
      <div className="border-border bg-card grid w-full max-w-4xl overflow-hidden border shadow-2xl shadow-black/20 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="p-6 sm:p-9 lg:p-11">
          <p className="text-primary mb-4 flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] uppercase">
            <span className="bg-primary size-1.5" /> Your personal ledger
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back.
          </h1>
          <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed">
            Sign in to see your balances, record activity, and keep your money
            story up to date.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              form.handleSubmit();
            }}
            className="mt-8 space-y-5"
          >
            <form.Field name="email">
              {(field) => (
                <div className="grid gap-2">
                  <Label
                    htmlFor={field.name}
                    className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase"
                  >
                    Email
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    autoComplete="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onInput={(event) =>
                      field.handleChange(event.currentTarget.value)
                    }
                    className="h-10 text-sm"
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      key={error?.message}
                      className="text-destructive text-xs"
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <div className="grid gap-2">
                  <Label
                    htmlFor={field.name}
                    className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase"
                  >
                    Password
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onInput={(event) =>
                      field.handleChange(event.currentTarget.value)
                    }
                    className="h-10 text-sm"
                  />
                  {field.state.meta.errors.map((error) => (
                    <p
                      key={error?.message}
                      className="text-destructive text-xs"
                    >
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button
                  type="submit"
                  className="h-10 w-full"
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? "Signing in…" : "Sign in"}
                  {!isSubmitting && <ArrowRight aria-hidden="true" />}
                </Button>
              )}
            </form.Subscribe>
          </form>
          <p className="text-muted-foreground mt-5 text-xs">
            Access is provided by your project administrator. Public sign-up is
            not available.
          </p>
        </section>

        <aside className="border-border/70 bg-muted/30 relative hidden overflow-hidden border-l p-8 lg:flex lg:flex-col lg:justify-between lg:p-10">
          <div
            aria-hidden="true"
            className="border-primary/15 absolute -top-16 -right-16 size-64 border"
          />
          <div
            aria-hidden="true"
            className="border-primary/20 absolute -top-8 -right-8 size-48 border"
          />
          <div className="relative">
            <span className="bg-primary/10 text-primary grid size-10 place-items-center">
              <LockKeyhole aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-7 max-w-xs text-2xl leading-snug font-medium tracking-tight">
              A more thoughtful view of everyday money.
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xs text-sm leading-relaxed">
              Balances, categories, and transactions—kept together, private to
              your account.
            </p>
          </div>
          <div className="border-border/70 relative space-y-3 border-t pt-5">
            <div className="flex items-center gap-3 text-xs">
              <ShieldCheck
                aria-hidden="true"
                className="size-4 text-emerald-400"
              />
              <span>Private account data</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <LockKeyhole
                aria-hidden="true"
                className="size-4 text-emerald-400"
              />
              <span>Protected sign-in</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
