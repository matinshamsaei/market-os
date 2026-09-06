import { Injectable } from '@nestjs/common';

import { Order, Payment, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma/prisma.service';

type PaymentWithOrder = Payment & { order: Order };

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(transaction: Prisma.TransactionClient, data: Prisma.PaymentCreateInput): Promise<Payment> {
    return transaction.payment.create({ data });
  }

  findById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  findByIdForUpdate(transaction: Prisma.TransactionClient, id: string): Promise<Payment | null> {
    return transaction.payment.findUnique({ where: { id } });
  }

  update(
    transaction: Prisma.TransactionClient,
    id: string,
    data: Prisma.PaymentUpdateInput,
  ): Promise<Payment> {
    return transaction.payment.update({ where: { id }, data });
  }

  findByProviderPaymentId(providerPaymentId: string): Promise<Payment | null> {
    return this.prisma.payment.findFirst({
      where: { providerPaymentId },
    });
  }

  findByProviderPaymentIdForUpdate(
    transaction: Prisma.TransactionClient,
    providerPaymentId: string,
  ): Promise<PaymentWithOrder | null> {
    return transaction.payment.findFirst({
      where: { providerPaymentId },
      include: { order: true },
    });
  }

  async hasActivePayment(orderId: string): Promise<boolean> {
    return this.prisma.payment
      .findFirst({
        where: {
          orderId,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        },
      })
      .then((payment) => payment !== null);
  }
}
