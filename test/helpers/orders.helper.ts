import type { INestApplication } from '@nestjs/common';
import type { Order, OrderStatus } from '@prisma/client';

import { authHeader, httpRequest } from './auth.helper';

export type OrderResponse = Order & {
  status: OrderStatus;
};

export async function checkout(
  app: INestApplication,
  token: string,
  idempotencyKey?: string,
): Promise<OrderResponse> {
  const request = httpRequest(app).post('/orders/checkout').set(authHeader(token));

  if (idempotencyKey) {
    request.set('Idempotency-Key', idempotencyKey);
  }

  const response = await request.expect(201);

  return response.body as OrderResponse;
}

export async function refundOrder(
  app: INestApplication,
  token: string,
  orderId: string,
): Promise<OrderResponse> {
  const response = await httpRequest(app)
    .post(`/orders/${orderId}/refund`)
    .set(authHeader(token))
    .expect(201);

  return response.body as OrderResponse;
}

export async function cancelOrder(
  app: INestApplication,
  token: string,
  orderId: string,
): Promise<OrderResponse> {
  const response = await httpRequest(app)
    .patch(`/orders/${orderId}/cancel`)
    .set(authHeader(token))
    .expect(200);

  return response.body as OrderResponse;
}
