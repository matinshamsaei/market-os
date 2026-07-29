import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentProviderType, PaymentStatus } from '@prisma/client';

import { PrismaService } from '@/database/prisma/prisma.service';
import type { TokenPayload } from '@/shared/types';

import { OrdersRepository } from '../../orders/orders.repository';
import { PaymentProviderFactory } from '../providers/provider.factory';
import { PaymentsRepository } from '../payments.repository';
import { PaymentsService } from '../payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const customer: TokenPayload = {
    userId: 'customer-1',
    email: 'customer@test.com',
    role: 'CUSTOMER' as TokenPayload['role'],
  };

  const pendingOrder = {
    id: 'order-1',
    userId: 'customer-1',
    status: OrderStatus.PENDING,
    total: 200,
    subTotal: 200,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaymentsRepository = {
    create: jest.fn(),
    update: jest.fn(),
    hasActivePayment: jest.fn(),
  };

  const mockOrdersRepository = {
    findById: jest.fn(),
  };

  const mockProvider = {
    createPayment: jest.fn(),
  };

  const mockProviderFactory = {
    resolveConfiguredProvider: jest.fn(),
    getProvider: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockProviderFactory.resolveConfiguredProvider.mockReturnValue(PaymentProviderType.FAKE);
    mockProviderFactory.getProvider.mockReturnValue(mockProvider);
    mockConfigService.get.mockReturnValue(undefined);
    mockPaymentsRepository.hasActivePayment.mockResolvedValue(false);
    mockProvider.createPayment.mockResolvedValue({
      providerPaymentId: 'fake_provider_1',
      paymentUrl: 'https://fake-payment.example.com/pay/fake_provider_1',
    });

    mockPrismaService.$transaction.mockImplementation((callback) =>
      callback({
        payment: {},
      }),
    );

    mockPaymentsRepository.create.mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      provider: PaymentProviderType.FAKE,
      status: PaymentStatus.PENDING,
      amount: 200,
      currency: 'IRR',
    });

    mockPaymentsRepository.update.mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.PROCESSING,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: mockPaymentsRepository },
        { provide: OrdersRepository, useValue: mockOrdersRepository },
        { provide: PaymentProviderFactory, useValue: mockProviderFactory },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  it('creates a payment and returns redirect details', async () => {
    mockOrdersRepository.findById.mockResolvedValue(pendingOrder);

    const result = await service.createPayment(customer, { orderId: 'order-1' });

    expect(result).toEqual({
      paymentId: 'payment-1',
      paymentUrl: 'https://fake-payment.example.com/pay/fake_provider_1',
    });
    expect(mockProvider.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment-1',
        orderId: 'order-1',
        amount: 200,
        currency: 'IRR',
      }),
    );
    expect(mockPaymentsRepository.update).toHaveBeenCalledWith(
      expect.anything(),
      'payment-1',
      expect.objectContaining({
        providerPaymentId: 'fake_provider_1',
        status: PaymentStatus.PROCESSING,
      }),
    );
  });

  it('throws when order is not found', async () => {
    mockOrdersRepository.findById.mockResolvedValue(null);

    await expect(service.createPayment(customer, { orderId: 'missing' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws when customer does not own the order', async () => {
    mockOrdersRepository.findById.mockResolvedValue({
      ...pendingOrder,
      userId: 'other-customer',
    });

    await expect(service.createPayment(customer, { orderId: 'order-1' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws when order is not pending', async () => {
    mockOrdersRepository.findById.mockResolvedValue({
      ...pendingOrder,
      status: OrderStatus.PAID,
    });

    await expect(service.createPayment(customer, { orderId: 'order-1' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws when order already has an active payment', async () => {
    mockOrdersRepository.findById.mockResolvedValue(pendingOrder);
    mockPaymentsRepository.hasActivePayment.mockResolvedValue(true);

    await expect(service.createPayment(customer, { orderId: 'order-1' })).rejects.toThrow(
      BadRequestException,
    );
  });
});
