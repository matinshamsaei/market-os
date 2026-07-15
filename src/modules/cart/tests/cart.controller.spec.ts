import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { CartController } from '../cart.controller';
import { CartService } from '../cart.service';

describe('CartController', () => {
  let controller: CartController;

  const mockCartService = {
    getCart: jest.fn(),
    addToCart: jest.fn(),
    updateCartItem: jest.fn(),
    removeCartItem: jest.fn(),
  };

  const customer: TokenPayload = {
    userId: 'customer-1',
    email: 'customer@test.com',
    role: UserRole.CUSTOMER,
  };

  const cartSummary = {
    items: [],
    subtotal: 0,
    totalItems: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('delegates to cartService.getCart', async () => {
      mockCartService.getCart.mockResolvedValue(cartSummary);

      const response = await controller.getCart(customer);

      expect(mockCartService.getCart).toHaveBeenCalledWith(customer);
      expect(response).toEqual(cartSummary);
    });
  });

  describe('addToCart', () => {
    it('delegates to cartService.addToCart', async () => {
      const body = { productId: 'product-1', quantity: 2 };
      mockCartService.addToCart.mockResolvedValue(cartSummary);

      const response = await controller.addToCart(body, customer);

      expect(mockCartService.addToCart).toHaveBeenCalledWith(body, customer);
      expect(response).toEqual(cartSummary);
    });
  });

  describe('updateCartItem', () => {
    it('delegates to cartService.updateCartItem', async () => {
      const body = { quantity: 4 };
      mockCartService.updateCartItem.mockResolvedValue(cartSummary);

      const response = await controller.updateCartItem('item-1', body, customer);

      expect(mockCartService.updateCartItem).toHaveBeenCalledWith('item-1', body, customer);
      expect(response).toEqual(cartSummary);
    });
  });

  describe('removeCartItem', () => {
    it('delegates to cartService.removeCartItem', async () => {
      mockCartService.removeCartItem.mockResolvedValue(cartSummary);

      const response = await controller.removeCartItem('item-1', customer);

      expect(mockCartService.removeCartItem).toHaveBeenCalledWith('item-1', customer);
      expect(response).toEqual(cartSummary);
    });
  });
});
