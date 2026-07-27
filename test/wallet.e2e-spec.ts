import type { INestApplication } from '@nestjs/common';
import { WalletTransactionType } from '@prisma/client';
import type { App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { depositToWallet, getWallet, getWalletTransactions } from './helpers/wallet.helper';
import { authHeader, httpRequest, registerUser, uniqueEmail } from './helpers/auth.helper';
import type { ErrorResponse } from './helpers/auth.helper';
import { cleanupMarketplace } from './helpers/db.helper';
import { createTestApp } from './helpers/app.helper';

describe('Wallet (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await cleanupMarketplace(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupMarketplace(prisma);
  });

  describe('GET /wallet', () => {
    it('returns the customer wallet created at registration', async () => {
      const customer = await registerUser(app, uniqueEmail('wallet-get'));

      const wallet = await getWallet(app, customer.token);

      expect(wallet).toMatchObject({
        userId: customer.user.id,
        balance: 0,
      });
    });
  });

  describe('POST /wallet/deposit', () => {
    it('credits balance and creates a DEPOSIT ledger entry', async () => {
      const customer = await registerUser(app, uniqueEmail('wallet-deposit'));

      const deposit = await depositToWallet(app, customer.token, 50000);
      const wallet = await getWallet(app, customer.token);

      expect(deposit).toMatchObject({
        type: WalletTransactionType.DEPOSIT,
        amount: 50000,
      });
      expect(wallet.balance).toBe(50000);
    });

    it('rejects non-positive amounts', async () => {
      const customer = await registerUser(app, uniqueEmail('wallet-deposit-invalid'));

      const response = await httpRequest(app)
        .post('/wallet/deposit')
        .set(authHeader(customer.token))
        .send({ amount: -10 })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toBeDefined();
    });
  });

  describe('GET /wallet/transactions', () => {
    it('returns paginated history with type filtering', async () => {
      const customer = await registerUser(app, uniqueEmail('wallet-history'));

      await depositToWallet(app, customer.token, 1000);
      await depositToWallet(app, customer.token, 2000);

      const all = await getWalletTransactions(app, customer.token, { page: 1, perPage: 10 });
      const filtered = await getWalletTransactions(app, customer.token, {
        page: 1,
        perPage: 10,
        type: WalletTransactionType.DEPOSIT,
      });

      expect(all.meta.total).toBe(2);
      expect(all.data).toHaveLength(2);
      expect(filtered.data.every((entry) => entry.type === WalletTransactionType.DEPOSIT)).toBe(
        true,
      );
    });
  });

  describe('immutable ledger', () => {
    it('rejects updates to wallet transactions at the database level', async () => {
      const customer = await registerUser(app, uniqueEmail('wallet-immutable'));
      const deposit = await depositToWallet(app, customer.token, 100);

      await expect(
        prisma.walletTransaction.update({
          where: { id: deposit.id },
          data: { amount: 1 },
        }),
      ).rejects.toThrow(/immutable/i);
    });
  });
});
