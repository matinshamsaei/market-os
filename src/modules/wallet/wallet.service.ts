import { Injectable, NotFoundException } from '@nestjs/common';

import { Wallet, WalletTransaction } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { WalletRepository } from './wallet.repository';

@Injectable()
export class WalletService {
  constructor(private readonly walletRepository: WalletRepository) {}

  async getWallet(user: TokenPayload): Promise<Wallet> {
    const wallet = await this.walletRepository.findByUserId(user.userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async getTransactions(user: TokenPayload): Promise<WalletTransaction[]> {
    const wallet = await this.walletRepository.findByUserIdWithTransactions(user.userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet.transactions;
  }
}
