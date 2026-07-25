import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma, Wallet, WalletTransaction } from '@prisma/client';

import { PrismaService } from '@/database/prisma/prisma.service';
import type { PaginatedResult } from '@/shared/pagination';
import type { TokenPayload } from '@/shared/types';

import { DepositDto, GetWalletTransactionsQueryDto } from './dto';
import { WalletRepository } from './wallet.repository';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getWallet(user: TokenPayload): Promise<Wallet> {
    const wallet = await this.walletRepository.findByUserId(user.userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async getTransactions(
    user: TokenPayload,
    query: GetWalletTransactionsQueryDto,
  ): Promise<PaginatedResult<WalletTransaction>> {
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException('"from" must be before or equal to "to"');
    }

    const wallet = await this.walletRepository.findByUserId(user.userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.walletRepository.findTransactions(wallet.id, query);
  }

  async deposit(user: TokenPayload, body: DepositDto): Promise<WalletTransaction> {
    const wallet = await this.walletRepository.findByUserId(user.userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.prisma.$transaction(async (tx) => {
      return this.walletRepository.deposit(wallet.id, body.amount, tx);
    });
  }

  async pay(
    userId: string,
    amount: number,
    transaction: Prisma.TransactionClient,
  ): Promise<WalletTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be positive');
    }

    const wallet = await this.walletRepository.findByUserId(userId, transaction);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    try {
      return await this.walletRepository.pay(wallet.id, amount, transaction);
    } catch (error) {
      if (error instanceof Error && error.message === 'INSUFFICIENT_WALLET_BALANCE') {
        throw new BadRequestException('Insufficient wallet balance');
      }

      throw error;
    }
  }

  async refund(
    userId: string,
    amount: number,
    transaction: Prisma.TransactionClient,
  ): Promise<WalletTransaction> {
    if (amount <= 0) {
      throw new BadRequestException('Refund amount must be positive');
    }

    const wallet = await this.walletRepository.findByUserId(userId, transaction);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.walletRepository.refund(wallet.id, amount, transaction);
  }
}
