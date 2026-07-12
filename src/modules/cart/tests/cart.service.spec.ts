import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductStatus, UserRole } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { CartService } from '../cart.service';
import { CartRepository } from '../cart.repository';

describe('CartService', () => {
  let service: CartService;

  const customer: TokenPayload = {
    userId: 'customer-1',
    email: 'customer@test.com',
    role: UserRole.CUSTOMER,
  };

  const mockCartRepository = {
    findByCustomerId: jest.fn(),
    findPublishedProductWithInventory: jest.fn(),
    findCartItemById: jest.fn(),
    findCartItemByProductId: jest.fn(),
    createCartWithItem: jest.fn(),
    createCartItem: jest.fn(),
    updateCartItemQuantity: jest.fn(),
    deleteCartItem: jest.fn(),
  };

  const publishedProduct = {
    id: 'product-1',
    title: 'Phone',
    description: 'A phone',
    price: 100,
    status: ProductStatus.PUBLISHED,
    vendorId: 'vendor-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    inventory: {
      id: 'inventory-1',
      productId: 'product-1',
      quantity: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const cartWithItems = {
    id: 'cart-1',
    customerId: customer.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    cartItems: [
      {
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'product-1',
        quantity: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        product: publishedProduct,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: CartRepository,
          useValue: mockCartRepository,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('returns empty summary when customer has no cart', async () => {
      mockCartRepository.findByCustomerId.mockResolvedValue(null);

      await expect(service.getCart(customer)).resolves.toEqual({
        items: [],
        subtotal: 0,
        totalItems: 0,
      });
    });

    it('returns computed totals for an existing cart', async () => {
      mockCartRepository.findByCustomerId.mockResolvedValue(cartWithItems);

      await expect(service.getCart(customer)).resolves.toEqual({
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            quantity: 2,
            title: 'Phone',
            price: 100,
            lineTotal: 200,
          },
        ],
        subtotal: 200,
        totalItems: 2,
      });
    });
  });

  describe('addToCart', () => {
    it('creates a cart when adding the first item', async () => {
      mockCartRepository.findPublishedProductWithInventory.mockResolvedValue(publishedProduct);
      mockCartRepository.findByCustomerId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(cartWithItems);
      mockCartRepository.createCartWithItem.mockResolvedValue(cartWithItems);

      await service.addToCart({ productId: 'product-1', quantity: 2 }, customer);

      expect(mockCartRepository.createCartWithItem).toHaveBeenCalledWith(
        customer.userId,
        'product-1',
        2,
      );
    });

    it('increases quantity when product already exists in cart', async () => {
      mockCartRepository.findPublishedProductWithInventory.mockResolvedValue(publishedProduct);
      mockCartRepository.findByCustomerId.mockResolvedValue(cartWithItems);
      mockCartRepository.findCartItemByProductId.mockResolvedValue(cartWithItems.cartItems[0]);
      mockCartRepository.updateCartItemQuantity.mockResolvedValue(undefined);

      await service.addToCart({ productId: 'product-1', quantity: 3 }, customer);

      expect(mockCartRepository.updateCartItemQuantity).toHaveBeenCalledWith('item-1', 5);
      expect(mockCartRepository.createCartItem).not.toHaveBeenCalled();
    });

    it('rejects unpublished products', async () => {
      mockCartRepository.findPublishedProductWithInventory.mockResolvedValue(null);

      await expect(
        service.addToCart({ productId: 'product-1', quantity: 1 }, customer),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects quantities above stock', async () => {
      mockCartRepository.findPublishedProductWithInventory.mockResolvedValue(publishedProduct);

      await expect(
        service.addToCart({ productId: 'product-1', quantity: 11 }, customer),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCartItem', () => {
    it('updates quantity when item belongs to customer', async () => {
      mockCartRepository.findCartItemById.mockResolvedValue({
        ...cartWithItems.cartItems[0],
        cart: cartWithItems,
        product: publishedProduct,
      });
      mockCartRepository.findPublishedProductWithInventory.mockResolvedValue(publishedProduct);
      mockCartRepository.updateCartItemQuantity.mockResolvedValue(undefined);
      mockCartRepository.findByCustomerId.mockResolvedValue(cartWithItems);

      await service.updateCartItem('item-1', { quantity: 4 }, customer);

      expect(mockCartRepository.updateCartItemQuantity).toHaveBeenCalledWith('item-1', 4);
    });

    it('throws when item does not exist', async () => {
      mockCartRepository.findCartItemById.mockResolvedValue(null);

      await expect(service.updateCartItem('missing', { quantity: 1 }, customer)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when item belongs to another customer', async () => {
      mockCartRepository.findCartItemById.mockResolvedValue({
        ...cartWithItems.cartItems[0],
        cart: { ...cartWithItems, customerId: 'other-customer' },
        product: publishedProduct,
      });

      await expect(service.updateCartItem('item-1', { quantity: 1 }, customer)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('removeCartItem', () => {
    it('deletes item when it belongs to customer', async () => {
      mockCartRepository.findCartItemById.mockResolvedValue({
        ...cartWithItems.cartItems[0],
        cart: cartWithItems,
        product: publishedProduct,
      });
      mockCartRepository.deleteCartItem.mockResolvedValue(undefined);
      mockCartRepository.findByCustomerId.mockResolvedValue({
        ...cartWithItems,
        cartItems: [],
      });

      await service.removeCartItem('item-1', customer);

      expect(mockCartRepository.deleteCartItem).toHaveBeenCalledWith('item-1');
    });
  });
});
