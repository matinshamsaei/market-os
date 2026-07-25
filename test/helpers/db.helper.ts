import type { PrismaService } from '../../src/database/prisma/prisma.service';

/**
 * Enables DELETE on wallet_transactions for this DB session only (test cleanup).
 * Production code must never call this — ledger rows are immutable.
 */
async function allowWalletLedgerMutationForSession(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.allow_wallet_ledger_mutation', 'on', true)`,
  );
}

export async function cleanupUsers(prisma: PrismaService): Promise<void> {
  await allowWalletLedgerMutationForSession(prisma);
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
}
