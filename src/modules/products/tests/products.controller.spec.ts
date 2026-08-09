import { Test, TestingModule } from '@nestjs/testing';
import { ProductStatus, UserRole } from '@prisma/client';

import type { TokenPayload } from '../../../shared/types';

import { ProductsController } from '../products.controller';
import { ProductsService } from '../products.service';

describe('ProductsController', () => {
  let controller: ProductsController;

  const mockProductsService = {
    getPublishedProducts: jest.fn(),
    getProductById: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    updateProductStatus: jest.fn(),
  };

  const vendorUser: TokenPayload = {
    userId: 'vendor-1',
    email: 'vendor@test.com',
    role: UserRole.VENDOR,
  };

  const product = {
    id: 'product-1',
    title: 'Test Product',
    description: 'Description',
    price: 100,
    status: ProductStatus.DRAFT,
    vendorId: vendorUser.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);

    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should call productsService.getPublishedProducts', async () => {
      const query = { page: 1, perPage: 10 };
      const paginatedResult = {
        data: [product],
        meta: { page: 1, perPage: 10, total: 1, totalPages: 1 },
      };

      mockProductsService.getPublishedProducts.mockResolvedValue(paginatedResult);

      const response = await controller.getProducts(query);

      expect(mockProductsService.getPublishedProducts).toHaveBeenCalledWith(query);
      expect(response).toEqual(paginatedResult);
    });
  });

  describe('getProductById', () => {
    it('should call productsService.getProductById', async () => {
      mockProductsService.getProductById.mockResolvedValue(product);

      const response = await controller.getProductById(product.id, vendorUser);

      expect(mockProductsService.getProductById).toHaveBeenCalledWith(product.id, vendorUser);
      expect(response).toEqual(product);
    });
  });

  describe('createProduct', () => {
    it('should call productsService.createProduct with user id', async () => {
      const body = { title: 'New Product', price: 150 };

      mockProductsService.createProduct.mockResolvedValue(product);

      const response = await controller.createProduct(body, vendorUser);

      expect(mockProductsService.createProduct).toHaveBeenCalledWith(body, vendorUser.userId);
      expect(response).toEqual(product);
    });
  });

  describe('updateProduct', () => {
    it('should call productsService.updateProduct', async () => {
      const body = { title: 'Updated Product' };
      const updatedProduct = { ...product, ...body };

      mockProductsService.updateProduct.mockResolvedValue(updatedProduct);

      const response = await controller.updateProduct(product.id, body, vendorUser);

      expect(mockProductsService.updateProduct).toHaveBeenCalledWith(product.id, body, vendorUser);
      expect(response.title).toBe('Updated Product');
    });
  });

  describe('updateProductStatus', () => {
    it('should call productsService.updateProductStatus', async () => {
      const body = { status: ProductStatus.PUBLISHED };
      const publishedProduct = { ...product, status: ProductStatus.PUBLISHED };

      mockProductsService.updateProductStatus.mockResolvedValue(publishedProduct);

      const response = await controller.updateProductStatus(product.id, body, vendorUser);

      expect(mockProductsService.updateProductStatus).toHaveBeenCalledWith(
        product.id,
        body,
        vendorUser,
      );
      expect(response.status).toBe(ProductStatus.PUBLISHED);
    });
  });
});
