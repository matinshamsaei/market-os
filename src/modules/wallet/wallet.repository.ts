import { Injectable } from '@nestjs/common';

import { Prisma, Wallet, WalletTransaction, WalletTransactionType } from '@prisma/client';

import { PrismaService } from '@/database/prisma/prisma.service';

@Injectable()
export class WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({
      where: { userId },
    });
  }

  findByUserIdWithTransactions(
    userId: string,
  ): Promise<(Wallet & { transactions: WalletTransaction[] }) | null> {
    return this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  createForUser(userId: string, transaction?: Prisma.TransactionClient): Promise<Wallet> {
    const repository = transaction ?? this.prisma;
    return repository.wallet.create({
      data: { userId },
    });
  }

  async recordTransaction(
    transaction: Prisma.TransactionClient,
    walletId: string,
    type: WalletTransactionType,
    amount: number,
    balanceDelta: number,
  ): Promise<WalletTransaction> {
    const walletTransaction = await transaction.walletTransaction.create({
      data: { walletId, type, amount },
    });

    await transaction.wallet.update({
      where: { id: walletId },
      data: { balance: { increment: balanceDelta } },
    });

    return walletTransaction;
  }
}
