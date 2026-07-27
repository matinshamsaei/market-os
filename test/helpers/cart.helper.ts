import type { INestApplication } from '@nestjs/common';

import { authHeader, httpRequest } from './auth.helper';

export type CartItemResponse = {
  id: string;
  productId: string;
  quantity: number;
  title: string;
  price: number;
  lineTotal: number;
};

export type CartResponse = {
  items: CartItemResponse[];
  subtotal: number;
  totalItems: number;
};

export async function getCart(app: INestApplication, token: string): Promise<CartResponse> {
  const response = await httpRequest(app).get('/cart').set(authHeader(token)).expect(200);

  return response.body as CartResponse;
}

export async function addToCart(
  app: INestApplication,
  token: string,
  payload: { productId: string; quantity: number },
): Promise<CartResponse> {
  const response = await httpRequest(app)
    .post('/cart/items')
    .set(authHeader(token))
    .send(payload)
    .expect(201);

  return response.body as CartResponse;
}

export async function updateCartItem(
  app: INestApplication,
  token: string,
  itemId: string,
  payload: { quantity: number },
): Promise<CartResponse> {
  const response = await httpRequest(app)
    .patch(`/cart/items/${itemId}`)
    .set(authHeader(token))
    .send(payload)
    .expect(200);

  return response.body as CartResponse;
}

export async function removeCartItem(
  app: INestApplication,
  token: string,
  itemId: string,
): Promise<CartResponse> {
  const response = await httpRequest(app)
    .delete(`/cart/items/${itemId}`)
    .set(authHeader(token))
    .expect(200);

  return response.body as CartResponse;
}

export async function setProductInventory(
  app: INestApplication,
  token: string,
  productId: string,
  quantity: number,
): Promise<void> {
  await httpRequest(app)
    .patch(`/products/${productId}/inventory`)
    .set(authHeader(token))
    .send({ quantity })
    .expect(200);
}
