export interface CreatePaymentInput {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  callbackUrl?: string;
}

export interface CreatePaymentResult {
  providerPaymentId: string;
  paymentUrl: string;
}

export interface CapturePaymentInput {
  providerPaymentId: string;
  amount: number;
}

export interface CapturePaymentResult {
  success: boolean;
}

export interface RefundPaymentInput {
  providerPaymentId: string;
  amount: number;
}

export interface RefundPaymentResult {
  providerRefundId: string;
}

export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  capture(input: CapturePaymentInput): Promise<CapturePaymentResult>;
  refund(input: RefundPaymentInput): Promise<RefundPaymentResult>;
}
