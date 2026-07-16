import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByProductId(productId: string) {
    return this.prisma.inventory.findUnique({
      where: {
        productId,
      },
    });
  }

  async decrementIfEnough(tx: Prisma.TransactionClient, productId: string, quantity: number) {
    const result = await tx.inventory.update({
      where: {
        productId,
        quantity: { gte: quantity },
      },
      data: {
        quantity: { decrement: quantity },
      },
    });

    if (!result) {
      throw new BadRequestException(`Insufficient stock for product ${productId}`);
    }

    return result;
  }

  findByProductIdIncludeVendorId(productId: string) {
    return this.prisma.inventory.findUnique({
      where: {
        productId,
      },
      include: {
        product: {
          select: {
            vendorId: true,
          },
        },
      },
    });
  }

  create(data: Prisma.InventoryCreateInput) {
    return this.prisma.inventory.create({
      data,
    });
  }

  update(productId: string, data: Prisma.InventoryUpdateInput) {
    return this.prisma.inventory.update({
      where: {
        productId,
      },
      data,
    });
  }
}
