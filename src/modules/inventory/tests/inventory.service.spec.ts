import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { InventoryRepository } from '../inventory.repository';
import { InventoryService } from '../inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const vendor: TokenPayload = {
    userId: 'vendor-1',
    email: 'vendor@test.com',
    role: UserRole.VENDOR,
  };

  const admin: TokenPayload = {
    userId: 'admin-1',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
  };

  const otherVendor: TokenPayload = {
    userId: 'vendor-2',
    email: 'other-vendor@test.com',
    role: UserRole.VENDOR,
  };

  const inventory = {
    id: 'inventory-1',
    productId: 'product-1',
    quantity: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const inventoryWithVendor = {
    ...inventory,
    product: {
      vendorId: vendor.userId,
    },
  };

  const mockTransaction = {};

  const mockInventoryRepository = {
    findByProductId: jest.fn(),
    findByProductIdIncludeVendorId: jest.fn(),
    decrementIfEnough: jest.fn(),
    increment: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: InventoryRepository,
          useValue: mockInventoryRepository,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
  });

  describe('getProductInventory', () => {
    it('returns inventory for a product', async () => {
      mockInventoryRepository.findByProductId.mockResolvedValue(inventory);

      await expect(service.getProductInventory('product-1')).resolves.toEqual(inventory);
      expect(mockInventoryRepository.findByProductId).toHaveBeenCalledWith('product-1');
    });

    it('throws when inventory does not exist', async () => {
      mockInventoryRepository.findByProductId.mockResolvedValue(null);

      await expect(service.getProductInventory('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('decrementProductStock', () => {
    it('delegates to repository.decrementIfEnough', async () => {
      const updated = { ...inventory, quantity: 8 };
      mockInventoryRepository.decrementIfEnough.mockResolvedValue(updated);

      await expect(
        service.decrementProductStock(mockTransaction as never, 'product-1', 2),
      ).resolves.toEqual(updated);
      expect(mockInventoryRepository.decrementIfEnough).toHaveBeenCalledWith(
        mockTransaction,
        'product-1',
        2,
      );
    });
  });

  describe('restoreProductStock', () => {
    it('delegates to repository.increment', async () => {
      const updated = { ...inventory, quantity: 12 };
      mockInventoryRepository.increment.mockResolvedValue(updated);

      await expect(
        service.restoreProductStock(mockTransaction as never, 'product-1', 2),
      ).resolves.toEqual(updated);
      expect(mockInventoryRepository.increment).toHaveBeenCalledWith(
        mockTransaction,
        'product-1',
        2,
      );
    });
  });

  describe('createProductInventory', () => {
    it('creates inventory for a product', async () => {
      const body = { productId: 'product-1', quantity: 5 };
      mockInventoryRepository.create.mockResolvedValue({ ...inventory, quantity: 5 });

      await expect(service.createProductInventory(body)).resolves.toMatchObject({
        productId: 'product-1',
        quantity: 5,
      });
      expect(mockInventoryRepository.create).toHaveBeenCalledWith({
        product: { connect: { id: body.productId } },
        quantity: body.quantity,
      });
    });
  });

  describe('updateProductInventory', () => {
    it('allows the owning vendor to update inventory', async () => {
      const body = { quantity: 20 };
      const updated = { ...inventory, quantity: 20 };

      mockInventoryRepository.findByProductIdIncludeVendorId.mockResolvedValue(inventoryWithVendor);
      mockInventoryRepository.update.mockResolvedValue(updated);

      await expect(service.updateProductInventory('product-1', body, vendor)).resolves.toEqual(
        updated,
      );
      expect(mockInventoryRepository.update).toHaveBeenCalledWith('product-1', body);
    });

    it('allows an admin to update any inventory', async () => {
      const body = { quantity: 30 };
      const updated = { ...inventory, quantity: 30 };

      mockInventoryRepository.findByProductIdIncludeVendorId.mockResolvedValue(inventoryWithVendor);
      mockInventoryRepository.update.mockResolvedValue(updated);

      await expect(service.updateProductInventory('product-1', body, admin)).resolves.toEqual(
        updated,
      );
    });

    it('rejects a vendor that does not own the product', async () => {
      mockInventoryRepository.findByProductIdIncludeVendorId.mockResolvedValue(inventoryWithVendor);

      await expect(
        service.updateProductInventory('product-1', { quantity: 1 }, otherVendor),
      ).rejects.toThrow(ForbiddenException);
      expect(mockInventoryRepository.update).not.toHaveBeenCalled();
    });

    it('throws when inventory does not exist', async () => {
      mockInventoryRepository.findByProductIdIncludeVendorId.mockResolvedValue(null);

      await expect(
        service.updateProductInventory('missing', { quantity: 1 }, vendor),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
