import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, UserRole } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { OrdersController } from '../orders.controller';
import { OrdersService } from '../orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;

  const mockOrdersService = {
    getOrders: jest.fn(),
    getOrderById: jest.fn(),
    getVendorOrders: jest.fn(),
    checkout: jest.fn(),
    updateStatus: jest.fn(),
    cancelOrder: jest.fn(),
    refundOrder: jest.fn(),
  };

  const customer: TokenPayload = {
    userId: 'customer-1',
    email: 'customer@test.com',
    role: UserRole.CUSTOMER,
  };

  const admin: TokenPayload = {
    userId: 'admin-1',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
  };

  const order = {
    id: 'order-1',
    userId: customer.userId,
    status: OrderStatus.PAID,
    total: 200,
    subTotal: 200,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    jest.clearAllMocks();
  });

  describe('checkout', () => {
    it('delegates to ordersService.checkout', async () => {
      mockOrdersService.checkout.mockResolvedValue(order);

      await expect(controller.checkout(customer, 'key-1')).resolves.toEqual(order);
      expect(mockOrdersService.checkout).toHaveBeenCalledWith(customer, 'key-1');
    });
  });

  describe('refundOrder', () => {
    it('delegates to ordersService.refundOrder', async () => {
      const cancelled = { ...order, status: OrderStatus.CANCELLED };
      mockOrdersService.refundOrder.mockResolvedValue(cancelled);

      await expect(controller.refundOrder(order.id, admin)).resolves.toEqual(cancelled);
      expect(mockOrdersService.refundOrder).toHaveBeenCalledWith(order.id, admin);
    });
  });

  describe('getOrders', () => {
    it('delegates to ordersService.getOrders', async () => {
      mockOrdersService.getOrders.mockResolvedValue([order]);

      await expect(controller.getOrders(customer)).resolves.toEqual([order]);
      expect(mockOrdersService.getOrders).toHaveBeenCalledWith(customer);
    });
  });
});
