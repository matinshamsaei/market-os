import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, WalletTransactionType } from '@prisma/client';

import { PrismaService } from '@/database/prisma/prisma.service';
import type { TokenPayload } from '@/shared/types';

import { WalletRepository } from '../wallet.repository';
import { WalletService } from '../wallet.service';

describe('WalletService', () => {
  let service: WalletService;

  const customer: TokenPayload = {
    userId: 'customer-1',
    email: 'customer@test.com',
    role: UserRole.CUSTOMER,
  };

  const wallet = {
    id: 'wallet-1',
    userId: customer.userId,
    balance: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction = {};

  const mockWalletRepository = {
    findByUserId: jest.fn(),
    findTransactions: jest.fn(),
    deposit: jest.fn(),
    pay: jest.fn(),
    refund: jest.fn(),
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: WalletRepository,
          useValue: mockWalletRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    jest.clearAllMocks();
  });

  describe('getWallet', () => {
    it('returns the wallet for the user', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(wallet);

      await expect(service.getWallet(customer)).resolves.toEqual(wallet);
      expect(mockWalletRepository.findByUserId).toHaveBeenCalledWith(customer.userId);
    });

    it('throws when wallet does not exist', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(null);

      await expect(service.getWallet(customer)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTransactions', () => {
    it('returns paginated transactions', async () => {
      const query = { page: 1, perPage: 10 };
      const paginated = {
        data: [],
        meta: { page: 1, perPage: 10, total: 0, totalPages: 0 },
      };

      mockWalletRepository.findByUserId.mockResolvedValue(wallet);
      mockWalletRepository.findTransactions.mockResolvedValue(paginated);

      await expect(service.getTransactions(customer, query)).resolves.toEqual(paginated);
      expect(mockWalletRepository.findTransactions).toHaveBeenCalledWith(wallet.id, query);
    });

    it('rejects invalid date range', async () => {
      await expect(
        service.getTransactions(customer, {
          page: 1,
          perPage: 10,
          from: '2026-12-31',
          to: '2026-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when wallet does not exist', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(null);

      await expect(service.getTransactions(customer, { page: 1, perPage: 10 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deposit', () => {
    it('deposits inside a database transaction', async () => {
      const ledgerEntry = {
        id: 'tx-1',
        walletId: wallet.id,
        type: WalletTransactionType.DEPOSIT,
        amount: 500,
        createdAt: new Date(),
      };

      mockWalletRepository.findByUserId.mockResolvedValue(wallet);
      mockWalletRepository.deposit.mockResolvedValue(ledgerEntry);
      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: typeof mockTransaction) => Promise<unknown>) =>
          callback(mockTransaction),
      );

      await expect(service.deposit(customer, { amount: 500 })).resolves.toEqual(ledgerEntry);
      expect(mockWalletRepository.deposit).toHaveBeenCalledWith(wallet.id, 500, mockTransaction);
    });

    it('throws when wallet does not exist', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(null);

      await expect(service.deposit(customer, { amount: 500 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('pay', () => {
    it('pays from the wallet balance', async () => {
      const ledgerEntry = {
        id: 'tx-2',
        walletId: wallet.id,
        type: WalletTransactionType.PAYMENT,
        amount: 200,
        createdAt: new Date(),
      };

      mockWalletRepository.findByUserId.mockResolvedValue(wallet);
      mockWalletRepository.pay.mockResolvedValue(ledgerEntry);

      await expect(service.pay(customer.userId, 200, mockTransaction as never)).resolves.toEqual(
        ledgerEntry,
      );
      expect(mockWalletRepository.pay).toHaveBeenCalledWith(wallet.id, 200, mockTransaction);
    });

    it('rejects non-positive payment amounts', async () => {
      await expect(service.pay(customer.userId, 0, mockTransaction as never)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('maps insufficient balance errors', async () => {
      mockWalletRepository.findByUserId.mockResolvedValue(wallet);
      mockWalletRepository.pay.mockRejectedValue(new Error('INSUFFICIENT_WALLET_BALANCE'));

      await expect(service.pay(customer.userId, 200, mockTransaction as never)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('refund', () => {
    it('refunds into the wallet', async () => {
      const ledgerEntry = {
        id: 'tx-3',
        walletId: wallet.id,
        type: WalletTransactionType.REFUND,
        amount: 200,
        createdAt: new Date(),
      };

      mockWalletRepository.findByUserId.mockResolvedValue(wallet);
      mockWalletRepository.refund.mockResolvedValue(ledgerEntry);

      await expect(service.refund(customer.userId, 200, mockTransaction as never)).resolves.toEqual(
        ledgerEntry,
      );
      expect(mockWalletRepository.refund).toHaveBeenCalledWith(wallet.id, 200, mockTransaction);
    });

    it('rejects non-positive refund amounts', async () => {
      await expect(service.refund(customer.userId, -1, mockTransaction as never)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
