import { ProductStatus, UserRole } from '@prisma/client';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma/prisma.service';

import type { PaginatedProductsResponse, ProductResponse } from './helpers/products.helper';
import { authHeader, httpRequest, registerUser, uniqueEmail } from './helpers/auth.helper';
import { createProduct, publishProduct, updateProduct } from './helpers/products.helper';
import type { ErrorResponse } from './helpers/auth.helper';
import { cleanupMarketplace } from './helpers/db.helper';
import { createTestApp } from './helpers/app.helper';

describe('Products (e2e)', () => {
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

  describe('POST /products', () => {
    it('allows a vendor to create a draft product assigned to themselves', async () => {
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-create'),
        'password123',
        UserRole.VENDOR,
      );

      const response = await httpRequest(app)
        .post('/products')
        .set(authHeader(vendor.token))
        .send({
          title: 'Vendor Phone',
          description: 'A great phone',
          price: 499,
        })
        .expect(201);

      const body = response.body as ProductResponse;

      expect(body).toMatchObject({
        title: 'Vendor Phone',
        description: 'A great phone',
        price: 499,
        status: ProductStatus.DRAFT,
        vendorId: vendor.user.id,
      });
      expect(typeof body.id).toBe('string');
    });

    it('rejects unauthenticated create requests', async () => {
      const response = await httpRequest(app)
        .post('/products')
        .send({ title: 'Unauthorized Product', price: 100 })
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Unauthorized');
    });

    it('rejects customers from creating products', async () => {
      const customer = await registerUser(app, uniqueEmail('customer-create'));

      const response = await httpRequest(app)
        .post('/products')
        .set(authHeader(customer.token))
        .send({ title: 'Customer Product', price: 100 })
        .expect(403);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Insufficient permissions');
    });

    it('rejects invalid create payloads', async () => {
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-invalid-create'),
        'password123',
        UserRole.VENDOR,
      );

      const response = await httpRequest(app)
        .post('/products')
        .set(authHeader(vendor.token))
        .send({ title: 'Missing Price Product' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /products/:id', () => {
    it('allows the owner vendor to update their product', async () => {
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-update'),
        'password123',
        UserRole.VENDOR,
      );
      const product = await createProduct(app, vendor.token, {
        title: 'Original Title',
        price: 100,
      });

      const updated = await updateProduct(app, vendor.token, product.id, {
        title: 'Updated Title',
        price: 150,
      });

      expect(updated).toMatchObject({
        id: product.id,
        title: 'Updated Title',
        price: 150,
        vendorId: vendor.user.id,
      });
    });

    it('allows an admin to update a product owned by another vendor', async () => {
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-admin-update'),
        'password123',
        UserRole.VENDOR,
      );
      const admin = await registerUser(
        app,
        uniqueEmail('admin-update'),
        'password123',
        UserRole.ADMIN,
      );
      const product = await createProduct(app, vendor.token, {
        title: 'Admin Updatable Product',
        price: 200,
      });

      const updated = await updateProduct(app, admin.token, product.id, {
        title: 'Updated By Admin',
      });

      expect(updated.title).toBe('Updated By Admin');
    });

    it('rejects unauthenticated update requests', async () => {
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-unauth-update'),
        'password123',
        UserRole.VENDOR,
      );
      const product = await createProduct(app, vendor.token, {
        title: 'Protected Product',
        price: 100,
      });

      const response = await httpRequest(app)
        .patch(`/products/${product.id}`)
        .send({ title: 'Hacked Title' })
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Unauthorized');
    });

    it('rejects updates from a non-owner vendor', async () => {
      const owner = await registerUser(
        app,
        uniqueEmail('owner-update'),
        'password123',
        UserRole.VENDOR,
      );
      const otherVendor = await registerUser(
        app,
        uniqueEmail('other-vendor-update'),
        'password123',
        UserRole.VENDOR,
      );
      const product = await createProduct(app, owner.token, {
        title: 'Owner Product',
        price: 100,
      });

      const response = await httpRequest(app)
        .patch(`/products/${product.id}`)
        .set(authHeader(otherVendor.token))
        .send({ title: 'Stolen Update' })
        .expect(403);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('You are not allowed to update this product!');
    });
  });

  describe('PATCH /products/:id/status', () => {
    it('allows the owner vendor to publish a draft product', async () => {
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-publish'),
        'password123',
        UserRole.VENDOR,
      );
      const product = await createProduct(app, vendor.token, {
        title: 'Publishable Product',
        price: 300,
      });

      const published = await publishProduct(app, vendor.token, product.id);

      expect(published.status).toBe(ProductStatus.PUBLISHED);
    });

    it('rejects unauthenticated publish requests', async () => {
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-unauth-publish'),
        'password123',
        UserRole.VENDOR,
      );
      const product = await createProduct(app, vendor.token, {
        title: 'Draft Product',
        price: 100,
      });

      const response = await httpRequest(app)
        .patch(`/products/${product.id}/status`)
        .send({ status: ProductStatus.PUBLISHED })
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Unauthorized');
    });

    it('rejects publish attempts from a non-owner vendor', async () => {
      const owner = await registerUser(
        app,
        uniqueEmail('owner-publish'),
        'password123',
        UserRole.VENDOR,
      );
      const otherVendor = await registerUser(
        app,
        uniqueEmail('other-vendor-publish'),
        'password123',
        UserRole.VENDOR,
      );
      const product = await createProduct(app, owner.token, {
        title: 'Owner Draft Product',
        price: 100,
      });

      const response = await httpRequest(app)
        .patch(`/products/${product.id}/status`)
        .set(authHeader(otherVendor.token))
        .send({ status: ProductStatus.PUBLISHED })
        .expect(403);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('You are not allowed to update this product!');
    });
  });

  describe('GET /products', () => {
    async function seedPublishedProducts(vendorToken: string) {
      const alpha = await createProduct(app, vendorToken, {
        title: 'Alpha Smartphone',
        price: 100,
      });
      const beta = await createProduct(app, vendorToken, {
        title: 'Beta Laptop',
        price: 200,
      });
      const gamma = await createProduct(app, vendorToken, {
        title: 'Gamma Tablet',
        price: 300,
      });

      await publishProduct(app, vendorToken, alpha.id);
      await publishProduct(app, vendorToken, beta.id);
      await publishProduct(app, vendorToken, gamma.id);
    }

    it('returns only published products with pagination metadata', async () => {
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-pagination'),
        'password123',
        UserRole.VENDOR,
      );

      await seedPublishedProducts(vendor.token);

      const draftProduct = await createProduct(app, vendor.token, {
        title: 'Draft Only Product',
        price: 50,
      });

      const response = await httpRequest(app).get('/products?page=1&perPage=2').expect(200);

      const body = response.body as PaginatedProductsResponse;

      expect(body.data).toHaveLength(2);
      expect(body.meta).toEqual({
        page: 1,
        perPage: 2,
        total: 3,
        totalPages: 2,
      });
      expect(body.data.every((product) => product.status === ProductStatus.PUBLISHED)).toBe(true);
      expect(body.data.some((product) => product.id === draftProduct.id)).toBe(false);
    });

    it('returns the next page of published products', async () => {
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-pagination-page-2'),
        'password123',
        UserRole.VENDOR,
      );

      await seedPublishedProducts(vendor.token);

      const response = await httpRequest(app).get('/products?page=2&perPage=2').expect(200);

      const body = response.body as PaginatedProductsResponse;

      expect(body.data).toHaveLength(1);
      expect(body.meta).toMatchObject({
        page: 2,
        perPage: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it('searches published products by title safely', async () => {
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-search'),
        'password123',
        UserRole.VENDOR,
      );

      await seedPublishedProducts(vendor.token);

      const response = await httpRequest(app).get('/products?search=beta').expect(200);

      const body = response.body as PaginatedProductsResponse;

      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe('Beta Laptop');
      expect(body.meta.total).toBe(1);
    });

    it('returns an empty result when search matches nothing', async () => {
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-search-empty'),
        'password123',
        UserRole.VENDOR,
      );

      await seedPublishedProducts(vendor.token);

      const response = await httpRequest(app)
        .get('/products?search=nonexistent-product-term')
        .expect(200);

      const body = response.body as PaginatedProductsResponse;

      expect(body.data).toHaveLength(0);
      expect(body.meta.total).toBe(0);
    });
  });

  describe('Ownership checks on product details', () => {
    it('hides draft products from anonymous users with a 404', async () => {
      const vendor = await registerUser(
        app,
        uniqueEmail('vendor-detail-anonymous'),
        'password123',
        UserRole.VENDOR,
      );
      const product = await createProduct(app, vendor.token, {
        title: 'Hidden Draft Product',
        price: 100,
      });

      const response = await httpRequest(app).get(`/products/${product.id}`).expect(404);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Product not found!');
    });

    it('returns 403 when another vendor requests a draft product', async () => {
      const owner = await registerUser(
        app,
        uniqueEmail('owner-detail'),
        'password123',
        UserRole.VENDOR,
      );
      const otherVendor = await registerUser(
        app,
        uniqueEmail('other-vendor-detail'),
        'password123',
        UserRole.VENDOR,
      );
      const product = await createProduct(app, owner.token, {
        title: 'Private Draft Product',
        price: 100,
      });

      const response = await httpRequest(app)
        .get(`/products/${product.id}`)
        .set(authHeader(otherVendor.token))
        .expect(403);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('You are not allowed to view this product!');
    });

    it('lets the owner vendor view their own draft product', async () => {
      const owner = await registerUser(
        app,
        uniqueEmail('owner-view-draft'),
        'password123',
        UserRole.VENDOR,
      );
      const product = await createProduct(app, owner.token, {
        title: 'Owner Draft Product',
        price: 100,
      });

      const response = await httpRequest(app)
        .get(`/products/${product.id}`)
        .set(authHeader(owner.token))
        .expect(200);

      expect(response.body).toMatchObject({
        id: product.id,
        title: 'Owner Draft Product',
        status: 'DRAFT',
      });
    });
  });
});
