import type { INestApplication } from '@nestjs/common';
import type { WalletTransaction, WalletTransactionType } from '@prisma/client';

import { authHeader, httpRequest } from './auth.helper';

export type WalletResponse = {
  id: string;
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedWalletTransactionsResponse = {
  data: Array<{
    id: string;
    walletId: string;
    type: WalletTransactionType;
    amount: number;
    createdAt: string;
  }>;
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

export async function getWallet(app: INestApplication, token: string): Promise<WalletResponse> {
  const response = await httpRequest(app).get('/wallet').set(authHeader(token)).expect(200);

  return response.body as WalletResponse;
}

export async function depositToWallet(
  app: INestApplication,
  token: string,
  amount: number,
): Promise<WalletTransaction> {
  const response = await httpRequest(app)
    .post('/wallet/deposit')
    .set(authHeader(token))
    .send({ amount })
    .expect(201);

  return response.body as WalletTransaction;
}

export async function getWalletTransactions(
  app: INestApplication,
  token: string,
  query: Record<string, string | number> = {},
): Promise<PaginatedWalletTransactionsResponse> {
  const response = await httpRequest(app)
    .get('/wallet/transactions')
    .query(query)
    .set(authHeader(token))
    .expect(200);

  return response.body as PaginatedWalletTransactionsResponse;
}
