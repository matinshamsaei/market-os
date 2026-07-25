-- DropIndex
DROP INDEX IF EXISTS "wallet_transactions_walletId_idx";

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_createdAt_idx" ON "wallet_transactions"("walletId", "createdAt");
