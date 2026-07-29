import { Injectable, NotImplementedException } from '@nestjs/common';

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
export class StripeProvider implements PaymentProvider {
  createPayment(_input: CreatePaymentInput): Promise<CreatePaymentResult> {
    throw new NotImplementedException('Stripe provider is not configured');
  }

  capture(_input: CapturePaymentInput): Promise<CapturePaymentResult> {
    throw new NotImplementedException('Stripe provider is not configured');
  }

  refund(_input: RefundPaymentInput): Promise<RefundPaymentResult> {
    throw new NotImplementedException('Stripe provider is not configured');
  }
}
