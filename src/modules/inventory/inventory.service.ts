import { Injectable, NotFoundException } from '@nestjs/common';

import type { TokenPayload } from '@/shared/types';

import { InventoryRepository } from './inventory.repository';
import type { UpdateInventoryDto } from './dto';
import { UserRole } from '@prisma/client';

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

  async updateProductInventory(productId: string, body: UpdateInventoryDto, user: TokenPayload) {
    const inventory = await this.inventoryRepository.findByProductIdIncludeVendorId(productId);

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    if (user.role !== UserRole.ADMIN && inventory.product?.vendorId !== user.userId) {
      throw new NotFoundException('Inventory not found');
    }

    return this.inventoryRepository.update(productId, body);
  }
}
