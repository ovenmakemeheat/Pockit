-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'LOAN_GIVEN', 'LOAN_TAKEN', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialTransactionForm" AS ENUM ('PAYMENT_CHARGE', 'RECEIVE_MONEY');

-- CreateEnum
CREATE TYPE "AllocationKind" AS ENUM ('EXPENSE', 'LOAN_TAKEN_REPAYMENT', 'LOAN_GIVEN_LENDING', 'TRANSFER_TO_CASH', 'INCOME', 'LOAN_GIVEN_REPAYMENT', 'LOAN_TAKEN_BORROWING', 'TRANSFER_FROM_CASH');

-- CreateTable
CREATE TABLE "financial_account" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'THB',
    "openingBalanceMinorUnits" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transaction" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "form" "FinancialTransactionForm" NOT NULL,
    "totalMinorUnits" TEXT NOT NULL,
    "transactionDate" DATE NOT NULL,
    "sourceAccountId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocation_line" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" "AllocationKind" NOT NULL,
    "amountMinorUnits" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allocation_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_account_ownerId_type_idx" ON "financial_account"("ownerId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "financial_account_id_ownerId_key" ON "financial_account"("id", "ownerId");

-- CreateIndex
CREATE INDEX "financial_transaction_ownerId_transactionDate_idx" ON "financial_transaction"("ownerId", "transactionDate");

-- CreateIndex
CREATE INDEX "financial_transaction_sourceAccountId_ownerId_idx" ON "financial_transaction"("sourceAccountId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transaction_id_ownerId_key" ON "financial_transaction"("id", "ownerId");

-- CreateIndex
CREATE INDEX "allocation_line_transactionId_ownerId_idx" ON "allocation_line"("transactionId", "ownerId");

-- CreateIndex
CREATE INDEX "allocation_line_accountId_ownerId_kind_idx" ON "allocation_line"("accountId", "ownerId", "kind");

-- AddForeignKey
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transaction" ADD CONSTRAINT "financial_transaction_sourceAccountId_ownerId_fkey" FOREIGN KEY ("sourceAccountId", "ownerId") REFERENCES "financial_account"("id", "ownerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_line" ADD CONSTRAINT "allocation_line_transactionId_ownerId_fkey" FOREIGN KEY ("transactionId", "ownerId") REFERENCES "financial_transaction"("id", "ownerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_line" ADD CONSTRAINT "allocation_line_accountId_ownerId_fkey" FOREIGN KEY ("accountId", "ownerId") REFERENCES "financial_account"("id", "ownerId") ON DELETE RESTRICT ON UPDATE CASCADE;
