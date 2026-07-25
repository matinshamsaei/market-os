import { Injectable } from '@nestjs/common';

import { Prisma, Wallet, WalletTransaction, WalletTransactionType } from '@prisma/client';

import { PrismaService } from '@/database/prisma/prisma.service';

@Injectable()
export class WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string, transaction?: Prisma.TransactionClient): Promise<Wallet | null> {
    const repository = transaction ?? this.prisma;
    return repository.wallet.findUnique({
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

  deposit(
    walletId: string,
    amount: number,
    transaction?: Prisma.TransactionClient,
  ): Promise<WalletTransaction> {
    const repository = transaction ?? this.prisma;

    return this.recordTransaction(
      repository,
      walletId,
      WalletTransactionType.DEPOSIT,
      amount,
      amount,
    );
  }

  async pay(
    walletId: string,
    amount: number,
    transaction: Prisma.TransactionClient,
  ): Promise<WalletTransaction> {
    const updated = await transaction.wallet.updateMany({
      where: {
        id: walletId,
        balance: { gte: amount },
      },
      data: {
        balance: { decrement: amount },
      },
    });

    if (updated.count === 0) {
      throw new Error('INSUFFICIENT_WALLET_BALANCE');
    }

    return transaction.walletTransaction.create({
      data: {
        walletId,
        type: WalletTransactionType.PAYMENT,
        amount,
      },
    });
  }

  refund(
    walletId: string,
    amount: number,
    transaction: Prisma.TransactionClient,
  ): Promise<WalletTransaction> {
    return this.recordTransaction(
      transaction,
      walletId,
      WalletTransactionType.REFUND,
      amount,
      amount,
    );
  }
}
