import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { InventoryController } from '../inventory.controller';
import { InventoryService } from '../inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;

  const mockInventoryService = {
    getProductInventory: jest.fn(),
    updateProductInventory: jest.fn(),
  };

  const vendor: TokenPayload = {
    userId: 'vendor-1',
    email: 'vendor@test.com',
    role: UserRole.VENDOR,
  };

  const inventory = {
    id: 'inventory-1',
    productId: 'product-1',
    quantity: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    jest.clearAllMocks();
  });

  describe('getProductInventory', () => {
    it('delegates to inventoryService.getProductInventory', async () => {
      mockInventoryService.getProductInventory.mockResolvedValue(inventory);

      await expect(controller.getProductInventory('product-1')).resolves.toEqual(inventory);
      expect(mockInventoryService.getProductInventory).toHaveBeenCalledWith('product-1');
    });
  });

  describe('updateProductInventory', () => {
    it('delegates to inventoryService.updateProductInventory', async () => {
      const body = { quantity: 25 };
      const updated = { ...inventory, quantity: 25 };

      mockInventoryService.updateProductInventory.mockResolvedValue(updated);

      await expect(controller.updateProductInventory('product-1', body, vendor)).resolves.toEqual(
        updated,
      );
      expect(mockInventoryService.updateProductInventory).toHaveBeenCalledWith(
        'product-1',
        body,
        vendor,
      );
    });
  });
});
