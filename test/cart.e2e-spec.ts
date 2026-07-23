import type { INestApplication } from '@nestjs/common';
import { UserRole } from '@prisma/client';
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
import { cleanupUsers } from './helpers/db.helper';
import {
  addToCart,
  getCart,
  removeCartItem,
  setProductInventory,
  updateCartItem,
} from './helpers/cart.helper';
import { createProduct, publishProduct } from './helpers/products.helper';

describe('Cart (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.product.deleteMany();
    await cleanupUsers(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.product.deleteMany();
    await cleanupUsers(prisma);
  });

  async function seedPublishedProduct(stock: number, price = 100) {
    const vendor = await registerUser(
      app,
      uniqueEmail('vendor-cart'),
      'password123',
      UserRole.VENDOR,
    );
    const product = await createProduct(app, vendor.token, {
      title: 'Cart Phone',
      description: 'A phone for cart tests',
      price,
    });

    await setProductInventory(app, vendor.token, product.id, stock);
    await publishProduct(app, vendor.token, product.id);

    return { vendor, product };
  }

  async function registerCustomer(): Promise<AuthResponse> {
    return registerUser(app, uniqueEmail('customer-cart'), 'password123', UserRole.CUSTOMER);
  }

  describe('GET /cart', () => {
    it('returns an empty cart summary for a customer without a cart', async () => {
      const customer = await registerCustomer();

      const cart = await getCart(app, customer.token);

      expect(cart).toEqual({
        items: [],
        subtotal: 0,
        totalItems: 0,
      });
    });
  });

  describe('POST /cart/items', () => {
    it('adds an item to an empty cart and returns the computed summary', async () => {
      const customer = await registerCustomer();
      const { product } = await seedPublishedProduct(10, 150);

      const cart = await addToCart(app, customer.token, {
        productId: product.id,
        quantity: 2,
      });

      expect(cart).toMatchObject({
        subtotal: 300,
        totalItems: 2,
        items: [
          {
            productId: product.id,
            quantity: 2,
            title: 'Cart Phone',
            price: 150,
            lineTotal: 300,
          },
        ],
      });
      expect(cart.items[0]?.id).toEqual(expect.any(String));
    });

    it('increases quantity for a duplicate product instead of creating a second row', async () => {
      const customer = await registerCustomer();
      const { product } = await seedPublishedProduct(10, 100);

      await addToCart(app, customer.token, { productId: product.id, quantity: 2 });
      const cart = await addToCart(app, customer.token, {
        productId: product.id,
        quantity: 3,
      });

      expect(cart.items).toHaveLength(1);
      expect(cart).toMatchObject({
        totalItems: 5,
        subtotal: 500,
        items: [{ productId: product.id, quantity: 5, lineTotal: 500 }],
      });

      const itemCount = await prisma.cartItem.count({
        where: { productId: product.id, cart: { customerId: customer.user.id } },
      });
      expect(itemCount).toBe(1);
    });

    it('rejects when requested quantity exceeds available stock', async () => {
      const customer = await registerCustomer();
      const { product } = await seedPublishedProduct(3);

      const response = await httpRequest(app)
        .post('/cart/items')
        .set(authHeader(customer.token))
        .send({ productId: product.id, quantity: 5 })
        .expect(400);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Requested quantity exceeds available stock');
    });

    it('rejects when combining with an existing cart item would exceed stock', async () => {
      const customer = await registerCustomer();
      const { product } = await seedPublishedProduct(5);

      await addToCart(app, customer.token, { productId: product.id, quantity: 3 });

      const response = await httpRequest(app)
        .post('/cart/items')
        .set(authHeader(customer.token))
        .send({ productId: product.id, quantity: 3 })
        .expect(400);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Requested quantity exceeds available stock');
    });

    it('rejects unpublished products', async () => {
      const customer = await registerCustomer();
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-draft'),
        'password123',
        UserRole.VENDOR,
      );
      const product = await createProduct(app, vendor.token, {
        title: 'Draft Phone',
        price: 50,
      });
      await setProductInventory(app, vendor.token, product.id, 10);

      const response = await httpRequest(app)
        .post('/cart/items')
        .set(authHeader(customer.token))
        .send({ productId: product.id, quantity: 1 })
        .expect(400);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Product is not published or does not exist');
    });
  });

  describe('PATCH /cart/items/:id', () => {
    it('updates the quantity of a cart item', async () => {
      const customer = await registerCustomer();
      const { product } = await seedPublishedProduct(10, 80);

      const created = await addToCart(app, customer.token, {
        productId: product.id,
        quantity: 2,
      });
      const itemId = created.items[0].id;

      const cart = await updateCartItem(app, customer.token, itemId, { quantity: 4 });

      expect(cart).toMatchObject({
        totalItems: 4,
        subtotal: 320,
        items: [{ id: itemId, productId: product.id, quantity: 4, lineTotal: 320 }],
      });
    });

    it('rejects updating quantity above available stock', async () => {
      const customer = await registerCustomer();
      const { product } = await seedPublishedProduct(4);

      const created = await addToCart(app, customer.token, {
        productId: product.id,
        quantity: 2,
      });

      const response = await httpRequest(app)
        .patch(`/cart/items/${created.items[0].id}`)
        .set(authHeader(customer.token))
        .send({ quantity: 5 })
        .expect(400);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Requested quantity exceeds available stock');
    });
  });

  describe('DELETE /cart/items/:id', () => {
    it('removes an item from the cart', async () => {
      const customer = await registerCustomer();
      const { product } = await seedPublishedProduct(10, 100);

      const created = await addToCart(app, customer.token, {
        productId: product.id,
        quantity: 2,
      });
      const itemId = created.items[0].id;

      const cart = await removeCartItem(app, customer.token, itemId);

      expect(cart).toEqual({
        items: [],
        subtotal: 0,
        totalItems: 0,
      });

      const remaining = await prisma.cartItem.findUnique({ where: { id: itemId } });
      expect(remaining).toBeNull();
    });
  });

  describe('unauthorized access', () => {
    it('rejects unauthenticated cart requests', async () => {
      await httpRequest(app).get('/cart').expect(401);
      await httpRequest(app)
        .post('/cart/items')
        .send({ productId: '00000000-0000-0000-0000-000000000001', quantity: 1 })
        .expect(401);
      await httpRequest(app)
        .patch('/cart/items/00000000-0000-0000-0000-000000000001')
        .send({ quantity: 1 })
        .expect(401);
      await httpRequest(app).delete('/cart/items/00000000-0000-0000-0000-000000000001').expect(401);
    });

    it('rejects vendors from accessing customer cart endpoints', async () => {
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-cart-forbidden'),
        'password123',
        UserRole.VENDOR,
      );

      const response = await httpRequest(app)
        .get('/cart')
        .set(authHeader(vendor.token))
        .expect(403);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Insufficient permissions');
    });

    it('rejects a customer from updating another customer cart item', async () => {
      const owner = await registerCustomer();
      const intruder = await registerCustomer();
      const { product } = await seedPublishedProduct(10);

      const created = await addToCart(app, owner.token, {
        productId: product.id,
        quantity: 1,
      });

      const response = await httpRequest(app)
        .patch(`/cart/items/${created.items[0].id}`)
        .set(authHeader(intruder.token))
        .send({ quantity: 2 })
        .expect(403);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('You are not allowed to modify this cart');
    });

    it('rejects a customer from deleting another customer cart item', async () => {
      const owner = await registerCustomer();
      const intruder = await registerCustomer();
      const { product } = await seedPublishedProduct(10);

      const created = await addToCart(app, owner.token, {
        productId: product.id,
        quantity: 1,
      });

      const response = await httpRequest(app)
        .delete(`/cart/items/${created.items[0].id}`)
        .set(authHeader(intruder.token))
        .expect(403);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('You are not allowed to modify this cart');
    });
  });
});
