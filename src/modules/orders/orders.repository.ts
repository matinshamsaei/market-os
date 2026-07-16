import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma/prisma.service';
import { Order, Prisma } from '@prisma/client';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  createOrder(
    transaction: Prisma.TransactionClient,
    data: Prisma.OrderCreateInput,
  ): Promise<Order> {
    return transaction.order.create({ data });
  }
}
