import type { INestApplication } from '@nestjs/common';
import { OrderStatus, UserRole, WalletTransactionType } from '@prisma/client';
import type { App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma/prisma.service';

import { createTestApp } from './helpers/app.helper';
import {
  authHeader,
  httpRequest,
  registerUser,
  uniqueEmail,
  type AuthResponse,
  type ErrorResponse,
} from './helpers/auth.helper';
import { addToCart, setProductInventory } from './helpers/cart.helper';
import { cleanupMarketplace } from './helpers/db.helper';
import { checkout, refundOrder } from './helpers/orders.helper';
import { createProduct, publishProduct } from './helpers/products.helper';
import { depositToWallet, getWallet, getWalletTransactions } from './helpers/wallet.helper';

describe('Orders wallet payment (e2e)', () => {
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

  async function seedPublishedProduct(stock: number, price = 100) {
    const vendor = await registerUser(
      app,
      uniqueEmail('vendor-orders'),
      'password123',
      UserRole.VENDOR,
    );
    const product = await createProduct(app, vendor.token, {
      title: 'Order Phone',
      description: 'A phone for order tests',
      price,
    });

    await setProductInventory(app, vendor.token, product.id, stock);
    await publishProduct(app, vendor.token, product.id);

    return { vendor, product };
  }

  async function registerCustomer(): Promise<AuthResponse> {
    return registerUser(app, uniqueEmail('customer-orders'), 'password123', UserRole.CUSTOMER);
  }

  describe('POST /orders/checkout', () => {
    it('deducts wallet, writes PAYMENT ledger, and creates a PAID order', async () => {
      const customer = await registerCustomer();
      const { product } = await seedPublishedProduct(10, 150);

      await depositToWallet(app, customer.token, 500);
      await addToCart(app, customer.token, { productId: product.id, quantity: 2 });

      const order = await checkout(app, customer.token);
      const wallet = await getWallet(app, customer.token);
      const history = await getWalletTransactions(app, customer.token, {
        type: WalletTransactionType.PAYMENT,
      });

      expect(order).toMatchObject({
        status: OrderStatus.PAID,
        total: 300,
        userId: customer.user.id,
      });
      expect(wallet.balance).toBe(200);
      expect(history.data).toHaveLength(1);
      expect(history.data[0]).toMatchObject({
        type: WalletTransactionType.PAYMENT,
        amount: 300,
      });
    });

    it('rejects checkout when wallet balance is insufficient', async () => {
      const customer = await registerCustomer();
      const { product } = await seedPublishedProduct(10, 150);

      await depositToWallet(app, customer.token, 50);
      await addToCart(app, customer.token, { productId: product.id, quantity: 2 });

      const response = await httpRequest(app)
        .post('/orders/checkout')
        .set(authHeader(customer.token))
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Insufficient wallet balance');

      const wallet = await getWallet(app, customer.token);
      expect(wallet.balance).toBe(50);

      const orders = await prisma.order.findMany({ where: { userId: customer.user.id } });
      expect(orders).toHaveLength(0);
    });
  });

  describe('POST /orders/:id/refund', () => {
    it('allows an admin to refund a paid order back to the wallet', async () => {
      const customer = await registerCustomer();
      const admin = await registerUser(
        app,
        uniqueEmail('admin-refund'),
        'password123',
        UserRole.ADMIN,
      );
      const { product } = await seedPublishedProduct(10, 100);

      await depositToWallet(app, customer.token, 500);
      await addToCart(app, customer.token, { productId: product.id, quantity: 1 });
      const order = await checkout(app, customer.token);

      const refunded = await refundOrder(app, admin.token, order.id);
      const wallet = await getWallet(app, customer.token);
      const history = await getWalletTransactions(app, customer.token, {
        type: WalletTransactionType.REFUND,
      });

      expect(refunded.status).toBe(OrderStatus.CANCELLED);
      expect(wallet.balance).toBe(500);
      expect(history.data).toHaveLength(1);
      expect(history.data[0]).toMatchObject({
        type: WalletTransactionType.REFUND,
        amount: 100,
      });
    });

    it('rejects refunds from non-admin users', async () => {
      const customer = await registerCustomer();
      const { product } = await seedPublishedProduct(10, 100);

      await depositToWallet(app, customer.token, 500);
      await addToCart(app, customer.token, { productId: product.id, quantity: 1 });
      const order = await checkout(app, customer.token);

      const response = await httpRequest(app)
        .post(`/orders/${order.id}/refund`)
        .set(authHeader(customer.token))
        .expect(403);

      const body = response.body as ErrorResponse;
      expect(body.message).toBe('Insufficient permissions');
    });
  });
});
