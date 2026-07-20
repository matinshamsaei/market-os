import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma/prisma.service';
import { Order, OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  createOrder(
    transaction: Prisma.TransactionClient,
    data: Prisma.OrderCreateInput,
  ): Promise<Order> {
    return transaction.order.create({ data });
  }

  findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({ where: { id } });
  }

  updateStatus(
    transaction: Prisma.TransactionClient,
    id: string,
    status: OrderStatus,
  ): Promise<Order> {
    return transaction.order.update({
      where: { id },
      data: { status },
    });
  }
}
