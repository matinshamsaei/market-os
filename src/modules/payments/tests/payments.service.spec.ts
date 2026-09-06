import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentProviderType, PaymentStatus } from '@prisma/client';

import { PrismaService } from '@/database/prisma/prisma.service';
import type { TokenPayload } from '@/shared/types';

import { OrderStateMachine } from '../../orders/helpers';
import { OrdersRepository } from '../../orders/orders.repository';
import { WalletService } from '../../wallet/wallet.service';
import { PaymentStateMachine } from '../helpers';
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

  const processingPayment = {
    id: 'payment-1',
    orderId: 'order-1',
    provider: PaymentProviderType.FAKE,
    providerPaymentId: 'fake_provider_1',
    status: PaymentStatus.PROCESSING,
    amount: 200,
    currency: 'IRR',
    createdAt: new Date(),
    updatedAt: new Date(),
    order: pendingOrder,
  };

  const mockPaymentsRepository = {
    create: jest.fn(),
    update: jest.fn(),
    hasActivePayment: jest.fn(),
    findByProviderPaymentIdForUpdate: jest.fn(),
  };

  const mockOrdersRepository = {
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockProvider = {
    createPayment: jest.fn(),
    verifyWebhook: jest.fn(),
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

  const mockWalletService = {
    refund: jest.fn(),
  };

  const mockPaymentStateMachine = {
    canTransition: jest.fn(),
  };

  const mockOrderStateMachine = {
    canTransition: jest.fn(),
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
    mockPaymentStateMachine.canTransition.mockReturnValue(true);
    mockOrderStateMachine.canTransition.mockReturnValue(true);

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
        { provide: PaymentStateMachine, useValue: mockPaymentStateMachine },
        { provide: OrderStateMachine, useValue: mockOrderStateMachine },
        { provide: WalletService, useValue: mockWalletService },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  describe('createPayment', () => {
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

  describe('handleWebhook', () => {
    const rawBody = JSON.stringify({
      eventId: 'evt_1',
      type: 'payment.succeeded',
      providerPaymentId: 'fake_provider_1',
      amount: 200,
    });

    beforeEach(() => {
      mockProvider.verifyWebhook.mockResolvedValue({
        eventId: 'evt_1',
        type: 'payment.succeeded',
        providerPaymentId: 'fake_provider_1',
        amount: 200,
      });
      mockPaymentsRepository.findByProviderPaymentIdForUpdate.mockResolvedValue(processingPayment);
      mockPaymentsRepository.update.mockResolvedValue({
        ...processingPayment,
        status: PaymentStatus.SUCCEEDED,
      });
      mockOrdersRepository.updateStatus.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.PAID,
      });
    });

    it('marks payment succeeded and order paid', async () => {
      const result = await service.handleWebhook(rawBody, 'signature', 'FAKE');

      expect(result).toEqual({
        received: true,
        paymentId: 'payment-1',
        status: PaymentStatus.SUCCEEDED,
      });
      expect(mockProvider.verifyWebhook).toHaveBeenCalledWith({
        rawBody,
        signature: 'signature',
        providerHint: PaymentProviderType.FAKE,
      });
      expect(mockPaymentsRepository.update).toHaveBeenCalledWith(expect.anything(), 'payment-1', {
        status: PaymentStatus.SUCCEEDED,
      });
      expect(mockOrdersRepository.updateStatus).toHaveBeenCalledWith(
        expect.anything(),
        'order-1',
        OrderStatus.PAID,
      );
      expect(mockWalletService.refund).not.toHaveBeenCalled();
    });

    it('is idempotent when payment is already in the target status', async () => {
      mockPaymentsRepository.findByProviderPaymentIdForUpdate.mockResolvedValue({
        ...processingPayment,
        status: PaymentStatus.SUCCEEDED,
        order: { ...pendingOrder, status: OrderStatus.PAID },
      });

      const result = await service.handleWebhook(rawBody, 'signature', 'FAKE');

      expect(result).toEqual({
        received: true,
        paymentId: 'payment-1',
        status: PaymentStatus.SUCCEEDED,
      });
      expect(mockPaymentsRepository.update).not.toHaveBeenCalled();
      expect(mockOrdersRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('marks payment failed without updating the order', async () => {
      mockProvider.verifyWebhook.mockResolvedValue({
        eventId: 'evt_2',
        type: 'payment.failed',
        providerPaymentId: 'fake_provider_1',
      });
      mockPaymentsRepository.update.mockResolvedValue({
        ...processingPayment,
        status: PaymentStatus.FAILED,
      });

      const result = await service.handleWebhook(rawBody, 'signature', 'FAKE');

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(mockOrdersRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('refunds wallet when payment is refunded', async () => {
      mockProvider.verifyWebhook.mockResolvedValue({
        eventId: 'evt_3',
        type: 'payment.refunded',
        providerPaymentId: 'fake_provider_1',
        amount: 200,
      });
      mockPaymentsRepository.findByProviderPaymentIdForUpdate.mockResolvedValue({
        ...processingPayment,
        status: PaymentStatus.SUCCEEDED,
        order: { ...pendingOrder, status: OrderStatus.PAID },
      });
      mockPaymentsRepository.update.mockResolvedValue({
        ...processingPayment,
        status: PaymentStatus.REFUNDED,
      });

      await service.handleWebhook(rawBody, 'signature', 'FAKE');

      expect(mockWalletService.refund).toHaveBeenCalledWith('customer-1', 200, expect.anything());
    });

    it('rejects invalid provider hints', async () => {
      await expect(service.handleWebhook(rawBody, 'signature', 'UNKNOWN')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects illegal payment transitions', async () => {
      mockPaymentStateMachine.canTransition.mockReturnValue(false);

      await expect(service.handleWebhook(rawBody, 'signature', 'FAKE')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when payment is missing', async () => {
      mockPaymentsRepository.findByProviderPaymentIdForUpdate.mockResolvedValue(null);

      await expect(service.handleWebhook(rawBody, 'signature', 'FAKE')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
