import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import type {
  CapturePaymentInput,
  CapturePaymentResult,
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  RefundPaymentInput,
  RefundPaymentResult,
} from './types';

@Injectable()
export class FakeProvider implements PaymentProvider {
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
}
