import type { PrismaService } from '../../src/database/prisma/prisma.service';

export async function cleanupUsers(prisma: PrismaService): Promise<void> {
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
}
