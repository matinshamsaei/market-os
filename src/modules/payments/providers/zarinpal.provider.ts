import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  CapturePaymentInput,
  CapturePaymentResult,
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  RefundPaymentInput,
  RefundPaymentResult,
} from './types';

type ZarinpalDataResponse<T> = {
  data?: T & { code?: number | string; message?: string };
  errors?: unknown;
};

@Injectable()
export class ZarinpalProvider implements PaymentProvider {
  private readonly logger = new Logger(ZarinpalProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const merchantId = this.requireMerchantId();
    const callbackUrl = this.buildCallbackUrl(input);
    const amount = this.toIntegerAmount(input.amount);

    const response = await this.post<
      ZarinpalDataResponse<{ authority: string; code: number | string }>
    >('/pg/v4/payment/request.json', {
      merchant_id: merchantId,
      amount,
      callback_url: callbackUrl,
      description: `Payment ${input.paymentId} for order ${input.orderId}`,
      currency: input.currency === 'IRT' ? 'IRT' : 'IRR',
      metadata: {
        payment_id: input.paymentId,
        order_id: input.orderId,
      },
    });

    const authority = response.data?.authority;
    const code = Number(response.data?.code);

    if (!authority || (code !== 100 && code !== 101)) {
      this.logger.error(`Zarinpal createPayment failed: ${JSON.stringify(response)}`);
      throw new BadGatewayException('Failed to create Zarinpal payment');
    }

    return {
      providerPaymentId: authority,
      paymentUrl: `${this.getStartPayBaseUrl()}/${authority}`,
    };
  }

  async capture(input: CapturePaymentInput): Promise<CapturePaymentResult> {
    const merchantId = this.requireMerchantId();
    const amount = this.toIntegerAmount(input.amount);

    const response = await this.post<ZarinpalDataResponse<{ code: number | string }>>(
      '/pg/v4/payment/verify.json',
      {
        merchant_id: merchantId,
        authority: input.providerPaymentId,
        amount,
      },
    );

    const code = Number(response.data?.code);

    // 100 = verified, 101 = already verified
    if (code === 100 || code === 101) {
      return { success: true };
    }

    this.logger.warn(`Zarinpal capture unsuccessful: ${JSON.stringify(response)}`);
    return { success: false };
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    const merchantId = this.requireMerchantId();
    const accessToken = this.configService.get<string>('ZARINPAL_ACCESS_TOKEN');

    if (!accessToken) {
      throw new BadRequestException('ZARINPAL_ACCESS_TOKEN is required for refunds');
    }

    const response = await this.post<
      ZarinpalDataResponse<{ code: number | string; ref_id?: number | string }>
    >(
      '/pg/v4/payment/refund.json',
      {
        merchant_id: merchantId,
        authority: input.providerPaymentId,
      },
      {
        Authorization: `Bearer ${accessToken}`,
      },
    );

    const code = Number(response.data?.code);

    if (code !== 100) {
      this.logger.error(`Zarinpal refund failed: ${JSON.stringify(response)}`);
      throw new BadGatewayException('Failed to refund Zarinpal payment');
    }

    return {
      providerRefundId: String(
        response.data?.ref_id ?? `zarinpal_refund_${input.providerPaymentId}`,
      ),
    };
  }

  private requireMerchantId(): string {
    const merchantId = this.configService.get<string>('ZARINPAL_MERCHANT_ID');

    if (!merchantId) {
      throw new BadRequestException('ZARINPAL_MERCHANT_ID is not configured');
    }

    return merchantId;
  }

  private buildCallbackUrl(input: CreatePaymentInput): string {
    const base = input.callbackUrl ?? this.configService.get<string>('PAYMENT_CALLBACK_URL');

    if (!base) {
      throw new BadRequestException('PAYMENT_CALLBACK_URL is required for Zarinpal');
    }

    const url = new URL(base);
    url.searchParams.set('paymentId', input.paymentId);
    url.searchParams.set('orderId', input.orderId);

    return url.toString();
  }

  private toIntegerAmount(amount: number): number {
    const value = Math.round(amount);

    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('Payment amount must be a positive number');
    }

    return value;
  }

  private isSandbox(): boolean {
    return this.configService.get<string>('ZARINPAL_SANDBOX', 'true') === 'true';
  }

  private getApiBaseUrl(): string {
    return this.isSandbox() ? 'https://sandbox.zarinpal.com' : 'https://api.zarinpal.com';
  }

  private getStartPayBaseUrl(): string {
    return this.isSandbox()
      ? 'https://sandbox.zarinpal.com/pg/StartPay'
      : 'https://www.zarinpal.com/pg/StartPay';
  }

  private async post<T>(
    path: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.getApiBaseUrl()}${path}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      this.logger.error(`Zarinpal network error on ${path}`, error);
      throw new BadGatewayException('Unable to reach Zarinpal');
    }

    let payload: T;

    try {
      payload = (await response.json()) as T;
    } catch {
      throw new BadGatewayException('Invalid response from Zarinpal');
    }

    if (!response.ok) {
      this.logger.error(`Zarinpal HTTP ${response.status} on ${path}: ${JSON.stringify(payload)}`);
      throw new BadGatewayException('Zarinpal request failed');
    }

    return payload;
  }
}
