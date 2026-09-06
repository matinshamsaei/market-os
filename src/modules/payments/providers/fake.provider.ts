import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

import type {
  CapturePaymentInput,
  CapturePaymentResult,
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentWebhookEvent,
  RefundPaymentInput,
  RefundPaymentResult,
  VerifyWebhookInput,
} from './types';

const WEBHOOK_EVENT_TYPES = new Set([
  'payment.succeeded',
  'payment.failed',
  'payment.cancelled',
  'payment.refunded',
]);

@Injectable()
export class FakeProvider implements PaymentProvider {
  constructor(private readonly configService: ConfigService) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerPaymentId = `fake_${randomUUID()}`;

    return Promise.resolve({
      providerPaymentId,
      paymentUrl: `https://fake-payment.example.com/pay/${providerPaymentId}?orderId=${input.orderId}&amount=${input.amount}`,
    });
  }

  async capture(_input: CapturePaymentInput): Promise<CapturePaymentResult> {
    return Promise.resolve({ success: true });
  }

  async refund(_input: RefundPaymentInput): Promise<RefundPaymentResult> {
    return Promise.resolve({ providerRefundId: `fake_refund_${randomUUID()}` });
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<PaymentWebhookEvent> {
    const secret = this.configService.get<string>('PAYMENT_WEBHOOK_SECRET');

    if (!secret) {
      throw new UnauthorizedException('PAYMENT_WEBHOOK_SECRET is not configured');
    }

    if (!input.signature || !this.isValidSignature(input.rawBody, input.signature, secret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(input.rawBody) as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException('Invalid webhook payload');
    }

    const eventId = typeof payload.eventId === 'string' ? payload.eventId : undefined;
    const type = typeof payload.type === 'string' ? payload.type : undefined;
    const providerPaymentId =
      typeof payload.providerPaymentId === 'string' ? payload.providerPaymentId : undefined;
    const amount = typeof payload.amount === 'number' ? payload.amount : undefined;

    if (!eventId || !type || !providerPaymentId || !WEBHOOK_EVENT_TYPES.has(type)) {
      throw new UnauthorizedException('Invalid webhook event');
    }

    return Promise.resolve({
      eventId,
      type: type as PaymentWebhookEvent['type'],
      providerPaymentId,
      amount,
    });
  }

  signPayload(rawBody: string, secret?: string): string {
    const webhookSecret = secret ?? this.configService.get<string>('PAYMENT_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new UnauthorizedException('PAYMENT_WEBHOOK_SECRET is not configured');
    }

    return createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  }

  private isValidSignature(rawBody: string, signature: string, secret: string): boolean {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}
