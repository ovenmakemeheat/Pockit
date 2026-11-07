import { Button } from "@Pockit/ui/components/button";
import { Card, CardContent } from "@Pockit/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChartNoAxesCombined,
  CreditCard,
  LockKeyhole,
  Wallet,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

const features = [
  {
    icon: Wallet,
    title: "Know what you have",
    detail: "Keep bank balances and card debt in one private view.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "See where it goes",
    detail: "Split purchases into categories and follow your spending.",
  },
  {
    icon: CreditCard,
    title: "Track the whole story",
    detail: "Record income, card charges, and repayments with clear history.",
  },
];

function HomeComponent() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <section className="grid min-h-[34rem] items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-20">
          <div>
            <p className="text-primary mb-5 flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase">
              <span className="bg-primary size-1.5" /> Money, in context
            </p>
            <h1 className="max-w-2xl text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Feel clearer about your money.
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
              Pockit brings your accounts, spending, and card repayments into
              one calm, personal ledger—so the numbers tell a useful story.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {session ? (
                <Link to="/dashboard">
                  <Button size="lg">
                    Open your overview <ArrowRight aria-hidden="true" />
                  </Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button size="lg" disabled={isPending}>
                    Sign in to Pockit <ArrowRight aria-hidden="true" />
                  </Button>
                </Link>
              )}
              <p className="text-muted-foreground text-xs">
                Private by default. Built for your everyday money.
              </p>
            </div>
            <div className="border-border/70 text-muted-foreground mt-10 flex items-center gap-2 border-t pt-5 text-xs">
              <LockKeyhole
                aria-hidden="true"
                className="size-4 text-emerald-400"
              />
              Your financial records are only visible to you.
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div
              aria-hidden="true"
              className="border-primary/50 absolute -top-3 -right-3 size-24 border-t border-r"
            />
            <Card className="border-border/80 bg-card relative overflow-hidden shadow-2xl shadow-black/20">
              <CardContent className="p-0">
                <div className="border-border/70 flex items-center justify-between border-b px-5 py-4">
                  <div>
                    <p className="text-primary text-[10px] font-semibold tracking-[0.18em] uppercase">
                      Your money, at a glance
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      One connected picture
                    </p>
                  </div>
                  <span className="bg-primary/10 text-primary grid size-9 place-items-center">
                    <ChartNoAxesCombined
                      aria-hidden="true"
                      className="size-4"
                    />
                  </span>
                </div>
                <div className="bg-border/60 grid grid-cols-2 gap-px">
                  <div className="bg-card p-5 sm:p-6">
                    <p className="text-muted-foreground text-xs">
                      Cash accounts
                    </p>
                    <p className="mt-3 text-lg font-medium">Starting balance</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      A clear baseline for what you have.
                    </p>
                  </div>
                  <div className="bg-card p-5 sm:p-6">
                    <p className="text-muted-foreground text-xs">
                      Card purchases
                    </p>
                    <p className="mt-3 text-lg font-medium">
                      Split by category
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Know what each charge was for.
                    </p>
                  </div>
                  <div className="bg-card p-5 sm:p-6">
                    <p className="text-muted-foreground text-xs">
                      Money received
                    </p>
                    <p className="mt-3 text-lg font-medium">Income, recorded</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Keep receipts and balances together.
                    </p>
                  </div>
                  <div className="bg-card p-5 sm:p-6">
                    <p className="text-muted-foreground text-xs">
                      Loan repayments
                    </p>
                    <p className="mt-3 text-lg font-medium">
                      Debt, made visible
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      See repayment effects without double-counting.
                    </p>
                  </div>
                </div>
                <div className="border-border/70 flex items-center gap-3 border-t px-5 py-4">
                  <span className="grid size-8 place-items-center bg-emerald-500/10 text-emerald-400">
                    <LockKeyhole aria-hidden="true" className="size-4" />
                  </span>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Your ledger stays yours. Account data is scoped to your
                    signed-in identity.
                  </p>
                </div>
              </CardContent>
            </Card>
            <div
              aria-hidden="true"
              className="border-primary/50 absolute -bottom-3 -left-3 size-24 border-b border-l"
            />
          </div>
        </section>

        <section
          aria-label="Pockit features"
          className="border-border/70 grid gap-3 border-t pt-6 sm:grid-cols-3"
        >
          {features.map(({ icon: Icon, title, detail }, index) => (
            <div key={title} className="flex gap-4 p-4 sm:p-5">
              <span className="border-border bg-muted/40 text-primary grid size-9 shrink-0 place-items-center border">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">
                  <span className="text-primary mr-2 text-xs tabular-nums">
                    0{index + 1}
                  </span>
                  {title}
                </p>
                <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                  {detail}
                </p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
