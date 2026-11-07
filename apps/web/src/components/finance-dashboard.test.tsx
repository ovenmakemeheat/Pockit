import type { AppRouter } from "@Pockit/api/routers/index";
import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { FinanceDashboard } from "./finance-dashboard";

type Outputs = inferRouterOutputs<AppRouter>;
type Inputs = inferRouterInputs<AppRouter>;
type Account = Outputs["finance"]["accounts"]["list"][number];
type Summary = Outputs["finance"]["summary"]["get"];
type Transaction = Outputs["finance"]["transactions"]["history"][number];

const accounts: Account[] = [
  {
    id: "cash-main",
    name: "Everyday bank",
    type: "CASH",
    currencyCode: "THB",
    openingBalance: null,
    balance: "0.00",
    categoryTotal: null,
  },
  {
    id: "card-main",
    name: "Travel card",
    type: "LOAN_TAKEN",
    currencyCode: "THB",
    openingBalance: null,
    balance: "0.00",
    categoryTotal: null,
  },
  {
    id: "income-salary",
    name: "Salary",
    type: "INCOME",
    currencyCode: "THB",
    openingBalance: null,
    balance: null,
    categoryTotal: "0.00",
  },
  {
    id: "expense-dining",
    name: "Dining",
    type: "EXPENSE",
    currencyCode: "THB",
    openingBalance: null,
    balance: null,
    categoryTotal: "0.00",
  },
  {
    id: "expense-groceries",
    name: "Groceries",
    type: "EXPENSE",
    currencyCode: "THB",
    openingBalance: null,
    balance: null,
    categoryTotal: "0.00",
  },
];

const summary: Summary = {
  incomeTotal: "0.00",
  expenseTotal: "0.00",
  balances: [
    {
      accountId: "cash-main",
      accountName: "Everyday bank",
      type: "CASH",
      balance: "0.00",
    },
    {
      accountId: "card-main",
      accountName: "Travel card",
      type: "LOAN_TAKEN",
      balance: "0.00",
    },
  ],
  categories: [
    {
      accountId: "income-salary",
      accountName: "Salary",
      type: "INCOME",
      total: "0.00",
    },
    {
      accountId: "expense-dining",
      accountName: "Dining",
      type: "EXPENSE",
      total: "0.00",
    },
    {
      accountId: "expense-groceries",
      accountName: "Groceries",
      type: "EXPENSE",
      total: "0.00",
    },
  ],
};

const noTransactions: Transaction[] = [];
const setOpeningBalance = mock(
  (_input: Inputs["finance"]["accounts"]["setOpeningBalance"]) =>
    Promise.resolve(),
);
const createTransaction = mock(
  (_input: Inputs["finance"]["transactions"]["create"]) => Promise.resolve(),
);

function renderDashboard() {
  return render(
    <FinanceDashboard
      name="Demo User"
      accounts={accounts}
      transactions={noTransactions}
      summary={summary}
      onSetOpeningBalance={setOpeningBalance}
      onCreateTransaction={createTransaction}
    />,
  );
}

describe("finance dashboard", () => {
  it("renders persisted API-shaped balances, summaries, categories, and history", () => {
    const displayedAccounts = accounts.map((account) =>
      account.id === "cash-main"
        ? { ...account, openingBalance: "1000.00", balance: "2460.00" }
        : account.id === "card-main"
          ? { ...account, balance: "60.00" }
          : account,
    );
    const [cashBalance, cardBalance] = summary.balances;
    const [salaryCategory, diningCategory, groceryCategory] =
      summary.categories;
    if (
      !cashBalance ||
      !cardBalance ||
      !salaryCategory ||
      !diningCategory ||
      !groceryCategory
    ) {
      throw new Error("Expected the finance summary fixture");
    }
    const displayedSummary: Summary = {
      ...summary,
      incomeTotal: "1500.00",
      expenseTotal: "100.00",
      balances: [
        { ...cashBalance, balance: "2460.00" },
        { ...cardBalance, balance: "60.00" },
      ],
      categories: [
        { ...salaryCategory, total: "1500.00" },
        { ...diningCategory, total: "65.00" },
        { ...groceryCategory, total: "35.00" },
      ],
    };
    const displayedTransactions: Transaction[] = [
      {
        id: "salary-transaction",
        form: "RECEIVE_MONEY",
        totalAmount: "1500.00",
        transactionDate: "2026-11-01",
        sourceAccountId: "cash-main",
        description: "Salary",
        allocations: [
          {
            id: "salary-allocation",
            accountId: "income-salary",
            accountName: "Salary",
            kind: "INCOME",
            amount: "1500.00",
          },
        ],
      },
      {
        id: "purchase-transaction",
        form: "PAYMENT_CHARGE",
        totalAmount: "100.00",
        transactionDate: "2026-11-02",
        sourceAccountId: "card-main",
        description: "Card purchase",
        allocations: [
          {
            id: "dining-allocation",
            accountId: "expense-dining",
            accountName: "Dining",
            kind: "EXPENSE",
            amount: "65.00",
          },
          {
            id: "grocery-allocation",
            accountId: "expense-groceries",
            accountName: "Groceries",
            kind: "EXPENSE",
            amount: "35.00",
          },
        ],
      },
    ];
    const view = render(
      <FinanceDashboard
        name="Demo User"
        accounts={displayedAccounts}
        transactions={displayedTransactions}
        summary={displayedSummary}
        onSetOpeningBalance={setOpeningBalance}
        onCreateTransaction={createTransaction}
      />,
    );

    const overview = view.getByRole("region", { name: "Financial overview" });
    expect(overview.textContent).toContain("฿2460.00");
    expect(overview.textContent).toContain("฿60.00");
    expect(overview.textContent).toContain("฿1500.00");
    expect(overview.textContent).toContain("฿100.00");
    expect(view.getAllByText("Card purchase")).toHaveLength(2);
    expect(view.getByText(/Dining · Groceries/)).toBeTruthy();
    expect(view.getByText("2026-11-01 · Salary")).toBeTruthy();
  });

  it("records an explicit opening balance for the selected Cash account", async () => {
    setOpeningBalance.mockClear();
    const view = renderDashboard();
    fireEvent.input(view.getByLabelText("Opening balance"), {
      target: { value: "25000.50" },
    });
    fireEvent.click(
      view.getByRole("button", { name: /save opening balance/i }),
    );

    await waitFor(() => {
      expect(setOpeningBalance).toHaveBeenCalledWith({
        accountId: "cash-main",
        amount: "25000.50",
      });
    });
  });

  it("submits a card purchase split over two Expense categories", async () => {
    createTransaction.mockClear();
    const view = renderDashboard();
    fireEvent.click(view.getByRole("button", { name: /card purchase/i }));
    fireEvent.input(view.getByLabelText("Purchase total"), {
      target: { value: "850.00" },
    });
    const [diningAllocation, groceryAllocation] =
      view.getAllByLabelText("Allocated amount");
    if (!diningAllocation || !groceryAllocation) {
      throw new Error("Expected two Expense allocation fields");
    }
    fireEvent.input(diningAllocation, { target: { value: "500.00" } });
    fireEvent.input(groceryAllocation, { target: { value: "350.00" } });
    fireEvent.input(view.getByLabelText("Transaction date"), {
      target: { value: "2026-11-07" },
    });
    fireEvent.click(
      view.getByRole("button", { name: /record card purchase/i }),
    );

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith({
        form: "PAYMENT_CHARGE",
        sourceAccountId: "card-main",
        totalAmount: "850.00",
        transactionDate: "2026-11-07",
        description: undefined,
        allocations: [
          { kind: "EXPENSE", accountId: "expense-dining", amount: "500.00" },
          { kind: "EXPENSE", accountId: "expense-groceries", amount: "350.00" },
        ],
      });
    });
  });

  it("records salary income into the selected Cash account", async () => {
    createTransaction.mockClear();
    const view = renderDashboard();
    fireEvent.click(view.getByRole("button", { name: /income received/i }));
    fireEvent.input(view.getByLabelText("Amount received"), {
      target: { value: "42000.00" },
    });
    fireEvent.input(view.getByLabelText("Transaction date"), {
      target: { value: "2026-11-07" },
    });
    fireEvent.click(view.getByRole("button", { name: "Record income" }));

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith({
        form: "RECEIVE_MONEY",
        sourceAccountId: "cash-main",
        totalAmount: "42000.00",
        transactionDate: "2026-11-07",
        description: "Salary",
        allocations: [
          { kind: "INCOME", accountId: "income-salary", amount: "42000.00" },
        ],
      });
    });
  });

  it("records a card repayment from Cash without an Expense allocation", async () => {
    createTransaction.mockClear();
    const view = renderDashboard();
    fireEvent.click(view.getByRole("button", { name: /repay card/i }));
    fireEvent.input(view.getByLabelText("Payment amount"), {
      target: { value: "1200.00" },
    });
    fireEvent.input(view.getByLabelText("Transaction date"), {
      target: { value: "2026-11-07" },
    });
    fireEvent.click(view.getByRole("button", { name: /record repayment/i }));

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith({
        form: "PAYMENT_CHARGE",
        sourceAccountId: "cash-main",
        totalAmount: "1200.00",
        transactionDate: "2026-11-07",
        description: "Credit-card repayment",
        allocations: [
          {
            kind: "LOAN_TAKEN_REPAYMENT",
            accountId: "card-main",
            amount: "1200.00",
          },
        ],
      });
    });
  });

  it("keeps submit disabled when allocation amounts do not balance", () => {
    const view = renderDashboard();
    fireEvent.click(view.getByRole("button", { name: /card purchase/i }));
    fireEvent.input(view.getByLabelText("Purchase total"), {
      target: { value: "850.00" },
    });
    const [diningAllocation, groceryAllocation] =
      view.getAllByLabelText("Allocated amount");
    if (!diningAllocation || !groceryAllocation) {
      throw new Error("Expected two Expense allocation fields");
    }
    fireEvent.input(diningAllocation, { target: { value: "500.00" } });
    fireEvent.input(groceryAllocation, { target: { value: "300.00" } });
    fireEvent.input(view.getByLabelText("Transaction date"), {
      target: { value: "2026-11-07" },
    });

    expect(
      (
        view.getByRole("button", {
          name: /record card purchase/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
