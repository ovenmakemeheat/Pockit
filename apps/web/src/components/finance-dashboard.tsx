import type { AppRouter } from "@Pockit/api/routers/index";
import { Button } from "@Pockit/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@Pockit/ui/components/card";
import { Input } from "@Pockit/ui/components/input";
import { Label } from "@Pockit/ui/components/label";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Plus,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { type ReactNode, useState } from "react";

type Outputs = inferRouterOutputs<AppRouter>;
type Inputs = inferRouterInputs<AppRouter>;
type Account = Outputs["finance"]["accounts"]["list"][number];
type Transaction = Outputs["finance"]["transactions"]["history"][number];
type Summary = Outputs["finance"]["summary"]["get"];
type TransactionInput = Inputs["finance"]["transactions"]["create"];
type OpeningBalanceInput = Inputs["finance"]["accounts"]["setOpeningBalance"];

type Action = "opening" | "income" | "purchase" | "repayment";
type AllocationDraft = { id: string; accountId: string; amount: string };

type FinanceDashboardProps = {
  name: string;
  accounts: Account[];
  transactions: Transaction[];
  summary: Summary;
  openingBalancePending?: boolean;
  transactionPending?: boolean;
  onSetOpeningBalance: (input: OpeningBalanceInput) => Promise<void>;
  onCreateTransaction: (input: TransactionInput) => Promise<void>;
};

const actionDetails: Record<Action, { label: string; hint: string }> = {
  opening: {
    label: "Starting balance",
    hint: "Set your bank's opening position.",
  },
  income: {
    label: "Income received",
    hint: "Log salary or another income receipt.",
  },
  purchase: {
    label: "Card purchase",
    hint: "Split a card charge across categories.",
  },
  repayment: {
    label: "Repay card",
    hint: "Record a payment from your bank account.",
  },
};

function toMinorUnits(value: string): bigint | null {
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) return null;
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const units = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return negative ? -units : units;
}

function formatMinorUnits(value: bigint): string {
  const sign = value < 0n ? "−" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, "0")}`;
}

function formatMoney(value: string | null | undefined): string {
  return `฿${value ?? "0.00"}`;
}

function totalMoney(values: (string | null)[]): string {
  const total = values.reduce(
    (sum, value) => sum + (value ? (toMinorUnits(value) ?? 0n) : 0n),
    0n,
  );
  return formatMinorUnits(total);
}

function allocationsMatch(
  total: string,
  allocations: AllocationDraft[],
): boolean {
  const totalUnits = toMinorUnits(total);
  if (totalUnits === null || totalUnits <= 0n || allocations.length === 0)
    return false;
  const amounts = allocations.map(({ amount }) => toMinorUnits(amount));
  return (
    amounts.every((amount) => amount !== null && amount > 0n) &&
    amounts.reduce<bigint>((sum, amount) => sum + (amount ?? 0n), 0n) ===
      totalUnits
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label
        htmlFor={id}
        className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Field id={id} label={label}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || options.length === 0}
        required
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full border px-3 text-sm transition-colors outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {!value && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function DateField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Field id="transaction-date" label="Transaction date">
      <div className="relative">
        <Input
          id="transaction-date"
          type="date"
          value={value}
          onInput={(event) => onChange(event.currentTarget.value)}
          required
          disabled={disabled}
          className="h-9 pl-9 text-sm [color-scheme:dark]"
        />
        <CalendarDays
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
      </div>
    </Field>
  );
}

function AmountField({
  id,
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <Field id={id} label={label}>
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          ฿
        </span>
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={value}
          onInput={(event) => onChange(event.currentTarget.value)}
          required
          disabled={disabled}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="h-9 pl-8 text-sm tabular-nums"
        />
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
    </Field>
  );
}

function ActionButton({
  action,
  active,
  icon,
  onClick,
}: {
  action: Action;
  active: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  const { label, hint } = actionDetails[action];
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-20 min-w-0 flex-1 items-start gap-3 border p-3 text-left transition-colors sm:p-4 ${active ? "border-primary/60 bg-primary/10" : "border-border bg-background/40 hover:bg-muted/60"}`}
    >
      <span
        className={`mt-0.5 grid size-8 shrink-0 place-items-center ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
          {hint}
        </span>
      </span>
    </button>
  );
}

export function FinanceDashboard({
  name,
  accounts,
  transactions,
  summary,
  openingBalancePending = false,
  transactionPending = false,
  onSetOpeningBalance,
  onCreateTransaction,
}: FinanceDashboardProps) {
  const cashAccounts = accounts.filter((account) => account.type === "CASH");
  const loanAccounts = accounts.filter(
    (account) => account.type === "LOAN_TAKEN",
  );
  const incomeAccounts = accounts.filter(
    (account) => account.type === "INCOME",
  );
  const expenseAccounts = accounts.filter(
    (account) => account.type === "EXPENSE",
  );
  const accountsNeedingOpeningBalance = cashAccounts.filter(
    (account) => account.openingBalance === null,
  );
  const [activeAction, setActiveAction] = useState<Action>(() =>
    accountsNeedingOpeningBalance.length > 0 ? "opening" : "income",
  );
  const [openingAccountId, setOpeningAccountId] = useState(
    accountsNeedingOpeningBalance[0]?.id ?? "",
  );
  const [openingAmount, setOpeningAmount] = useState("");
  const [incomeCashId, setIncomeCashId] = useState(cashAccounts[0]?.id ?? "");
  const [incomeCategoryId, setIncomeCategoryId] = useState(
    incomeAccounts[0]?.id ?? "",
  );
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState("");
  const [incomeDescription, setIncomeDescription] = useState("Salary");
  const [purchaseCardId, setPurchaseCardId] = useState(
    loanAccounts[0]?.id ?? "",
  );
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseDescription, setPurchaseDescription] = useState("");
  const [purchaseAllocations, setPurchaseAllocations] = useState<
    AllocationDraft[]
  >(() =>
    expenseAccounts.slice(0, 2).map((account) => ({
      id: crypto.randomUUID(),
      accountId: account.id,
      amount: "",
    })),
  );
  const [repaymentCashId, setRepaymentCashId] = useState(
    cashAccounts[0]?.id ?? "",
  );
  const [repaymentCardId, setRepaymentCardId] = useState(
    loanAccounts[0]?.id ?? "",
  );
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [repaymentDate, setRepaymentDate] = useState("");

  const isBusy = openingBalancePending || transactionPending;
  const cashTotal = totalMoney(
    summary.balances
      .filter((account) => account.type === "CASH")
      .map((account) => account.balance),
  );
  const cardDebt = totalMoney(
    summary.balances
      .filter((account) => account.type === "LOAN_TAKEN")
      .map((account) => account.balance),
  );
  const canPostPurchase =
    allocationsMatch(purchaseAmount, purchaseAllocations) &&
    purchaseAllocations.length > 0 &&
    purchaseAllocations.every(({ accountId }) =>
      expenseAccounts.some((account) => account.id === accountId),
    );

  async function submit(promise: Promise<void>, reset: () => void) {
    try {
      await promise;
      reset();
    } catch {
      // The page mutation reports a user-safe error through the global toast.
    }
  }

  return (
    <main className="bg-background min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-4 pt-7 pb-12 sm:px-6 lg:px-8 lg:pt-10">
        <div className="flex flex-col gap-6">
          <section className="border-border flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-end">
            <div>
              <div className="text-primary mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase">
                <span className="bg-primary size-1.5" />
                Personal finance, in focus
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Good to see you, {name.split(" ")[0]}.
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
                A clear view of what came in, what went out, and where you
                stand.
              </p>
            </div>
            <div className="border-border text-muted-foreground flex items-center gap-2 self-start border px-3 py-2 text-xs sm:self-auto">
              <CalendarDays
                aria-hidden="true"
                className="text-primary size-4"
              />
              <span>All-time overview</span>
            </div>
          </section>

          <section
            aria-label="Financial overview"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Card className="border-l-primary bg-card border-l-2">
              <CardHeader className="pb-1">
                <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-medium tracking-[0.12em] uppercase">
                  Cash on hand{" "}
                  <Wallet aria-hidden="true" className="text-primary size-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(cashTotal)}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    THB
                  </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Across {cashAccounts.length} Cash{" "}
                  {cashAccounts.length === 1 ? "Account" : "Accounts"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-l-2 border-l-amber-500">
              <CardHeader className="pb-1">
                <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-medium tracking-[0.12em] uppercase">
                  Card debt{" "}
                  <CreditCard
                    aria-hidden="true"
                    className="size-4 text-amber-400"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(cardDebt)}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    THB
                  </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Outstanding across {loanAccounts.length} Loan Taken{" "}
                  {loanAccounts.length === 1 ? "Account" : "Accounts"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-1">
                <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-medium tracking-[0.12em] uppercase">
                  Income{" "}
                  <ArrowDownLeft
                    aria-hidden="true"
                    className="size-4 text-emerald-400"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(summary.incomeTotal)}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    THB
                  </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Recorded receipts
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-1">
                <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-medium tracking-[0.12em] uppercase">
                  Expenses{" "}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 text-rose-400"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(summary.expenseTotal)}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    THB
                  </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Card purchases and spending
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
            <Card className="border-border/80">
              <CardHeader className="border-border/70 border-b pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-primary text-[11px] font-semibold tracking-[0.18em] uppercase">
                      Your ledger
                    </p>
                    <CardTitle className="mt-2 text-xl">
                      Make a money move
                    </CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Every entry is saved to your private financial ledger.
                    </p>
                  </div>
                  <CircleDollarSign
                    aria-hidden="true"
                    className="text-muted-foreground mt-1 size-5"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <ActionButton
                    action="opening"
                    active={activeAction === "opening"}
                    icon={<Banknote className="size-4" />}
                    onClick={() => setActiveAction("opening")}
                  />
                  <ActionButton
                    action="income"
                    active={activeAction === "income"}
                    icon={<ArrowDownLeft className="size-4" />}
                    onClick={() => setActiveAction("income")}
                  />
                  <ActionButton
                    action="purchase"
                    active={activeAction === "purchase"}
                    icon={<CreditCard className="size-4" />}
                    onClick={() => setActiveAction("purchase")}
                  />
                  <ActionButton
                    action="repayment"
                    active={activeAction === "repayment"}
                    icon={<ArrowUpRight className="size-4" />}
                    onClick={() => setActiveAction("repayment")}
                  />
                </div>

                {activeAction === "opening" && (
                  <form
                    className="border-border/70 grid gap-4 border-t pt-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submit(
                        onSetOpeningBalance({
                          accountId: openingAccountId,
                          amount: openingAmount,
                        }),
                        () => setOpeningAmount(""),
                      );
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center">
                        <Banknote className="size-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-medium">
                          Start with the right baseline
                        </h2>
                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                          This opening balance sets your starting Cash position;
                          it is not counted as income.
                        </p>
                      </div>
                    </div>
                    {accountsNeedingOpeningBalance.length === 0 ? (
                      <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-300">
                        <Check aria-hidden="true" className="size-4" />
                        Your opening balance is recorded.
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <SelectField
                          id="opening-account"
                          label="Cash account"
                          value={openingAccountId}
                          onChange={setOpeningAccountId}
                          options={accountsNeedingOpeningBalance}
                          placeholder="Choose an account"
                          disabled={isBusy}
                        />
                        <AmountField
                          id="opening-amount"
                          label="Opening balance"
                          value={openingAmount}
                          onChange={setOpeningAmount}
                          hint="Use THB with up to two decimal places."
                          disabled={isBusy}
                        />
                        <div className="sm:col-span-2">
                          <Button
                            type="submit"
                            disabled={
                              isBusy ||
                              !openingAccountId ||
                              (toMinorUnits(openingAmount) ?? 0n) <= 0n
                            }
                            className="w-full sm:w-auto"
                          >
                            {openingBalancePending
                              ? "Saving balance…"
                              : "Save opening balance"}
                            <ChevronRight aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </form>
                )}

                {activeAction === "income" && (
                  <form
                    className="border-border/70 grid gap-4 border-t pt-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submit(
                        onCreateTransaction({
                          form: "RECEIVE_MONEY",
                          sourceAccountId: incomeCashId,
                          totalAmount: incomeAmount,
                          transactionDate: incomeDate,
                          description: incomeDescription || undefined,
                          allocations: [
                            {
                              kind: "INCOME",
                              accountId: incomeCategoryId,
                              amount: incomeAmount,
                            },
                          ],
                        }),
                        () => {
                          setIncomeAmount("");
                          setIncomeDate("");
                        },
                      );
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField
                        id="income-cash"
                        label="Received into"
                        value={incomeCashId}
                        onChange={setIncomeCashId}
                        options={cashAccounts}
                        placeholder="Choose a Cash account"
                        disabled={isBusy}
                      />
                      <SelectField
                        id="income-category"
                        label="Income category"
                        value={incomeCategoryId}
                        onChange={setIncomeCategoryId}
                        options={incomeAccounts}
                        placeholder="Choose a category"
                        disabled={isBusy}
                      />
                      <AmountField
                        id="income-amount"
                        label="Amount received"
                        value={incomeAmount}
                        onChange={setIncomeAmount}
                        disabled={isBusy}
                      />
                      <DateField
                        value={incomeDate}
                        onChange={setIncomeDate}
                        disabled={isBusy}
                      />
                      <Field id="income-description" label="Description">
                        <Input
                          id="income-description"
                          value={incomeDescription}
                          onInput={(event) =>
                            setIncomeDescription(event.currentTarget.value)
                          }
                          disabled={isBusy}
                          className="h-9 text-sm"
                        />
                      </Field>
                      <div className="flex items-end">
                        <Button
                          type="submit"
                          disabled={
                            isBusy ||
                            !incomeCashId ||
                            !incomeCategoryId ||
                            (toMinorUnits(incomeAmount) ?? 0n) <= 0n ||
                            !incomeDate
                          }
                          className="w-full"
                        >
                          {transactionPending
                            ? "Saving entry…"
                            : "Record income"}
                          <ChevronRight aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Income increases the selected Cash balance and category
                      total.
                    </p>
                  </form>
                )}

                {activeAction === "purchase" && (
                  <form
                    className="border-border/70 grid gap-4 border-t pt-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submit(
                        onCreateTransaction({
                          form: "PAYMENT_CHARGE",
                          sourceAccountId: purchaseCardId,
                          totalAmount: purchaseAmount,
                          transactionDate: purchaseDate,
                          description: purchaseDescription || undefined,
                          allocations: purchaseAllocations.map(
                            ({ accountId, amount }) => ({
                              kind: "EXPENSE" as const,
                              accountId,
                              amount,
                            }),
                          ),
                        }),
                        () => {
                          setPurchaseAmount("");
                          setPurchaseDate("");
                          setPurchaseDescription("");
                          setPurchaseAllocations(
                            expenseAccounts.slice(0, 2).map((account) => ({
                              id: crypto.randomUUID(),
                              accountId: account.id,
                              amount: "",
                            })),
                          );
                        },
                      );
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField
                        id="purchase-card"
                        label="Charged to"
                        value={purchaseCardId}
                        onChange={setPurchaseCardId}
                        options={loanAccounts}
                        placeholder="Choose a card"
                        disabled={isBusy}
                      />
                      <AmountField
                        id="purchase-total"
                        label="Purchase total"
                        value={purchaseAmount}
                        onChange={setPurchaseAmount}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="border-border/70 bg-muted/20 space-y-3 border p-3 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 className="text-sm font-medium">
                            Split by category
                          </h2>
                          <p className="text-muted-foreground mt-1 text-xs">
                            Allocation total must match the purchase total.
                          </p>
                        </div>
                        <span
                          className={`text-xs tabular-nums ${canPostPurchase ? "text-emerald-400" : "text-muted-foreground"}`}
                        >
                          Allocated{" "}
                          {formatMoney(
                            totalMoney(
                              purchaseAllocations.map(
                                (allocation) => allocation.amount,
                              ),
                            ),
                          )}{" "}
                          / {formatMoney(purchaseAmount || "0.00")}
                        </span>
                      </div>
                      {purchaseAllocations.map((allocation, index) => (
                        <div
                          key={allocation.id}
                          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.6fr)_auto] sm:items-end"
                        >
                          <SelectField
                            id={`expense-category-${index}`}
                            label={`Expense category ${index + 1}`}
                            value={allocation.accountId}
                            onChange={(accountId) =>
                              setPurchaseAllocations((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, accountId }
                                    : entry,
                                ),
                              )
                            }
                            options={expenseAccounts}
                            placeholder="Choose a category"
                            disabled={isBusy}
                          />
                          <AmountField
                            id={`expense-amount-${index}`}
                            label="Allocated amount"
                            value={allocation.amount}
                            onChange={(amount) =>
                              setPurchaseAllocations((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, amount }
                                    : entry,
                                ),
                              )
                            }
                            disabled={isBusy}
                          />
                          {purchaseAllocations.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Remove category ${index + 1}`}
                              disabled={isBusy}
                              onClick={() =>
                                setPurchaseAllocations((current) =>
                                  current.filter(
                                    (_, entryIndex) => entryIndex !== index,
                                  ),
                                )
                              }
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isBusy || expenseAccounts.length === 0}
                        onClick={() =>
                          setPurchaseAllocations((current) => [
                            ...current,
                            {
                              id: crypto.randomUUID(),
                              accountId: expenseAccounts[0]?.id ?? "",
                              amount: "",
                            },
                          ])
                        }
                      >
                        <Plus aria-hidden="true" />
                        Add category
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DateField
                        value={purchaseDate}
                        onChange={setPurchaseDate}
                        disabled={isBusy}
                      />
                      <Field id="purchase-description" label="Description">
                        <Input
                          id="purchase-description"
                          value={purchaseDescription}
                          onInput={(event) =>
                            setPurchaseDescription(event.currentTarget.value)
                          }
                          placeholder="e.g. Weekly groceries"
                          disabled={isBusy}
                          className="h-9 text-sm"
                        />
                      </Field>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-muted-foreground text-xs">
                        The purchase increases card debt and records Expense
                        categories.
                      </p>
                      <Button
                        type="submit"
                        disabled={
                          isBusy ||
                          !purchaseCardId ||
                          !purchaseDate ||
                          !canPostPurchase
                        }
                        className="w-full sm:w-auto"
                      >
                        {transactionPending
                          ? "Saving entry…"
                          : "Record card purchase"}
                        <ChevronRight aria-hidden="true" />
                      </Button>
                    </div>
                  </form>
                )}

                {activeAction === "repayment" && (
                  <form
                    className="border-border/70 grid gap-4 border-t pt-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submit(
                        onCreateTransaction({
                          form: "PAYMENT_CHARGE",
                          sourceAccountId: repaymentCashId,
                          totalAmount: repaymentAmount,
                          transactionDate: repaymentDate,
                          description: "Credit-card repayment",
                          allocations: [
                            {
                              kind: "LOAN_TAKEN_REPAYMENT",
                              accountId: repaymentCardId,
                              amount: repaymentAmount,
                            },
                          ],
                        }),
                        () => {
                          setRepaymentAmount("");
                          setRepaymentDate("");
                        },
                      );
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField
                        id="repayment-cash"
                        label="Pay from"
                        value={repaymentCashId}
                        onChange={setRepaymentCashId}
                        options={cashAccounts}
                        placeholder="Choose a Cash account"
                        disabled={isBusy}
                      />
                      <SelectField
                        id="repayment-card"
                        label="Repay card"
                        value={repaymentCardId}
                        onChange={setRepaymentCardId}
                        options={loanAccounts}
                        placeholder="Choose a card"
                        disabled={isBusy}
                      />
                      <AmountField
                        id="repayment-amount"
                        label="Payment amount"
                        value={repaymentAmount}
                        onChange={setRepaymentAmount}
                        disabled={isBusy}
                      />
                      <DateField
                        value={repaymentDate}
                        onChange={setRepaymentDate}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-muted-foreground text-xs">
                        Repayment reduces Cash and card debt, not Income or
                        Expenses.
                      </p>
                      <Button
                        type="submit"
                        disabled={
                          isBusy ||
                          !repaymentCashId ||
                          !repaymentCardId ||
                          !repaymentDate ||
                          (toMinorUnits(repaymentAmount) ?? 0n) <= 0n
                        }
                        className="w-full sm:w-auto"
                      >
                        {transactionPending
                          ? "Saving entry…"
                          : "Record repayment"}
                        <ChevronRight aria-hidden="true" />
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader className="border-border/70 border-b pb-4">
                <p className="text-primary text-[11px] font-semibold tracking-[0.18em] uppercase">
                  Recent activity
                </p>
                <div className="flex items-end justify-between gap-3">
                  <CardTitle className="mt-1 text-xl">
                    Your transactions
                  </CardTitle>
                  <span className="text-muted-foreground text-xs">
                    {transactions.length} total
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <span className="border-border text-muted-foreground mx-auto grid size-10 place-items-center border">
                      <ReceiptText aria-hidden="true" className="size-5" />
                    </span>
                    <h2 className="mt-3 text-sm font-medium">
                      Your story starts here
                    </h2>
                    <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs leading-relaxed">
                      Record salary, a purchase, or a repayment and it will
                      appear here.
                    </p>
                  </div>
                ) : (
                  <ol className="divide-border/70 divide-y">
                    {transactions.map((transaction) => {
                      const isIncome = transaction.form === "RECEIVE_MONEY";
                      const allocationNames = transaction.allocations
                        .map((allocation) => allocation.accountName)
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <li
                          key={transaction.id}
                          className="flex items-start gap-3 px-4 py-4"
                        >
                          <span
                            className={`mt-0.5 grid size-8 shrink-0 place-items-center ${isIncome ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft
                                aria-hidden="true"
                                className="size-4"
                              />
                            ) : (
                              <ReceiptText
                                aria-hidden="true"
                                className="size-4"
                              />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {transaction.description ||
                                (isIncome
                                  ? "Money received"
                                  : "Payment or charge")}
                            </p>
                            <p className="text-muted-foreground mt-1 truncate text-xs">
                              {transaction.transactionDate}
                              {allocationNames ? ` · ${allocationNames}` : ""}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 text-sm font-medium tabular-nums ${isIncome ? "text-emerald-400" : "text-foreground"}`}
                          >
                            {isIncome ? "+" : "−"}
                            {formatMoney(transaction.totalAmount)}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <Card className="border-border/80">
              <CardHeader className="border-border/70 border-b pb-4">
                <p className="text-primary text-[11px] font-semibold tracking-[0.18em] uppercase">
                  Account map
                </p>
                <CardTitle className="mt-1 text-xl">
                  Where your money lives
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                {accounts
                  .filter(
                    (account) =>
                      account.type === "CASH" || account.type === "LOAN_TAKEN",
                  )
                  .map((account) => {
                    const isCard = account.type === "LOAN_TAKEN";
                    return (
                      <div
                        key={account.id}
                        className="border-border/70 flex items-center gap-3 border p-3"
                      >
                        <span
                          className={`grid size-9 shrink-0 place-items-center ${isCard ? "bg-amber-500/10 text-amber-400" : "bg-primary/10 text-primary"}`}
                        >
                          {isCard ? (
                            <CreditCard aria-hidden="true" className="size-4" />
                          ) : (
                            <Wallet aria-hidden="true" className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {account.name}
                          </p>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {isCard ? "Loan Taken" : "Cash"}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatMoney(account.balance)}
                          <span className="text-muted-foreground ml-1 text-[10px] font-normal">
                            THB
                          </span>
                        </p>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
            <Card className="border-border/80">
              <CardHeader className="border-border/70 border-b pb-4">
                <p className="text-primary text-[11px] font-semibold tracking-[0.18em] uppercase">
                  Category totals
                </p>
                <CardTitle className="mt-1 text-xl">
                  Spending & income mix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {summary.categories.map((category) => {
                  const maxUnits = summary.categories.reduce(
                    (maximum, entry) => {
                      const units = toMinorUnits(entry.total) ?? 0n;
                      if (units > maximum) return units;
                      return maximum;
                    },
                    1n,
                  );
                  const currentUnits = toMinorUnits(category.total) ?? 0n;
                  const percent = (currentUnits * 100n) / maxUnits;
                  const boundedPercent = percent > 100n ? 100n : percent;
                  const isIncome = category.type === "INCOME";
                  return (
                    <div key={category.accountId}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground truncate">
                          {category.accountName}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatMoney(category.total)}
                        </span>
                      </div>
                      <div className="bg-muted h-1.5">
                        <div
                          className={`h-full ${isIncome ? "bg-emerald-400" : "bg-primary"}`}
                          style={{ width: `${boundedPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {summary.categories.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Categories will appear after your accounts are set up.
                  </p>
                )}
                <p className="border-border/70 text-muted-foreground border-t pt-3 text-xs">
                  Opening balances and card repayments stay outside your income
                  and spending totals.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
