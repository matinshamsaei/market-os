import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, WalletTransactionType } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { WalletController } from '../wallet.controller';
import { WalletService } from '../wallet.service';

describe('WalletController', () => {
  let controller: WalletController;

  const mockWalletService = {
    getWallet: jest.fn(),
    getTransactions: jest.fn(),
    deposit: jest.fn(),
  };

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
      ],
    }).compile();

    controller = module.get<WalletController>(WalletController);
    jest.clearAllMocks();
  });

  describe('getWallet', () => {
    it('delegates to walletService.getWallet', async () => {
      mockWalletService.getWallet.mockResolvedValue(wallet);

      await expect(controller.getWallet(customer)).resolves.toEqual(wallet);
      expect(mockWalletService.getWallet).toHaveBeenCalledWith(customer);
    });
  });

  describe('getTransactions', () => {
    it('delegates to walletService.getTransactions', async () => {
      const query = { page: 1, perPage: 10 };
      const paginated = {
        data: [],
        meta: { page: 1, perPage: 10, total: 0, totalPages: 0 },
      };

      mockWalletService.getTransactions.mockResolvedValue(paginated);

      await expect(controller.getTransactions(customer, query)).resolves.toEqual(paginated);
      expect(mockWalletService.getTransactions).toHaveBeenCalledWith(customer, query);
    });
  });

  describe('deposit', () => {
    it('delegates to walletService.deposit', async () => {
      const body = { amount: 500 };
      const ledgerEntry = {
        id: 'tx-1',
        walletId: wallet.id,
        type: WalletTransactionType.DEPOSIT,
        amount: 500,
        createdAt: new Date(),
      };

      mockWalletService.deposit.mockResolvedValue(ledgerEntry);

      await expect(controller.deposit(customer, body)).resolves.toEqual(ledgerEntry);
      expect(mockWalletService.deposit).toHaveBeenCalledWith(customer, body);
    });
  });
});
