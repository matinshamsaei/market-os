import type { ProductStatus } from '@prisma/client';
import type { INestApplication } from '@nestjs/common';

import { authHeader, httpRequest } from './auth.helper';

export type ProductResponse = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: ProductStatus | null;
  vendorId: string;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedProductsResponse = {
  data: ProductResponse[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

export type CreateProductPayload = {
  title: string;
  price: number;
  description?: string;
};

export async function createProduct(
  app: INestApplication,
  token: string,
  payload: CreateProductPayload,
): Promise<ProductResponse> {
  const response = await httpRequest(app)
    .post('/products')
    .set(authHeader(token))
    .send(payload)
    .expect(201);

  return response.body as ProductResponse;
}

export async function updateProduct(
  app: INestApplication,
  token: string,
  productId: string,
  payload: Partial<CreateProductPayload>,
): Promise<ProductResponse> {
  const response = await httpRequest(app)
    .patch(`/products/${productId}`)
    .set(authHeader(token))
    .send(payload)
    .expect(200);

  return response.body as ProductResponse;
}

export async function publishProduct(
  app: INestApplication,
  token: string,
  productId: string,
): Promise<ProductResponse> {
  const response = await httpRequest(app)
    .patch(`/products/${productId}/status`)
    .set(authHeader(token))
    .send({ status: 'PUBLISHED' })
    .expect(200);

  return response.body as ProductResponse;
}
