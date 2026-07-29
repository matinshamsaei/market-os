import { Test, TestingModule } from '@nestjs/testing';

import { FakeProvider } from '../fake.provider';

describe('FakeProvider', () => {
  let provider: FakeProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FakeProvider],
    }).compile();

    provider = module.get(FakeProvider);
  });

  it('creates a payment with a redirect URL', async () => {
    const result = await provider.createPayment({
      paymentId: 'payment-1',
      orderId: 'order-1',
      amount: 100,
      currency: 'IRR',
    });

    expect(result.providerPaymentId).toMatch(/^fake_/);
    expect(result.paymentUrl).toContain(result.providerPaymentId);
    expect(result.paymentUrl).toContain('orderId=order-1');
  });

  it('captures a payment successfully', async () => {
    await expect(provider.capture({ providerPaymentId: 'fake_123', amount: 100 })).resolves.toEqual(
      { success: true },
    );
  });

  it('refunds a payment with a provider refund id', async () => {
    const result = await provider.refund({ providerPaymentId: 'fake_123', amount: 50 });

    expect(result.providerRefundId).toMatch(/^fake_refund_/);
  });
});
