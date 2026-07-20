import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma/prisma.service';
import { Order, OrderItem, OrderStatus, Prisma } from '@prisma/client';

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

  findByIdWithItems(id: string): Promise<(Order & { orderItems: OrderItem[] }) | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: true },
    });
  }

  findMany(userId?: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      ...(userId ? { where: { userId } } : {}),
      orderBy: { createdAt: 'desc' },
    });
  }

  findManyForVendor(vendorId: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: {
        orderItems: {
          some: {
            product: {
              vendorId,
            },
          },
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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
