import { Injectable } from '@nestjs/common';

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

  update(productId: string, data: Prisma.InventoryUpdateInput) {
    return this.prisma.inventory.update({
      where: {
        productId,
      },
      data,
    });
  }
}
