import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductStatus, UserRole } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { ProductsService } from '../products.service';
import { ProductsRepository } from '../products.repository';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockProductsRepository = {
    findAllPublishedProducts: jest.fn(),
    findByIdWithVendor: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
  };

  const vendorUser: TokenPayload = {
    userId: 'vendor-1',
    email: 'vendor@test.com',
    role: UserRole.VENDOR,
  };

  const adminUser: TokenPayload = {
    userId: 'admin-1',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
  };

  const baseProduct = {
    id: 'product-1',
    title: 'Test Product',
    description: 'Description',
    price: 100,
    status: ProductStatus.DRAFT,
    vendorId: 'vendor-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    vendor: {
      id: 'vendor-1',
      email: 'vendor@test.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: ProductsRepository,
          useValue: mockProductsRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);

    jest.clearAllMocks();
  });

  describe('getPublishedProducts', () => {
    it('should delegate to repository', async () => {
      const query = { page: 1, perPage: 10 };
      const paginatedResult = {
        data: [baseProduct],
        meta: { page: 1, perPage: 10, total: 1, totalPages: 1 },
      };

      mockProductsRepository.findAllPublishedProducts.mockResolvedValue(paginatedResult);

      const response = await service.getPublishedProducts(query);

      expect(mockProductsRepository.findAllPublishedProducts).toHaveBeenCalledWith(query);
      expect(response).toEqual(paginatedResult);
    });
  });

  describe('getProductById', () => {
    it('should throw when product does not exist', async () => {
      mockProductsRepository.findByIdWithVendor.mockResolvedValue(null);

      await expect(service.getProductById('missing-id', undefined)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should hide unpublished products from anonymous users', async () => {
      mockProductsRepository.findByIdWithVendor.mockResolvedValue(baseProduct);

      await expect(service.getProductById(baseProduct.id, undefined)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return published product without status for anonymous users', async () => {
      const publishedProduct = { ...baseProduct, status: ProductStatus.PUBLISHED };

      mockProductsRepository.findByIdWithVendor.mockResolvedValue(publishedProduct);

      const response = await service.getProductById(publishedProduct.id, undefined);

      expect(response).toMatchObject({
        id: publishedProduct.id,
        title: publishedProduct.title,
        vendor: publishedProduct.vendor,
      });
      expect(response).not.toHaveProperty('status');
    });

    it('should include status for the owner vendor', async () => {
      mockProductsRepository.findByIdWithVendor.mockResolvedValue(baseProduct);

      const response = await service.getProductById(baseProduct.id, vendorUser);

      expect(response.status).toBe(ProductStatus.DRAFT);
    });

    it('should throw when another vendor tries to view a draft product', async () => {
      mockProductsRepository.findByIdWithVendor.mockResolvedValue(baseProduct);

      await expect(
        service.getProductById(baseProduct.id, {
          userId: 'vendor-2',
          email: 'other-vendor@test.com',
          role: UserRole.VENDOR,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createProduct', () => {
    it('should create a draft product for the authenticated vendor', async () => {
      const body = { title: 'New Product', price: 250, description: 'Nice product' };

      mockProductsRepository.create.mockResolvedValue({
        ...baseProduct,
        ...body,
      });

      const response = await service.createProduct(body, vendorUser.userId);

      expect(mockProductsRepository.create).toHaveBeenCalledWith({
        ...body,
        vendor: { connect: { id: vendorUser.userId } },
        status: ProductStatus.DRAFT,
      });
      expect(response.title).toBe('New Product');
    });
  });

  describe('updateProduct', () => {
    it('should throw when body is empty', async () => {
      await expect(service.updateProduct('product-1', {}, vendorUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update product when user is the owner', async () => {
      const body = { title: 'Updated Title' };
      const updatedProduct = { ...baseProduct, ...body };

      mockProductsRepository.findById.mockResolvedValue(baseProduct);
      mockProductsRepository.update.mockResolvedValue(updatedProduct);

      const response = await service.updateProduct(baseProduct.id, body, vendorUser);

      expect(mockProductsRepository.update).toHaveBeenCalledWith(baseProduct.id, body);
      expect(response.title).toBe('Updated Title');
    });

    it('should throw when product does not exist', async () => {
      mockProductsRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateProduct('missing-id', { title: 'Updated' }, vendorUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when user is not the owner or admin', async () => {
      mockProductsRepository.findById.mockResolvedValue(baseProduct);

      await expect(
        service.updateProduct(
          baseProduct.id,
          { title: 'Updated' },
          {
            userId: 'vendor-2',
            email: 'other-vendor@test.com',
            role: UserRole.VENDOR,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateProductStatus', () => {
    it('should publish a draft product for the owner', async () => {
      const publishedProduct = { ...baseProduct, status: ProductStatus.PUBLISHED };

      mockProductsRepository.findById.mockResolvedValue(baseProduct);
      mockProductsRepository.update.mockResolvedValue(publishedProduct);

      const response = await service.updateProductStatus(
        baseProduct.id,
        { status: ProductStatus.PUBLISHED },
        vendorUser,
      );

      expect(mockProductsRepository.update).toHaveBeenCalledWith(baseProduct.id, {
        status: ProductStatus.PUBLISHED,
      });
      expect(response.status).toBe(ProductStatus.PUBLISHED);
    });

    it('should allow admin to update product status', async () => {
      const publishedProduct = { ...baseProduct, status: ProductStatus.PUBLISHED };

      mockProductsRepository.findById.mockResolvedValue(baseProduct);
      mockProductsRepository.update.mockResolvedValue(publishedProduct);

      await service.updateProductStatus(
        baseProduct.id,
        { status: ProductStatus.PUBLISHED },
        adminUser,
      );

      expect(mockProductsRepository.update).toHaveBeenCalled();
    });

    it('should reject invalid status transitions', async () => {
      mockProductsRepository.findById.mockResolvedValue({
        ...baseProduct,
        status: ProductStatus.PUBLISHED,
      });

      await expect(
        service.updateProductStatus(baseProduct.id, { status: ProductStatus.DRAFT }, vendorUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
