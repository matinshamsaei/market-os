import { Injectable } from '@nestjs/common';

import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentStateMachine {
  private readonly allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    [PaymentStatus.PENDING]: [
      PaymentStatus.PROCESSING,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
    ],
    [PaymentStatus.PROCESSING]: [
      PaymentStatus.SUCCEEDED,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
    ],
    [PaymentStatus.SUCCEEDED]: [PaymentStatus.REFUNDED],
    [PaymentStatus.FAILED]: [],
    [PaymentStatus.CANCELLED]: [],
    [PaymentStatus.REFUNDED]: [],
  };

  canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
    if (from === to) {
      return true;
    }

    return this.allowedTransitions[from]?.includes(to) ?? false;
  }
}
