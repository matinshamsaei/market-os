import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

import type { TokenPayload } from '@/shared/types';

import { InventoryRepository } from './inventory.repository';
import type { CreateInventoryDto, UpdateInventoryDto } from './dto';
import { Prisma, UserRole } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async getProductInventory(productId: string) {
    const inventory = await this.inventoryRepository.findByProductId(productId);

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }
    return inventory;
  }

  async decrementProductStock(
    transaction: Prisma.TransactionClient,
    productId: string,
    quantity: number,
  ) {
    return this.inventoryRepository.decrementIfEnough(transaction, productId, quantity);
  }

  createProductInventory(body: CreateInventoryDto) {
    return this.inventoryRepository.create({
      product: { connect: { id: body.productId } },
      quantity: body.quantity,
    });
  }

  async updateProductInventory(productId: string, body: UpdateInventoryDto, user: TokenPayload) {
    const inventory = await this.inventoryRepository.findByProductIdIncludeVendorId(productId);

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    if (user.role !== UserRole.ADMIN && inventory.product?.vendorId !== user.userId) {
      throw new ForbiddenException('You are not authorized to update this inventory');
    }

    return this.inventoryRepository.update(productId, body);
  }
}
