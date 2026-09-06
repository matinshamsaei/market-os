import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Order,
  OrderStatus,
  Payment,
  PaymentProviderType,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '@/database/prisma/prisma.service';
import type { TokenPayload } from '@/shared/types';

import { OrderStateMachine } from '../orders/helpers';
import { OrdersRepository } from '../orders/orders.repository';
import { WalletService } from '../wallet/wallet.service';
import { CreatePaymentDto, CreatePaymentResponseDto, WebhookResponseDto } from './dto';
import { PaymentStateMachine } from './helpers';
import { PaymentProviderFactory } from './providers';
import type { PaymentWebhookEvent } from './providers';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly paymentStateMachine: PaymentStateMachine,
    private readonly orderStateMachine: OrderStateMachine,
    private readonly walletService: WalletService,
  ) {}

  async createPayment(
    user: TokenPayload,
    dto: CreatePaymentDto,
  ): Promise<CreatePaymentResponseDto> {
    const order = await this.ordersRepository.findById(dto.orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== user.userId) {
      throw new ForbiddenException('You are not allowed to pay for this order');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be paid');
    }

    const hasActivePayment = await this.paymentsRepository.hasActivePayment(order.id);

    if (hasActivePayment) {
      throw new BadRequestException('This order already has an active payment attempt');
    }

    const providerType = this.providerFactory.resolveConfiguredProvider();
    const provider = this.providerFactory.getProvider(providerType);
    const callbackUrl = this.configService.get<string>('PAYMENT_CALLBACK_URL');

    return this.prisma.$transaction(async (tx) => {
      const payment = await this.paymentsRepository.create(tx, {
        order: { connect: { id: order.id } },
        provider: providerType,
        amount: order.total,
        currency: 'IRR',
        status: PaymentStatus.PENDING,
      });

      const result = await provider.createPayment({
        paymentId: payment.id,
        orderId: order.id,
        amount: order.total,
        currency: 'IRR',
        callbackUrl,
      });

      await this.paymentsRepository.update(tx, payment.id, {
        providerPaymentId: result.providerPaymentId,
        status: PaymentStatus.PROCESSING,
      });

      return {
        paymentId: payment.id,
        paymentUrl: result.paymentUrl,
      };
    });
  }

  async handleWebhook(
    rawBody: string,
    signature: string | undefined,
    providerHint?: string,
  ): Promise<WebhookResponseDto> {
    const providerType = this.resolveWebhookProvider(providerHint);
    const provider = this.providerFactory.getProvider(providerType);
    const event = await provider.verifyWebhook({
      rawBody,
      signature,
      providerHint: providerType,
    });

    return this.prisma.$transaction(async (tx) => {
      const payment = await this.paymentsRepository.findByProviderPaymentIdForUpdate(
        tx,
        event.providerPaymentId,
      );

      if (!payment) {
        throw new NotFoundException('Payment not found for webhook event');
      }

      if (payment.provider !== providerType) {
        throw new BadRequestException('Webhook provider does not match payment provider');
      }

      const nextStatus = this.mapEventToStatus(event.type);

      if (payment.status === nextStatus) {
        return {
          received: true,
          paymentId: payment.id,
          status: payment.status,
        };
      }

      if (!this.paymentStateMachine.canTransition(payment.status, nextStatus)) {
        throw new BadRequestException(
          `Cannot change payment from ${payment.status} to ${nextStatus}`,
        );
      }

      const updatedPayment = await this.paymentsRepository.update(tx, payment.id, {
        status: nextStatus,
      });

      if (nextStatus === PaymentStatus.SUCCEEDED) {
        await this.markOrderPaid(tx, payment);
      }

      if (nextStatus === PaymentStatus.REFUNDED) {
        await this.walletService.refund(payment.order.userId, payment.amount, tx);
      }

      return {
        received: true,
        paymentId: updatedPayment.id,
        status: updatedPayment.status,
      };
    });
  }

  private resolveWebhookProvider(providerHint?: string): PaymentProviderType {
    if (!providerHint) {
      return this.providerFactory.resolveConfiguredProvider();
    }

    const normalized = providerHint.toUpperCase();

    if (!Object.values(PaymentProviderType).includes(normalized as PaymentProviderType)) {
      throw new UnauthorizedException('Unknown payment provider');
    }

    return normalized as PaymentProviderType;
  }

  private mapEventToStatus(type: PaymentWebhookEvent['type']): PaymentStatus {
    switch (type) {
      case 'payment.succeeded':
        return PaymentStatus.SUCCEEDED;
      case 'payment.failed':
        return PaymentStatus.FAILED;
      case 'payment.cancelled':
        return PaymentStatus.CANCELLED;
      case 'payment.refunded':
        return PaymentStatus.REFUNDED;
      default: {
        throw new BadRequestException(`Unsupported webhook event type: ${String(type)}`);
      }
    }
  }

  private async markOrderPaid(
    tx: Prisma.TransactionClient,
    payment: Payment & { order: Order },
  ): Promise<void> {
    if (payment.order.status === OrderStatus.PAID) {
      return;
    }

    if (!this.orderStateMachine.canTransition(payment.order.status, OrderStatus.PAID)) {
      throw new BadRequestException(
        `Cannot change order from ${payment.order.status} to ${OrderStatus.PAID}`,
      );
    }

    await this.ordersRepository.updateStatus(tx, payment.order.id, OrderStatus.PAID);
  }
}
