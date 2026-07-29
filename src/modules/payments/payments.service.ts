import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentStatus } from '@prisma/client';

import { PrismaService } from '@/database/prisma/prisma.service';
import type { TokenPayload } from '@/shared/types';

import { OrdersRepository } from '../orders/orders.repository';
import { CreatePaymentDto, CreatePaymentResponseDto } from './dto';
import { PaymentProviderFactory } from './providers';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
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
}
